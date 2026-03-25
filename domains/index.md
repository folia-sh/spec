# Domain System

folia's core is **domain-agnostic**. Domains are pluggable modules that extend the platform with:

- **Schema extensions** - additional properties on layers (e.g., `geo:`, `tabular:`)
- **Operations** - domain-specific transforms and analyses
- **Implementations** - the libraries and logic that execute those operations

*Decided in [ADR-0006](/decisions/#adr-0006)*

## Domain vs Operation Category

Not everything that adds operations is a domain. The litmus test: **"Can it be a top-level block on a layer?"**

|  | Domain | Operation Category |
|---|---|---|
| **Adds** | Schema extension on layers | Operations + display hints |
| **Answers** | "What kind of data?" | "What can I do with it?" |
| **Example** | `geo`, `tabular`, `temporal` | `terrain`, `h3`, `hydrology` |
| **Layer block** | `geo: {}`, `tabular: {}` | None |

Operation categories (like `terrain` or `hydrology`) live *inside* a domain. They organize operations but do not extend the layer schema.

## Module Structure

Each domain is a Python package under `folia/domains/<name>/`:

```
folia/domains/<name>/
  domain.yaml       # manifest
  schema/            # JSON Schema extensions
  operations/        # Operation YAMLs organized by category
  implementations/   # Operation implementations
```

## Domain Manifest

The `domain.yaml` file declares a domain's identity and capabilities.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique domain identifier |
| `name` | string | Yes | Human-readable name |
| `version` | string | No | Semantic version |
| `description` | string | No | What this domain provides |
| `schema_extension` | string | Yes | Key added to layers (e.g., `geo:`) |
| `transforms_module` | string | Yes | Python module path for transform implementations |
| `operations_dir` | string | No | Path to operation YAML directory |
| `implementations` | list | No | Available operation implementations |
| `default_implementation_priority` | list | No | Ordered implementation preference |
| `types` | list | No | Data types this domain introduces |
| `uri_schemes` | list | No | URI schemes this domain handles |

```yaml
# folia/domains/geo/domain.yaml
name: geo
schema_extension: "geo:"
transforms_module: folia.domains.geo.transforms
description: >
  Geospatial domain - terrain analysis, raster/vector transforms,
  H3 hexagonal indexing, tile generation, STAC and USGS 3DEP connectors.
```

## Current Domains

| Domain | Operations | Priority | Description |
|---|---|---|---|
| **[geo](/domains/geo)** | 47 | P1 | Geospatial - terrain, raster, vector, analysis, imagery, classification, hydrology, utility |
| **[tabular](/domains/tabular)** | 6 | P1 | Tabular data - DuckDB-powered SQL transforms |
| **[temporal](/domains/temporal)** | 6 | P2 | Time-series - resample, rolling, align, interpolate |
| **ml** | 4 | P3 | Machine learning - foundation model inference, embedding, chip/reassemble |

Future domains under consideration: `imagery` (P2), `sensor` (P3).

## Third-Party Domains

Domains are pip-installable. A third-party domain ships as a standard Python package:

```bash
pip install folia-medical
```

This installs to `folia/domains/medical/` and is automatically discovered at startup. Third-party domains follow the same manifest and directory conventions as built-in domains.

## How Domains Compose

A single layer MAY include extensions from multiple domains:

```yaml
layers:
  weather-stations:
    uri: s3://bucket/stations.parquet
    type: table
    geo:
      bbox: [-120, 35, -110, 45]
      crs: EPSG:4326
    tabular:
      key_column: station_id
    temporal:
      time_column: observed_at
      frequency: 1h
```

The `geo:`, `tabular:`, and `temporal:` blocks are each validated by their respective domain's JSON Schema extension. The core layer schema knows nothing about their contents.

*Decided in [ADR-0001](/decisions/#adr-0001) - everything is a layer, domains extend the layer schema.*
