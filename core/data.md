# Data URIs and Sources

The `uri` field on a layer defines where its data lives. folia treats everything as a pointer with a protocol, whether the data is a local file, a cloud object, a STAC catalog entry, or an API endpoint.

*Core philosophy: everything is a pointer. Decided in [ADR-0001](/decisions/#adr-0001) and [ADR-0005](/decisions/#adr-0005).*

---

## URI Schemes

| Scheme | Example | Description |
|--------|---------|-------------|
| `file://` | `data/dem.tif` | Local file relative to workspace root. The `file://` prefix is optional for local paths. |
| `https://` | `https://example.com/data.tif` | Remote file accessible over HTTPS. |
| `s3://` | `s3://bucket/key` | AWS S3 object. |
| `r2://` | `r2://bucket/key` | Cloudflare R2 object. |
| `gs://` | `gs://bucket/key` | Google Cloud Storage object. |
| `stac://` | `stac://planetary-computer/sentinel-2-l2a` | STAC catalog item. The platform resolves the STAC API, queries for matching assets, and fetches the data. |
| `gee://` | `gee://USGS/NED` | Google Earth Engine asset. Requires GEE authentication. |
| `catalog://` | `catalog://terrain/slope@v2` | folia catalog artifact. Versioned with `@tag`. |
| `commons/` | `commons/usgs/3dep/1m` | Platform-curated commons dataset. Maintained by the folia team or community bots. |
| `@user/` | `@nathan/terrain/slope` | User-published layer in the catalog. |
| `api://` | `api://openweathermap/current` | External API endpoint. Data is fetched on demand, not stored. |
| `postgres://` | `postgres://host/db` | PostgreSQL connection. Used for vector/tabular layers backed by a database. |

A layer **MUST** specify a `uri` (data definition) or a `ref` (reference to another layer), never both. Computed layers that produce output purely from inputs **MAY** omit both.

---

## Local Files

Local paths are resolved relative to the workspace root. The `file://` prefix is optional:

```yaml
layers:
  boundaries:
    uri: data/counties.gpkg
    type: vector

  elevation:
    uri: file://data/dem.tif
    type: raster
```

Files in the `data/` directory **SHOULD** be `.gitignored`. Large files (over the configurable threshold, default 50 MB) are represented locally as pointer files in `.folia/.pointers/` and stored in R2.

---

## Cloud Storage

```yaml
layers:
  imagery:
    uri: s3://my-bucket/sentinel/scene.tif
    type: raster
    auth:
      type: aws
      secret_ref: aws-credentials

  tiles:
    uri: r2://folia-data/terrain/slope.pmtiles
    type: raster
```

Cloud URIs follow the standard `scheme://bucket/key` pattern. Authentication is configured via the `auth:` block on the layer.

---

## STAC Catalog

```yaml
layers:
  sentinel:
    uri: stac://planetary-computer/sentinel-2-l2a
    type: raster
    params:
      bbox: [-112, 40, -111, 41]
      datetime: "2024-01/2024-06"
      query:
        eo:cloud_cover: { lte: 20 }
```

The platform resolves the STAC API endpoint, executes the search with the provided parameters, and fetches matching assets. STAC URIs **SHOULD** include spatial and temporal parameters to constrain the search.

---

## Catalog Artifacts

```yaml
layers:
  slope:
    uri: catalog://terrain/slope@v2
    type: raster
```

The `catalog://` scheme references artifacts in the folia catalog. The `@tag` suffix specifies a version. If omitted, the latest version is used.

---

## Three Namespaces

Data lives in three namespaces with different trust models:

| Namespace | Trust Model | Example |
|-----------|-------------|---------|
| `commons/` | Platform-curated. Reviewed, maintained, high trust. | `commons/usgs/3dep/1m` |
| `@user/` or `@team/` | User-published. Automated validation only. | `@nathan/wasatch-slope` |
| Workspace-local | Unpublished. No catalog entry, no validation. | `data/my_upload.tif` |

*Decided in [ADR-0005](/decisions/#adr-0005) D2*

### Concept Refs (`#`)

A concept ref resolves to the best dataset matching the workspace's bounding box and the concept definition:

```yaml
layers:
  elevation:
    ref: "#terrain/dem"
    # For Utah -> resolves to @usgs-3dep 1m
    # For Ghana -> resolves to @copernicus GLO-30
```

Concept definitions live in `registry/concepts/` as curated YAML files. The resolution strategy selects the best available dataset based on spatial coverage, resolution, and availability.

### Source Refs (`@`)

A source ref points to a specific dataset from a specific cataloged source:

```yaml
layers:
  population:
    ref: "@worldpop/population:GHA:2020:100m"
```

Source definitions live in `commons/sources.yaml`.

*Decided in [ADR-0026](/decisions/#adr-0026)*

---

## Authentication

The `auth:` block configures credentials for accessing protected data sources.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `auth.type` | enum | Yes | Authentication method: `api_key`, `oauth`, `basic`, `aws`. |
| `auth.secret_ref` | string | No | Reference to a stored secret (e.g., in `.folia/config.yaml` or a secret manager). |
| `auth.key` | string | No | Inline credential or environment variable reference (e.g., `${OPENWEATHER_API_KEY}`). |

### Examples

```yaml
# API key via environment variable
weather:
  uri: api://openweathermap/current
  type: api
  auth:
    type: api_key
    key: ${OPENWEATHER_API_KEY}

# Secret reference
private-data:
  uri: s3://private-bucket/data.parquet
  type: table
  auth:
    type: aws
    secret_ref: aws-production

# OAuth
earth-engine:
  uri: gee://USGS/NED
  type: raster
  auth:
    type: oauth
    secret_ref: gee-credentials
```

Secrets **MUST NOT** be stored in `folia.yaml`. They **SHOULD** be referenced via environment variables (`${VAR}`) or secret refs that resolve to `.folia/config.yaml` (which is `.gitignored`) or an external secret manager.

---

## Storage Rules

Where different types of data are stored:

| Data Type | Storage | Why |
|-----------|---------|-----|
| Layer definitions | Turso (primary), `folia.yaml` (sync) | Queryable, edge-available |
| Layer data (GeoTIFFs, PMTiles, Parquet) | R2 (object storage) | Large, binary, CDN-served |
| SQL expressions | Inline in layer definition | Small, declarative, DuckDB-safe |
| Python code | Files (git or R2) | Needs review, version control, sandboxing |

SQL is configuration: small, declarative, sandboxed by DuckDB. Python is code: Turing-complete, needs container sandboxing. The database stores a URI reference to Python files, never the code blob.

*Decided in [ADR-0005](/decisions/#adr-0005) D1*
