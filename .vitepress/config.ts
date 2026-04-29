import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'

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

    themeConfig: {
      logo: '/logo.svg',

      nav: [
        { text: 'Home', link: '/' },
        { text: 'Dashboard', link: 'https://www.zynd.ai' },
        { text: 'Registry', link: 'https://www.zynd.ai/registry' },
        { text: 'Deployer', link: 'https://deployer.zynd.ai' },
      ],

      sidebar: [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Zynd AI', link: '/guide/' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Key Concepts', link: '/guide/concepts' },
            { text: 'Network Hosts', link: '/guide/network-hosts' },
            { text: 'Video Tutorials', link: '/guide/video-tutorials' },
          ],
        },
        {
          text: 'Getting Started',
          items: [
            { text: 'Quickstart', link: '/getting-started/' },
            { text: 'Getting Testnet Tokens', link: '/getting-started/testnet-tokens' },
          ],
        },
        {
          text: 'Building Agents',
          items: [
            { text: 'Overview', link: '/agents/' },
            { text: 'Your First Agent', link: '/agents/first-agent' },
            { text: 'Framework Integrations', link: '/agents/frameworks' },
            { text: 'Agent Cards', link: '/agents/agent-cards' },
            { text: 'Webhooks & Communication', link: '/agents/webhooks' },
            { text: 'Heartbeat & Liveness', link: '/agents/heartbeat' },
          ],
        },
        {
          text: 'Building Services',
          items: [
            { text: 'Overview', link: '/services/' },
            { text: 'Your First Service', link: '/services/first-service' },
          ],
        },
        {
          text: 'Persona Agents',
          items: [
            { text: 'What is a Persona', link: '/persona/' },
            { text: 'Deploy Your Persona', link: '/persona/deploy' },
            { text: 'OAuth Integrations', link: '/persona/integrations' },
            { text: 'Agent-to-Agent Messaging', link: '/persona/messaging' },
            { text: 'Telegram Bridge', link: '/persona/telegram' },
            { text: 'Self-Host Backend', link: '/persona/self-host' },
          ],
        },
        {
          text: 'Deploying to Zynd',
          items: [
            { text: 'Deployer Overview', link: '/deployer/' },
            { text: 'Deploy via deployer.zynd.ai', link: '/deployer/deploy' },
            { text: 'Monitoring & Logs', link: '/deployer/monitoring' },
            { text: 'Troubleshooting', link: '/deployer/troubleshooting' },
            { text: 'Self-Host Deployer', link: '/deployer/self-host' },
          ],
        },
        {
          text: 'Deployer (Implementation)',
          items: [
            { text: 'Overview', link: '/deployer-app/' },
            { text: 'Architecture', link: '/deployer-app/architecture' },
            { text: 'Worker Subsystems', link: '/deployer-app/worker' },
            { text: 'API Routes', link: '/deployer-app/api-routes' },
            { text: 'Data Model', link: '/deployer-app/data-model' },
          ],
        },
        {
          text: 'Agent DNS Registry',
          items: [
            { text: 'How It Works', link: '/registry/' },
            { text: 'Registration', link: '/registry/registration' },
            { text: 'Search & Discovery', link: '/registry/search' },
            { text: 'Zynd Naming Service (ZNS)', link: '/registry/zns' },
            { text: 'Mesh Network', link: '/registry/mesh' },
            { text: 'Trust & Verification', link: '/registry/trust-verification' },
            { text: 'API Reference', link: '/registry/api-reference' },
          ],
        },
        {
          text: 'AgentDNS (Registry Binary)',
          items: [
            { text: 'Overview & Quickstart', link: '/agentdns/' },
            { text: 'Architecture & Startup', link: '/agentdns/architecture' },
            { text: 'Identity Layer', link: '/agentdns/identity' },
            { text: 'Storage Schema', link: '/agentdns/storage' },
            { text: 'Gossip Mesh', link: '/agentdns/gossip-mesh' },
            { text: 'Search Engine', link: '/agentdns/search-engine' },
            { text: 'DHT (Kademlia)', link: '/agentdns/dht' },
            { text: 'Agent Cards & Caching', link: '/agentdns/cards-cache' },
            { text: 'CLI Reference', link: '/agentdns/cli' },
            { text: 'Configuration', link: '/agentdns/configuration' },
          ],
        },
        {
          text: 'Identity & Security',
          items: [
            { text: 'Ed25519 Identity', link: '/identity/' },
            { text: 'HD Key Derivation', link: '/identity/hd-keys' },
            { text: 'x402 Micropayments', link: '/identity/payments' },
          ],
        },
        {
          text: 'CLI Reference',
          items: [
            { text: 'Installation', link: '/cli/' },
            { text: 'Agent Commands', link: '/cli/agent' },
            { text: 'Service Commands', link: '/cli/service' },
            { text: 'Key Management', link: '/cli/keys' },
            { text: 'Search & Resolve', link: '/cli/search' },
          ],
        },
        {
          text: 'Platform',
          items: [
            { text: 'Dashboard', link: '/platform/dashboard' },
          ],
        },
        {
          text: 'Zynd Dashboard (Web App)',
          items: [
            { text: 'Overview', link: '/dashboard-app/' },
            { text: 'Architecture', link: '/dashboard-app/architecture' },
            { text: 'API Routes', link: '/dashboard-app/api-routes' },
            { text: 'Data Model', link: '/dashboard-app/data-model' },
            { text: 'Self-Host', link: '/dashboard-app/self-host' },
          ],
        },
        {
          text: 'n8n Nodes',
          items: [
            { text: 'Overview & Installation', link: '/n8n-nodes/' },
            { text: 'Node Reference', link: '/n8n-nodes/node-reference' },
            { text: 'Building a Paid Workflow', link: '/n8n-nodes/building-paid-workflow' },
          ],
        },
        {
          text: 'Python SDK',
          items: [
            { text: 'Installation & Core Concepts', link: '/python-sdk/' },
            { text: 'Examples', link: '/python-sdk/examples' },
            { text: 'API Reference', link: '/python-sdk/api-reference' },
          ],
        },
        {
          text: 'Python SDK (Internals)',
          items: [
            { text: 'Module Map', link: '/python-sdk-internals/' },
            { text: 'Lifecycle Modules', link: '/python-sdk-internals/lifecycle' },
            { text: 'Networking & Payments', link: '/python-sdk-internals/networking' },
          ],
        },
        {
          text: 'TypeScript SDK',
          items: [
            { text: 'Overview & Quickstart', link: '/ts-sdk/' },
            { text: 'CLI Reference', link: '/ts-sdk/cli' },
            { text: 'Programmatic API', link: '/ts-sdk/programmatic' },
            { text: 'Entity Card & x402', link: '/ts-sdk/entity-card' },
          ],
        },
        {
          text: 'MCP Server',
          items: [
            { text: 'Overview', link: '/mcp-server/' },
            { text: 'Tools Reference', link: '/mcp-server/tools' },
            { text: 'Persona Runner', link: '/mcp-server/persona-runner' },
            { text: 'Configuration', link: '/mcp-server/configuration' },
          ],
        },
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/zyndai' },
        { icon: 'x', link: 'https://x.com/ZyndAI' },
        { icon: 'youtube', link: 'https://www.youtube.com/@ZyndAINetwork' },
      ],

      search: {
        provider: 'local',
      },

      editLink: {
        pattern: 'https://github.com/zyndai/zyndai-agent/edit/main/docs/:path',
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
