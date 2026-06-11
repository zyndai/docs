// .vitepress/config.ts
import { defineConfig } from "file:///sessions/vigilant-funny-sagan/mnt/docs/node_modules/vitepress/dist/node/index.js";
import { withMermaid } from "file:///sessions/vigilant-funny-sagan/mnt/docs/node_modules/vitepress-plugin-mermaid/dist/vitepress-plugin-mermaid.es.mjs";
import { tabsMarkdownPlugin } from "file:///sessions/vigilant-funny-sagan/mnt/docs/node_modules/vitepress-plugin-tabs/dist/node/index.js";
var config_default = withMermaid(
  defineConfig({
    title: "Zynd AI",
    description: "Build, discover, and monetize AI agents and services on the open Zynd network.",
    head: [
      ["link", { rel: "icon", href: "/favicon.ico" }]
    ],
    markdown: {
      config(md) {
        md.use(tabsMarkdownPlugin);
      }
    },
    themeConfig: {
      logo: "/logo.svg",
      nav: [
        { text: "Home", link: "/" },
        { text: "Dashboard", link: "https://www.zynd.ai" },
        { text: "Registry", link: "https://www.zynd.ai/registry" }
      ],
      sidebar: [
        {
          text: "Introduction",
          items: [
            { text: "What is Zynd AI", link: "/guide/" },
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Key Concepts", link: "/guide/concepts" },
            { text: "Video Tutorials", link: "/guide/video-tutorials" }
          ]
        },
        {
          text: "Getting Started",
          items: [
            { text: "Quickstart", link: "/getting-started/" },
            { text: "Setting Up MetaMask", link: "/getting-started/metamask-setup" },
            { text: "Getting Testnet Tokens", link: "/getting-started/testnet-tokens" }
          ]
        },
        {
          text: "Building Agents",
          items: [
            { text: "Overview", link: "/agents/" },
            { text: "Your First Agent", link: "/agents/first-agent" },
            { text: "Framework Integrations", link: "/agents/frameworks" },
            { text: "Agent Cards", link: "/agents/agent-cards" },
            { text: "Webhooks & Communication", link: "/agents/webhooks" },
            { text: "Heartbeat & Liveness", link: "/agents/heartbeat" }
          ]
        },
        {
          text: "Building Services",
          items: [
            { text: "Overview", link: "/services/" },
            { text: "Your First Service", link: "/services/first-service" }
          ]
        },
        {
          text: "Agent DNS Registry",
          items: [
            { text: "How It Works", link: "/registry/" },
            { text: "Registration", link: "/registry/registration" },
            { text: "Search & Discovery", link: "/registry/search" },
            { text: "Zynd Naming Service (ZNS)", link: "/registry/zns" },
            { text: "Mesh Network", link: "/registry/mesh" }
          ]
        },
        {
          text: "Identity & Security",
          items: [
            { text: "Ed25519 Identity", link: "/identity/" },
            { text: "HD Key Derivation", link: "/identity/hd-keys" },
            { text: "x402 Micropayments", link: "/identity/payments" }
          ]
        },
        {
          text: "CLI Reference",
          items: [
            { text: "Installation", link: "/cli/" },
            { text: "Agent Commands", link: "/cli/agent" },
            { text: "Service Commands", link: "/cli/service" },
            { text: "Key Management", link: "/cli/keys" },
            { text: "Search & Resolve", link: "/cli/search" }
          ]
        },
        {
          text: "Platform",
          items: [
            { text: "Dashboard", link: "/platform/dashboard" }
          ]
        },
        {
          text: "n8n Nodes",
          items: [
            { text: "Overview & Installation", link: "/n8n-nodes/" },
            { text: "Node Reference", link: "/n8n-nodes/node-reference" },
            { text: "Building a Paid Workflow", link: "/n8n-nodes/building-paid-workflow" }
          ]
        },
        {
          text: "Python SDK",
          items: [
            { text: "Installation & Core Concepts", link: "/python-sdk/" },
            { text: "Examples", link: "/python-sdk/examples" },
            { text: "API Reference", link: "/python-sdk/api-reference" }
          ]
        }
      ],
      socialLinks: [
        { icon: "github", link: "https://github.com/zyndai" },
        { icon: "x", link: "https://x.com/ZyndAI" },
        { icon: "youtube", link: "https://www.youtube.com/@ZyndAINetwork" }
      ],
      search: {
        provider: "local"
      },
      editLink: {
        pattern: "https://github.com/zyndai/zyndai-agent/edit/main/docs/:path",
        text: "Edit this page on GitHub"
      },
      footer: {
        message: "Released under the MIT License.",
        copyright: "Copyright \xA9 2024-present Zynd AI"
      }
    },
    mermaid: {}
  })
);
export {
  config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLnZpdGVwcmVzcy9jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvdmlnaWxhbnQtZnVubnktc2FnYW4vbW50L2RvY3MvLnZpdGVwcmVzc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL3ZpZ2lsYW50LWZ1bm55LXNhZ2FuL21udC9kb2NzLy52aXRlcHJlc3MvY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy92aWdpbGFudC1mdW5ueS1zYWdhbi9tbnQvZG9jcy8udml0ZXByZXNzL2NvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGVwcmVzcydcbmltcG9ydCB7IHdpdGhNZXJtYWlkIH0gZnJvbSAndml0ZXByZXNzLXBsdWdpbi1tZXJtYWlkJ1xuaW1wb3J0IHsgdGFic01hcmtkb3duUGx1Z2luIH0gZnJvbSAndml0ZXByZXNzLXBsdWdpbi10YWJzJ1xuXG5leHBvcnQgZGVmYXVsdCB3aXRoTWVybWFpZChcbiAgZGVmaW5lQ29uZmlnKHtcbiAgICB0aXRsZTogJ1p5bmQgQUknLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQsIGRpc2NvdmVyLCBhbmQgbW9uZXRpemUgQUkgYWdlbnRzIGFuZCBzZXJ2aWNlcyBvbiB0aGUgb3BlbiBaeW5kIG5ldHdvcmsuJyxcblxuICAgIGhlYWQ6IFtcbiAgICAgIFsnbGluaycsIHsgcmVsOiAnaWNvbicsIGhyZWY6ICcvZmF2aWNvbi5pY28nIH1dLFxuICAgIF0sXG5cbiAgICBtYXJrZG93bjoge1xuICAgICAgY29uZmlnKG1kKSB7XG4gICAgICAgIG1kLnVzZSh0YWJzTWFya2Rvd25QbHVnaW4pXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICB0aGVtZUNvbmZpZzoge1xuICAgICAgbG9nbzogJy9sb2dvLnN2ZycsXG5cbiAgICAgIG5hdjogW1xuICAgICAgICB7IHRleHQ6ICdIb21lJywgbGluazogJy8nIH0sXG4gICAgICAgIHsgdGV4dDogJ0Rhc2hib2FyZCcsIGxpbms6ICdodHRwczovL3d3dy56eW5kLmFpJyB9LFxuICAgICAgICB7IHRleHQ6ICdSZWdpc3RyeScsIGxpbms6ICdodHRwczovL3d3dy56eW5kLmFpL3JlZ2lzdHJ5JyB9LFxuICAgICAgXSxcblxuICAgICAgc2lkZWJhcjogW1xuICAgICAgICB7XG4gICAgICAgICAgdGV4dDogJ0ludHJvZHVjdGlvbicsXG4gICAgICAgICAgaXRlbXM6IFtcbiAgICAgICAgICAgIHsgdGV4dDogJ1doYXQgaXMgWnluZCBBSScsIGxpbms6ICcvZ3VpZGUvJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnQXJjaGl0ZWN0dXJlJywgbGluazogJy9ndWlkZS9hcmNoaXRlY3R1cmUnIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdLZXkgQ29uY2VwdHMnLCBsaW5rOiAnL2d1aWRlL2NvbmNlcHRzJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnVmlkZW8gVHV0b3JpYWxzJywgbGluazogJy9ndWlkZS92aWRlby10dXRvcmlhbHMnIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRleHQ6ICdHZXR0aW5nIFN0YXJ0ZWQnLFxuICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICB7IHRleHQ6ICdRdWlja3N0YXJ0JywgbGluazogJy9nZXR0aW5nLXN0YXJ0ZWQvJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnU2V0dGluZyBVcCBNZXRhTWFzaycsIGxpbms6ICcvZ2V0dGluZy1zdGFydGVkL21ldGFtYXNrLXNldHVwJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnR2V0dGluZyBUZXN0bmV0IFRva2VucycsIGxpbms6ICcvZ2V0dGluZy1zdGFydGVkL3Rlc3RuZXQtdG9rZW5zJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnQnVpbGRpbmcgQWdlbnRzJyxcbiAgICAgICAgICBpdGVtczogW1xuICAgICAgICAgICAgeyB0ZXh0OiAnT3ZlcnZpZXcnLCBsaW5rOiAnL2FnZW50cy8nIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdZb3VyIEZpcnN0IEFnZW50JywgbGluazogJy9hZ2VudHMvZmlyc3QtYWdlbnQnIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdGcmFtZXdvcmsgSW50ZWdyYXRpb25zJywgbGluazogJy9hZ2VudHMvZnJhbWV3b3JrcycgfSxcbiAgICAgICAgICAgIHsgdGV4dDogJ0FnZW50IENhcmRzJywgbGluazogJy9hZ2VudHMvYWdlbnQtY2FyZHMnIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdXZWJob29rcyAmIENvbW11bmljYXRpb24nLCBsaW5rOiAnL2FnZW50cy93ZWJob29rcycgfSxcbiAgICAgICAgICAgIHsgdGV4dDogJ0hlYXJ0YmVhdCAmIExpdmVuZXNzJywgbGluazogJy9hZ2VudHMvaGVhcnRiZWF0JyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnQnVpbGRpbmcgU2VydmljZXMnLFxuICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICB7IHRleHQ6ICdPdmVydmlldycsIGxpbms6ICcvc2VydmljZXMvJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnWW91ciBGaXJzdCBTZXJ2aWNlJywgbGluazogJy9zZXJ2aWNlcy9maXJzdC1zZXJ2aWNlJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnQWdlbnQgRE5TIFJlZ2lzdHJ5JyxcbiAgICAgICAgICBpdGVtczogW1xuICAgICAgICAgICAgeyB0ZXh0OiAnSG93IEl0IFdvcmtzJywgbGluazogJy9yZWdpc3RyeS8nIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdSZWdpc3RyYXRpb24nLCBsaW5rOiAnL3JlZ2lzdHJ5L3JlZ2lzdHJhdGlvbicgfSxcbiAgICAgICAgICAgIHsgdGV4dDogJ1NlYXJjaCAmIERpc2NvdmVyeScsIGxpbms6ICcvcmVnaXN0cnkvc2VhcmNoJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnWnluZCBOYW1pbmcgU2VydmljZSAoWk5TKScsIGxpbms6ICcvcmVnaXN0cnkvem5zJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnTWVzaCBOZXR3b3JrJywgbGluazogJy9yZWdpc3RyeS9tZXNoJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnSWRlbnRpdHkgJiBTZWN1cml0eScsXG4gICAgICAgICAgaXRlbXM6IFtcbiAgICAgICAgICAgIHsgdGV4dDogJ0VkMjU1MTkgSWRlbnRpdHknLCBsaW5rOiAnL2lkZW50aXR5LycgfSxcbiAgICAgICAgICAgIHsgdGV4dDogJ0hEIEtleSBEZXJpdmF0aW9uJywgbGluazogJy9pZGVudGl0eS9oZC1rZXlzJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAneDQwMiBNaWNyb3BheW1lbnRzJywgbGluazogJy9pZGVudGl0eS9wYXltZW50cycgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dDogJ0NMSSBSZWZlcmVuY2UnLFxuICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICB7IHRleHQ6ICdJbnN0YWxsYXRpb24nLCBsaW5rOiAnL2NsaS8nIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdBZ2VudCBDb21tYW5kcycsIGxpbms6ICcvY2xpL2FnZW50JyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnU2VydmljZSBDb21tYW5kcycsIGxpbms6ICcvY2xpL3NlcnZpY2UnIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdLZXkgTWFuYWdlbWVudCcsIGxpbms6ICcvY2xpL2tleXMnIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdTZWFyY2ggJiBSZXNvbHZlJywgbGluazogJy9jbGkvc2VhcmNoJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnUGxhdGZvcm0nLFxuICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICB7IHRleHQ6ICdEYXNoYm9hcmQnLCBsaW5rOiAnL3BsYXRmb3JtL2Rhc2hib2FyZCcgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dDogJ244biBOb2RlcycsXG4gICAgICAgICAgaXRlbXM6IFtcbiAgICAgICAgICAgIHsgdGV4dDogJ092ZXJ2aWV3ICYgSW5zdGFsbGF0aW9uJywgbGluazogJy9uOG4tbm9kZXMvJyB9LFxuICAgICAgICAgICAgeyB0ZXh0OiAnTm9kZSBSZWZlcmVuY2UnLCBsaW5rOiAnL244bi1ub2Rlcy9ub2RlLXJlZmVyZW5jZScgfSxcbiAgICAgICAgICAgIHsgdGV4dDogJ0J1aWxkaW5nIGEgUGFpZCBXb3JrZmxvdycsIGxpbms6ICcvbjhuLW5vZGVzL2J1aWxkaW5nLXBhaWQtd29ya2Zsb3cnIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRleHQ6ICdQeXRob24gU0RLJyxcbiAgICAgICAgICBpdGVtczogW1xuICAgICAgICAgICAgeyB0ZXh0OiAnSW5zdGFsbGF0aW9uICYgQ29yZSBDb25jZXB0cycsIGxpbms6ICcvcHl0aG9uLXNkay8nIH0sXG4gICAgICAgICAgICB7IHRleHQ6ICdFeGFtcGxlcycsIGxpbms6ICcvcHl0aG9uLXNkay9leGFtcGxlcycgfSxcbiAgICAgICAgICAgIHsgdGV4dDogJ0FQSSBSZWZlcmVuY2UnLCBsaW5rOiAnL3B5dGhvbi1zZGsvYXBpLXJlZmVyZW5jZScgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcblxuICAgICAgc29jaWFsTGlua3M6IFtcbiAgICAgICAgeyBpY29uOiAnZ2l0aHViJywgbGluazogJ2h0dHBzOi8vZ2l0aHViLmNvbS96eW5kYWknIH0sXG4gICAgICAgIHsgaWNvbjogJ3gnLCBsaW5rOiAnaHR0cHM6Ly94LmNvbS9aeW5kQUknIH0sXG4gICAgICAgIHsgaWNvbjogJ3lvdXR1YmUnLCBsaW5rOiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vQFp5bmRBSU5ldHdvcmsnIH0sXG4gICAgICBdLFxuXG4gICAgICBzZWFyY2g6IHtcbiAgICAgICAgcHJvdmlkZXI6ICdsb2NhbCcsXG4gICAgICB9LFxuXG4gICAgICBlZGl0TGluazoge1xuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9naXRodWIuY29tL3p5bmRhaS96eW5kYWktYWdlbnQvZWRpdC9tYWluL2RvY3MvOnBhdGgnLFxuICAgICAgICB0ZXh0OiAnRWRpdCB0aGlzIHBhZ2Ugb24gR2l0SHViJyxcbiAgICAgIH0sXG5cbiAgICAgIGZvb3Rlcjoge1xuICAgICAgICBtZXNzYWdlOiAnUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLicsXG4gICAgICAgIGNvcHlyaWdodDogJ0NvcHlyaWdodCBcdTAwQTkgMjAyNC1wcmVzZW50IFp5bmQgQUknLFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgbWVybWFpZDoge30sXG4gIH0pXG4pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThULFNBQVMsb0JBQW9CO0FBQzNWLFNBQVMsbUJBQW1CO0FBQzVCLFNBQVMsMEJBQTBCO0FBRW5DLElBQU8saUJBQVE7QUFBQSxFQUNiLGFBQWE7QUFBQSxJQUNYLE9BQU87QUFBQSxJQUNQLGFBQWE7QUFBQSxJQUViLE1BQU07QUFBQSxNQUNKLENBQUMsUUFBUSxFQUFFLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQztBQUFBLElBQ2hEO0FBQUEsSUFFQSxVQUFVO0FBQUEsTUFDUixPQUFPLElBQUk7QUFDVCxX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
