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
          text: 'Agent DNS Registry',
          items: [
            { text: 'How It Works', link: '/registry/' },
            { text: 'Registration', link: '/registry/registration' },
            { text: 'Search & Discovery', link: '/registry/search' },
            { text: 'Zynd Naming Service (ZNS)', link: '/registry/zns' },
            { text: 'Mesh Network', link: '/registry/mesh' },
            { text: 'API Reference', link: '/registry/api-reference' },
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
