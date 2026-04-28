import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'

export default withMermaid(
  defineConfig({
    title: 'Zynd AI',
    description: 'Build, discover, and monetize AI agents on the open Zynd network.',

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
      ],

      sidebar: [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Zynd AI', link: '/guide/' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Video Tutorials', link: '/guide/video-tutorials' },
          ],
        },
        {
          text: 'Getting Started',
          items: [
            { text: 'Setting Up MetaMask', link: '/getting-started/metamask-setup' },
            { text: 'Getting Testnet Tokens', link: '/getting-started/testnet-tokens' },
            { text: 'Getting Your API Key', link: '/getting-started/api-key' },
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
        {
          text: 'Agent DNS',
          items: [
            { text: 'Overview', link: '/agent-dns/' },
            { text: 'Setup Guide', link: '/agent-dns/setup' },
            { text: 'Architecture', link: '/agent-dns/architecture' },
            { text: 'CLI & API Reference', link: '/agent-dns/cli-api' },
          ],
        },
        {
          text: 'Persona Platform',
          items: [
            { text: 'Overview', link: '/agent-persona/' },
            { text: 'Architecture', link: '/agent-persona/architecture' },
            { text: 'Design System', link: '/agent-persona/design-system' },
          ],
        },
        {
          text: 'TypeScript SDK',
          items: [
            { text: 'Overview', link: '/typescript-sdk/' },
            { text: 'Repository Map', link: '/typescript-sdk/repo-map' },
            { text: 'JS/TS Deploy Design', link: '/typescript-sdk/deploy-design' },
          ],
        },
        {
          text: 'MCP Server',
          items: [
            { text: 'Overview', link: '/mcp-server/' },
          ],
        },
        {
          text: 'Deployer',
          items: [
            { text: 'Overview', link: '/deployer/' },
            { text: 'Design Plan', link: '/deployer/design-plan' },
          ],
        },
        {
          text: 'Dashboard App',
          items: [
            { text: 'Overview', link: '/dashboard-app/' },
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
