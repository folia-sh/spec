---
layout: home
hero:
  name: "folia"
  text: "the declarative geospatial platform"
  tagline: "Define what you want, not how. Specs, not scripts."
  actions:
    - theme: brand
      text: Read the Spec
      link: /primer
    - theme: alt
      text: Browse Operations
      link: /operations/
features:
  - icon: "\U0001F5FA\uFE0F"
    title: Layers Are Everything
    details: "Every data source, computation, and visualization is a layer. Three concerns: Data, Compute, Style."
    link: /core/layers
  - icon: "\u26A1"
    title: Declarative Compute
    details: "op: for registered operations, engine: for SQL/Python, steps: for multi-stage pipelines. Three compute tiers: browser, local, cloud."
    link: /core/compute
  - icon: "\U0001F441\uFE0F"
    title: Multi-View Workspaces
    details: "Same layer pool, multiple views. Maps, charts, tables, and stat-cards arranged in flexible layouts."
    link: /views/
  - icon: "\U0001F50C"
    title: Domain Modules
    details: "Geo, tabular, temporal - pluggable domain extensions that add schema and operations for specific data types."
    link: /domains/
  - icon: "\U0001F4E6"
    title: 63+ Operations
    details: "Terrain, vegetation, classification, hydrology, tabular transforms, temporal analysis. Abstract interfaces, automatic compute routing."
    link: /operations/
  - icon: "\U0001F310"
    title: Cloud-Native Catalog
    details: "@owner/project/dataset namespaces. #concept discovery. OGC Records. Publish and share."
    link: /catalog/namespaces
---

## Build a Workspace in Three Steps

A `folia.yaml` file is all you need. Start with data, add computation, then style and view it.

### Step 1: Point to data

```yaml
layers:
  dem:
    uri: https://data.folia.sh/@usgs/3dep/wasatch-10m.tif
    type: raster
```

A layer can be as simple as a URI. folia resolves the data, reads metadata, and makes it available to other layers.

### Step 2: Add computation

```yaml
layers:
  dem:
    uri: https://data.folia.sh/@usgs/3dep/wasatch-10m.tif
    type: raster
  slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: dem }
```

The `slope` layer references `dem` as an input. The workspace YAML is a DAG: layers compose by referencing each other.

### Step 3: Add style and views

```yaml
layers:
  dem:
    uri: https://data.folia.sh/@usgs/3dep/wasatch-10m.tif
    type: raster
  slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: dem }
    style:
      palette: viridis
      rescale: "0,60"
views:
  - name: Terrain
    layout: full-map
    layers: [slope]
    content:
      - type: map
        components:
          - type: legend
            anchor: bottom-right
```

Views define how layers are presented: layout, visible layers, and UI components like legends and charts. Multiple views can show the same layer pool in different ways.

---

## What is folia?

folia is a declarative geospatial platform. A `folia.yaml` file defines data sources, computations, and visualizations. The platform handles execution, locally or in the cloud. This spec documents the complete YAML schema and platform behavior.

Read the [Primer](/primer) to understand the core concepts, or jump straight into the [Core Spec](/core/workspace).
