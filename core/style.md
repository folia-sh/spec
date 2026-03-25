# Style Defaults

The `style:` block on a layer provides optional visual defaults: palette, opacity, color ramp, and info panel overrides. It does **not** declare capabilities, queryability, chart configuration, or interactions. Those concerns belong elsewhere.

*Decided in [ADR-0015](/decisions/#adr-0015) D2 - "`views:` becomes `style:`. Optional visual defaults only."*

---

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `palette` | string | No | Named color palette (e.g., `viridis`, `terrain`, `rdbu`, `avalanche`). |
| `opacity` | number | No | Layer opacity, `0.0` to `1.0`. Default: `1.0`. |
| `colorRamp` | list | No | Explicit color stops. Alternative to a named palette. Each entry: `{ value, color }`. |
| `rescale` | string | No | Value range for palette mapping, as `"min,max"` (e.g., `"0,60"`). |
| `info` | object | No | Info panel configuration. Overrides auto-derived fields. |
| `table` | object | No | Table rendering hints. |
| `form` | object | No | Interactive parameter control definitions. |

### `info` Block

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `info.fields` | list | No | Visible fields. Restricts which fields appear in the info panel. |
| `info.format` | string | No | Display template (e.g., `"{value}m"`, `"{value}deg"`). |
| `info.section` | string | No | Grouping label in the info panel (e.g., `Terrain`, `Weather`). |
| `info.hierarchy` | list | No | Nested lookup order for hierarchical data. |

### `table` Block

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `table.columns` | list | No | Column definitions. Each entry: `{ field, label, format, width }`. |

### `form` Block

Each key in the `form` block defines a control bound to a compute parameter:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | Yes | Control type: `slider`, `dropdown`, `toggle`. |
| `label` | string | No | Human-readable label. |
| `min` | number | For slider | Minimum value. |
| `max` | number | For slider | Maximum value. |
| `step` | number | No | Step increment for sliders. |
| `default` | any | No | Default value. |
| `values` | list | For dropdown | Available options. |

---

## What `style:` Covers

The `style:` block provides **visual defaults** that apply wherever the layer appears. These are hints to the renderer, not capability declarations.

| Field | Purpose |
|-------|---------|
| `palette` | Named color palette for raster rendering |
| `opacity` | Default opacity |
| `colorRamp` | Explicit color stops as an alternative to a named palette |
| `rescale` | Value range for palette mapping |
| `info` | Override auto-derived info panel fields |
| `table` | Hints for table column rendering |
| `form` | Parameter controls for interactive layers |

## What `style:` Does NOT Cover

| Concern | Where It Belongs | Why |
|---------|-----------------|-----|
| Chart config (type, axes, marks) | View `content:` block ([Views](/views/)) | Charts are view-specific layout items |
| Capabilities (queryable, sampleable) | Inferred from `type:` + op registry | Never manually declared |
| Interactions (click, hover, draw) | View-level per-layer config ([Interactions](/views/interactions)) | Behaviors, not visual defaults |

---

## Style Resolution Cascade

When a layer is rendered, its visual styling is resolved through a fallback chain. Most specific wins:

1. **View content item `style:` override** - per-view, per-content-item overrides in the workspace `views:` block.
2. **Layer `style:` block** - the layer's own defaults.
3. **Operation `display_hints:`** - suggested defaults from the op YAML, if the layer has `compute.op:`. *Decided in [ADR-0009](/decisions/#adr-0009).*
4. **Type-based defaults** - fallback for layers with no styling at any level. Raster gets `viridis`, vector gets blue fill, table gets default grid.

```
View-level style override (most specific)
    |
    v falls back to
Layer style: block (defaults)
    |
    v falls back to
Op display_hints: (from op YAML)
    |
    v falls back to
Type-based defaults (least specific)
```

---

## Examples

### Raster with palette and info

```yaml
layers:
  terrain/elevation:
    uri: catalog://terrain/dem
    type: raster
    style:
      palette: terrain
      rescale: "0,4000"
      info:
        fields: [elevation_m]
        format: "{value}m"
        section: Terrain
```

### Custom color ramp

```yaml
layers:
  terrain/slope:
    uri: catalog://terrain/slope/wasatch@v2
    type: raster
    style:
      palette: avalanche
      opacity: 0.7
      colorRamp:
        - { value: 0, color: "transparent" }
        - { value: 30, color: "yellow" }
        - { value: 45, color: "red" }
        - { value: 55, color: "purple" }
      info:
        fields: [slope_degrees]
        format: "{value}deg"
        section: Terrain
```

### Form controls for interactive parameters

```yaml
layers:
  pricing/calculator:
    type: computed
    compute:
      engine: sql
      query: |
        SELECT :count * ondemand_hr * :hours AS monthly_cost
        FROM :prices WHERE instance_type = :instance_type
      inputs:
        prices: { layer: cloud_pricing/ec2 }
      params:
        instance_type: m5.xlarge
        hours: 730
        count: 1
    style:
      form:
        instance_type:
          type: dropdown
          label: Instance Type
          values: [m5.large, m5.xlarge, m5.2xlarge, c5.xlarge]
        hours:
          type: slider
          label: Hours/Month
          min: 0
          max: 730
          step: 10
          default: 730
        count:
          type: slider
          label: Instance Count
          min: 1
          max: 100
          default: 1
      table:
        columns:
          - { field: instance_type, label: "Instance", width: 200 }
          - { field: monthly_cost, label: "Monthly Cost", format: "${value}" }
```

### Layer with no style block

```yaml
layers:
  hydrology/drainage:
    uri: catalog://hydrology/nhd
    type: vector
    # No style: block needed.
    # Type "vector" uses default blue fill.
    # Info fields auto-derived from attribute table.
```

### Info override on a computed layer

```yaml
layers:
  astro/sun_moon:
    type: computed
    compute:
      engine: python
      module: ./sun_moon.py
      function: compute
    style:
      info:
        fields: [sunrise, sunset, moon_phase, moon_illumination]
        section: Sun & Moon
    # Not rendered on map - no palette/opacity needed.
```
