# Vector Operations

Vector operations transform feature geometries: buffering, dissolving, intersecting, clipping, simplifying, and more. Implemented using GeoPandas and Shapely, running in the local or cloud compute tier.

Part of the [geo domain](/domains/geo).

## Operations

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `vector_buffer` | vector → vector | Create buffer zones around geometries. Supports positive (expansion) and negative (erosion) buffers. Output is always polygon. | `distance` (meters, required), `cap_style`, `join_style`, `dissolve` (bool) |
| `vector_dissolve` | vector → vector | Merge features into a single geometry, optionally grouped by attribute. | `by` (attribute name) |
| `vector_intersection` | vector + vector → vector | Geometric intersection of two feature sets. Returns overlapping portions. | *(none)* |
| `vector_union` | vector + vector → vector | Geometric union of two feature sets. Returns combined area. | *(none)* |
| `vector_simplify` | vector → vector | Reduce vertices while maintaining shape (Douglas-Peucker algorithm). | `tolerance` (required) |
| `vector_clip` | vector + vector → vector | Clip features to a mask polygon. Only portions inside the mask are retained. | *(none, mask is an input)* |
| `vector_centroid` | vector → vector | Compute centroid points for polygon or line features. | *(none)* |
| `vector_harmonize` | vector → vector | Harmonize feature attributes using crosswalk mappings. | crosswalk reference |
| `vector_spatial_containment` | vector + vector → vector | Spatial containment query: features from set A that are within features of set B. | *(none)* |
| `vector_name_clean` | vector → vector | Clean and normalize feature name attributes. | rules |
| `vector_upstream_trace` | vector → vector | Trace upstream network from a point through connected features. | *(network topology)* |

## Examples

### Buffer and Dissolve

```yaml
layers:
  analysis/exclusion-zones:
    type: vector
    description: "500m buffer around protected areas, dissolved"
    compute:
      op: vector_buffer
      inputs:
        features: { layer: source/protected-areas }
      params:
        distance: 500
        dissolve: true
    style:
      fill: "#D32F2F"
      fill-opacity: 0.3
      stroke: "#B71C1C"
```

### Intersection

```yaml
layers:
  analysis/overlap:
    type: vector
    compute:
      op: vector_intersection
      inputs:
        features1: { layer: source/parcels }
        features2: { layer: source/flood-zones }
```

### Clip Features to Study Area

```yaml
layers:
  analysis/local-roads:
    type: vector
    compute:
      op: vector_clip
      inputs:
        features: { layer: source/road-network }
        mask: { layer: source/study-area }
```

### Dissolve by Attribute

```yaml
layers:
  analysis/county-boundaries:
    type: vector
    compute:
      op: vector_dissolve
      inputs:
        features: { layer: source/census-tracts }
      params:
        by: county_fips
```
