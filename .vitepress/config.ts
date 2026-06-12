import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'

// Legacy v1 docs are parked under /v1/ for reference. Their internal cross-links
// were authored against the original paths (/agents/, /services/, /cli/, etc.),
// so we tell VitePress to ignore those when checking the build.
const LEGACY_PATH_PATTERN =
  /^\/(?:agents|services|persona|cli|registry|agentdns|deployer|deployer-app|dashboard-app|python-sdk|python-sdk-internals|ts-sdk|mcp-server|identity|getting-started|guide|platform)(?:\/|$)/

export default withMermaid(
  defineConfig({
    title: 'Zynd AI',
    description: 'Build, discover, and monetize AI agents and services on the open Zynd network.',

    head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }],
    ],

    markdown: {
      config(md) {
        md.use(tabsMarkdownPlugin)
      },
    },

    ignoreDeadLinks: [LEGACY_PATH_PATTERN],

    themeConfig: {
      logo: '/logo.svg',

      nav: [
        { text: 'Home', link: '/' },
        { text: 'Get Started', link: '/v2/get-started/' },
        { text: 'Reference', link: '/v2/reference/' },
        { text: 'Architecture', link: '/v2/architecture/' },
        { text: 'Dashboard', link: 'https://www.zynd.ai' },
        { text: 'Deployer', link: 'https://deployer.zynd.ai' },
      ],

      sidebar: {
        '/v2/': [
          {
            text: 'Overview',
            items: [
              { text: 'Welcome', link: '/v2/' },
            ],
          },
          {
            text: 'Introduction',
            items: [
              { text: 'What is Zynd AI', link: '/v2/introduction/' },
              { text: 'Architecture Overview', link: '/v2/introduction/architecture' },
              { text: 'Concepts & Glossary', link: '/v2/introduction/concepts' },
              { text: 'Network Hosts', link: '/v2/introduction/network-hosts' },
            ],
          },
          {
            text: 'Get Started',
            items: [
              { text: 'Overview', link: '/v2/get-started/' },
              { text: 'Prerequisites', link: '/v2/get-started/prerequisites' },
              { text: 'Choose Your SDK', link: '/v2/get-started/choose-sdk' },
              { text: 'Install the SDK', link: '/v2/get-started/install-sdk' },
              { text: 'Sign In on the Dashboard', link: '/v2/get-started/sign-in' },
              { text: 'Authenticate the CLI', link: '/v2/get-started/cli-auth' },
              { text: 'Get Testnet Tokens', link: '/v2/get-started/testnet-tokens' },
              { text: 'Your First Agent', link: '/v2/get-started/first-agent' },
              { text: 'Your First Service', link: '/v2/get-started/first-service' },
              { text: 'Call It', link: '/v2/get-started/call-it' },
              { text: 'Next Steps', link: '/v2/get-started/next-steps' },
            ],
          },
          {
            text: 'Build',
            items: [
              { text: 'Overview', link: '/v2/build/' },
              { text: 'Agents', link: '/v2/build/agents/' },
              { text: 'Frameworks', link: '/v2/build/agents/frameworks' },
              { text: 'Agent Cards', link: '/v2/build/agents/agent-cards' },
              { text: 'Webhooks', link: '/v2/build/agents/webhooks' },
              { text: 'Heartbeat & Liveness', link: '/v2/build/agents/heartbeat' },
              { text: 'Services', link: '/v2/build/services/' },
              { text: 'Service Chaining', link: '/v2/build/services/chaining' },
              { text: 'Personas', link: '/v2/build/personas/' },
              { text: 'OAuth Integrations', link: '/v2/build/personas/integrations' },
              { text: 'Agent-to-Agent Messaging', link: '/v2/build/personas/messaging' },
              { text: 'Telegram Bridge', link: '/v2/build/personas/telegram' },
            ],
          },
          {
            text: 'Discover & Integrate',
            items: [
              { text: 'Overview', link: '/v2/discover-integrate/' },
              { text: 'Search & Resolve', link: '/v2/discover-integrate/search-resolve' },
              { text: 'Calling Other Agents', link: '/v2/discover-integrate/calling-agents' },
              { text: 'MCP Server', link: '/v2/discover-integrate/mcp-server' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'Overview', link: '/v2/reference/' },
              { text: 'CLI', link: '/v2/reference/cli' },
              { text: 'Python SDK API', link: '/v2/reference/python-sdk' },
              { text: 'TypeScript SDK API', link: '/v2/reference/ts-sdk' },
              { text: 'REST API (Registry)', link: '/v2/reference/rest-api' },
              { text: 'Identity & Cryptography', link: '/v2/reference/identity' },
              { text: 'x402 Payments', link: '/v2/reference/x402' },
              { text: 'Configuration', link: '/v2/reference/config' },
            ],
          },
          {
            text: 'Architecture',
            items: [
              { text: 'Overview', link: '/v2/architecture/' },
              { text: 'Registry Spec', link: '/v2/architecture/registry-spec/' },
              { text: 'AgentDNS (Implementation)', link: '/v2/architecture/agentdns/' },
              { text: 'Dashboard (Implementation)', link: '/v2/architecture/dashboard/' },
              { text: 'Python SDK Internals', link: '/v2/architecture/python-sdk-internals/' },
              { text: 'MCP Server Internals', link: '/v2/architecture/mcp-server/' },
            ],
          },
          {
            text: 'Operate',
            items: [
              { text: 'Self-Host Overview', link: '/v2/operate/' },
              { text: 'Run a Registry Node', link: '/v2/operate/run-registry-node' },
              { text: 'Local Testing', link: '/v2/operate/local-testing' },
              { text: 'Metrics & Monitoring', link: '/v2/operate/metrics' },
            ],
          },
          {
            text: 'Troubleshooting',
            items: [
              { text: 'Overview', link: '/v2/troubleshooting/' },
              { text: 'Registration Issues', link: '/v2/troubleshooting/registration' },
              { text: 'Heartbeat Issues', link: '/v2/troubleshooting/heartbeat' },
              { text: 'x402 Payment Issues', link: '/v2/troubleshooting/x402' },
              { text: 'Persona Webhook Issues', link: '/v2/troubleshooting/persona-webhook' },
              { text: 'Common SDK Errors', link: '/v2/troubleshooting/sdk-errors' },
            ],
          },
          {
            text: 'Resources',
            items: [
              { text: 'Videos', link: '/v2/resources/videos' },
              { text: 'Glossary', link: '/v2/resources/glossary' },
              { text: 'Support & Community', link: '/v2/resources/support' },
            ],
          },
        ],
        '/v1/': [
          {
            text: 'About v1 (legacy)',
            items: [
              { text: 'These docs are archived', link: '/v1/guide/' },
            ],
          },
          {
            text: 'Introduction',
            items: [
              { text: 'What is Zynd AI', link: '/v1/guide/' },
              { text: 'Architecture', link: '/v1/guide/architecture' },
              { text: 'Key Concepts', link: '/v1/guide/concepts' },
              { text: 'Network Hosts', link: '/v1/guide/network-hosts' },
              { text: 'Video Tutorials', link: '/v1/guide/video-tutorials' },
            ],
          },
          {
            text: 'Getting Started',
            items: [
              { text: 'Quickstart', link: '/v1/getting-started/' },
              { text: 'Getting Testnet Tokens', link: '/v1/getting-started/testnet-tokens' },
            ],
          },
          {
            text: 'Building Agents',
            items: [
              { text: 'Overview', link: '/v1/agents/' },
              { text: 'Your First Agent', link: '/v1/agents/first-agent' },
              { text: 'Framework Integrations', link: '/v1/agents/frameworks' },
              { text: 'Agent Cards', link: '/v1/agents/agent-cards' },
              { text: 'Webhooks & Communication', link: '/v1/agents/webhooks' },
              { text: 'Heartbeat & Liveness', link: '/v1/agents/heartbeat' },
            ],
          },
          {
            text: 'Building Services',
            items: [
              { text: 'Overview', link: '/v1/services/' },
              { text: 'Your First Service', link: '/v1/services/first-service' },
            ],
          },
          {
            text: 'Persona Agents',
            items: [
              { text: 'What is a Persona', link: '/v1/persona/' },
              { text: 'Deploy Your Persona', link: '/v1/persona/deploy' },
              { text: 'OAuth Integrations', link: '/v1/persona/integrations' },
              { text: 'Agent-to-Agent Messaging', link: '/v1/persona/messaging' },
              { text: 'Telegram Bridge', link: '/v1/persona/telegram' },
              { text: 'Self-Host Backend', link: '/v1/persona/self-host' },
            ],
          },
          {
            text: 'Deploying to Zynd',
            items: [
              { text: 'Deployer Overview', link: '/v1/deployer/' },
              { text: 'Deploy via deployer.zynd.ai', link: '/v1/deployer/deploy' },
              { text: 'Monitoring & Logs', link: '/v1/deployer/monitoring' },
              { text: 'Troubleshooting', link: '/v1/deployer/troubleshooting' },
              { text: 'Self-Host Deployer', link: '/v1/deployer/self-host' },
            ],
          },
          {
            text: 'Deployer (Implementation)',
            items: [
              { text: 'Overview', link: '/v1/deployer-app/' },
              { text: 'Architecture', link: '/v1/deployer-app/architecture' },
              { text: 'Worker Subsystems', link: '/v1/deployer-app/worker' },
              { text: 'API Routes', link: '/v1/deployer-app/api-routes' },
              { text: 'Data Model', link: '/v1/deployer-app/data-model' },
            ],
          },
          {
            text: 'Agent DNS Registry',
            items: [
              { text: 'How It Works', link: '/v1/registry/' },
              { text: 'Registration', link: '/v1/registry/registration' },
              { text: 'Search & Discovery', link: '/v1/registry/search' },
              { text: 'Zynd Naming Service (ZNS)', link: '/v1/registry/zns' },
              { text: 'Mesh Network', link: '/v1/registry/mesh' },
              { text: 'Trust & Verification', link: '/v1/registry/trust-verification' },
              { text: 'API Reference', link: '/v1/registry/api-reference' },
            ],
          },
          {
            text: 'AgentDNS (Registry Binary)',
            items: [
              { text: 'Overview & Quickstart', link: '/v1/agentdns/' },
              { text: 'Architecture & Startup', link: '/v1/agentdns/architecture' },
              { text: 'Identity Layer', link: '/v1/agentdns/identity' },
              { text: 'Storage Schema', link: '/v1/agentdns/storage' },
              { text: 'Gossip Mesh', link: '/v1/agentdns/gossip-mesh' },
              { text: 'Search Engine', link: '/v1/agentdns/search-engine' },
              { text: 'DHT (Kademlia)', link: '/v1/agentdns/dht' },
              { text: 'Agent Cards & Caching', link: '/v1/agentdns/cards-cache' },
              { text: 'CLI Reference', link: '/v1/agentdns/cli' },
              { text: 'Configuration', link: '/v1/agentdns/configuration' },
            ],
          },
          {
            text: 'Identity & Security',
            items: [
              { text: 'Ed25519 Identity', link: '/v1/identity/' },
              { text: 'HD Key Derivation', link: '/v1/identity/hd-keys' },
              { text: 'x402 Micropayments', link: '/v1/identity/payments' },
            ],
          },
          {
            text: 'CLI Reference',
            items: [
              { text: 'Installation', link: '/v1/cli/' },
              { text: 'Agent Commands', link: '/v1/cli/agent' },
              { text: 'Service Commands', link: '/v1/cli/service' },
              { text: 'Key Management', link: '/v1/cli/keys' },
              { text: 'Search & Resolve', link: '/v1/cli/search' },
            ],
          },
          {
            text: 'Platform',
            items: [
              { text: 'Dashboard', link: '/v1/platform/dashboard' },
            ],
          },
          {
            text: 'Zynd Dashboard (Web App)',
            items: [
              { text: 'Overview', link: '/v1/dashboard-app/' },
              { text: 'Architecture', link: '/v1/dashboard-app/architecture' },
              { text: 'API Routes', link: '/v1/dashboard-app/api-routes' },
              { text: 'Data Model', link: '/v1/dashboard-app/data-model' },
              { text: 'Self-Host', link: '/v1/dashboard-app/self-host' },
            ],
          },
          {
            text: 'Python SDK',
            items: [
              { text: 'Installation & Core Concepts', link: '/v1/python-sdk/' },
              { text: 'Examples', link: '/v1/python-sdk/examples' },
              { text: 'API Reference', link: '/v1/python-sdk/api-reference' },
            ],
          },
          {
            text: 'Python SDK (Internals)',
            items: [
              { text: 'Module Map', link: '/v1/python-sdk-internals/' },
              { text: 'Lifecycle Modules', link: '/v1/python-sdk-internals/lifecycle' },
              { text: 'Networking & Payments', link: '/v1/python-sdk-internals/networking' },
            ],
          },
          {
            text: 'TypeScript SDK',
            items: [
              { text: 'Overview & Quickstart', link: '/v1/ts-sdk/' },
              { text: 'CLI Reference', link: '/v1/ts-sdk/cli' },
              { text: 'Programmatic API', link: '/v1/ts-sdk/programmatic' },
              { text: 'Entity Card & x402', link: '/v1/ts-sdk/entity-card' },
            ],
          },
          {
            text: 'MCP Server',
            items: [
              { text: 'Overview', link: '/v1/mcp-server/' },
              { text: 'Tools Reference', link: '/v1/mcp-server/tools' },
              { text: 'Persona Runner', link: '/v1/mcp-server/persona-runner' },
              { text: 'Configuration', link: '/v1/mcp-server/configuration' },
            ],
          },
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/zyndai' },
        { icon: 'x', link: 'https://x.com/ZyndAI' },
        { icon: 'youtube', link: 'https://www.youtube.com/@ZyndAINetwork' },
      ],

      search: {
        provider: 'local',
      },

      editLink: {
        pattern: 'https://github.com/zyndai/docs/edit/main/:path',
        text: 'Edit this page on GitHub',
      },

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2024-present Zynd AI',
      },
    },

    mermaid: {},
  })
)
