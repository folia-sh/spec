# YAML Schema Reference

The complete `folia.yaml` schema. This is the single source of truth for workspace definition.

*Decided in [ADR-0001](/decisions/#adr-0001) - unified layer abstraction.*
*Decided in [ADR-0005](/decisions/#adr-0005) - DATA + COMPUTE + STYLE. `op:`/`engine:`/`steps:` mutually exclusive.*
*Decided in [ADR-0015](/decisions/#adr-0015) - views at workspace level, style on layers.*

## Full Schema

```yaml
# folia.yaml - complete schema

# ── Workspace Identity ──────────────────────────────────
name: string                    # required for publishing
version: string                 # required for publishing
description: string
author: string                  # required for publishing
license: string                 # SPDX identifier (e.g., MIT, CC-BY-4.0)

# ── Settings ────────────────────────────────────────────
settings:
  default_bbox: [number x 4]   # [west, south, east, north] in EPSG:4326
  default_crs: string           # e.g., EPSG:4326, EPSG:32612

# ── Layers ──────────────────────────────────────────────
layers:
  <path>:                       # slash-delimited path (e.g., source/dem, terrain/slope)

    # Data
    uri: string                 # data source - OR ref (mutually exclusive)
    ref: string                 # catalog reference - OR uri (mutually exclusive)
    type: raster | vector | api | computed | table

    description: string

    # Compute (three modes, mutually exclusive)
    compute:
      op: string                # registered operation (e.g., terrain_slope)
      engine: sql | python      # inline engine mode
      steps: [...]              # multi-stage pipeline mode

      # Inputs (for op and steps modes)
      inputs:
        <name>:
          layer: string         # reference to another layer path

      # Parameters
      params:
        <name>: value           # operation-specific parameters

      # External compute override
      backend: string           # external compute platform (e.g., gee)

      # Engine-specific fields
      query: string             # SQL query (engine: sql)
      module: string            # Python module (engine: python)
      function: string          # Python function (engine: python)

    # Style
    style:
      palette: string           # named palette (e.g., viridis, terrain, ndvi)
      opacity: number           # 0.0 to 1.0
      colorRamp:                # custom color ramp
        - value: number
          color: string         # CSS color
      rescale: string           # value range as "min,max"
      renderer: string          # rendering engine (e.g., maplibre)

      # Info popup
      info:
        fields: [string]        # fields to show on click
        format: string          # format string (e.g., "{value}°")
        section: string         # grouping label

      # Table display
      table:
        renderer: string        # e.g., tanstack-table
        columns:
          - field: string       # column key
            label: string       # display label
            format: string      # number format (e.g., ".2f", "$,.0f")
        sortBy: string
        sortOrder: asc | desc

      # Interactive form controls
      form:
        fields:
          - name: string
            type: slider | dropdown | text | toggle | date
            label: string
            min: number         # slider
            max: number         # slider
            step: number        # slider
            default: any
            options: [...]      # dropdown

      # Chart display
      chart:
        renderer: string        # e.g., observable-plot
        type: bar | line | area | scatter | histogram
        x: string               # x-axis field
        y: string               # y-axis field

    # Refresh strategy
    refresh: manual | schedule(cron) | poll(seconds) | stream | webhook

    # Resolution constraint
    resolution: string

    # Authentication
    auth:
      type: string              # e.g., api_key, oauth2
      secret_ref: string        # reference to secret store

    # Domain extensions
    geo:
      bbox: [number x 4]       # [west, south, east, north]
      crs: string               # coordinate reference system
      query_method: spatial_lookup | point_sample | nearest

    tabular:
      key_column: string
      index: [string]
      column_types:
        <column>: string

    temporal:
      time_column: string
      frequency: string         # 1h, 1D, 1W, 1M
      timezone: string          # e.g., UTC, America/Denver
      range:
        start: string           # ISO 8601
        end: string             # ISO 8601
      gaps: string

    # Metadata
    tags: [string]

# ── Views ───────────────────────────────────────────────
views:
  - name: string                # view name (shown as tab)
    description: string
    layout: full-map | split | dashboard | grid

    # Layer visibility
    layers: [string]            # layer paths visible in this view

    # Map configuration
    map:
      center: [number, number]  # [longitude, latitude]
      zoom: number
      bearing: number
      pitch: number
      engine: string            # e.g., maplibre
      style: string             # base map style URL

    # Grid layout
    grid:
      columns: number
      rows: number
      gap: string               # CSS gap (e.g., "8px")
      syncMaps: boolean         # synchronize map pan/zoom across cells

    # Split layout
    split:
      direction: horizontal | vertical
      ratio: [number, number]   # e.g., [1, 1] for equal split

    # Content components
    content:
      - type: map | chart | table | stat-card | form | info-panel
        # ... content-type-specific fields
        layer: string           # layer this component renders
        layers: [string]        # multiple layers (for map)
        title: string
        position: string        # grid position or panel slot

    # View-level parameters
    params:
      <name>: value
```

## Property Reference

### Workspace-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | For publish | URL-safe workspace identifier |
| `version` | string | For publish | Semantic version |
| `description` | string | No | Human-readable description |
| `author` | string | For publish | Author or organization |
| `license` | string | No | SPDX license identifier |

### Settings

| Field | Type | Required | Description |
|---|---|---|---|
| `default_bbox` | `[w, s, e, n]` | No | Default spatial extent in EPSG:4326 |
| `default_crs` | string | No | Default coordinate reference system |

### Layer Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `uri` | string | One of `uri`/`ref` | Data source URI |
| `ref` | string | One of `uri`/`ref` | Catalog reference (`@source/...` or `#concept/...`) |
| `type` | string | Yes | `raster`, `vector`, `api`, `computed`, `table` |
| `description` | string | No | What this layer represents |
| `compute` | object | No | How derived values are produced |
| `style` | object | No | How results are displayed |
| `refresh` | string | No | Data freshness strategy |
| `resolution` | string | No | Spatial or temporal resolution constraint |
| `auth` | object | No | Authentication for protected sources |
| `geo` | object | No | Geospatial metadata (geo domain extension) |
| `tabular` | object | No | Tabular metadata (tabular domain extension) |
| `temporal` | object | No | Temporal metadata (temporal domain extension) |
| `tags` | `[string]` | No | Metadata tags for discovery |

### Compute Block

| Field | Type | Required | Description |
|---|---|---|---|
| `op` | string | Exclusive | Registered operation ID |
| `engine` | string | Exclusive | `sql` or `python` |
| `steps` | list | Exclusive | Multi-stage pipeline |
| `inputs` | object | No | Named input references (`{ <name>: { layer: <path> } }`) |
| `params` | object | No | Operation parameters |
| `backend` | string | No | External compute override (e.g., `gee`). Rarely needed. |
| `query` | string | No | SQL query (when `engine: sql`) |
| `module` | string | No | Python module (when `engine: python`) |
| `function` | string | No | Python function (when `engine: python`) |

::: warning Mutual Exclusivity
`op`, `engine`, and `steps` are mutually exclusive. A compute block MUST use exactly one of these three modes.
:::

### View Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | View name (displayed as tab label) |
| `description` | string | No | What this view shows |
| `layout` | string | No | Layout mode: `full-map`, `split`, `dashboard`, `grid` |
| `layers` | `[string]` | No | Layer paths visible in this view |
| `map` | object | No | Map configuration (center, zoom, style) |
| `grid` | object | No | Grid layout configuration |
| `split` | object | No | Split layout configuration |
| `content` | list | No | UI components to render |
| `params` | object | No | View-level parameter overrides |
