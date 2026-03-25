# Views

A workspace defines a pool of layers and a list of **views**. Each view is a tab with its own layout, layer selection, and content. Switching tabs changes the main content area; workspace chrome (sidebar panels, terminal, agent chat) persists across tab switches.

*Decided in [ADR-0015](/decisions/#adr-0015) D3 and D6.*

## Terminology

Four terms replace the retired "widget" concept:

| Term | What it is | Where it lives | Lifetime |
|------|-----------|---------------|----------|
| **View content** | Maps, charts, tables, stat-cards arranged in a layout | `views[].content:` in folia.yaml | Changes with active tab |
| **Components** | Elements floating on a map canvas (legend, scale-bar) | `components:` inside a map content item | Lives with its map |
| **Interactions** | Event-driven behaviors per-layer (popup, highlight, cross-filter) | `interactions:` inside a map content item | Triggered by user action |
| **Panels** | Workspace chrome (layers, catalog, terminal) | Workbench IDE, mode presets | Persists across view tabs |

Panels are **not** defined in `folia.yaml`. They are part of the workbench IDE, configured by workspace mode presets. See the workbench layout documentation.

## View Definition

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **MUST** | Unique name for the view, displayed as the tab label |
| `layout` | enum | **MUST** | One of `full-map`, `split`, `dashboard`, `grid` |

### Optional Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | **MAY** | Human-readable description of the view's purpose |
| `layers` | list | **MAY** | Subset of workspace layers visible in this view. Defaults to all workspace layers if omitted. |
| `map` | object | **MAY** | Camera state: `engine`, `style`, `center`, `zoom`, `pitch`, `bearing`, `bounds` |
| `grid` | object | **MAY** | Grid configuration for `dashboard` and `grid` layouts |
| `split` | object | **MAY** | Split configuration for `split` layout |
| `content` | list | **MAY** | View content items (maps, charts, tables, stat-cards, forms, info-panels) |
| `params` | object | **MAY** | Named parameters that content items and interactions can reference |

## Default View

If `views:` is omitted from `folia.yaml`, the platform **MUST** auto-generate a default view:

- Layout: `full-map`
- Layers: all workspace layers
- Content: a single map with a legend component

This ensures every workspace is immediately viewable without explicit view configuration.

## Examples

### Single View

A minimal workspace with one view showing terrain data:

```yaml
layers:
  elevation:
    uri: https://data.folia.sh/@usgs/3dep/wasatch-10m.tif
    type: raster
  slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: elevation }
    style:
      palette: viridis
      rescale: "0,60"

views:
  - name: Terrain
    layout: full-map
    layers: [slope]
    content:
      - type: map
        components:
          - type: legend
            anchor: bottom-right
          - type: scale-bar
            anchor: bottom-left
```

### Multi-View

Two tabs showing different perspectives on the same layer pool. The terrain analyst sees slope maps and statistics; the land manager sees land cover with county boundaries.

```yaml
layers:
  terrain/elevation:
    uri: commons/usgs/3dep/10m
    type: raster
  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: terrain/elevation }
    style:
      palette: avalanche
  land-cover/nlcd:
    uri: catalog://mrlc/nlcd/2021
    type: raster
  boundaries/counties:
    uri: file://data/counties.gpkg
    type: vector

views:
  - name: Terrain Analysis
    layout: dashboard
    grid: { columns: 3, rows: 2 }
    layers: [terrain/elevation, terrain/slope]
    content:
      - type: map
        position: [0, 0, 2, 2]
        components:
          - type: legend
            anchor: bottom-right
      - type: chart
        position: [2, 0, 1, 1]
        chartType: histogram
        data: terrain/slope
        title: Slope Distribution
      - type: stat-card
        position: [2, 1, 1, 1]
        title: "Mean Slope"
        value: terrain/slope
        field: mean_slope
        format: degrees

  - name: Land Cover
    layout: full-map
    layers: [land-cover/nlcd, boundaries/counties]
    map:
      center: [-111.8, 40.7]
      zoom: 10
    content:
      - type: map
        interactions:
          boundaries/counties:
            click: popup
            hover: highlight
        components:
          - type: legend
            anchor: bottom-right
```

## Key Properties

- **Layers are a workspace-level pool.** Views select subsets via `layers:`. If a view omits `layers:`, all workspace layers are available.
- **Each view has its own layout** (`full-map`, `split`, `dashboard`, `grid`). See [Layouts](./layouts).
- **Each view has independent map state.** Navigating in one tab does not affect another.
- **View-level layer style overrides** can change styling without affecting the layer's `style:` block or other views. Resolution order (most specific wins):

```
View content item style: { ... }    (most specific)
    falls back to
Layer style: block                  (layer defaults)
    falls back to
Op view hints (ADR-0009)            (from op YAML)
    falls back to
Type-based defaults                 (raster -> viridis, vector -> blue fill)
```

- **Views are rendered as tabs** in the workbench's `PanelTabs` node (see the workbench layout documentation).
- **Split/comparison is ONE view** with multiple map content items and `syncMaps: true`, not multiple tabs.
- **`content:` describes the view's layout items.** These exist only within their view tab. They are not workspace panels.
