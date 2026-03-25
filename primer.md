<!-- TODO: Primer is currently unlinked from sidebar/nav. Overview goes directly to /core/workspace.
     Restore when primer content is polished:
     - config.ts: add { text: 'Primer', link: '/primer' } under Introduction
     - index.md: hero link back to /primer
-->

# Platform Primer

::: info Non-Normative
This document is an informational introduction. It is not part of the formal specification. For normative definitions, see the [Core Spec](/core/workspace) and [Reference](/reference/schema).
:::

## What is folia?

folia is a declarative geospatial platform. You define **what** you want - data sources, computations, visualizations - in a YAML file, and the platform handles **how** it gets executed. The same workspace definition runs locally on your laptop or at scale in the cloud with zero code changes.

The unit of work is a **workspace**: a `folia.yaml` file that describes layers, views, and settings. There are no scripts to write, no infrastructure to manage, and no vendor lock-in.

## Core Concepts

### Workspace

A workspace is a `folia.yaml` file. It has a name, a set of layers, and one or more views. Everything about a project - its data, its computations, its visual presentation - lives in this single declarative document.

### Layer

The layer is the universal noun. Every data source, every computation, and every visualization target is a layer. A layer has three concerns:

- **Data** - where the bits come from (`uri`, connectors)
- **Compute** - how derived values are produced (`compute` block)
- **Style** - how results are displayed (`style` block with palette, opacity, rescale)

A layer can have all three, or just one. A raw data layer only needs a `uri`. A computed layer needs `compute`. Style is always optional.

### Compute Block

The compute block defines how a layer's values are produced. Three modes, mutually exclusive:

- **`op:`** - a registered operation like `terrain_slope` or `ndvi`. Abstract interface, automatic compute routing.
- **`engine:`** - inline SQL or Python for ad-hoc transforms. Quick and flexible.
- **`steps:`** - a multi-stage pipeline chaining multiple operations. For complex workflows.

```yaml
# op mode
compute:
  op: terrain_slope
  inputs:
    dem: { layer: dem }

# engine mode
compute:
  engine: sql
  query: "SELECT *, area_km2 * density AS total FROM {parcels}"
```

### Operation

An operation is an abstract interface: typed inputs, typed outputs, named parameters. The platform runs operations across three **compute tiers**: browser (instant, for small data), local (your machine, using GDAL and DuckDB), and cloud (K8s workers for large-scale batch). The platform picks the tier automatically based on data size and operation type. Google Earth Engine is available as an external compute platform when explicitly requested.

Operations carry **view hints** - default visualization suggestions like palette and legend type. These hints are overridden by layer-level style, which is overridden by view-level settings.

### Domain

A domain is a pluggable module that extends the platform with schema fields and operations for a specific data type:

- **`geo:`** - CRS, bounds, resolution. 43+ operations (terrain, vegetation, hydrology).
- **`tabular:`** - Column schemas, joins, aggregations. Powered by DuckDB.
- **`temporal:`** - Time dimensions, trends, anomaly detection. Time-series analysis.

### View

A view is a tab in the workspace. Each view selects layers from the shared pool and arranges content - maps, charts, tables, stat-cards - in a layout. Multiple views let different audiences see the same data differently: a terrain analyst gets slope maps, a land manager gets risk tables.

### Style

Style lives on the layer as visual defaults: `palette`, `opacity`, `rescale`, `color`. The resolution cascade is: **view override > layer style > op hints > type defaults**. You set it once on the layer; views can refine it.

## How Layers Compose

Layers reference other layers through `compute.inputs`. This makes the workspace YAML a directed acyclic graph (DAG):

```yaml
layers:
  elevation:
    uri: s3://bucket/dem.tif
    type: raster
  slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: elevation }
  steep_zones:
    type: raster
    compute:
      op: threshold
      inputs:
        raster: { layer: slope }
      params:
        threshold: 35
```

`steep_zones` depends on `slope`, which depends on `elevation`. The platform resolves the graph and executes in the right order.

## URI Schemes

| Scheme | Example | Description |
|--------|---------|-------------|
| `https://` | `https://data.folia.sh/@usgs/3dep/...` | Remote HTTP resource |
| `file://` | `file://./data/local.tif` | Local file path |
| `stac://` | `stac://earth-search/sentinel-2-l2a` | STAC catalog item |
| `gee://` | `gee://USGS/SRTMGL1_003` | Google Earth Engine asset |
| `@owner/` | `@usgs/3dep/wasatch-10m` | folia catalog reference |
| `commons/` | `commons/admin-boundaries` | Shared community dataset |

## Execution Model

The platform supports three execution modes, **inferred** from the workspace definition. You never declare a mode explicitly:

- **Batch** - all inputs are static. Run once, produce artifacts.
- **Reactive** - a `params:` block with form controls. Changing a slider re-computes downstream layers.
- **Scheduled** - a `refresh:` block with a cron expression. Layers update on a timer.

## Design Principles

- **Declarative over imperative** - define outcomes, not procedures.
- **Local-first, cloud-scalable** - iterate on your laptop, deploy the same YAML to a cluster.
- **Every abstraction can be inspected** - "View the spec" on every result. No magic.
- **Provenance is first-class** - every artifact traces back to source data and the exact computation that produced it.
- **AI-native** - MCP server exposes the full platform to AI agents. Agent-mediated discovery and computation.
