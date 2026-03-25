# Temporal Domain

For time-series data. Provides resampling, rolling windows, alignment, interpolation, filtering, and period statistics. All operations are powered by DuckDB.

*Decided in [ADR-0006](/decisions/#adr-0006)*

## Schema Extension

The `temporal:` block on a layer declares time-series metadata.

| Field | Type | Required | Description |
|---|---|---|---|
| `time_column` | string | Yes | Column containing timestamps |
| `frequency` | string | No | Expected frequency: `1h`, `1D`, `1W`, `1M`, `1Y` |
| `timezone` | string | No | Timezone identifier (e.g., `UTC`, `America/Denver`) |
| `range` | object | No | Expected time range: `{start, end}` as ISO 8601 strings |
| `gaps` | string | No | Gap handling strategy |

```yaml
layers:
  weather-observations:
    uri: data/station-temps.parquet
    type: table
    temporal:
      time_column: observed_at
      frequency: 1h
      timezone: America/Denver
      range:
        start: "2020-01-01"
        end: "2024-12-31"
```

## Operations

The temporal domain provides 6 operations in 3 categories:

### Transform

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `temporal_resample` | table → table | Resample time series to a different frequency | `time_column`, `freq` (e.g., `1D`, `1W`), `agg_method`, `value_columns` |
| `temporal_rolling` | table → table | Rolling window aggregation over a trailing time window | `time_column`, `window` (e.g., `7D`), `value_columns`, `agg` |
| `temporal_align` | table + table → table | Align two time series to common timestamps via ASOF JOIN | `time_column`, `method` |
| `temporal_interpolate` | table → table | Fill gaps using forward or backward fill | `time_column`, `value_columns`, `method` |

### Filter

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `temporal_time_range` | table → table | Filter to a time window (inclusive bounds) | `time_column`, `start`, `end` (ISO 8601) |

### Aggregate

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `temporal_period_stats` | table → table | Statistics per calendar period (month, year, etc.) | `time_column`, `period`, `value_columns`, `aggregations` |

## Compute

All temporal operations are powered by DuckDB. For small datasets, queries run in-browser via DuckDB-WASM. Larger time-series data runs server-side with DuckDB native in the local or cloud tier.

DuckDB provides:

- Native timestamp types and `date_trunc()` for period grouping
- Window functions for rolling aggregations
- `ASOF JOIN` for time-series alignment
- Interval arithmetic for frequency-based operations

## Examples

### Daily Resample with 7-Day Rolling Average

```yaml
layers:
  source/hourly-temps:
    uri: data/station-temps.parquet
    type: table
    temporal:
      time_column: observed_at
      frequency: 1h

  analysis/daily-temps:
    type: table
    compute:
      op: temporal_resample
      inputs:
        table: { layer: source/hourly-temps }
      params:
        time_column: observed_at
        freq: "1D"
        agg_method: mean

  analysis/weekly-trend:
    type: table
    compute:
      op: temporal_rolling
      inputs:
        table: { layer: analysis/daily-temps }
      params:
        time_column: observed_at
        window: "7D"
        value_columns: [temperature]
        agg: mean
    style:
      chart:
        type: line
        x: observed_at
        y: temperature
```

### Filter and Summarize by Month

```yaml
layers:
  analysis/2024-only:
    type: table
    compute:
      op: temporal_time_range
      inputs:
        table: { layer: source/observations }
      params:
        time_column: observed_at
        start: "2024-01-01"
        end: "2024-12-31"

  results/monthly-stats:
    type: table
    compute:
      op: temporal_period_stats
      inputs:
        table: { layer: analysis/2024-only }
      params:
        time_column: observed_at
        period: month
        value_columns: [temperature, precipitation]
        aggregations:
          avg_temp: "AVG(temperature)"
          total_precip: "SUM(precipitation)"
          max_temp: "MAX(temperature)"
```
