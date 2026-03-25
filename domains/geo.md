# Geo Domain

The foundational domain for geospatial data. Provides raster and vector operations, terrain analysis, spatial indexing, and imagery processing.

*Decided in [ADR-0006](/decisions/#adr-0006)*

## Schema Extension

The `geo:` block on a layer declares geospatial metadata.

| Field | Type | Required | Description |
|---|---|---|---|
| `bbox` | `[number x 4]` | No | Bounding box in EPSG:4326 as `[west, south, east, north]` |
| `crs` | string | No | Coordinate reference system. Default: `EPSG:4326` |
| `query_method` | string | No | How point queries are resolved: `spatial_lookup`, `point_sample`, or `nearest` |

```yaml
layers:
  dem:
    uri: data/wasatch-dem-10m.tif
    type: raster
    geo:
      bbox: [-111.9, 40.5, -111.6, 40.8]
      crs: EPSG:4326
```

## Operation Categories

The geo domain organizes 47 operations into 9 categories:

| Category | Count | Description |
|---|---|---|
| [terrain](/operations/terrain) | 7 | Slope, aspect, hillshade, curvature, TPI, TRI, viewshed |
| [raster](/operations/raster) | 9 | NDVI, reclassify, clip, mosaic, reproject, normalize, calc, mask, rasterize |
| [vector](/operations/vector) | 11 | Buffer, dissolve, intersection, union, simplify, clip, centroid, harmonize, and more |
| [analysis](/operations/analysis) | 8 | Zonal stats, weighted overlay, point sample, change detection, histogram, H3 index, distance, summary |
| imagery | 3 | Pansharpening, radiometric indices, optical calibration |
| classification | 2 | Train, predict |
| hydrology | 2 | Catchment network, tiered catchment network |
| composite | 1 | Treeline |
| utility | 4 | Raster-to-PMTiles, PMTiles merge, Terrarium encode/decode |

## Key Operations

| Operation | Type | Description |
|---|---|---|
| `terrain_slope` | raster → raster | Slope angle from DEM (Horn's method). Output: float32 degrees. |
| `terrain_aspect` | raster → raster | Aspect direction (0-360 degrees clockwise from north). |
| `terrain_hillshade` | raster → raster | Hillshade illumination from configurable light source. |
| `raster_ndvi` | raster → raster | Normalized Difference Vegetation Index from NIR and Red bands. |
| `raster_reclassify` | raster → raster | Remap values to classes (manual breaks, equal interval, quantile, value map). |
| `raster_clip` | raster + vector → raster | Clip raster to polygon boundary. |
| `raster_calc` | raster → raster | Band math expressions using numpy functions. |
| `analysis_zonal_stats` | raster + vector → table | Statistics (mean, min, max, etc.) per polygon zone. |
| `analysis_weighted_overlay` | raster[] → raster | Multi-criteria weighted combination with normalization. |
| `analysis_change_detection` | raster + raster → raster | Pixel-wise difference with optional classification. |
| `analysis_h3_index` | raster → table | Index data onto H3 hexagonal grid at configurable resolution. |
| `vector_buffer` | vector → vector | Buffer features by distance in meters. |
| `vector_dissolve` | vector → vector | Merge features, optionally grouped by attribute. |
| `analysis_point_sample` | raster + vector → table | Sample raster values at point locations. |

## Compute

Geo operations run on GDAL, rasterio, and numpy in the local and cloud compute tiers. The platform routes automatically based on data size and location - local files run locally, cloud-hosted data runs on K8s workers.

Google Earth Engine is available as an external compute option for cloud-scale processing via `backend: gee`.

| Tier | Libraries | Use Case |
|------|-----------|----------|
| **Local** | GDAL, rasterio, numpy | Local files, small to medium rasters |
| **Cloud** | GDAL, rasterio, numpy (on K8s workers) | Remote data, large-scale batch processing |
| **External (GEE)** | Google Earth Engine | Explicit `backend: gee`, planetary-scale analysis |

*Decided in [ADR-0007](/decisions/#adr-0007) - engines, connectors, and drivers are three orthogonal concerns.*

## Example: Terrain Analysis Workspace

```yaml
layers:
  source/dem:
    uri: data/dem.tif
    type: raster
    geo:
      bbox: [-111.9, 40.5, -111.6, 40.8]
      crs: EPSG:4326

  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: source/dem }
      params:
        smooth: true
        smooth_sigma: 1.5
    style:
      palette: viridis
      rescale: "0,60"
      info:
        fields: [slope_degrees]
        format: "{value}°"

  terrain/hillshade:
    type: raster
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
```
