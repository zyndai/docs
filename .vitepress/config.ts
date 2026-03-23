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
