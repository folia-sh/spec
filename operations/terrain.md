# Terrain Operations

Terrain operations derive surface characteristics from Digital Elevation Models (DEMs). All terrain operations accept a raster DEM as input and produce a raster output. Implemented using GDAL and rasterio, running in the local or cloud compute tier.

Part of the [geo domain](/domains/geo).

## Operations

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `terrain_slope` | raster → raster | Slope angle from DEM (Horn's method). Output: float32 degrees, 0 = flat, 90 = vertical. | `smooth` (bool), `smooth_sigma` (number), `remove_edges` (bool) |
| `terrain_aspect` | raster → raster | Aspect direction: degrees clockwise from north (0-360). Flat areas below threshold are nodata. | `flat_threshold` (number), `smooth` (bool) |
| `terrain_hillshade` | raster → raster | Simulated illumination from a configurable light source. Output: uint8, 0 = shadow, 255 = bright. | `azimuth` (0-360), `altitude` (0-90), `z_factor`, `multidirectional` (bool) |
| `terrain_tpi` | raster → raster | Topographic Position Index: elevation difference from local mean. Positive = ridges, negative = valleys. | `radius` (int, neighborhood size in cells) |
| `terrain_tri` | raster → raster | Terrain Ruggedness Index: total elevation change across 8 neighbors. Based on Riley et al. (1999). | *(none)* |
| `terrain_curvature` | raster → raster | Surface curvature: profile (flow acceleration), planform (flow convergence), or total (Laplacian). | `type` (profile, planform, total) |
| `terrain_viewshed` | raster → raster | Viewshed analysis from observer point(s). | observer location, height |

## Example

```yaml
layers:
  source/dem:
    uri: data/wasatch-dem-10m.tif
    type: raster
    geo:
      bbox: [-111.9, 40.5, -111.6, 40.8]

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

  terrain/aspect:
    type: raster
    compute:
      op: terrain_aspect
      inputs:
        dem: { layer: source/dem }
      params:
        flat_threshold: 1.0
    style:
      palette: twilight
      rescale: "0,360"

  terrain/hillshade:
    type: raster
    compute:
      op: terrain_hillshade
      inputs:
        dem: { layer: source/dem }
      params:
        azimuth: 315
        altitude: 45
        multidirectional: false
    style:
      palette: grayscale
      opacity: 0.7

  terrain/tpi:
    type: raster
    compute:
      op: terrain_tpi
      inputs:
        dem: { layer: source/dem }
      params:
        radius: 3
    style:
      palette: rdylbu
      rescale: "-50,50"

  terrain/tri:
    type: raster
    compute:
      op: terrain_tri
      inputs:
        dem: { layer: source/dem }
    style:
      palette: magma
      rescale: "0,100"

  terrain/curvature:
    type: raster
    compute:
      op: terrain_curvature
      inputs:
        dem: { layer: source/dem }
      params:
        type: total
    style:
      palette: rdbu
```

## Default Data Source

All terrain operations declare a `default_input` referencing the USGS 3DEP connector. If no DEM is provided, the platform MAY resolve a DEM from 3DEP at the workspace's `default_bbox` and requested resolution.

```yaml
default_input:
  connector: usgs_3dep
  params:
    resolution: 10m
```
