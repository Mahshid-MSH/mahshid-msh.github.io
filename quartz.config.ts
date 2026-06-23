import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Digital Notes",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "mahshid-msh.github.io",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#f8f9fa",         // Clean off-white
          lightgray: "#e5e7eb",
          gray: "#9ca3af",
          darkgray: "#4b5563",
          dark: "#1f2937",
          secondary: "#0d9488",     // Muted teal for light mode readability
          tertiary: "#0f766e",
          highlight: "rgba(13, 148, 136, 0.15)",
        },
        darkMode: {
          light: "#0d1117",         // Deep slate background (prevents high-contrast eye burn)
          lightgray: "#21262d",     // Very subtle borders that fade into the background
          gray: "#484f58",          // Graph nodes and structural lines
          darkgray: "#8b949e",      // Soft slate-gray body text for long-form reading
          dark: "#c9d1d9",          // Crisp, muted white for headers to stand out cleanly
          secondary: "#3fb950",     // Professional terminal green (distinct, readable, not blinding)
          tertiary: "#2ea043",      // Deeper green for hover effects and visited nodes
          highlight: "rgba(63, 185, 80, 0.15)", // Gentle green highlight for internal links
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
