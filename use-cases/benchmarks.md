# CBGB Benchmarks

**CBGB** (Cloud-Based Geospatial Benchmarks) is a suite of 43 benchmark problems from Cardille et al. (2025) converted to `folia.yaml` workspaces. Each problem has a known ground-truth answer, enabling automated validation that the platform produces correct results.

The full benchmark suite lives at `workspaces/cbgb/` in the main repository.

## Purpose

CBGB validates that folia can:

1. **Express** real-world geospatial analyses declaratively in YAML
2. **Execute** those analyses and produce correct results
3. **Scale** from simple vector queries to multi-year satellite compositing

## The `cbgb:` Block

Each benchmark workspace includes a `cbgb:` metadata block:

| Field | Type | Required | Description |
|---|---|---|---|
| `problem_id` | string | Yes | Canonical problem ID (e.g., `FRC_1`, `EBA_A1.2_A1a`) |
| `difficulty` | string | Yes | `easy`, `intermediate`, or `difficult` |
| `ground_truth` | number | Yes | Expected answer value |
| `units` | string | Yes | Units of the answer (e.g., `hectares`, `NDVI`) |
| `tolerance_pct` | number | Yes | Acceptable deviation from ground truth (%) |
| `source` | string | Yes | Citation for the benchmark |

```yaml
cbgb:
  problem_id: "FRC_1"
  difficulty: easy
  ground_truth: 3084127.799
  units: hectares
  tolerance_pct: 5
  source: "Cardille et al. (2025)"
```

## Problem Categories

| Category | Count | Description | Example Problems |
|---|---|---|---|
| Vector-only queries | 9 | Attribute filtering, area calculation, spatial intersection, length | FRC_1, FRC_2, FRC_3, FRC_5, FRC_8, FRC_9 |
| Single-scene band math | 7 | Fetch one scene, compute band ratio, extract at point | EBD_F2.0_C1, EBA_F2.0_A1, EBA_F3.1_A1 |
| Small-area raster analysis | 6 | Zonal stats, slope, or water occurrence over small AOI | FRC_10, FRC_11, FRC_12, EBA_F5.2_A2 |
| Temporal point extraction | 3 | Multi-scene value at single pixel, compositing/regression | EBD_F4.1_C2, EBD_F4.6_C1, EBD_F4.2_C1 |
| Pre-computed global COGs | 3 | Hansen GFC or similar, zonal stats over parks | EBA_F5.1_A1, EBA_F5.1_A2, EBD_F5.1_C1 |
| Annual/multi-year compositing | 6 | Large-area temporal compositing (cloud-required) | EBD_F4.1_C1, EBD_F4.3_C1, EBD_F4.4_C2 |
| Classification / ML | 5 | RF, SVM, KMeans training + classification | EBA_A1.2_A1a, EBD_F2.1_C1, EBD_F2.2_C2 |
| Multi-sensor regression | 2 | Cross-sensor calibration + regression | EBD_F3.0_C1, EBD_F3.0_C2 |
| Metadata-only | 1 | STAC catalog query counting | EBA_F1.3_A3 |
| Pure math | 1 | Combinatorial calculation, no geodata | FRC_13 |

## Difficulty Distribution

| Difficulty | Count | Client-Runnable | Cloud-Required |
|---|---|---|---|
| Easy | 15 | 14 | 1 |
| Intermediate | 17 | 10 | 7 |
| Difficult | 11 | 6 | 5 |
| **Total** | **43** | **30 (70%)** | **13 (30%)** |

## Example: FRC_1 - Watershed Area Calculation

```yaml
name: cbgb-frc-1
version: "1.0"
description: >
  CBGB Benchmark FRC_1 (Easy): Calculate the area of the HUC04
  watershed with code '0707'. Expected: 3,084,127.799 hectares.

settings:
  default_crs: EPSG:4326

cbgb:
  problem_id: "FRC_1"
  difficulty: easy
  ground_truth: 3084127.799
  units: hectares
  tolerance_pct: 5
  source: "Cardille et al. (2025)"

layers:

  source/watersheds:
    uri: gee://USGS/WBD/2017/HUC04
    type: vector
    description: USGS WBD HUC04 level boundaries

  compute/watershed-0707:
    type: vector
    description: HUC04 polygon for code '0707'
    compute:
      op: tabular_filter
      inputs:
        table: { layer: source/watersheds }
      params:
        expression: "huc4 == '0707'"

  result/area:
    type: table
    description: Area of watershed 0707 in hectares
    compute:
      op: vector_area
      inputs:
        features: { layer: compute/watershed-0707 }
      params:
        units: hectares
    style:
      table:
        columns:
          - { field: area_hectares, label: "Area (hectares)", format: ",.3f" }

  compute/watershed-explorer:
    type: vector
    description: Explore any HUC04 watershed by code
    compute:
      op: tabular_filter
      inputs:
        table: { layer: source/watersheds }
      params:
        expression: "huc4 == '0707'"
    style:
      form:
        fields:
          - name: huc_code
            type: text
            default: "0707"
            label: "HUC4 Code"
            description: Enter a 4-digit HUC code to calculate watershed area.
```

## Running Benchmarks

```bash
trk bench ls              # list all benchmarks with status
trk bench run FRC_1       # run a specific benchmark
trk bench status          # show latest pass/fail for all benchmarks
```

A benchmark **passes** if the computed result is within `tolerance_pct` of `ground_truth`.

## Reference

- Cardille, J. A., et al. (2025). *Cloud-Based Remote Sensing with Google Earth Engine.*
- Full workspace library: `workspaces/cbgb/` (43 problems)
- Client vs. cloud analysis: `workspaces/cbgb/CLIENT_VS_CLOUD.md`
