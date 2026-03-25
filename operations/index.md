# Operation Model

Operations are **abstract interfaces** that define what inputs they accept, what outputs they produce, and what parameters configure their behavior. The platform routes operations to the appropriate [compute tier](/core/compute#compute-routing) automatically. Users rarely need to specify where an operation runs.

*Decided in [ADR-0005](/decisions/#adr-0005) - DATA + COMPUTE + STYLE per layer. Pipeline eliminated.*
*Decided in [ADR-0007](/decisions/#adr-0007) - engines, connectors, and drivers are three orthogonal concerns.*

## Operation YAML Schema

Every operation is defined in a YAML file within its domain's `operations/` directory.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier (e.g., `terrain_slope`) |
| `name` | string | Yes | Human-readable name |
| `description` | string | Yes | What this operation does |
| `version` | string | No | Semantic version |
| `category` | string | Yes | Category within the domain (e.g., `terrain`, `raster`) |
| `type` | string | Yes | Transform signature (e.g., `raster-to-raster`, `raster-vector-to-table`) |
| `default_implementation` | string | No | Default implementation library (e.g., `native`, `duckdb`) |
| `inputs` | object | Yes | Typed inputs with descriptions |
| `outputs` | object | Yes | Typed outputs with format, dtype |
| `params` | object | No | Parameters with type, default, min/max, options |
| `display_hints` | object | No | Default view configurations for results |
| `cache_policy` | object | No | TTL, invalidation triggers |
| `granularity` | object | No | Resolution constraints |
| `uncertainty` | object | No | Error model, known limitations |
| `execution` | object | No | Resource profiles, cost hints |
| `default_input` | object | No | Default data source connector and params |

```yaml
# Example: terrain_slope operation
id: terrain_slope
name: Slope
description: >
  Calculate slope from DEM using GDAL DEMProcessing (Horn's method).
  Output is float32 degrees where 0 = flat and 90 = vertical cliff.
version: 2.3.0
category: terrain
type: raster-to-raster
default_implementation: native

inputs:
  - name: dem
    type: raster
    format: dem
    description: Input Digital Elevation Model (GeoTIFF)
    required: true

outputs:
  - name: slope
    type: raster
    format: cog
    dtype: float32
    unit: degrees
    description: Slope in degrees (0=flat, 90=vertical)

params:
  smooth:
    type: boolean
    default: true
    description: Apply Gaussian smoothing to reduce noise
  smooth_sigma:
    type: number
    default: 1.5
    description: "Gaussian sigma (~4-5m radius at 1m resolution)"
    min: 0.1
    max: 10.0

display_hints:
  map:
    renderer: maplibre
    palette: terrain
    opacity: 0.8
    rescale: "0,60"
    colormap: viridis
  info:
    fields: [slope_degrees]
    format: "{value}°"
    section: Terrain

cache_policy:
  ttl_days: 90
  invalidate_on: [source_update]
```

## Inputs and Outputs

Inputs and outputs are typed. The `type` field indicates the data kind:

| Type | Description | Common Formats |
|---|---|---|
| `raster` | Gridded raster data | `geotiff`, `cog`, `dem` |
| `vector` | Feature geometries | `geojson`, `geopackage` |
| `table` | Tabular data | `parquet`, `csv`, `arrow` |
| `stats` | Statistical summaries | `json` |
| `raster[]` | List of rasters | (same as raster) |

An input with `required: true` MUST be provided. Inputs with `required: false` MAY be omitted, in which case the operation either uses a default or adjusts its behavior.

## Parameters

Parameters configure operation behavior. Each parameter declares:

| Field | Type | Description |
|---|---|---|
| `type` | string | `string`, `number`, `integer`, `boolean`, `enum`, `array`, `object` |
| `default` | any | Default value if not provided |
| `required` | boolean | Whether the parameter MUST be provided |
| `description` | string | What this parameter controls |
| `min` / `max` | number | Numeric bounds |
| `enum` | list | Allowed values for enum types |

## Display Hints

Operations declare default display configurations for their results. These are suggestions; layer-level `style:` blocks override operation-level `display_hints`.

*Decided in [ADR-0009](/decisions/#adr-0009) - operations provide display hints; layer style takes precedence.*

```yaml
display_hints:
  map:
    renderer: maplibre
    palette: viridis
    opacity: 0.8
    rescale: "0,60"
  table:
    renderer: tanstack-table
    sortBy: value
  chart:
    renderer: observable-plot
    chartType: bar
  info:
    fields: [slope_degrees]
    format: "{value}°"
    section: Terrain
```

Resolution priority: **layer `style:`** > **operation `display_hints`** > **type defaults**.

## Compute Routing

When a layer uses `compute.op`, the platform routes it to a compute tier:

1. **External override** - if `compute.backend: gee` is set, route to Google Earth Engine
2. **Data locality** - compute near the data (cloud tier for remote data, local tier for local files)
3. **Data size** - small datasets may run in the browser tier; large datasets route to local or cloud
4. **Availability** - use the libraries available in the current tier

Google Earth Engine is the primary external compute option. All other routing is automatic. See [Compute Routing](/core/compute#compute-routing) for the full routing table.

## Custom Operations

Users MAY define workspace-local operations by placing an `operation.yaml` and a `compute.py` in their workspace:

```
my-workspace/
  folia.yaml
  ops/
    custom_index/
      operation.yaml   # operation definition
      compute.py       # implementation
```

The workspace-local operation is available only within that workspace. Publishing the workspace to the catalog makes the operation available to others.

## Operation Categories

Browse operations by category:

- **[Terrain](/operations/terrain)** - slope, aspect, hillshade, curvature, TPI, TRI, viewshed
- **[Raster](/operations/raster)** - NDVI, reclassify, clip, mosaic, reproject, calc, and more
- **[Vector](/operations/vector)** - buffer, dissolve, intersection, union, simplify, clip
- **[Analysis](/operations/analysis)** - zonal stats, weighted overlay, change detection, H3 index
- **[Tabular](/operations/tabular)** - filter, select, sort, join, union, aggregate
- **[Temporal](/operations/temporal)** - resample, rolling, align, interpolate, time range, period stats
