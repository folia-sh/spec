# Terrain Analysis

**Persona:** Geomorphologist, land manager, recreation planner
**Concept:** `#terrain`
**Difficulty:** Introductory

## Scenario

Compute terrain derivatives for the Wasatch Range, Utah, from a USGS 3DEP 10m DEM. Derive slope, aspect, hillshade, and topographic position. Classify terrain into zones and compute statistics per HUC-10 watershed.

## Data Sources

| Layer | Source | Type | Resolution |
|---|---|---|---|
| DEM | USGS 3DEP | raster | 10m |
| Watersheds | USGS WBD HUC-10 | vector | N/A |

## Operations Used

| Operation | Purpose |
|---|---|
| `terrain_slope` | Derive slope angle from DEM |
| `terrain_aspect` | Derive aspect direction from DEM |
| `terrain_hillshade` | Generate hillshade visualization |
| `terrain_tpi` | Compute Topographic Position Index |
| `raster_reclassify` | Classify slope into terrain zones |
| `analysis_zonal_stats` | Compute mean slope per watershed |

## Complete Workspace

```yaml
name: wasatch-terrain-analysis
version: "1.0"
description: >
  Terrain analysis for the Wasatch Range, Utah. Derives slope,
  aspect, hillshade, and TPI from USGS 3DEP 10m DEM.

settings:
  default_bbox: [-111.9, 40.5, -111.6, 40.8]
  default_crs: EPSG:4326

layers:

  # --- SOURCE DATA ---

  source/dem:
    uri: cache/wasatch-dem-10m.tif
    type: raster
    description: USGS 3DEP 10m seamless DEM for Wasatch Range
    geo:
      bbox: [-111.9, 40.5, -111.6, 40.8]
      crs: EPSG:4326

  source/watersheds:
    uri: cache/wasatch-huc10.geojson
    type: vector
    description: HUC-10 watershed boundaries
    style:
      stroke: "#1565C0"
      fill: transparent
      stroke-width: 2

  # --- TERRAIN DERIVATIVES ---

  terrain/slope:
    type: raster
    description: Slope angle in degrees (0=flat, 90=vertical)
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: source/dem }
      params:
        smooth: true
        smooth_sigma: 1.5
    style:
      palette: slope_angle
      rescale: "0,60"
      info:
        fields: [slope_degrees]
        format: "{value}°"
        section: Terrain

  terrain/aspect:
    type: raster
    description: Aspect (compass direction of slope face, 0-360°)
    compute:
      op: terrain_aspect
      inputs:
        dem: { layer: source/dem }
    style:
      palette: aspect
      rescale: "0,360"

  terrain/hillshade:
    type: raster
    description: Hillshade illumination (NW sun, 45° altitude)
    compute:
      op: terrain_hillshade
      inputs:
        dem: { layer: source/dem }
      params:
        azimuth: 315
        altitude: 45
    style:
      palette: grayscale
      opacity: 0.7

  terrain/tpi:
    type: raster
    description: Topographic Position Index (ridges + / valleys -)
    compute:
      op: terrain_tpi
      inputs:
        dem: { layer: source/dem }
      params:
        window_size: 11
    style:
      palette: rdylbu
      rescale: "-50,50"

  # --- CLASSIFICATION ---

  analysis/terrain-classes:
    type: raster
    description: Terrain classification from slope
    compute:
      op: raster_reclassify
      inputs:
        raster: { layer: terrain/slope }
      params:
        breaks: [0, 5, 15, 30, 45, 90]
        labels: [1, 2, 3, 4, 5]

  # --- WATERSHED STATISTICS ---

  results/slope-by-watershed:
    type: vector
    description: Mean slope statistics per HUC-10 watershed
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
          - { field: mean, label: "Mean Slope (°)", format: ".1f" }
          - { field: max, label: "Max Slope (°)", format: ".1f" }
          - { field: std, label: "Std Dev", format: ".2f" }
```

## Views

The workspace renders naturally as a full-map view with terrain layers, supplemented by a dashboard showing the watershed statistics table and a slope histogram.
