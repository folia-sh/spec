# Change Detection

**Persona:** Forest ecologist, land manager, conservation analyst
**Concept:** `#vegetation`
**Difficulty:** Intermediate

## Scenario

Detect vegetation change in the Sierra Nevada, California, by comparing Sentinel-2 summer composites from 2020 (baseline) and 2024 (current). Compute NDVI for both periods, calculate the difference, classify change into health zones, and summarize by watershed.

## Data Sources

| Layer | Source | Type | Resolution |
|---|---|---|---|
| Sentinel-2 2020 | Copernicus Sentinel-2 L2A | raster | 10m |
| Sentinel-2 2024 | Copernicus Sentinel-2 L2A | raster | 10m |
| Watersheds | USGS WBD HUC-10 | vector | N/A |
| Fire perimeters | MTBS 2020-2024 | vector | N/A |

## Operations Used

| Operation | Purpose |
|---|---|
| `imagery_radiometric_indices` | Compute NDVI from Sentinel-2 bands |
| `raster_calc` | Compute NDVI difference (2024 - 2020) |
| `raster_reclassify` | Classify change into loss/stable/gain zones |
| `analysis_zonal_stats` | Summarize change per watershed |

## Complete Workspace

```yaml
name: sierra-ndvi-change
version: "1.0"
description: >
  NDVI change detection in the Sierra Nevada, California.
  Compares summer 2020 baseline to summer 2024 to identify
  vegetation loss (drought/fire) and recovery areas.

settings:
  default_bbox: [-120.3, 37.9, -119.8, 38.4]
  default_crs: EPSG:4326

layers:

  # --- SOURCE IMAGERY ---

  source/sentinel2-2020:
    uri: cache/sierra-sentinel2-2020.tif
    type: raster
    description: Sentinel-2 L2A summer composite, July-August 2020

  source/sentinel2-2024:
    uri: cache/sierra-sentinel2-2024.tif
    type: raster
    description: Sentinel-2 L2A summer composite, July-August 2024

  source/watersheds:
    uri: cache/sierra-huc10.geojson
    type: vector
    description: HUC-10 watershed boundaries
    style:
      stroke: "#1565C0"
      fill: transparent

  source/fire-perimeters:
    uri: cache/sierra-fires-2020-2024.geojson
    type: vector
    description: MTBS fire perimeters (2020-2024)
    style:
      stroke: "#FF4444"
      fill: "rgba(255,68,68,0.2)"

  # --- NDVI COMPUTATION ---

  analysis/ndvi-2020:
    type: raster
    description: NDVI from 2020 baseline imagery
    compute:
      op: imagery_radiometric_indices
      inputs:
        imagery: { layer: source/sentinel2-2020 }
      params:
        index: ndvi
        red_band: 4
        nir_band: 8
    style:
      palette: ndvi
      rescale: "-0.2,0.9"

  analysis/ndvi-2024:
    type: raster
    description: NDVI from 2024 current imagery
    compute:
      op: imagery_radiometric_indices
      inputs:
        imagery: { layer: source/sentinel2-2024 }
      params:
        index: ndvi
        red_band: 4
        nir_band: 8
    style:
      palette: ndvi
      rescale: "-0.2,0.9"

  # --- CHANGE DETECTION ---

  analysis/ndvi-change:
    type: raster
    description: NDVI difference (2024 - 2020). Negative = vegetation loss.
    compute:
      op: raster_calc
      inputs:
        a: { layer: analysis/ndvi-2024 }
        b: { layer: analysis/ndvi-2020 }
      params:
        expression: "a - b"
    style:
      palette: rdylgn
      rescale: "-0.5,0.5"
      info:
        fields: [ndvi_change]
        section: Vegetation Change

  # --- CLASSIFICATION ---

  analysis/change-classes:
    type: raster
    description: >
      Vegetation change classification:
      1=severe loss, 2=moderate loss, 3=stable, 4=moderate gain, 5=recovery
    compute:
      op: raster_reclassify
      inputs:
        raster: { layer: analysis/ndvi-change }
      params:
        breaks: [-1.0, -0.3, -0.1, 0.1, 0.3, 1.0]
        labels: [1, 2, 3, 4, 5]

  # --- WATERSHED STATISTICS ---

  results/change-by-watershed:
    type: vector
    description: NDVI change statistics per watershed
    compute:
      op: analysis_zonal_stats
      inputs:
        raster: { layer: analysis/ndvi-change }
        zones: { layer: source/watersheds }
      params:
        stats: [mean, min, max, std, count]
    style:
      type: fill
      property: mean
      palette: rdylgn
      table:
        columns:
          - { field: name, label: Watershed }
          - { field: mean, label: "Mean NDVI change", format: ".3f" }
          - { field: min, label: "Min NDVI change", format: ".3f" }
          - { field: count, label: Pixels }
```

## Key Insight

The workspace YAML is a DAG. Each layer references its inputs by path:

```
source/sentinel2-2020 → analysis/ndvi-2020 ──┐
                                               ├→ analysis/ndvi-change → analysis/change-classes
source/sentinel2-2024 → analysis/ndvi-2024 ──┘                       → results/change-by-watershed
```

The platform resolves dependencies and executes in the correct order. No imperative script needed.
