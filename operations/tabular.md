# Tabular Operations

Tabular operations transform non-spatial table data: filtering, selecting, sorting, joining, combining, and aggregating. All operations are powered by DuckDB.

Part of the [tabular domain](/domains/tabular).

## Operations

| Operation | Type | Description | Key Params |
|---|---|---|---|
| `tabular_filter` | table → table | Filter rows using a SQL WHERE expression. | `where` (string, required) |
| `tabular_select` | table → table | Select, rename, or compute columns. Pick a subset, exclude columns, or add computed expressions. | `columns` (array), `exclude` (array), `expressions` (object) |
| `tabular_sort` | table → table | Sort rows by one or more columns. Optionally limit to top-N. | `by` (array, required), `limit` (int) |
| `tabular_join` | table + table → table | Join two tables on matching columns. Supports inner, left, right, outer, and cross joins. | `on`, `left_on`/`right_on`, `how` |
| `tabular_union` | table[] → table | Stack rows from multiple tables vertically. All tables MUST have compatible schemas. | `distinct` (bool) |
| `tabular_aggregate` | table → table | Group rows and compute aggregate statistics using SQL functions. | `group_by` (array, required), `aggregations` (object, required), `having`, `order_by`, `limit` |

## Examples

### Filter

```yaml
layers:
  analysis/active-users:
    type: table
    compute:
      op: tabular_filter
      inputs:
        table: { layer: source/users }
      params:
        where: "status = 'active' AND last_login > '2024-01-01'"
```

### Select and Compute Columns

```yaml
layers:
  analysis/enriched:
    type: table
    compute:
      op: tabular_select
      inputs:
        table: { layer: source/parcels }
      params:
        columns: [parcel_id, area_sqft, zone_code]
        expressions:
          area_acres: "area_sqft / 43560.0"
          zone_label: "CASE WHEN zone_code = 'R' THEN 'Residential' ELSE 'Commercial' END"
```

### Sort (Top-N)

```yaml
layers:
  results/top-emitters:
    type: table
    compute:
      op: tabular_sort
      inputs:
        table: { layer: source/facilities }
      params:
        by: ["emissions DESC"]
        limit: 10
    style:
      table:
        columns:
          - { field: name, label: Facility }
          - { field: emissions, label: "CO2 (tons)", format: ",.0f" }
```

### Join

```yaml
layers:
  analysis/orders-with-customers:
    type: table
    compute:
      op: tabular_join
      inputs:
        left: { layer: source/orders }
        right: { layer: source/customers }
      params:
        on: customer_id
        how: left
        suffix: "_cust"
```

### Union

```yaml
layers:
  combined/all-observations:
    type: table
    compute:
      op: tabular_union
      inputs:
        tables:
          - { layer: source/observations-2023 }
          - { layer: source/observations-2024 }
      params:
        distinct: false
```

### Aggregate

```yaml
layers:
  results/sales-summary:
    type: table
    compute:
      op: tabular_aggregate
      inputs:
        table: { layer: source/transactions }
      params:
        group_by: [region, quarter]
        aggregations:
          total_revenue: "SUM(amount)"
          avg_order: "AVG(amount)"
          num_orders: "COUNT(*)"
        having: "SUM(amount) > 10000"
        order_by: ["total_revenue DESC"]
        limit: 20
    style:
      table:
        columns:
          - { field: region, label: Region }
          - { field: quarter, label: Quarter }
          - { field: total_revenue, label: Revenue, format: "$,.2f" }
```
