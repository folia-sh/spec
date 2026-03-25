# Raster Operations

Raster operations transform gridded data: band math, reclassification, clipping, mosaicking, reprojection, and normalization. Implemented using GDAL and rasterio, running in the local or cloud compute tier.

Part of the [geo domain](/domains/geo).

## Operations

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `raster_ndvi` | raster → raster | Normalized Difference Vegetation Index: `(NIR - Red) / (NIR + Red)`. Output: float32, -1 to 1. | *(none, inputs are NIR and Red bands)* |
| `raster_reclassify` | raster → raster | Remap values to new classes. Supports manual breaks, equal interval, quantile, value map, and crosswalk-based mapping. | `method`, `breaks`, `class_values`, `n_classes`, `value_map`, `crosswalk` |
| `raster_clip` | raster + vector → raster | Clip raster to a polygon boundary or bounding box. | `all_touched` (bool), `crop` (bool) |
| `raster_mosaic` | raster[] → raster | Combine multiple rasters into one. All inputs MUST share a CRS. | `method` (first, last, max, min, mean), `nodata` |
| `raster_reproject` | raster → raster | Reproject to a new CRS with configurable resampling. | `crs` (required), `resolution`, `resampling` (nearest, bilinear, cubic, lanczos) |
| `raster_calc` | raster → raster | Band math expressions using numpy. Bands accessible as `b1`, `b2`, etc. | `expression` (string, required) |
| `raster_normalize` | raster → raster | Normalize values to a target range (min-max scaling). | `method`, `output_range` |
| `raster_mask` | raster + vector → raster | Mask raster values outside a geometry. | *(geometry input)* |
| `raster_resample` | raster → raster | Resample raster to a new resolution. | resolution, resampling method |
| `raster_rasterize` | vector → raster | Convert vector features to raster grid. | attribute, resolution |

## Examples

### NDVI from Sentinel-2

```yaml
layers:
  analysis/ndvi:
    type: raster
    compute:
      op: raster_ndvi
      inputs:
        nir: { layer: source/sentinel2-b8 }
        red: { layer: source/sentinel2-b4 }
    style:
      palette: ndvi
      rescale: "-0.2,0.9"
```

### Reclassify with Manual Breaks

```yaml
layers:
  analysis/slope-classes:
    type: raster
    compute:
      op: raster_reclassify
      inputs:
        raster: { layer: terrain/slope }
      params:
        method: manual
        breaks: [5, 15, 30, 45]
        class_values: [1, 2, 3, 4, 5]
        labels: ["Flat", "Gentle", "Moderate", "Steep", "Cliff"]
```

### Reclassify with Crosswalk

Crosswalks enable value remapping between classification systems using the crosswalk registry.

*Decided in [ADR-0025](/decisions/#adr-0025) - YAML crosswalk registry with SKOS predicates.*

```yaml
layers:
  analysis/harmonized-landcover:
    type: raster
    compute:
      op: raster_reclassify
      inputs:
        raster: { layer: source/nlcd }
      params:
        crosswalk: nlcd-to-esa-worldcover
```

### Band Math Expression

```yaml
layers:
  analysis/ndbi:
    type: raster
    compute:
      op: raster_calc
      inputs:
        raster: { layer: source/sentinel2 }
      params:
        expression: "(b11 - b8) / (b11 + b8)"
```

### Clip and Mosaic

```yaml
layers:
  processing/clipped:
    type: raster
    compute:
      op: raster_clip
      inputs:
        raster: { layer: source/dem }
        geometry: { layer: source/study-area }
      params:
        all_touched: true
        crop: true

  processing/combined:
    type: raster
    compute:
      op: raster_mosaic
      inputs:
        rasters:
          - { layer: source/tile-a }
          - { layer: source/tile-b }
          - { layer: source/tile-c }
      params:
        method: first
```
