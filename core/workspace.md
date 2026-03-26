# Workspace

A workspace is the root container in folia. It is defined by a `folia.yaml` file and contains everything needed to describe data sources, computations, visualizations, and their relationships.

*Decided in [ADR-0001](/decisions/#adr-0001) and [ADR-0005](/decisions/#adr-0005)*

---

## Schema

The `folia.yaml` file is the single entry point for a workspace.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | For publishing | Workspace name. **MUST** be a valid identifier (`[a-z0-9-]`). |
| `version` | string | For publishing | Semver version (e.g., `1.0.0`). |
| `description` | string | No | Human-readable description of the workspace. |
| `author` | string | For publishing | Owner identifier (e.g., `nathan`). |
| `license` | string | No | SPDX license identifier (e.g., `CC-BY-4.0`, `Apache-2.0`). |
| `layers` | object | No | Layer definitions. Keys are slash-delimited layer paths. See [Layers](/core/layers). |
| `views` | list | No | View definitions. Each entry is a named tab with its own layout. See [Views](/views/). |
| `settings` | object | No | Workspace-level settings. |
| `schedules` | object | No | Workspace-level scheduled execution. |

### Settings

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `default_bbox` | array | No | Default bounding box as `[west, south, east, north]` in EPSG:4326. |
| `default_crs` | string | No | Default coordinate reference system (e.g., `EPSG:4326`, `EPSG:32612`). |

---

## Minimal Workspace

A valid `folia.yaml` can contain nothing more than a `layers:` block:

```yaml
layers:
  dem:
    uri: https://data.folia.sh/@usgs/3dep/wasatch-10m.tif
    type: raster
```

No metadata, no views, no settings. The platform infers defaults for everything omitted.

---

## Complete Workspace

```yaml
name: wasatch-terrain
version: 1.0.0
author: nathan
license: CC-BY-4.0
description: Terrain analysis for the Wasatch Range

layers:
  terrain/elevation:
    uri: commons/usgs/3dep/1m
    type: raster
    style:
      palette: terrain
      info:
        fields: [elevation_m]
        format: "{value}m"
    geo:
      query_method: point_sample

  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        elevation: { layer: terrain/elevation }
    style:
      palette: avalanche
      opacity: 0.7

  terrain/slope_contours:
    ref: terrain/slope
    style:
      type: line
      lineInterval: 5
      color: "#333"

views:
  - name: Terrain Analysis
    layout: dashboard
    grid: { columns: 3, rows: 2 }
    layers: [terrain/elevation, terrain/slope]
    content:
      - type: map
        position: [0, 0, 2, 2]
        components:
          - type: legend
            anchor: bottom-right
      - type: chart
        position: [2, 0, 1, 1]
        chartType: histogram
        data: terrain/slope
      - type: stat-card
        position: [2, 1, 1, 1]
        title: "Mean Slope"
        value: terrain/slope
        field: mean_slope

settings:
  default_bbox: [-112.2, 40.4, -111.5, 40.8]
  default_crs: EPSG:4326

schedules:
  nightly-rebuild:
    cron: "0 2 * * *"
    layers: [terrain/slope, terrain/slope_contours]
```

---

## Dual Representation

A workspace has two representations that stay in sync.

```
DECLARATIVE (portable)              OPERATIONAL (running)
─────────────────────               ────────────────────
folia.yaml + layers/          <->   Turso (metadata rows)
*.sql, *.py files             <->   R2 (code as files)
data/ (local uploads)         <->   R2 (uploaded data)
.folia/ (pointers, cache)          R2 (artifacts)
```

The declarative side is the developer interface: git, CLI, text editors. The operational side is the web app interface: Turso queries, R2 access, global availability.

- `folia deploy` pushes workspace state to Turso + R2.
- `folia pull` fetches the latest workspace state locally.
- Web app edits go directly to Turso + R2; the next `folia pull` picks them up.

*Decided in [ADR-0005](/decisions/#adr-0005) D1*

---

## Directory Structure

```
my-workspace/
├── folia.yaml                    # The manifest - everything starts here
├── layers/                       # Complex layers (auto-discovered)
│   ├── terrain/
│   │   └── slope/                # -> layer "terrain/slope"
│   │       ├── layer.yaml        # Layer definition
│   │       ├── compute.sql       # SQL compute step
│   │       └── postprocess.py    # Python compute step
│   └── analysis/
│       └── risk-zones/           # -> layer "analysis/risk-zones"
│           ├── layer.yaml
│           └── classify.py
├── data/                         # Input data files (.gitignored)
│   └── my_upload.shp
├── .folia/                       # Local workspace state
│   ├── config.yaml               # Local-only settings (credentials)
│   ├── workspace.db              # Runtime state (SQLite)
│   └── .pointers/                # Pointer files for cloud-only data
└── scratch/                      # Never synced, local experiments
```

### Layer Auto-Discovery

Any `layer.yaml` under `layers/` is automatically part of the workspace. The folder path becomes the layer name:

- `layers/terrain/slope/layer.yaml` becomes layer `terrain/slope`
- `layers/analysis/risk-zones/layer.yaml` becomes layer `analysis/risk-zones`

Layer folders are self-contained. File references (`./compute.sql`, `./classify.py`) resolve relative to the layer folder.

### Precedence

If the same layer name exists inline in `folia.yaml` **and** in a layer folder, the **folder wins** (more specific).

---

## Publishing

A workspace becomes publishable when it has `name`, `version`, and `author`. Published workspaces are discoverable in the catalog under `@author/name`.

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier within the author's namespace |
| `version` | Semver version for reproducibility |
| `author` | Owner, maps to `@author/` namespace |
| `license` | Tells consumers how they can use it |

Publishing a workspace makes its layers available for reference by other workspaces. A private workspace **MAY** publish individual layers as public without exposing the full workspace.

*Decided in [ADR-0005](/decisions/#adr-0005) D3, D4*

---

## Deployment Inference

The platform infers deployment requirements from the workspace contents:

| Condition | Inferred Behavior |
|-----------|-------------------|
| All layers are static, no compute | Serve-only deployment |
| Any layer has `compute:` with `engine: python` | Python runtime required (browser via Pyodide for pure Python, server-side for heavy dependencies) |
| Any layer has `refresh: stream` | Persistent connection required |
| Any layer has `refresh: schedule(...)` | Scheduler deployment required |

Users **SHOULD NOT** need to declare deployment topology. The platform reads the workspace and provisions accordingly.

*Decided in [ADR-0003](/decisions/#adr-0003)*
