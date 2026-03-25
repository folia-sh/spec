# Map Components

Components are elements that float on the map canvas. They are **anchored** to a corner or edge of the map, not placed in the grid layout. Components live inside a map content item under the `components:` block.

*Decided in [ADR-0015](/decisions/#adr-0015) D4.*

## Placement

Components are defined inside a `type: map` content item:

```yaml
content:
  - type: map
    position: [0, 0, 2, 2]
    components:
      - type: legend
        anchor: bottom-right
      - type: controls
        anchor: top-left
        items: [...]
      - type: scale-bar
        anchor: bottom-left
      - type: coordinates
        anchor: bottom-left
        offset: [0, 24]
```

## Anchor Positions

Anchors place components relative to the map canvas edges:

```
top-left       top-center       top-right
 +--------------------------------------+
 |                                      |
 |                                      |
 |            map canvas                |
 |                                      |
 |                                      |
 +--------------------------------------+
bottom-left  bottom-center  bottom-right
```

Multiple components at the same anchor **MUST** stack vertically. Use `offset: [x, y]` for fine-tuning position in pixels.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anchor` | enum | **MUST** | `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right` |
| `offset` | [x, y] | **MAY** | Pixel offset from the anchor position |

## Component Types

### `legend`

Auto-generates from layer styles. Displays color ramps, category swatches, and symbol keys for visible layers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anchor` | enum | **MUST** | Anchor position on the map canvas |
| `layers` | list | **MAY** | Restrict legend to specific layers. Defaults to all visible layers with meaningful symbology. |
| `collapsed` | boolean | **MAY** | Start collapsed or expanded. Defaults to `false` (expanded). |

```yaml
- type: legend
  anchor: bottom-right
  layers:
    - terrain/slope
    - land-cover/nlcd
  collapsed: false
```

### `controls`

Interactive sliders, dropdowns, and toggles bound to view parameters. When a control changes, any content item or layer referencing that parameter **MUST** re-render.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anchor` | enum | **MUST** | Anchor position on the map canvas |
| `items` | list | **MUST** | List of control definitions |

#### Control Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **MUST** | Unique identifier for this control |
| `control` | enum | **MUST** | `slider`, `dropdown`, `multi-select` |
| `label` | string | **MUST** | Display label |
| `min` | number | **MAY** | Minimum value (for `slider`) |
| `max` | number | **MAY** | Maximum value (for `slider`) |
| `step` | number | **MAY** | Step increment (for `slider`) |
| `default` | any | **MAY** | Default value |
| `options` | list | **MAY** | Available choices (for `dropdown`, `multi-select`). Each item: string or `{ value, label }`. |
| `bind` | string | **MUST** | Parameter path to bind to, e.g., `params.slope_threshold` |

```yaml
- type: controls
  anchor: top-left
  items:
    - id: slope_threshold
      control: slider
      label: Min Slope (degrees)
      min: 0
      max: 60
      step: 1
      default: 30
      bind: params.slope_threshold

    - id: aspect_filter
      control: multi-select
      label: Aspects
      options: [N, NE, E, SE, S, SW, W, NW]
      default: [N, NE, NW]
      bind: params.aspect_filter

    - id: basemap
      control: dropdown
      label: Basemap
      options:
        - { value: terrain, label: Terrain }
        - { value: satellite, label: Satellite }
        - { value: dark, label: Dark }
      default: terrain
      bind: params.basemap
```

### `minimap`

Small overview map showing the current map extent as a rectangle.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `width` | number | **MAY** | Width in pixels. Defaults to `150`. |
| `height` | number | **MAY** | Height in pixels. Defaults to `100`. |
| `style` | string | **MAY** | Basemap style for the minimap |

```yaml
- type: minimap
  anchor: bottom-left
  width: 150
  height: 100
  style: light
```

### `scale-bar`

Distance scale indicator that updates as the user zooms.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anchor` | enum | **MUST** | Anchor position on the map canvas |
| `units` | enum | **MAY** | `metric`, `imperial`, or `both`. Defaults to `metric`. |

```yaml
- type: scale-bar
  anchor: bottom-left
  units: metric
```

### `compass`

North arrow that rotates with the map bearing.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anchor` | enum | **MUST** | Anchor position on the map canvas |

```yaml
- type: compass
  anchor: top-right
```

### `coordinates`

Displays the cursor's latitude and longitude as the user moves the mouse over the map.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anchor` | enum | **MUST** | Anchor position on the map canvas |

```yaml
- type: coordinates
  anchor: bottom-left
```

### `stat-card`

A single metric displayed on the map canvas. Same fields as the view-level [stat-card content type](./content#stat-card--single-metric), but anchored to the map instead of placed in the grid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anchor` | enum | **MUST** | Anchor position on the map canvas |
| `title` | string | **MUST** | Metric label |
| `value` | string | **MUST** | Layer path providing the metric |
| `field` | string | **MUST** | Field name within the layer to display |
| `format` | enum | **MAY** | `area_ha`, `area_km2`, `percent`, `number`, `degrees`, `currency_usd` |

```yaml
- type: stat-card
  anchor: top-right
  title: "Mean Slope"
  value: analysis/mean_slope
  field: mean_degrees
  format: degrees
```

## Dual Placement

Some types (`stat-card`, `controls`) can appear as **either** view content (placed in a dashboard grid with `position:`) or a component (anchored to a map canvas). The data binding is identical; only the placement context differs.

```yaml
# As view content in a dashboard grid
content:
  - type: stat-card
    position: [2, 0, 1, 1]
    title: "Mean Slope"
    value: analysis/mean_slope
    field: mean_degrees
    format: degrees

# As a map component
content:
  - type: map
    position: [0, 0, 2, 2]
    components:
      - type: stat-card
        anchor: top-right
        title: "Mean Slope"
        value: analysis/mean_slope
        field: mean_degrees
        format: degrees
```

## Complete Example

A map with multiple components:

```yaml
content:
  - type: map
    position: [0, 0, 3, 2]
    map:
      engine: maplibre
      style: terrain
      center: [-111.6, 40.6]
      zoom: 12
    layers: [terrain/slope, boundaries/counties]
    components:
      - type: legend
        anchor: bottom-right
        collapsed: false

      - type: controls
        anchor: top-left
        items:
          - id: slope_threshold
            control: slider
            label: Min Slope
            min: 0
            max: 60
            step: 1
            default: 30
            bind: params.slope_threshold

      - type: scale-bar
        anchor: bottom-left
        units: metric

      - type: coordinates
        anchor: bottom-left
        offset: [0, 24]

      - type: compass
        anchor: top-right

      - type: stat-card
        anchor: top-right
        offset: [0, 40]
        title: "Avg Slope"
        value: analysis/mean_slope
        field: mean_degrees
        format: degrees
```
