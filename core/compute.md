# Compute Block

The `compute:` block on a layer defines how data is produced or transformed. There are three mutually exclusive modes: `op:` for registered operations, `engine:` for inline SQL or Python, and `steps:` for multi-stage pipelines. A layer **MUST NOT** use more than one of these at the top level.

*Decided in [ADR-0005](/decisions/#adr-0005) D5 - "Pipeline is eliminated as a separate concept. Compute IS the transformation."*

---

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `op` | string | Exclusive | Registered operation name (e.g., `terrain_slope`). See [Operations](/operations/). |
| `engine` | string | Exclusive | Inline engine: `sql` or `python`. |
| `steps` | list | Exclusive | Ordered list of compute steps. |
| `backend` | string | No | Override for external compute (e.g., `gee`). Rarely needed - the platform routes to compute tiers automatically. |
| `query` | string | When `engine: sql` | SQL expression or file reference. |
| `module` | string | When `engine: python` | Python file path relative to layer folder. |
| `function` | string | When `engine: python` | Entry point function name. |
| `inputs` | object | No | Named input layers. See [Input References](#input-references). |
| `params` | object | No | Parameter definitions. Values bind to form controls or query variables. |

`op`, `engine`, and `steps` are **mutually exclusive** at the top level of a `compute:` block.

---

## `op:` Mode - Registered Operation

Uses a named operation from the registry. The platform routes the operation to the appropriate compute tier automatically.

```yaml
layers:
  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        dem: { layer: terrain/elevation }
      params:
        algorithm: horn
        smooth: true
        smooth_sigma: 1.5
```

The operation name **MUST** match an entry in the operation registry. The `inputs:` block maps the operation's declared input names to workspace layers. The `params:` block provides parameter values, either static values or form-bound definitions.

*See [Operations](/operations/) for the full operation model.*

---

## `engine:` Mode - Inline SQL or Python

Engines are a core platform concept. They live at `folia/engines/` and are dispatched by the compute executor.

*Decided in [ADR-0007](/decisions/#adr-0007)*

### SQL Engine

SQL is declarative, sandboxed, and runs via DuckDB-WASM (client-side for small data) or DuckDB native (server-side for large data).

```yaml
layers:
  analysis/parcels-summary:
    type: table
    compute:
      engine: sql
      query: |
        SELECT *, area_ha / total_area * 100 AS pct
        FROM read_parquet('input.parquet')
      inputs:
        input: { layer: source/parcels }
```

Input layers are referenced as `:input_name` bind variables in SQL. Parameter values are referenced as `:param_name`.

```yaml
layers:
  pricing/calculator:
    type: computed
    compute:
      engine: sql
      query: |
        SELECT :count * ondemand_hr * :hours AS monthly_cost
        FROM :prices
        WHERE instance_type = :instance_type
      inputs:
        prices: { layer: cloud_pricing/ec2 }
      params:
        instance_type: { type: select, source: cloud_pricing/ec2 }
        hours: { type: slider, min: 0, max: 730, default: 730 }
        count: { type: number, default: 1 }
```

### Python Engine

Python is Turing-complete and file-referenced. For pure Python and numpy, it runs in-browser via Pyodide. For operations requiring native libraries (GDAL, rasterio), it runs server-side. Python code **MUST** be stored as a file, never inline in YAML.

```yaml
layers:
  analysis/risk-zones:
    type: raster
    compute:
      engine: python
      module: ./classify.py
      function: compute
      inputs:
        elevation: { layer: terrain/elevation }
      params:
        threshold: { type: number, default: 35 }
```

The referenced Python file:

```python
# layers/analysis/risk-zones/classify.py
def compute(elevation, threshold=35):
    """Classify terrain risk zones from elevation-derived slope."""
    slope = elevation.slope(algorithm="horn")
    return (slope > threshold).astype(int)
```

SQL is **configuration**: small, declarative, safe inline. Python is **code**: always a file, git-trackable, reviewable, container-sandboxed.

*Decided in [ADR-0005](/decisions/#adr-0005) D1*

---

## `steps:` Mode - Multi-Stage Pipeline

Chains operations and engines. Output of step N feeds step N+1. Named intermediates (`as:`) can be referenced by later steps.

```yaml
layers:
  analysis/vegetation-index:
    type: raster
    compute:
      steps:
        - op: cloud_mask
          params: { sensor: landsat8 }
        - op: ndvi_composite
          params: { method: greenest }
        - op: focal_median
          params: { radius: 10 }
          as: ndvi_smoothed
        - op: raster_reclassify
          inputs: { raster: { ref: ndvi_smoothed } }
          params:
            breaks: [0, 0.2, 0.4, 0.6, 0.8, 1.0]
      inputs:
        imagery: { layer: source/landsat8 }
```

### Step Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `op` | string | Exclusive with `engine` | Registered operation for this step. |
| `engine` | string | Exclusive with `op` | `sql` or `python` for this step. |
| `inputs` | object | No | Overrides or additions to pipeline inputs for this step. |
| `params` | object | No | Parameters for this step. |
| `as` | string | No | Name for this step's output. Later steps can reference it via `{ ref: name }`. |

`op:` and `engine:` **MAY** be mixed in the same chain. If any step requires native dependencies, the entire chain runs server-side.

---

## Input References

The `inputs:` block maps named inputs to data sources. Three reference types are supported:

| Reference | Syntax | Description |
|-----------|--------|-------------|
| Workspace layer | `{ layer: terrain/elevation }` | References a layer defined in the workspace. |
| Step output | `{ ref: step_name }` | References the output of a named step (in `steps:` mode). |
| Self | `{ self: true }` | References the layer's own `uri` data. |

### The `self: true` Pattern

When a layer has both `uri` (stored data) and a `compute:` block, the compute can reference its own data:

```yaml
layers:
  terrain/slope:
    uri: catalog://terrain/slope@v2
    type: raster
    compute:
      engine: sql
      query: SELECT * FROM :self WHERE slope_angle > :threshold
      inputs:
        self: { self: true }
      params:
        threshold: { type: number, default: 35 }
```

- `{ self: true }` is only valid on layers that have a `uri`.
- `{ self: true }` **MAY** coexist with other layer inputs.
- Without `{ self: true }`, compute produces output purely from inputs and params.

---

## Execution Mode Inference

The runtime infers the execution mode. There is no `mode:` flag.

| Condition | Mode | Behavior |
|-----------|------|----------|
| All inputs static, no form params | **Batch** | Run once, store result at `uri`. |
| Any param bound to a form control | **Reactive** | Re-execute on form change. |
| Depends on a reactive layer | **Reactive** | Reactivity propagates up the DAG. |
| Layer has `refresh: schedule(...)` | **Scheduled** | Re-execute on cron. |

*Decided in [ADR-0002](/decisions/#adr-0002) and [ADR-0005](/decisions/#adr-0005)*

---

## Compute Routing

The platform routes operations to one of three **compute tiers** based on data size, operation type, and engine:

| Tier | When | Tools Used |
|------|------|------------|
| **Browser** | `engine: sql` with data < 50 MB, pure Python via Pyodide | DuckDB-WASM, Pyodide, client-side rendering |
| **Local** | `engine: sql` with data >= 50 MB, `op:` with local data | DuckDB native, GDAL, rasterio, Python |
| **Cloud** | Large-scale batch, fan-out/reduce, continental-scale ops | Same libraries, server-side compute |

The user does not choose a tier. The platform picks based on data size and operation type.

### Routing Rules

For `op:` mode, the platform selects a tier automatically:

| Signal | Routing |
|--------|---------|
| Data is local, operation is lightweight | **Local** tier. |
| Data is in R2/S3 (folia-managed) | **Cloud** tier (compute near the data). |
| Data has `gee://` URI | **External** - Google Earth Engine. |
| Explicit `backend: gee` on compute block | **External** - Google Earth Engine. |

For `engine:` mode, routing is based on engine type and data size:

| Context | Tier |
|---------|------|
| `engine: sql`, data < 50 MB | **Browser** (DuckDB-WASM, client-side) |
| `engine: sql`, data >= 50 MB | **Local** (DuckDB native, server-side) |
| `engine: python`, pure Python/numpy, data < 50 MB | **Browser** (Pyodide) |
| `engine: python`, needs native libs (GDAL, rasterio) | **Local** or **Cloud** |
| Multi-step chain with any native-dependency step | Entire chain runs **Local** or **Cloud** |

### External Compute

Google Earth Engine is an **external compute platform** - it runs on GEE's infrastructure, not folia's. This is the one case where the user makes an explicit choice via `backend: gee`. All other routing is automatic.

*Decided in [ADR-0005](/decisions/#adr-0005) D7 and [ADR-0007](/decisions/#adr-0007)*

---

## Parameter Binding

Parameters defined in `compute.params` bind to form controls in the UI and to query variables in SQL:

```yaml
compute:
  engine: sql
  query: |
    SELECT * FROM :data
    WHERE elevation > :min_elev
    AND slope < :max_slope
  inputs:
    data: { layer: terrain/combined }
  params:
    min_elev: { type: slider, min: 0, max: 5000, default: 1000 }
    max_slope: { type: slider, min: 0, max: 90, default: 45 }
```

- Parameter names map to `:param` bind variables in SQL by name.
- Input layer names map to `:input` bind variables in SQL by name.
- For Python engines, parameters are passed as keyword arguments to the function.

The form rendering (slider vs. dropdown vs. toggle) is a view concern. The `params:` block defines the data contract: what type, what range, what default. The UI reads this contract and renders appropriate controls.
