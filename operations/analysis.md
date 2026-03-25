# Analysis Operations

Analysis operations combine raster and vector data to produce derived insights: zonal statistics, weighted overlays, change detection, spatial indexing, point sampling, and distance calculations.

Part of the [geo domain](/domains/geo).

## Operations

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `analysis_zonal_stats` | raster + vector → table | Compute statistics of raster values within polygon zones. | `stats` (array: mean, min, max, std, median, etc.), `admin_level` |
| `analysis_weighted_overlay` | raster[] → raster | Multi-criteria weighted combination. Inputs normalized to 0-1, weights normalized to sum to 1. | `weights` (array, required), `normalize_inputs` (bool), `output_range` |
| `raster_change_detection` | raster + raster → raster | Pixel-wise change between baseline and current rasters. Supports difference, normalized difference, and threshold classification. | `method`, `threshold`, `min_patch_pixels` |
| `analysis_point_sample` | raster + vector → table | Sample raster values at point locations. | `property_name` |
| `analysis_h3_index` | raster → table | Index data onto H3 hexagonal grid. Resolution auto-detected from pixel size if not specified. | `resolution` (0-15), `stats` |
| `analysis_histogram` | raster → stats | Compute histogram of raster value distribution. | `bins` (int) |
| `analysis_distance_to_features` | raster + vector → raster | Euclidean distance from each pixel to nearest feature. | *(none)* |
| `analysis_summary` | raster → stats | Summary statistics for entire raster. | *(none)* |

## Examples

### Zonal Statistics by Watershed

```yaml
layers:
  results/slope-by-watershed:
    type: vector
    compute:
      op: analysis_zonal_stats
      inputs:
        raster: { layer: terrain/slope }
        zones: { layer: source/watersheds }
      params:
        stats: [mean, min, max, std]
    style:
      type: fill
      property: mean
      palette: ylorbr
      table:
        columns:
          - { field: name, label: Watershed }
          - { field: mean, label: "Mean Slope", format: ".1f" }
          - { field: max, label: "Max Slope", format: ".1f" }
```

### Weighted Multi-Criteria Overlay

```yaml
layers:
  suitability/composite:
    type: raster
    compute:
      op: analysis_weighted_overlay
      inputs:
        rasters:
          - { layer: analysis/slope-suitability }
          - { layer: analysis/aspect-suitability }
          - { layer: analysis/land-suitability }
          - { layer: analysis/grid-proximity }
      params:
        weights: [0.30, 0.20, 0.25, 0.25]
        normalize_inputs: true
    style:
      palette: suitability
      colorRamp:
        - { value: 0.0, color: "#d73027" }
        - { value: 0.5, color: "#fee08b" }
        - { value: 1.0, color: "#1a9850" }
      form:
        fields:
          - name: slope_weight
            type: slider
            min: 0
            max: 1
            step: 0.05
            default: 0.30
            label: Slope Weight
```

### Change Detection

```yaml
layers:
  analysis/ndvi-change:
    type: raster
    compute:
      op: raster_change_detection
      inputs:
        baseline: { layer: analysis/ndvi-2020 }
        current: { layer: analysis/ndvi-2024 }
      params:
        method: threshold_classification
        threshold: 0.1
        min_patch_pixels: 50
    style:
      palette: rdylgn
      rescale: "-0.5,0.5"
```

### H3 Hexagonal Aggregation

```yaml
layers:
  results/site-hexes:
    type: vector
    compute:
      op: analysis_h3_index
      inputs:
        raster: { layer: suitability/composite }
      params:
        resolution: 7
        stats: [mean, min, max]
    style:
      fill-opacity: 0.6
      table:
        columns:
          - { field: h3_cell_id, label: "Hex Cell" }
          - { field: mean, label: "Mean Score", format: ".2f" }
```

## Administrative Boundaries

When `analysis_zonal_stats` is used without explicit zones, users MAY specify an `admin_level` parameter to use platform-provided administrative boundaries:

```yaml
params:
  admin_level: county  # country | state | county
```

The platform resolves boundaries from `folia://boundaries/admin/{level}` (Natural Earth / Census Bureau).
