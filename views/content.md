# Content Types

View content items are the maps, charts, tables, stat-cards, forms, and info-panels that make up a view's layout. They are defined under `views[].content:` in `folia.yaml`.

Content items are **per-tab**: they exist only within their view. When the user switches tabs, the content changes. This is distinct from workspace panels (layers, terminal, catalog) which persist across tabs.

*Decided in [ADR-0015](/decisions/#adr-0015) D4.*

## `map` - Interactive Map

The primary spatial content type. Renders an interactive map with data layers. Supports nested `components:` for canvas overlays and per-layer `interactions:`.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `map` | object | **MAY** | Map state: `engine`, `style`, `center`, `zoom`, `pitch`, `bearing`, `bounds` |
| `layers` | list | **MAY** | Layer subset for this map. Overrides view-level `layers:`. |
| `style` | object | **MAY** | Per-layer style overrides keyed by layer path |
| `interactions` | object | **MAY** | Per-layer interaction config (see [Interactions](./interactions)) |
| `components` | list | **MAY** | Map canvas components (see [Components](./components)) |
| `label` | string | **MAY** | Label shown in `grid` layouts to identify this map |

When a `map` content item omits `layers:`, it **MUST** inherit the view-level `layers:` list.

### Map State Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `engine` | enum | **MAY** | Map renderer: `maplibre` (default), `mapbox`, `deckgl`, `leaflet` |
| `style` | string | **MAY** | Basemap style name or URL |
| `center` | [lng, lat] | **MAY** | Initial map center |
| `zoom` | number | **MAY** | Initial zoom level |
| `pitch` | number | **MAY** | Camera tilt in degrees (0-85) |
| `bearing` | number | **MAY** | Camera rotation in degrees |
| `bounds` | [w, s, e, n] | **MAY** | Bounding box. Alternative to `center`/`zoom`. |

### Example

```yaml
- type: map
  position: [0, 0, 2, 2]
  map:
    engine: maplibre
    style: terrain
    center: [-111.6, 40.6]
    zoom: 12
    pitch: 45
    bearing: -30
  layers: [terrain/slope, boundaries/counties]
  style:
    terrain/slope: { opacity: 0.7, palette: avalanche }
  interactions:
    terrain/slope:
      click: sample
      hover: value-tooltip
    boundaries/counties:
      click: popup
      hover: highlight
  components:
    - type: legend
      anchor: bottom-right
    - type: scale-bar
      anchor: bottom-left
```

## `chart` - Data Visualization

Renders charts from layer data or analysis results.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chartType` | enum | **MUST** | `bar`, `line`, `scatter`, `histogram`, `pie`, `area` |
| `title` | string | **MAY** | Chart title |
| `data` | string | **MUST** | Layer path providing the data |
| `xAxis` | object | **MUST** (except `pie`) | `{ field, label }` - field name and axis label |
| `yAxis` | object | **MUST** (except `pie`, `histogram`) | `{ field, label }` - field name and axis label |
| `color` | string or object | **MAY** | Fixed color string, or `{ field, map }` for categorical coloring |

### Supported Chart Types

| Type | Use Case | Required Fields |
|------|----------|-----------------|
| `bar` | Category comparison | `xAxis.field`, `yAxis.field` |
| `line` | Time series, trends | `xAxis.field`, `yAxis.field` |
| `scatter` | Correlation | `xAxis.field`, `yAxis.field` |
| `histogram` | Distribution | `xAxis.field` (binned automatically) |
| `pie` | Proportions | `field`, `valueField` |
| `area` | Cumulative trends | `xAxis.field`, `yAxis.field` |

### Example

```yaml
- type: chart
  position: [2, 0, 2, 1]
  chartType: bar
  title: Avalanches by Terrain Class
  data: analysis/terrain_avy_join
  xAxis:
    field: terrain_class
    label: ATES Classification
  yAxis:
    field: avalanche_count
    label: Number of Avalanches
  color:
    field: terrain_class
    map:
      simple: "#4caf50"
      challenging: "#ff9800"
      complex: "#f44336"
```

## `table` - Data Table

Sortable, filterable data grid from vector data or analysis results.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | string | **MUST** | Layer path to render |
| `columns` | list | **MAY** | Column definitions. Each item: `{ field, label, format, width }`. Defaults to all fields. |
| `sortBy` | string | **MAY** | Default sort column field name |
| `sortOrder` | enum | **MAY** | `asc` or `desc`. Defaults to `asc`. |
| `pageSize` | number | **MAY** | Rows per page. Defaults to `25`. |
| `filterable` | boolean | **MAY** | Enable column filter UI. Defaults to `false`. |

### Column Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | string | **MUST** | Attribute field name from the data source |
| `label` | string | **MAY** | Display label. Defaults to `field` name. |
| `format` | string | **MAY** | Format type: `number`, `percent`, `area_ha`, `area_km2`, `degrees`, `currency_usd` |
| `width` | number | **MAY** | Column width in pixels |

### Example

```yaml
- type: table
  position: [0, 2, 4, 1]
  title: SNOTEL Stations
  data: sources/snotel_stations
  columns:
    - { field: name, label: Station, width: 200 }
    - { field: elevation, label: "Elev (ft)", format: number }
    - { field: snow_depth, label: "Depth (in)", format: number }
    - { field: air_temp, label: "Temp (F)", format: number }
  sortBy: snow_depth
  sortOrder: desc
  pageSize: 15
  filterable: true
```

## `stat-card` - Single Metric

Displays a single prominent value with label and optional trend indicator.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **MUST** | Metric label |
| `value` | string | **MUST** | Layer path providing the metric |
| `field` | string | **MUST** | Field name within the layer to display |
| `format` | enum | **MAY** | `area_ha`, `area_km2`, `percent`, `number`, `degrees`, `currency_usd` |
| `precision` | number | **MAY** | Decimal places |
| `icon` | string | **MAY** | Icon name (e.g., `mountain`, `tree`, `trending-up`) |
| `trend` | object | **MAY** | Trend indicator with `value`, `field`, `format`, and `positiveIs` |

### Trend Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | string | **MUST** | Layer path providing the trend metric |
| `field` | string | **MUST** | Field name for the trend value |
| `format` | enum | **MAY** | Format type for the trend value |
| `positiveIs` | enum | **MUST** | `good` or `bad`. Controls color: green for good, red for bad. |

### Example

```yaml
- type: stat-card
  position: [2, 0, 1, 1]
  title: Forest Loss
  value: analysis/forest_loss_total
  field: total_ha
  format: area_ha
  precision: 0
  icon: tree
  trend:
    value: analysis/forest_loss_yoy_change
    field: yoy_percent
    format: percent
    positiveIs: bad
```

A `stat-card` can also appear as a **component** anchored to a map canvas. See [Components](./components).

## `form` - User Input

::: warning Bidirectional Content
Every other content type is read-only: it consumes data and renders it. The `form` content type is **bidirectional** - it renders input controls AND provides parameter values.
:::

Forms change what data **is** (re-execute compute to produce new results). This is different from `controls` components, which change how data **looks** (client-side rendering adjustments).

*Decided in [ADR-0005](/decisions/#adr-0005).*

### Form Field Types

| Type | Renders as | Value type | Additional config |
|------|-----------|------------|-------------------|
| `select` | Dropdown | string | `source` (layer to populate from), `sourceField` |
| `multi-select` | Multi-select | string[] | `source`, `sourceField` |
| `slider` | Range slider | number | `min`, `max`, `step`, `default` |
| `number` | Number input | number | `min`, `max`, `default` |
| `text` | Text input | string | `default`, `placeholder` |
| `date` | Date picker | date | `default`, `min`, `max` |
| `toggle` | Toggle switch | boolean | `default` |

### Form vs Controls

| | `controls` component | `form` content |
|---|---|---|
| **Defined in** | `components:` on a map content item | `content:` in a view layout |
| **Binds to** | `params` in the view | `:param` in a `compute:` block |
| **Scope** | Visual parameters (opacity, filters, thresholds) | Computation inputs (function arguments) |
| **Data flow** | Param changes re-render existing data | Param changes re-execute compute, produce new data |

### Example

```yaml
- type: form
  position: [0, 0, 1, 1]
  title: Pricing Parameters
  fields:
    - name: instance_type
      type: select
      label: Instance Type
      source: cloud_pricing/ec2
      sourceField: instance_type

    - name: hours
      type: slider
      label: Hours / Month
      min: 0
      max: 730
      step: 1
      default: 730

    - name: count
      type: number
      label: Instance Count
      default: 1
      min: 1
      max: 100

    - name: include_reserved
      type: toggle
      label: Include Reserved Pricing
      default: false
```

### Reactivity

When any form field changes, the computed layer's `compute.query` **MUST** re-execute with the new parameter values. All content items referencing that layer **MUST** update with the new results. The dependency graph determines which downstream layers also recompute.

## `info-panel` - Aggregated Selection Results

Displays query results from map clicks or row selections, aggregated across all queryable layers. Fields are auto-derived from the layer's type and output schema; optionally overridden by the layer's `style.info:` block.

*Decided in [ADR-0015](/decisions/#adr-0015) D1.*

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trigger` | enum | **MUST** | `map-click` or `row-select` |

### Field Resolution Order

When a user clicks a point on the map, the platform **MUST** query every visible layer that supports sampling/querying (determined by `type:`, not manual declaration). Fields are resolved in this order:

1. **Compute output schema** - if the layer has `compute:`, the op definition declares output fields
2. **Band metadata** - if raster source, bands from source metadata
3. **Attribute table** - if vector source, all fields
4. **`style.info.fields` override** - restricts or customizes the auto-derived fields

Results **SHOULD** be grouped by `style.info.section` if specified on the layer.

### Example

```yaml
- type: info-panel
  position: [2, 0, 1, 2]
  trigger: map-click
```
