# Layers

A layer is the fundamental data abstraction in folia. It is a pointer to information with metadata describing what it is, where it came from, and how it can be used. A layer replaces what other systems split into "sources," "artifacts," "datasets," and "layers." In folia, they are all layers.

*Decided in [ADR-0001](/decisions/#adr-0001)*

---

## Three Concerns

Every layer has three concerns:

| Concern | What It Covers | Fields |
|---------|---------------|--------|
| **Data** | Where the data lives and how it stays current | `uri`, `type`, `auth`, `refresh` |
| **Compute** | How the data is produced or transformed | `compute` (`op:` / `engine:` / `steps:`), `inputs`, `params` |
| **Style** | Optional visual defaults | `style` (palette, opacity, info overrides) |

Capabilities (what a layer can do: sample, clip, query, export) are inferred from `type:` and the operation registry. They are never manually declared.

*Decided in [ADR-0005](/decisions/#adr-0005) D6 and [ADR-0015](/decisions/#adr-0015) D1*

---

## Schema

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | Yes | Layer type: `raster`, `vector`, `api`, `computed`, `table`. |
| `uri` or `ref` | string | Conditional | `uri` for data layers, `ref` for reference layers. At least one **MUST** be present for non-computed layers. Mutually exclusive; a layer **MUST NOT** have both. |

### Core Optional Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | No | Human-readable description. |
| `compute` | [ComputeBlock](/core/compute) | No | Transformation logic. See [Compute](/core/compute). |
| `style` | [StyleBlock](/core/style) | No | Visual defaults. See [Style](/core/style). |
| `refresh` | string or object | No | Data update strategy. Default: `manual`. See [Refresh](/core/refresh). |
| `resolution` | string | No | Spatial resolution (e.g., `10m`, `30m`). Informational metadata. |
| `auth` | object | No | Authentication configuration. See [Data](/core/data). |
| `tags` | list | No | Searchable tags. |
| `geo` | GeoBlock | No | Geospatial domain extension (`bbox`, `crs`, `query_method`). |
| `tabular` | TabularBlock | No | Tabular domain extension. |
| `temporal` | TemporalBlock | No | Temporal domain extension (`type`, `timestamp`, `range`). |

### Domain Extension: `geo:`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `geo.bbox` | array | No | Spatial extent as `[west, south, east, north]`. |
| `geo.crs` | string | No | Coordinate reference system. Default: `EPSG:4326`. |
| `geo.query_method` | enum | No | `spatial_lookup`, `point_sample`, `nearest`. Inferred from `type` if omitted. |

---

## Layer Types

| Type | Description | Query Method | Typical Formats |
|------|-------------|--------------|-----------------|
| `raster` | Gridded pixel data (elevation, imagery, temperature) | `point_sample` | COG, Zarr, GeoTIFF |
| `vector` | Features with geometry (boundaries, parcels, trails) | `spatial_lookup` | GeoParquet, GeoJSON, PMTiles |
| `api` | External service (weather, geocoding) | `api_call` | -- |
| `computed` | Has a compute block, no external data source | `evaluate compute` | -- |
| `table` | Non-spatial tabular data (census, pricing) | `key_lookup` | Parquet, CSV |

A layer's `type` determines its capabilities. The platform infers what operations can accept the layer as input, what export formats are available, and what query methods apply.

*Decided in [ADR-0015](/decisions/#adr-0015) D1, D7*

---

## Minimal Layer

```yaml
layers:
  terrain/elevation:
    uri: catalog://terrain/dem
    type: raster
```

A layer **MUST** have a `type`. It **MUST** have either a `uri` (data definition) or a `ref` (reference to another layer), unless it is of type `computed` with a `compute:` block that produces output from inputs alone.

---

## Reference Layers (`ref`)

A layer can reference another layer's data while overriding style or other properties:

```yaml
layers:
  terrain/slope:
    uri: catalog://terrain/slope/wasatch@v2
    type: raster
    compute:
      op: terrain_slope
      inputs: { elevation: { layer: terrain/elevation } }
    style:
      palette: avalanche
      opacity: 0.7

  terrain/slope_contours:
    ref: terrain/slope
    style:
      type: line
      lineInterval: 5
      color: "#333"
      opacity: 0.5
```

### `ref` Rules

- A layer **MUST** specify either `uri` or `ref`, never both.
- `ref` inherits all properties from the target. Any property set locally overrides the inherited value.
- `ref` is a live pointer: if the parent's compute reruns or the parent's `uri` changes, all referencing layers see the new data.
- **One-hop only:** `ref` **MUST** point to a layer that has a `uri`, not another `ref`. No chains, no cycles.
- **Orphan handling:** If the `ref` target is deleted, referencing layers enter an error state. They **MUST** be re-pointed or deleted. No cascading deletes.
- **Detaching:** Replacing `ref` with `uri` on a child makes it independent (a "fork").

---

## Catalog Ref Patterns

In addition to referencing workspace-local layers, the `ref:` field supports catalog reference patterns:

```yaml
layers:
  # Concept reference - resolves to best dataset for workspace bbox
  elevation:
    ref: "#terrain/dem"

  # Source reference - specific dataset from a specific source
  ghana-pop:
    ref: "@worldpop/population:GHA:2020:100m"

  # Queryable source reference - with spatial/temporal parameters
  imagery:
    ref: "@earth-search/sentinel-2-l2a"
    params:
      bbox: [-3.26, 4.74, 1.19, 11.17]
      datetime: "2024-01/2024-06"
      query:
        eo:cloud_cover: { lte: 20 }
```

| Pattern | Sigil | Resolves To | Example |
|---------|-------|-------------|---------|
| Concept ref | `#` | Best dataset matching workspace bbox and concept | `ref: "#terrain/dem"` |
| Source ref | `@` | Specific dataset from a cataloged source | `ref: "@worldpop/population:GHA:2020:100m"` |
| Queryable ref | `@` + `params:` | Live query to external STAC API | `ref: "@earth-search/sentinel-2-l2a"` |

The `#` sigil maps to concept definitions in `registry/concepts/`. The `@` sigil maps to sources in `commons/sources.yaml`.

*Decided in [ADR-0026](/decisions/#adr-0026) D1, D5*

---

## Layer Namespacing

Layer keys are slash-delimited paths. The UI **SHOULD** render these as a collapsible tree:

```yaml
layers:
  terrain/elevation:
    uri: commons/usgs/3dep/1m
    type: raster
  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs: { elevation: { layer: terrain/elevation } }
  terrain/aspect:
    type: raster
    compute:
      op: terrain_aspect
      inputs: { elevation: { layer: terrain/elevation } }
  boundaries/counties:
    uri: file://data/counties.gpkg
    type: vector
```

This renders as:

```
terrain/
  elevation
  slope
  aspect
boundaries/
  counties
```

---

## Example: Source + Computed Layer

```yaml
layers:
  # Source layer - points to existing data
  terrain/elevation:
    uri: commons/usgs/3dep/1m
    type: raster
    style:
      palette: terrain
      info:
        fields: [elevation_m]
        format: "{value}m"
    geo:
      bbox: [-112.2, 40.4, -111.5, 40.8]
      crs: EPSG:4326

  # Computed layer - derives slope from elevation
  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        elevation: { layer: terrain/elevation }
      params:
        algorithm: horn
    style:
      palette: avalanche
      opacity: 0.7
      info:
        fields: [slope_degrees]
        format: "{value}deg"
        section: Terrain
    refresh: manual
```

The `terrain/slope` layer references `terrain/elevation` as an input. The workspace YAML is a DAG: layers compose by referencing each other through `compute.inputs`.
