# Publishing

A workspace becomes publishable by adding identity metadata. Publishing pushes the workspace and its artifacts to the catalog, making them available at `data.folia.sh`.

*Decided in [ADR-0013](/decisions/#adr-0013) - `data.folia.sh`, `@tag` versioning, artifact-first URLs.*
*Decided in [ADR-0028](/decisions/#adr-0028) - everything is a workspace.*

## Publishable Workspace

A `folia.yaml` becomes publishable when it includes `name`, `version`, and `author`:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Workspace identifier (URL-safe slug) |
| `version` | string | Yes | Semantic version (e.g., `"1.0"`, `"2.3.1"`) |
| `description` | string | No | Human-readable description |
| `author` | string | Yes | Author or organization name |
| `license` | string | No | SPDX license identifier (e.g., `MIT`, `CC-BY-4.0`) |

```yaml
name: solar-siting-utah
version: "1.0"
description: >
  Multi-criteria solar siting analysis for southern Utah.
author: Nathan
license: CC-BY-4.0

settings:
  default_bbox: [-113.5, 38.1, -113.0, 38.6]

layers:
  # ... layer definitions
```

## Publishing Workflow

```bash
# Publish workspace to catalog
folia publish

# Publish with explicit version tag
folia publish --tag v1.0

# Dry run - validate without publishing
folia publish --dry-run
```

The `folia publish` command:

1. Validates the `folia.yaml` schema
2. Resolves all layer dependencies
3. Materializes computed layers (if not already cached)
4. Uploads artifacts to object storage (R2)
5. Registers the workspace in the catalog
6. Creates an OGC Records entry

## Artifact URLs

Published artifacts are served at `data.folia.sh` under the owner's namespace:

```
https://data.folia.sh/@owner/workspace
https://data.folia.sh/@owner/workspace/layer-path
https://data.folia.sh/@owner/workspace@v1.0/layer-path
```

| URL Pattern | Description |
|---|---|
| `@owner/workspace` | Latest version of the workspace |
| `@owner/workspace@v1.0` | Specific version |
| `@owner/workspace/layer-path` | Specific layer artifact |
| `@owner/workspace@v1.0/layer-path` | Versioned layer artifact |

## Versioning

Workspaces use `@tag` versioning:

- `@v1.0` - specific version tag
- `@latest` - most recent published version (default when no tag specified)
- Tags are immutable. Publishing a tag that already exists is an error.

## Visibility

| Level | Description |
|---|---|
| `public` | Anyone can discover and access |
| `unlisted` | Accessible by URL, not discoverable in search |
| `private` | Only the owner and authorized users |

Default visibility is `unlisted`. Set to `public` to appear in catalog search.

## Catalog Registration

Publishing creates an OGC Records-compliant catalog entry with:

- Spatial extent (from `settings.default_bbox` or computed from layers)
- Temporal extent (if temporal layers are present)
- Keywords and themes (from layer tags and concept mappings)
- Provenance (source URIs, operation chain)
- License and attribution

*Decided in [ADR-0028](/decisions/#adr-0028) - OGC Records native, not pgSTAC.*
