# Interactions

Interactions are event-driven behaviors triggered by user action on the map. They are **not placed**; they are configured per-layer within a map content item, or at the map level for cross-content behaviors.

*Decided in [ADR-0015](/decisions/#adr-0015) D4.*

## Per-Layer Configuration

Interactions are declared per-layer inside a map content item's `interactions:` block. Each layer path maps to an object with event triggers as keys.

```yaml
content:
  - type: map
    interactions:
      terrain/slope:
        click: sample
        hover: value-tooltip
      boundaries/counties:
        click: popup
        hover: highlight
      stations/snotel:
        click: fly-to
        hover: highlight
```

## Interaction Types

### `popup`

Click to show feature properties in a tooltip at the click location. Applies to vector layers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fields` | list | **MAY** | Restrict to specific attribute fields. Defaults to all fields. |
| `template` | string | **MAY** | Custom template string with `{field_name}` placeholders |

```yaml
boundaries/counties:
  click:
    type: popup
    fields: [name, population, area_km2]
    template: "<b>{name}</b><br>Pop: {population}"
```

When declared as a shorthand string (`click: popup`), defaults apply: all fields are shown with no custom template.

### `highlight`

Hover to visually emphasize a feature. Applies to vector layers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `color` | string | **MAY** | Highlight color. Defaults to `"#ffcc00"`. |
| `width` | number | **MAY** | Highlight stroke width. Defaults to `2`. |

```yaml
boundaries/counties:
  hover:
    type: highlight
    color: "#ffcc00"
    width: 3
```

### `select`

Click to add a feature to the selection set. Hold shift for multi-select. Applies to vector layers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `maxItems` | number | **MAY** | Maximum number of selected features. Defaults to unlimited. |

```yaml
parcels/residential:
  click:
    type: select
    maxItems: 10
```

### `sample`

Click to point-sample a raster layer at the click location. Results are displayed in the nearest `info-panel` content item. Applies to raster layers.

```yaml
terrain/slope:
  click: sample
```

No additional fields. The sampled values are determined by the raster's band metadata or compute output schema.

### `value-tooltip`

Hover to show the raster value at the cursor position. Applies to raster layers.

```yaml
terrain/slope:
  hover: value-tooltip
```

No additional fields. The displayed value updates in real-time as the cursor moves.

### `fly-to`

Click to animate the map camera to the clicked feature.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `zoom` | number | **MAY** | Target zoom level. Defaults to current zoom + 2. |
| `duration` | number | **MAY** | Animation duration in milliseconds. Defaults to `1000`. |

```yaml
stations/snotel:
  click:
    type: fly-to
    zoom: 14
    duration: 1500
```

### `draw`

Activate a drawing tool to define a region for spatial queries (clip, zonal statistics, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `modes` | list | **MAY** | Allowed draw modes: `polygon`, `rectangle`, `circle`. Defaults to all. |

```yaml
terrain/slope:
  draw:
    modes: [polygon, rectangle]
```

The drawn geometry is available as a parameter for downstream compute operations.

### `cross-filter`

Click on a chart, table row, or map feature to filter linked content. All content items in the same `crossfilter.group` update to reflect the selection.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `group` | string | **MUST** | Cross-filter group name. All content items sharing this group are linked. |
| `field` | string | **MUST** | Attribute field used for filtering |

Cross-filter is configured at the content item level, not per-layer:

```yaml
content:
  - type: map
    position: [0, 0, 2, 2]
    layers: [analysis/ates_classification]
    interactions:
      analysis/ates_classification:
        click: select
    crossfilter:
      group: terrain
      field: terrain_class

  - type: chart
    position: [2, 0, 2, 1]
    chartType: bar
    data: analysis/terrain_avy_join
    xAxis: { field: terrain_class }
    yAxis: { field: avalanche_count }
    crossfilter:
      group: terrain
      field: terrain_class

  - type: table
    position: [2, 1, 2, 1]
    data: sources/observed_avalanches
    columns: [date, location, terrain_class, size]
    crossfilter:
      group: terrain
      field: terrain_class
```

When a user clicks "complex" on the bar chart, the map dims all non-complex polygons and the table filters to show only complex-terrain avalanches. Clicking a feature on the map filters the chart and table to that class.

## Parameter Binding

View-level parameters create reactive connections between controls, forms, and content items. The `param()` function references a named parameter value.

### Defining Parameters

Parameters are declared at the view level under `params:`:

```yaml
views:
  - name: Slope Explorer
    layout: split
    split: { direction: horizontal, ratio: [0.7, 0.3] }
    params:
      slope_threshold: 30
      aspect_filter: [N, NE, NW]
```

### Binding Controls to Parameters

Controls **MUST** declare a `bind:` field that targets a named parameter:

```yaml
components:
  - type: controls
    anchor: top-left
    items:
      - id: slope_threshold
        control: slider
        label: Min Slope
        min: 0
        max: 60
        step: 1
        bind: params.slope_threshold
```

### Referencing Parameters in Content

Content items reference parameters using `param()`:

```yaml
content:
  - type: map
    area: primary
    layers: [terrain/slope]
    style:
      terrain/slope:
        colorRamp:
          - { value: 0, color: "transparent" }
          - { value: param(slope_threshold), color: "yellow" }
          - { value: 45, color: "red" }
          - { value: 55, color: "purple" }

  - type: chart
    area: secondary
    chartType: histogram
    data: terrain/slope
    filter: "slope >= param(slope_threshold)"
```

### Param Routing: Compute vs Views

The platform **MUST** infer whether a parameter change triggers server-side computation or client-side rendering:

- If `compute:` has `params:` with matching names, param changes trigger re-execution (server or DuckDB-WASM)
- If only view content references `param()`, changes apply client-side filtering

```
Param changes compute input  -> re-execute SQL/op -> new data -> re-render
Param changes view filter    -> filter existing data client-side -> re-render
```

### Latency Indicators

The platform **SHOULD** indicate expected latency to the user:

| Icon | Meaning | Example |
|------|---------|---------|
| Lightning | Instant, client-side (DuckDB-WASM, filter) | Opacity slider, aspect filter |
| Cloud | Server-side, ~1-5s (Python, GEE) | Resolution change, model re-run |

The user does not need to understand the distinction. The UI subtly indicates latency.

## Complete Example

A split view with popup, highlight, cross-filter, and parameter-bound controls:

```yaml
views:
  - name: Terrain Risk Analysis
    layout: split
    split: { direction: horizontal, ratio: [0.65, 0.35] }
    params:
      slope_threshold: 30
      terrain_class: null
    layers: [terrain/slope, boundaries/counties, analysis/ates_classification]
    content:
      - type: map
        area: primary
        interactions:
          analysis/ates_classification:
            click: select
            hover: highlight
          terrain/slope:
            hover: value-tooltip
          boundaries/counties:
            click:
              type: popup
              fields: [name, population]
        crossfilter:
          group: terrain
          field: terrain_class
        components:
          - type: legend
            anchor: bottom-right
          - type: controls
            anchor: top-left
            items:
              - id: slope_threshold
                control: slider
                label: Min Slope (deg)
                min: 0
                max: 60
                step: 1
                default: 30
                bind: params.slope_threshold

      - type: chart
        area: secondary
        chartType: bar
        title: Avalanches by Terrain Class
        data: analysis/terrain_avy_join
        xAxis: { field: terrain_class }
        yAxis: { field: avalanche_count }
        crossfilter:
          group: terrain
          field: terrain_class

      - type: table
        area: secondary
        data: sources/observed_avalanches
        columns:
          - { field: date, label: Date }
          - { field: location, label: Location }
          - { field: terrain_class, label: Class }
          - { field: size, label: Size }
        crossfilter:
          group: terrain
          field: terrain_class
```
