# Glossary

## Artifact

A materialized output from a computed layer. Artifacts are stored as files (COG, Parquet, GeoJSON) and can be published to the catalog. Every artifact traces back to its source data and the operation chain that produced it.

## Backend

The implementation behind an operation. The platform routes operations to compute tiers (browser, local, cloud) automatically. External compute platforms like Google Earth Engine are available as explicit backend overrides via `backend: gee` on the compute block.

## Compute Tiers

The three levels where folia runs computation: browser (DuckDB-WASM, instant, free), local (GDAL, DuckDB, Python - seconds, free), and cloud (K8s workers, batch - minutes, metered). The platform picks the tier based on data size and operation type. Users do not choose a tier explicitly.

## Capabilities

The set of interactions and behaviors a layer supports, determined by its type and domain extensions. For example, a raster layer with `geo:` supports point queries and map rendering; a table layer supports column sorting and filtering. Capabilities drive which UI components are available.

## CBGB

Cloud-Based Geospatial Benchmarks. A set of 43 benchmark problems from Cardille et al. (2025) converted to `folia.yaml` workspaces. Used to validate that the platform can express real-world geospatial analyses declaratively. Problems range from simple vector area calculations to multi-year satellite compositing.

## Component

A UI element within a view's content area. Components include maps, charts, tables, stat-cards, forms, info-panels, and legends. Each component type renders one or more layers in a specific way.

## Compute Block

The `compute:` section of a layer that defines how derived values are produced. Three mutually exclusive modes: `op:` (registered operation), `engine:` (inline SQL or Python), or `steps:` (multi-stage pipeline). *Decided in [ADR-0005](/decisions/#adr-0005).*

## Concept

A semantic identifier for a type of data, expressed as `#theme/concept` (e.g., `#terrain/dem`, `#vegetation/ndvi`). Concepts enable intent-based discovery: the catalog resolves a concept to the best matching dataset for the workspace's spatial extent.

## Crosswalk

A mapping between two classification systems, defined in YAML using SKOS predicates (`exactMatch`, `closeMatch`, `broadMatch`). Crosswalks enable harmonization of datasets that use different coding schemes (e.g., NLCD to ESA WorldCover). *Decided in [ADR-0025](/decisions/#adr-0025).*

## Display Hints

Default view configurations declared on an operation YAML. Display hints suggest how results should be rendered (palette, chart type, table columns). Layer-level `style:` always takes precedence. *Decided in [ADR-0009](/decisions/#adr-0009).*

## Domain

A pluggable module that extends the platform with schema extensions and operations for a specific data type. Domains answer "what kind of data?" - geo, tabular, temporal. A domain adds a top-level block to layers (e.g., `geo:`, `tabular:`). *Decided in [ADR-0006](/decisions/#adr-0006).*

## Engine

An inline compute mode (`engine: sql` or `engine: python`) for ad-hoc transforms that don't warrant a registered operation. SQL engines run DuckDB queries (in-browser for small data, server-side for large data); Python engines invoke a specified module and function. *Decided in [ADR-0005](/decisions/#adr-0005).*

## Form

An interactive UI element that exposes layer parameters as controls (sliders, dropdowns, text inputs). Forms enable direct manipulation: changing a slider immediately recomputes the layer with new parameter values.

## Interaction

A user action that affects layer state or view behavior. Interactions include click-to-query (point info), hover highlights, draw-to-define (region selection), and parameter binding (form controls that drive recomputation).

## Layer

The universal noun in folia. Every data source, computation, and visualization target is a layer. A layer has three concerns: Data (where bits come from), Compute (how derived values are produced), and Style (how results are displayed). Layers compose by referencing each other; the workspace YAML is a DAG. *Decided in [ADR-0001](/decisions/#adr-0001).*

## Namespace

A scoping mechanism for published datasets. Three tiers: `commons/` (platform-curated), `@owner/` (user-published), and workspace-local (unpublished). *Decided in [ADR-0028](/decisions/#adr-0028).*

## Operation

An abstract interface defining a transform: what inputs it accepts, what outputs it produces, and what parameters configure it. The platform routes operations to the appropriate compute tier automatically. Examples: `terrain_slope`, `tabular_join`, `analysis_zonal_stats`.

## Panel

A UI container within a view layout. Panels hold content components and are arranged according to the view's layout mode (full-map, split, dashboard, grid).

## Refresh

The strategy for keeping a layer's data current. Options: `manual` (user-triggered), `schedule(cron)` (periodic), `poll(seconds)` (interval checking), `stream` (real-time), `webhook` (event-driven). *Decided in [ADR-0015](/decisions/#adr-0015).*

## Renderer

The visualization engine used to display a layer. Map renderers include MapLibre GL JS. Table renderers include TanStack Table. Chart renderers include Observable Plot. The renderer is specified in the layer's `style:` block or inferred from the operation's display hints.

## Source

A specific data provider, expressed as `@owner/dataset` (e.g., `@usgs/3dep`, `@copernicus/sentinel2`). Sources are registered in the catalog with metadata about coverage, resolution, update frequency, and access patterns.

## Style

The `style:` block on a layer that controls visual presentation: palette, opacity, rescale range, color ramp, info popups, table columns, chart configuration, and form controls. Style is always optional; operations provide display hints as defaults.

## URI

A Uniform Resource Identifier pointing to a layer's data source. URIs can be local paths (`data/dem.tif`), HTTP URLs, S3 paths, or scheme-prefixed identifiers (`gee://USGS/WBD/2017/HUC04`).

## View

A named presentation of a subset of workspace layers. Views define layout (full-map, split, dashboard, grid), which layers are visible, and what content components are displayed. A workspace MAY have multiple views showing the same layer pool in different ways. *Decided in [ADR-0015](/decisions/#adr-0015).*

## Workspace

A `folia.yaml` file - the unit of work in folia. Contains a name, settings, layers, and views. Everything about a project lives in this single declarative document. Workspaces can be published to the catalog, making their layers available to others.
