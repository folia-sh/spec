import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'folia spec',
  description: 'The declarative geospatial platform specification',
  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'folia spec',

    nav: [
      { text: 'Spec', link: '/core/workspace' },
      { text: 'Operations', link: '/operations/' },
      { text: 'Use Cases', link: '/use-cases/' },
      {
        text: 'Glossary',
        items: [
          { text: 'Layer', link: '/reference/glossary#layer' },
          { text: 'Operation', link: '/reference/glossary#operation' },
          { text: 'Domain', link: '/reference/glossary#domain' },
          { text: 'View', link: '/reference/glossary#view' },
          { text: 'Compute Block', link: '/reference/glossary#compute-block' },
          { text: 'Engine', link: '/reference/glossary#engine' },
          { text: 'Backend', link: '/reference/glossary#backend' },
          { text: 'Style', link: '/reference/glossary#style' },
          { text: 'Full Glossary →', link: '/reference/glossary' },
        ],
      },
      {
        text: 'Links',
        items: [
          { text: 'Catalog (data.folia.sh)', link: 'https://data.folia.sh' },
          { text: 'GitHub', link: 'https://github.com/nthh/folia' },
        ],
      },
    ],

    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Overview', link: '/primer' },
            { text: 'Quick Start', link: '/quickstart' },
          ],
        },
        {
          text: 'Core Spec',
          items: [
            { text: 'Workspace', link: '/core/workspace' },
            { text: 'Layers', link: '/core/layers' },
            { text: 'Data', link: '/core/data' },
            { text: 'Compute', link: '/core/compute' },
            { text: 'Style', link: '/core/style' },
            { text: 'Refresh', link: '/core/refresh' },
          ],
        },
        {
          text: 'Views',
          items: [
            { text: 'Multi-View Model', link: '/views/' },
            { text: 'Layouts', link: '/views/layouts' },
            { text: 'Content Types', link: '/views/content' },
            { text: 'Map Components', link: '/views/components' },
            { text: 'Interactions', link: '/views/interactions' },
          ],
        },
        {
          text: 'Domains',
          items: [
            { text: 'Domain System', link: '/domains/' },
            { text: 'Geo', link: '/domains/geo' },
            { text: 'Tabular', link: '/domains/tabular' },
            { text: 'Temporal', link: '/domains/temporal' },
          ],
        },
        {
          text: 'Operations',
          items: [
            { text: 'Operation Model', link: '/operations/' },
            { text: 'Terrain', link: '/operations/terrain' },
            { text: 'Raster', link: '/operations/raster' },
            { text: 'Vector', link: '/operations/vector' },
            { text: 'Analysis', link: '/operations/analysis' },
            { text: 'Tabular Ops', link: '/operations/tabular' },
            { text: 'Temporal Ops', link: '/operations/temporal' },
          ],
        },
        {
          text: 'Catalog',
          items: [
            { text: 'Namespaces', link: '/catalog/namespaces' },
            { text: 'Publishing', link: '/catalog/publishing' },
          ],
        },
        {
          text: 'Use Cases',
          items: [
            { text: 'Overview', link: '/use-cases/' },
            { text: 'Terrain Analysis', link: '/use-cases/terrain-analysis' },
            { text: 'Change Detection', link: '/use-cases/change-detection' },
            { text: 'Weighted Overlay', link: '/use-cases/weighted-overlay' },
            { text: 'Benchmarks (CBGB)', link: '/use-cases/benchmarks' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Glossary', link: '/reference/glossary' },
            { text: 'YAML Schema', link: '/reference/schema' },
            { text: 'Decision Records', link: '/decisions/' },
          ],
        },
      ],
    },

    search: { provider: 'local' },

    outline: { level: [2, 3] },

    editLink: {
      pattern: 'https://github.com/nthh/folia/edit/main/spec/:path',
      text: 'Edit this page',
    },

    footer: {
      message: 'Licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">CC-BY-4.0</a>',
      copyright: '© 2026 folia contributors',
    },
  },
})
