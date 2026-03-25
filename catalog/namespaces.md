# Namespace Model

folia's catalog organizes datasets into a three-tier namespace hierarchy. Every published dataset has a unique identity. Unpublished workspace-local data requires no identity at all.

*Decided in [ADR-0028](/decisions/#adr-0028) - `@owner/project/dataset` two-level identity. Everything is a workspace.*
*Decided in [ADR-0026](/decisions/#adr-0026) - `#concept`/`@source` patterns, agent-mediated discovery.*

## Namespace Tiers

| Tier | Pattern | Description | Example |
|---|---|---|---|
| **commons** | `commons/` | Platform-curated, trusted datasets | `commons/boundaries/us-states` |
| **user/org** | `@owner/` | User-published datasets and workspaces | `@usgs/3dep`, `@nathan/solar-siting` |
| **workspace-local** | *(none)* | Unpublished, local-only | `data/dem.tif` (relative path) |

## Identity Pattern

Published datasets use a two-level identity:

```
@owner/project/dataset
```

| Component | Description | Example |
|---|---|---|
| `@owner` | User or organization namespace | `@usgs`, `@nasa`, `@nathan` |
| `project` | Workspace or collection name | `3dep`, `sentinel2`, `solar-siting` |
| `dataset` | Specific dataset within the project | `wasatch-10m`, `B04`, `suitability` |

A workspace published as `@nathan/solar-siting` makes all its layers available under that namespace. Individual layers are addressable as `@nathan/solar-siting/suitability/composite`.

## Concept Refs

Concept refs use a `#theme/concept` pattern for **intent-based discovery**. The catalog resolves a concept ref to the best matching dataset based on coverage, recency, and resolution.

```yaml
layers:
  dem:
    ref: "#terrain/dem"      # resolved to best DEM for workspace bbox
  landcover:
    ref: "#land-cover/nlcd"  # resolved to NLCD for CONUS, ESA WorldCover elsewhere
```

Concepts are organized into a `#theme/concept` hierarchy:

| Theme | Example Concepts |
|---|---|
| `#terrain` | `dem`, `slope`, `aspect` |
| `#land-cover` | `nlcd`, `esa-worldcover`, `copernicus-glc` |
| `#vegetation` | `ndvi`, `evi`, `lai` |
| `#water` | `occurrence`, `extent`, `quality` |
| `#climate` | `temperature`, `precipitation`, `humidity` |
| `#boundaries` | `countries`, `states`, `counties`, `watersheds` |

## Source Refs

Source refs use an `@source` pattern for **specific dataset access**. No ambiguity; the user knows exactly what they want.

```yaml
layers:
  dem:
    ref: "@usgs/3dep"          # USGS 3DEP, any resolution
  imagery:
    ref: "@copernicus/sentinel2/B04"  # Sentinel-2 Band 4
```

## Resolution Rules

When a layer uses `ref:` instead of `uri:`, the catalog resolves it:

1. **Source refs** (`@owner/...`) - direct lookup by namespace path
2. **Concept refs** (`#theme/concept`) - resolved using:
   - Workspace `default_bbox` for spatial coverage matching
   - Available resolution tiers
   - Recency preferences
   - User-configured source preferences

## Workspace-Local Data

Layers with `uri:` pointing to relative or absolute paths are workspace-local. They are never published to the catalog and require no namespace registration.

```yaml
layers:
  dem:
    uri: data/dem.tif          # relative to workspace root
    type: raster
```

Workspace-local URIs MUST NOT start with `@` or `#`.

## Namespace Registration

Organizations and users register namespaces through the platform. Namespace ownership follows standard rules:

- `@org/` namespaces require organization membership
- `@user/` namespaces are created on first publish
- `commons/` is platform-managed (curated datasets only)
- Namespace squatting is prohibited; namespaces without published content MAY be reclaimed
