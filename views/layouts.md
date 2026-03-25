# Layout Types

Layouts define the spatial arrangement of content items within a view tab. Every view **MUST** declare a `layout` field. Four layout types are supported.

*Decided in [ADR-0015](/decisions/#adr-0015) D3.*

## `full-map`

A single map fills the entire view area. Components (legend, controls, scale-bar) float on top of the map canvas. This is the simplest layout and the default when auto-generating a view.

```yaml
layout: full-map
```

Content items in a `full-map` layout **SHOULD** be limited to a single `map` item. Additional content (stat-cards, controls) **MAY** appear as components anchored to the map canvas.

### Example

```yaml
views:
  - name: Slope Explorer
    layout: full-map
    map:
      engine: maplibre
      style: terrain
      center: [-111.6, 40.6]
      zoom: 13
    layers: [terrain/slope]
    content:
      - type: map
        components:
          - type: legend
            anchor: bottom-right
          - type: scale-bar
            anchor: bottom-left
          - type: controls
            anchor: top-left
            items:
              - id: opacity
                control: slider
                label: Opacity
                min: 0
                max: 1
                step: 0.1
                default: 0.8
                bind: params.opacity
```

## `split`

A map alongside a secondary content area. The secondary area holds charts, tables, forms, or other content items.

```yaml
layout: split
split:
  direction: horizontal  # or vertical
  ratio: [0.65, 0.35]
```

### Split Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | enum | **MUST** | `horizontal` (side-by-side) or `vertical` (top-bottom) |
| `ratio` | [number, number] | **SHOULD** | Proportional sizes of primary and secondary areas. Defaults to `[0.6, 0.4]`. |

Content items **MUST** declare `area: primary` (map side) or `area: secondary` (content side). Items without an `area` field default to `primary`.

### Example

```yaml
views:
  - name: Slope with Statistics
    layout: split
    split:
      direction: horizontal
      ratio: [0.65, 0.35]
    layers: [terrain/slope, slide-paths/wasatch]
    content:
      - type: map
        area: primary
        components:
          - type: legend
            anchor: bottom-right
      - type: table
        area: secondary
        title: Slope Statistics by Zone
        data: analysis/zonal_slope_stats
        columns:
          - { field: zone_name, label: Zone }
          - { field: mean_slope, label: "Mean Slope", format: degrees }
          - { field: max_slope, label: "Max Slope", format: degrees }
          - { field: area_km2, label: "Area", format: area_km2 }
        sortBy: mean_slope
        sortOrder: desc
```

## `dashboard`

A grid of mixed content types. Each content item is positioned in the grid using `position: [col, row, colSpan, rowSpan]`.

```yaml
layout: dashboard
grid:
  columns: 3
  rows: 2
  gap: 8
```

### Grid Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columns` | number | **MUST** | Number of grid columns |
| `rows` | number | **MUST** | Number of grid rows |
| `gap` | number | **MAY** | Pixels between grid cells. Defaults to `8`. |

Each content item **MUST** declare `position: [col, row, colSpan, rowSpan]` where `col` and `row` are zero-indexed.

### Example

A complete dashboard with map, charts, stat-cards, and a table:

```yaml
views:
  - name: Terrain Dashboard
    layout: dashboard
    grid:
      columns: 4
      rows: 3
      gap: 8
    layers: [terrain/slope, slide-paths/wasatch]
    content:
      - type: map
        position: [0, 0, 2, 2]
        layers: [terrain/slope]
        components:
          - type: legend
            anchor: bottom-right

      - type: stat-card
        position: [2, 0, 1, 1]
        title: Area > 35 deg
        value: analysis/steep_terrain_area
        format: area_km2
        icon: mountain

      - type: stat-card
        position: [3, 0, 1, 1]
        title: Avg Slope
        value: analysis/mean_slope
        format: degrees
        icon: trending-up

      - type: chart
        position: [2, 1, 2, 1]
        chartType: histogram
        title: Slope Distribution
        data: analysis/slope_histogram
        xAxis: { field: slope_bin, label: "Slope (degrees)" }
        yAxis: { field: count, label: "Pixel Count" }
        color: "#e74c3c"

      - type: table
        position: [0, 2, 4, 1]
        title: Avalanche Paths
        data: slide-paths/wasatch
        columns:
          - { field: name, label: Name, width: 200 }
          - { field: aspect, label: Aspect }
          - { field: start_elevation, label: "Start Elev (m)", format: number }
          - { field: vertical_drop, label: "Vert Drop (m)", format: number }
          - { field: area_ha, label: "Area", format: area_ha }
        sortBy: vertical_drop
        sortOrder: desc
        pageSize: 10
```

## `grid`

Equal-sized grid of maps for side-by-side comparison. Each cell contains a map content item. Maps **MAY** be synchronized so that panning or zooming one map updates all others.

```yaml
layout: grid
grid:
  columns: 2
  rows: 2
  syncMaps: true
```

### Grid Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columns` | number | **MUST** | Number of grid columns |
| `rows` | number | **MAY** | Number of grid rows. Defaults to `1`. |
| `syncMaps` | boolean | **MAY** | When `true`, camera state is linked across all maps. Defaults to `false`. |

Content items in a `grid` layout **SHOULD** all be `type: map`. Each map item **SHOULD** include a `label` field for identification.

### Example

```yaml
views:
  - name: Terrain Comparison
    layout: grid
    grid:
      columns: 2
      rows: 2
      syncMaps: true
    content:
      - type: map
        label: Slope Angle
        layers: [terrain/slope]
        style:
          terrain/slope: { palette: avalanche }

      - type: map
        label: Aspect
        layers: [terrain/aspect]
        style:
          terrain/aspect: { palette: aspect_standard }

      - type: map
        label: Hillshade
        layers: [terrain/hillshade]
        style:
          terrain/hillshade: { opacity: 0.6 }

      - type: map
        label: Satellite
        map: { engine: mapbox, style: satellite }
        layers: [terrain/slope]
        style:
          terrain/slope: { opacity: 0.4, palette: avalanche }
```

## Layout Interaction

### Drag-to-Rearrange

Content items **MAY** be reordered by dragging in `dashboard` layouts. The YAML `position:` field **MUST** update to match the new arrangement.

### Responsive Breakpoints

On smaller screens:
- `dashboard` grids **SHOULD** collapse to a single column
- `split` layouts **SHOULD** stack vertically
- `grid` layouts **SHOULD** reduce columns

### Bi-Directional YAML Sync

GUI changes **MUST** be reflected in the YAML, and YAML edits **MUST** update the GUI in real-time.

| GUI Action | YAML Field Updated |
|------------|--------------------|
| Pan/zoom map | `views[n].map.center`, `views[n].map.zoom` |
| Change layer opacity | `content[n].style.opacity` or layer `style.opacity` |
| Toggle layer visibility | View layer list or `visible` flag |
| Move slider control | `views[n].params.{param_name}` |
| Resize split area | `views[n].split.ratio` |
| Drag content item | `content[n].position` |
