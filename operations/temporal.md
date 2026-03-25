# Temporal Operations

Temporal operations transform time-series data: resampling to different frequencies, rolling window aggregations, alignment of mismatched series, interpolation of gaps, time range filtering, and period statistics. All operations are powered by DuckDB.

Part of the [temporal domain](/domains/temporal).

## Operations

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `temporal_resample` | table → table | Resample to a different frequency. Groups rows into time buckets and aggregates. | `time_column`, `freq` (e.g., `1D`, `1W`, `1M`), `agg_method`, `value_columns` |
| `temporal_rolling` | table → table | Rolling window aggregation over a trailing time window. | `time_column`, `window` (e.g., `7D`, `24h`), `value_columns`, `agg` |
| `temporal_align` | table + table → table | Align two time series to common timestamps via ASOF JOIN. Finds nearest prior or equal timestamp. | `time_column`, `method` |
| `temporal_interpolate` | table → table | Fill gaps using forward fill (carry last known value) or backward fill. | `time_column`, `value_columns`, `method` (forward, backward) |
| `temporal_time_range` | table → table | Filter to a time window. Keeps rows where timestamp is within `[start, end]` inclusive. | `time_column`, `start`, `end` (ISO 8601) |
| `temporal_period_stats` | table → table | Compute statistics per calendar period (month, year, etc.). Groups by truncated timestamp. | `time_column`, `period` (day, week, month, quarter, year), `value_columns`, `aggregations` |

## Frequency Shorthand

Frequency strings follow a consistent format:

| Shorthand | Meaning |
|---|---|
| `30min` | 30 minutes |
| `1h` | Hourly |
| `1D` | Daily |
| `1W` | Weekly |
| `1M` | Monthly |
| `1Y` | Yearly |

## Examples

### Resample Hourly to Daily

```yaml
layers:
  analysis/daily:
    type: table
    compute:
      op: temporal_resample
      inputs:
        table: { layer: source/hourly-temps }
      params:
        time_column: observed_at
        freq: "1D"
        agg_method: mean
        value_columns: [temperature, humidity]
```

### 7-Day Rolling Average

```yaml
layers:
  analysis/smoothed:
    type: table
    compute:
      op: temporal_rolling
      inputs:
        table: { layer: analysis/daily }
      params:
        time_column: observed_at
        window: "7D"
        value_columns: [temperature]
        agg: mean
    style:
      chart:
        type: area
        x: observed_at
        y: temperature
```

### Align Two Sensors

```yaml
layers:
  analysis/aligned:
    type: table
    compute:
      op: temporal_align
      inputs:
        left: { layer: source/sensor-a }
        right: { layer: source/sensor-b }
      params:
        time_column: timestamp
        method: nearest
```

### Fill Gaps

```yaml
layers:
  analysis/filled:
    type: table
    compute:
      op: temporal_interpolate
      inputs:
        table: { layer: source/observations }
      params:
        time_column: observed_at
        value_columns: [temperature, pressure]
        method: forward
```

### Filter to Date Range

```yaml
layers:
  analysis/summer-2024:
    type: table
    compute:
      op: temporal_time_range
      inputs:
        table: { layer: source/observations }
      params:
        time_column: observed_at
        start: "2024-06-01"
        end: "2024-08-31"
```

### Monthly Statistics

```yaml
layers:
  results/monthly-summary:
    type: table
    compute:
      op: temporal_period_stats
      inputs:
        table: { layer: source/observations }
      params:
        time_column: observed_at
        period: month
        value_columns: [temperature, precipitation]
        aggregations:
          avg_temp: "AVG(temperature)"
          total_precip: "SUM(precipitation)"
          max_temp: "MAX(temperature)"
    style:
      chart:
        type: bar
        x: period
```
