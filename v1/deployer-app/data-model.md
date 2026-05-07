---
title: Data Model
description: Prisma schema, on-disk layout, and the at-rest encryption format.
---

# Data Model

The Deployer keeps everything that matters in Postgres. The on-disk data directory holds opaque encrypted blobs whose names are looked up via the database — the filesystem alone tells you nothing.

## Schema

`prisma/schema.prisma` defines four models.

### `Deployment`

The single row that represents an upload through its entire lifetime.

```prisma
model Deployment {
  id            String   @id @default(cuid())

  // user-facing identifiers
  name          String                          // from upload form
  slug          String   @unique                // slugify(name) + 6-char suffix
  entityType    String                          // "agent" | "service"
  entityId      String?                         // populated after first successful registry registration
  registryUrl   String                          // snapshot of ZYND_REGISTRY_URL at upload time

  // lifecycle
  status        String                          // queued | unpacking | ... | running | crashed | ...
  errorMessage  String?

  // on-disk storage
  blobPath      String                          // .../blobs/<id>.zip.age
  keyPath       String                          // .../keys/<id>/keypair.json.age

  runtime       String   @default("python")      // "python" | "node"

  // runtime fields populated after start
  port          Int?                             // mirror; PortAllocation is canonical
  containerId   String?
  hostUrl       String?                          // https://<slug>.deployer.<wildcard>
  publicKeyB64  String?                          // derived from uploaded keypair, shown in UI

  // crash state
  lastExitCode  Int?
  lastCrashAt   DateTime?

  createdAt     DateTime @default(now())
  startedAt     DateTime?
  stoppedAt     DateTime?

  logs          DeploymentLog[]

  @@index([status])
  @@index([createdAt])
}
```

Field-level notes:

| Field | Notes |
|-------|-------|
| `id` | CUID, not UUID. Used as label on Docker containers and as filesystem path component. |
| `slug` | Globally unique; what shows up in the URL. |
| `entityId` | Stays `null` until the container's first successful `POST /v1/entities`. After that, used by `/api/v1/agents/[entityId]`. |
| `registryUrl` | Snapshot at upload time so a deployment can survive an operator changing `ZYND_REGISTRY_URL` later. |
| `port` | Display mirror. The `PortAllocation` table is the source of truth for uniqueness and is the only thing the worker uses for collision checks. |
| `status` indexes | `@@index([status])` makes the `drainQueue` claim query fast even with thousands of historical rows. |

### `DeploymentLog`

Append-only log table. One row per stdout / stderr / system line.

```prisma
model DeploymentLog {
  id           BigInt    @id @default(autoincrement())
  deploymentId String
  lineNo       Int                              // monotonic per deployment
  text         String    @db.Text
  stream       String                           // "stdout" | "stderr" | "system"
  ts           DateTime  @default(now())

  deployment   Deployment @relation(fields: [deploymentId], references: [id], onDelete: Cascade)

  @@index([deploymentId, lineNo])
  @@index([deploymentId, ts])
}
```

- `lineNo` is monotonic per deployment, written by `worker/logs.ts`. It's the resume token for SSE log clients (`?since=<lineNo>`).
- `stream="system"` rows come from `appendSystemLog()` in the worker — these are state transitions and worker-level events.
- The `[deploymentId, ts]` index lets retention sweep efficiently delete by age.

### `DeploymentMetric`

Per-container CPU / memory samples.

```prisma
model DeploymentMetric {
  id           BigInt   @id @default(autoincrement())
  deploymentId String
  sampledAt    DateTime @default(now())
  memUsedMb    Int                               // cgroup memory.usage_in_bytes / 1MB
  memLimitMb   Int                               // cgroup memory.limit_in_bytes / 1MB
  cpuPct       Float                             // 0..N (fraction of one logical CPU)

  @@index([deploymentId, sampledAt])
  @@index([sampledAt])
}
```

