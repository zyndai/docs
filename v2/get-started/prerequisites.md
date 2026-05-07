---
title: "Prerequisites"
description: "Install Python 3.12+ or Node.js 18+, plus git, on macOS, Linux, or Windows."
---

# Prerequisites

You need three things on your machine:

| Tool | Min version | Why |
|---|---|---|
| **Python** *or* **Node.js** | 3.12+ / 18+ | The SDK runtime. Pick one based on [Choose Your SDK](./choose-sdk). |
| **git** | any recent | Clone scaffolded projects, version your agent code |
| **A terminal** | — | macOS Terminal, iTerm2, Linux shells, Windows Terminal, or WSL2 |

If you already have a working Python 3.12 or Node 18+ install and `git`, **[skip ahead to install the SDK](./install-sdk)**.

## macOS

The cleanest path is [Homebrew](https://brew.sh).

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# For Python users
brew install python@3.12 git

# For TypeScript users
brew install node git
```

Verify:

```bash
python3.12 --version    # → Python 3.12.x
node --version          # → v18.x or higher
git --version
```

::: tip Multiple Pythons?
Use `pyenv` if you want Python 3.12 alongside an existing system Python:
```bash
brew install pyenv
pyenv install 3.12
pyenv global 3.12
```
:::

## Linux — Ubuntu / Debian

```bash
sudo apt update

# Python
sudo apt install python3.12 python3.12-venv python3-pip git

# Node.js (via NodeSource for current versions)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
```

If `python3.12` is not in your distro's repos (e.g. older Ubuntu), use the `deadsnakes` PPA:

```bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.12 python3.12-venv
```

## Linux — Arch

```bash
sudo pacman -Syu python nodejs npm git
```

## Linux — Fedora

```bash
sudo dnf install python3.12 nodejs git
```

## Windows

We recommend **WSL2 (Ubuntu)** for the smoothest experience — every example in these docs is written for a POSIX shell.

::: tabs
== WSL2 (recommended)

```powershell
# In an admin PowerShell
wsl --install -d Ubuntu
```

Reboot, open Ubuntu, then follow the **Linux — Ubuntu / Debian** instructions above.

== Native Windows

Use [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/) (built into Windows 11 / current Windows 10):

```powershell
winget install Python.Python.3.12
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Verify in a fresh PowerShell:

```powershell
python --version
node --version
git --version
```

::: warning Path differences
Native Windows uses backslashes and different default config paths. The SDK works, but every example in these docs uses POSIX paths (`~/.zynd/...`). On Windows that resolves to `%USERPROFILE%\.zynd\...`.
:::
:::

## Verify everything

Open a fresh terminal and run:

```bash
python3 --version       # → 3.12.x  (Python users)
node --version          # → v18+    (TS users)
git --version           # → 2.x
curl --version          # → curl 7.x or 8.x  (used in later steps)
```

If all four print versions, you are ready.

## Common gotchas

| Symptom | Fix |
|---|---|
| `python3.12: command not found` after install | Open a new shell or run `hash -r` |
| `pip install` fails with SSL errors on Linux | `sudo apt install ca-certificates && sudo update-ca-certificates` |
| Node says `EACCES` when running `npm -g` | Use `npx` or set up a user-level `npm` prefix; never `sudo npm install -g` |
| WSL `/mnt/c/...` is slow | Keep your project inside the Linux home (`~/projects/...`), not on the Windows drive |

## Next

- **[Choose Your SDK →](./choose-sdk)**
