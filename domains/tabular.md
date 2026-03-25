# Tabular Domain

For non-spatial or weakly-spatial tabular data. All operations are powered by DuckDB, operating on Parquet, CSV, and Arrow tables.

*Decided in [ADR-0006](/decisions/#adr-0006)*

## Schema Extension

The `tabular:` block on a layer declares tabular metadata.

| Field | Type | Required | Description |
|---|---|---|---|
| `key_column` | string | No | Primary key column name |
| `index` | list | No | Columns to index for fast lookups |
| `column_types` | object | No | Column type overrides (e.g., `{"zip": "VARCHAR"}`) |

```yaml
layers:
  census-tracts:
    uri: data/tracts.parquet
    type: table
    tabular:
      key_column: geoid
      index: [state_fips, county_fips]
      column_types:
        geoid: VARCHAR
```

## Operations

The tabular domain provides 6 operations in 3 categories:

### Transform

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `tabular_filter` | table → table | Filter rows using a SQL WHERE expression | `where` (string, required) |
| `tabular_select` | table → table | Select, rename, or compute columns | `columns`, `exclude`, `expressions` |
| `tabular_sort` | table → table | Sort rows by columns, optionally limit to top-N | `by` (array, required), `limit` |

### Combine

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `tabular_join` | table + table → table | Join two tables on matching columns (inner, left, right, outer, cross) | `on` or `left_on`/`right_on`, `how` |
| `tabular_union` | table[] → table | Stack rows from multiple tables vertically | `distinct` (boolean) |

### Summarize

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `tabular_aggregate` | table → table | Group rows and compute aggregate statistics | `group_by` (array, required), `aggregations` (object, required), `having`, `order_by`, `limit` |

## Compute

All tabular operations are powered by DuckDB. For datasets under ~50 MB, queries run in-browser via DuckDB-WASM (instant, free). Larger datasets run server-side with DuckDB native in the local or cloud tier.

DuckDB provides:

- SQL-based transforms on Parquet, CSV, and Arrow tables
- Zero-copy reads from Parquet files
- Window functions, CTEs, and full SQL expression support

## Examples

### Filter and Aggregate

```yaml
layers:
  source/sales:
    uri: data/sales.parquet
    type: table
    tabular:
      key_column: order_id

  analysis/active-sales:
    type: table
    compute:
      op: tabular_filter
      inputs:
        table: { layer: source/sales }
      params:
        where: "status = 'active' AND amount > 100"

  results/sales-by-region:
    type: table
    compute:
      op: tabular_aggregate
      inputs:
        table: { layer: analysis/active-sales }
      params:
        group_by: [region]
        aggregations:
          total_sales: "SUM(amount)"
          avg_order: "AVG(amount)"
          order_count: "COUNT(*)"
        order_by: ["total_sales DESC"]
    style:
      table:
        columns:
          - { field: region, label: Region }
          - { field: total_sales, label: "Total Sales", format: "$,.2f" }
          - { field: order_count, label: Orders }
```

### Join Two Tables

```yaml
layers:
  analysis/enriched:
    type: table
    compute:
      op: tabular_join
      inputs:
        left: { layer: source/orders }
        right: { layer: source/customers }
      params:
        on: customer_id
        how: left
```