- Default sample interval is 30 s. Customizable via `DEPLOYER_METRICS_INTERVAL_MS`.
- `cpuPct` is **fraction of one logical CPU**, not percentage of the container's CPU limit. A value of `1.7` means 1.7 cores of compute.
- Default retention 3 days (`DEPLOYER_METRIC_RETENTION_DAYS`). Metrics accumulate fast — one row per deployment per 30 s — and aren't useful past a few days.

### `PortAllocation`

The source of truth for port uniqueness.

```prisma
model PortAllocation {
  port         Int      @id
  deploymentId String   @unique
  takenAt      DateTime @default(now())
}
```

Both keys are unique:

- `port @id` — at most one deployment per port.
- `deploymentId @unique` — at most one port per deployment.

`worker/ports.ts` allocates with `INSERT ... ON CONFLICT DO NOTHING` to make the operation atomic across multiple workers. There's no soft-delete — `release()` actually deletes the row.

## On-disk layout

```
${DEPLOYER_DATA_ROOT}/         # default /var/lib/zynd-deployer
├── master.age                 # the master age key (mode 600, owner zynd)
├── blobs/
│   └── <deploymentId>.zip.age # encrypted project archive
├── keys/
│   └── <deploymentId>/
│       └── keypair.json.age   # encrypted Ed25519 keypair
├── workdirs/
│   └── <deploymentId>/        # decrypted working directory (only while building / running)
└── logs/                      # transient — DB is canonical
```

- `blobs/` and `keys/` are written by the web service at upload time. Read by the worker on transition into `unpacking`.
- `workdirs/<id>/` exists only while the container is alive. `lifecycle.ts` removes it when the deployment moves to `stopped`, `crashed`, or `failed`.
- Nothing in `${DEPLOYER_DATA_ROOT}/` is web-served. Caddy proxies straight to the container; the data directory is private to the host.

## At-rest encryption format

`src/lib/crypto.ts` uses the stock `age` CLI:

| File | Wrote by | Read by |
|------|----------|---------|
| `master.age` | `infra/install.sh` (one-time) | both web (encrypt) and worker (decrypt) |
| `<id>.zip.age` | web at upload | worker at `unpacking` |
| `keypair.json.age` | web at upload | worker (mounted into container at start) |

Encryption is symmetric in effect — the same age identity is used as both the encryption recipient and the decryption identity. Operators can decrypt anything with `age -d -i master.age <file>`, which is the point: format compatibility with the `age` toolchain operators already trust.

## Why no User table

The Deployer has no accounts. There's no row that says "Alice owns this deployment." The keypair *is* the identity:

- The same keypair you uploaded is what the running container uses to sign the registry registration.
- If you keep your keypair, you can deploy under the same identity again.
- If you lose it, that identity is gone — but a new upload mints a new identity, you don't get locked out of *the platform*.

This is what makes the Deployer fully open — anyone can upload, no signup, no email gating. The downside is that there's no "list my deployments" view scoped to an account; you bookmark the URL or look it up by entity ID via `/api/v1/agents/[entityId]`.

## Migrations

```bash
pnpm prisma migrate dev    # local: derive a new migration from schema diff
pnpm prisma migrate deploy # production: apply pending migrations
```

Migrations live in `prisma/migrations/` and are checked in. The web and worker services share the same schema; either restart will run pending migrations on boot.

## Backup checklist

- **Postgres** — `Deployment`, `DeploymentLog`, `DeploymentMetric`, `PortAllocation`. Standard `pg_dump`.
- **`master.age`** — without this, every encrypted blob is unrecoverable. Treat it like a wallet seed.
- **`/var/lib/zynd-deployer/blobs/` and `keys/`** — the encrypted blobs themselves. Useless without `master.age`, but you need both to redeploy from cold storage.

## Next

- **[Architecture](/deployer-app/architecture)** — how the lifecycle drives these tables.
- **[Worker Subsystems](/deployer-app/worker)** — which file owns which write path.
- **[Self-Host](/deployer/self-host)** — env vars and VM setup.
