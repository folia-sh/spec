# Weighted Overlay - Solar Siting

**Persona:** Renewable energy analyst, land use planner
**Concept:** `#terrain`, `#land-cover`
**Difficulty:** Advanced

## Scenario

Identify suitable sites for solar energy development in southern Utah using multi-criteria analysis. Combine terrain suitability (slope, aspect, TPI), land cover classification, protected area exclusions, and grid proximity into a weighted composite score. Aggregate results onto an H3 hexagonal grid for standardized comparison.

## Data Sources

| Layer | Source | Type | Resolution |
|---|---|---|---|
| DEM | USGS 3DEP | raster | 10m |
| Land cover | NLCD 2021 | raster | 30m |
| Protected areas | PAD-US | vector | N/A |
| Transmission lines | HIFLD | vector | N/A |

## Operations Used

| Operation | Purpose |
|---|---|
| `terrain_slope` | Derive slope (flat terrain preferred) |
| `terrain_aspect` | Derive aspect (south-facing preferred) |
| `terrain_tpi` | Derive topographic position (flat/plateau preferred) |
| `raster_reclassify` | Score each criterion into 0-1 suitability |
| `vector_buffer` | Create 500m exclusion zones around protected areas |
| `analysis_distance_to_features` | Distance to transmission lines |
| `raster_normalize` | Invert distance to proximity score |
| `analysis_weighted_overlay` | Combine criteria with configurable weights |
| `analysis_h3_index` | Aggregate to H3 hexagonal grid |

## Pipeline Structure

```
source/dem ──┬── terrain/slope ──── analysis/slope-suitability ──┐
             ├── terrain/aspect ─── analysis/aspect-suitability ──┤
             └── terrain/tpi ────── analysis/tpi-suitability ─────┤
source/landcover ───────────────── analysis/land-suitability ─────┤
source/protected-areas ─────────── analysis/exclusion-zones       │
source/transmission-lines ──┐                                     │
source/dem ─────────────────┴── analysis/grid-distance ───────────┤
                                analysis/grid-proximity ──────────┤
                                                                  ▼
                                               suitability/composite
                                                        │
                                               suitability/site-hexes
```

## Complete Workspace

```yaml
name: solar-siting-utah
version: "1.0"
description: >
  Multi-criteria solar siting analysis for southern Utah.
  Combines terrain, land cover, protected areas, and grid proximity
  into a weighted suitability surface with H3 hex aggregation.

settings:
  default_bbox: [-113.5, 38.1, -113.0, 38.6]
  default_crs: EPSG:32612

layers:

  # --- SOURCE DATA ---

  source/dem:
    uri: data/dem.tif
    type: raster
    description: USGS 3DEP 10m DEM
    geo:
      bbox: [-113.5, 38.1, -113.0, 38.6]

  source/landcover:
    uri: data/nlcd.tif
    type: raster
    description: NLCD 2021 land cover (30m)

  source/protected-areas:
    uri: data/protected_areas.geojson
    type: vector
    description: PAD-US protected areas

  source/transmission-lines:
    uri: data/transmission_lines.geojson
    type: vector
    description: HIFLD electric transmission lines

  # --- TERRAIN ---

  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: source/dem }

  terrain/aspect:
    type: raster
    compute:
      op: terrain_aspect
      inputs:
        dem: { layer: source/dem }

  terrain/tpi:
    type: raster
    compute:
      op: terrain_tpi
      inputs:
        dem: { layer: source/dem }
      params:
        radius: 3

  # --- SUITABILITY SCORING ---

  analysis/slope-suitability:
    type: raster
    description: "0-5° ideal (1.0), 5-10° good (0.75), 10-15° marginal (0.5), >15° exclude (0.0)"
    compute:
      op: raster_reclassify
      inputs:
        raster: { layer: terrain/slope }
      params:
        method: manual
        breaks: [5, 10, 15]
        class_values: [1.0, 0.75, 0.5, 0.0]

  analysis/aspect-suitability:
    type: raster
    description: "South-facing (135-225°) ideal, E/W marginal, N poor"
    compute:
      op: raster_reclassify
      inputs:
        raster: { layer: terrain/aspect }
      params:
        method: manual
        breaks: [90, 135, 225, 270]
        class_values: [0.0, 0.5, 1.0, 0.5, 0.0]

  analysis/land-suitability:
    type: raster
    description: "NLCD class scored for solar: grassland=5, shrub=4, barren=4, forest=1, developed=0"
    compute:
      op: raster_reclassify
      inputs:
        raster: { layer: source/landcover }
      params:
        method: value_map
        value_map:
          "71": 5.0    # Grassland - ideal
          "52": 4.0    # Shrub/Scrub - good
          "31": 4.0    # Barren Land - good
          "81": 3.0    # Pasture - acceptable
          "82": 3.0    # Cropland - acceptable
          "41": 1.0    # Forest - poor
          "42": 1.0    # Evergreen - poor
          "11": 0.0    # Water - exclude
          "21": 0.0    # Developed - exclude

  analysis/exclusion-zones:
    type: vector
    description: "500m buffer around protected areas - hard exclusion"
    compute:
      op: vector_buffer
      inputs:
        features: { layer: source/protected-areas }
      params:
        distance: 500

  analysis/grid-distance:
    type: raster
    compute:
      op: analysis_distance_to_features
      inputs:
        raster: { layer: source/dem }
        features: { layer: source/transmission-lines }

  analysis/grid-proximity:
    type: raster
    description: "Inverted distance: closer to grid = higher score"
    compute:
      op: raster_normalize
      inputs:
        raster: { layer: analysis/grid-distance }
      params:
        method: minmax
        output_range: [1.0, 0.0]

  # --- COMPOSITE ---

  suitability/composite:
    type: raster
    description: Weighted multi-criteria suitability (0-1)
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
      colorRamp:
        - { value: 0.0, color: "#d73027" }
        - { value: 0.25, color: "#fc8d59" }
        - { value: 0.5, color: "#fee08b" }
        - { value: 0.75, color: "#91cf60" }
        - { value: 1.0, color: "#1a9850" }
      info:
        fields: [value]
        format: "Suitability: {value:.0%}"
      form:
        fields:
          - name: slope_weight
            type: slider
            min: 0
            max: 1
            step: 0.05
            default: 0.30
            label: Slope Weight
          - name: aspect_weight
            type: slider
            min: 0
            max: 1
            step: 0.05
            default: 0.20
            label: Aspect Weight
          - name: land_weight
            type: slider
            min: 0
            max: 1
            step: 0.05
            default: 0.25
            label: Land Cover Weight
          - name: grid_weight
            type: slider
            min: 0
            max: 1
            step: 0.05
            default: 0.25
            label: Grid Proximity Weight

  # --- H3 AGGREGATION ---

  suitability/site-hexes:
    type: vector
    description: H3 hex grid aggregation of suitability scores
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
          - { field: min, label: "Min Score", format: ".2f" }
          - { field: max, label: "Max Score", format: ".2f" }
```

## Interactive Weights

The `form:` block on `suitability/composite` exposes weight sliders. Adjusting a slider triggers recomputation of the weighted overlay with new weights. This is **direct manipulation**: dragging a slider beats typing a threshold.

The form controls bind to `compute.params.weights` via parameter names. The UI normalizes weights to sum to 1 before recomputing.
