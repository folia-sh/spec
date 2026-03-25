# Use Cases

folia use cases document real-world analytical workflows. Each use case specifies a persona, required operations, data sources, and views. Readiness is automatically scored against the platform's current capabilities using `trk uc show UC-XXX`.

## Use Cases by Theme

### #terrain - Terrain Analysis

| Use Case | Description | Key Operations |
|---|---|---|
| [Terrain Analysis](/use-cases/terrain-analysis) | Derive slope, aspect, hillshade, and terrain classes from DEM. Zonal stats by watershed. | `terrain_slope`, `terrain_aspect`, `terrain_hillshade`, `raster_reclassify`, `analysis_zonal_stats` |
| Solar Siting | [Weighted overlay](/use-cases/weighted-overlay) combining terrain, land cover, and grid proximity for renewable energy site selection. | `analysis_weighted_overlay`, `analysis_h3_index` |
| Wildfire Risk | Multi-criteria terrain and vegetation assessment for fire risk. | `terrain_slope`, `raster_ndvi`, `analysis_weighted_overlay` |

### #vegetation - Vegetation Monitoring

| Use Case | Description | Key Operations |
|---|---|---|
| [NDVI Change Detection](/use-cases/change-detection) | Compare NDVI between two dates to identify vegetation loss and recovery. | `raster_ndvi`, `raster_change_detection`, `raster_reclassify` |
| Precision Agriculture | Field-level NDVI tracking across growing season. | `raster_ndvi`, `analysis_zonal_stats`, `temporal_resample` |
| Deforestation Monitoring | Hansen GFC loss analysis within protected areas. | `raster_reclassify`, `analysis_zonal_stats`, `vector_buffer` |

### #land-cover - Land Cover

| Use Case | Description | Key Operations |
|---|---|---|
| Land Cover Composition | Area statistics per land cover class within administrative boundaries. | `analysis_zonal_stats`, `raster_reclassify` |
| Urban Heat Island | LST + impervious surface correlation analysis. | `raster_calc`, `analysis_zonal_stats` |

### #water - Water Resources

| Use Case | Description | Key Operations |
|---|---|---|
| Wetland Resilience | Temporal water occurrence analysis using JRC data. | `temporal_period_stats`, `analysis_zonal_stats` |
| Dam Risk Screening | Multi-criteria assessment of dam infrastructure vulnerability. | `analysis_weighted_overlay`, `vector_buffer` |

### #health - Health & Accessibility

| Use Case | Description | Key Operations |
|---|---|---|
| Healthcare Accessibility | Travel distance to facilities with population-weighted scoring. | `analysis_distance_to_features`, `analysis_zonal_stats` |

### #compliance - Regulatory Compliance

| Use Case | Description | Key Operations |
|---|---|---|
| EUDR Compliance | EU Deforestation Regulation screening for commodity supply chains. | `raster_change_detection`, `vector_clip`, `analysis_zonal_stats` |
| TNFD Screening | Taskforce on Nature-related Financial Disclosures biodiversity assessment. | `analysis_weighted_overlay`, `raster_reclassify` |

## CBGB Benchmarks

The [CBGB benchmark suite](/use-cases/benchmarks) provides 43 validated problems with ground-truth answers. See the [benchmarks page](/use-cases/benchmarks) for details.
