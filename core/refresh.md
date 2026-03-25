# Refresh Strategies

The `refresh:` field on a layer controls when its data is re-fetched (for source layers) or re-computed (for computed layers). By default, layers are `manual`: they only update on explicit user action.

Real-time data, scheduled updates, webhooks, and polling are not separate source types. They are **refresh strategies** on any layer.

*Decided in [ADR-0015](/decisions/#adr-0015) D5 - "`refresh:` strategies unify data update patterns."*

---

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh` | string or object | No | Refresh strategy. Default: `manual`. |

### Strategy Reference

| Strategy | Syntax | Mechanism | Use Case |
|----------|--------|-----------|----------|
| `manual` | `refresh: manual` | User triggers `folia run` or clicks refresh. | Default. Batch processing, one-off analysis. |
| `schedule(cron)` | `refresh: schedule("0 */6 * * *")` | Cron expression. | Nightly rebuilds, periodic data refresh. |
| `poll(interval)` | `refresh: poll(3600)` | Pull at fixed interval (seconds). | Weather data, sensor readings, API monitoring. |
| `stream` | `refresh: stream` | Push via WebSocket, SSE, or MQTT. Always-connected. | Real-time sensor feeds, live data streams. |
| `webhook` | `refresh: { webhook: <url>, filter: {...} }` | External system POSTs an event to trigger refresh. | New satellite scene available, data provider notification. |

---

## `manual`

The default. The layer only updates when the user explicitly triggers it via `folia run`, a UI refresh button, or an API call.

```yaml
layers:
  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        elevation: { layer: terrain/elevation }
    refresh: manual
```

Since `manual` is the default, it **MAY** be omitted entirely:

```yaml
layers:
  terrain/slope:
    type: raster
    compute:
      op: terrain_slope
      inputs:
        elevation: { layer: terrain/elevation }
    # refresh defaults to manual
```

---

## `schedule(cron)`

Re-fetches or re-computes on a cron schedule. The cron expression follows standard 5-field format: `minute hour day-of-month month day-of-week`.

```yaml
layers:
  forecast/temperature:
    uri: api://noaa/forecast
    type: raster
    refresh: schedule("0 */6 * * *")
```

This layer refreshes every 6 hours. The platform fetches new data from the NOAA API and replaces the previous version.

For computed layers, `schedule` triggers re-execution of the compute block:

```yaml
layers:
  analysis/daily-report:
    type: table
    compute:
      engine: sql
      query: |
        SELECT region, COUNT(*) as events
        FROM :events
        WHERE date >= current_date - interval '1 day'
      inputs:
        events: { layer: source/events }
    refresh: schedule("0 2 * * *")
```

This computed layer re-runs its SQL query nightly at 2 AM.

---

## `poll(interval)`

Periodically checks the data source for updates. The interval is specified in seconds.

```yaml
layers:
  weather/current:
    uri: api://openweathermap/current
    type: api
    refresh: poll(60)
```

This layer polls the OpenWeatherMap API every 60 seconds. If the response differs from the cached version, the layer updates.

```yaml
layers:
  sensors/air-quality:
    uri: https://api.purpleair.com/v1/sensors
    type: table
    refresh: poll(300)
    auth:
      type: api_key
      key: ${PURPLEAIR_API_KEY}
```

This layer checks the PurpleAir API every 5 minutes.

---

## `stream`

Maintains an always-connected push channel. Data arrives as events, not on a schedule.

```yaml
layers:
  sensors/stream:
    uri: mqtt://broker.example.com/sensors/#
    type: table
    refresh: stream
```

The platform establishes a persistent connection and updates the layer as messages arrive. Stream connections are managed by drivers per the URI scheme:

| Protocol | Driver |
|----------|--------|
| WebSocket | `folia/drivers/websocket.py` |
| SSE (Server-Sent Events) | `folia/drivers/sse.py` |
| MQTT | `folia/drivers/mqtt.py` |

*Decided in [ADR-0007](/decisions/#adr-0007)*

---

## `webhook`

Triggered by an external system POSTing an event to a registered endpoint.

```yaml
layers:
  imagery/sentinel:
    uri: stac://earth-search/sentinel-2-l2a
    type: raster
    refresh:
      webhook: https://api.folia.sh/hooks/new-scene
      filter: { bbox: [-112, 40, -111, 41] }
```

When the STAC catalog notifies the webhook that a new scene is available within the bounding box, the platform re-queries the catalog and updates the layer.

The `filter` field is optional. It constrains which webhook events trigger a refresh.

---

## Refresh and the Compute DAG

When a layer with `refresh:` updates, the change propagates through the compute DAG. Any downstream computed layer that depends on the refreshed layer is re-evaluated.

```yaml
layers:
  weather/current:
    uri: api://openweathermap/current
    type: api
    refresh: poll(60)

  analysis/wind-risk:
    type: computed
    compute:
      op: wind_risk_classify
      inputs:
        weather: { layer: weather/current }
        terrain: { layer: terrain/slope }
    # No refresh: needed - re-evaluates when weather/current updates
```

The `analysis/wind-risk` layer has no `refresh:` of its own. It re-computes automatically when `weather/current` updates because it depends on it through `compute.inputs`.

**Rules:**

- A source layer's `refresh:` controls when its data is re-fetched.
- A computed layer's `refresh:` controls when its compute block is re-executed, **independent** of input changes.
- A computed layer that depends on a refreshed input re-evaluates when the input changes, even without its own `refresh:`.
- If a computed layer has **both** a `refresh:` and upstream dependencies, either trigger causes re-evaluation.

---

## Workspace-Level Schedules

For batch refreshes across multiple layers, use workspace-level `schedules:` in `folia.yaml`:

```yaml
schedules:
  nightly-rebuild:
    cron: "0 2 * * *"
    layers: [terrain/slope, terrain/aspect, terrain/hillshade]
```

This is syntactic sugar. It is equivalent to setting `refresh: schedule("0 2 * * *")` on each listed layer, but allows coordinating multiple layers under a single schedule name.

---

## Relationship to `compute.schedule`

The `compute.schedule:` field from earlier versions is superseded by layer-level `refresh: schedule(...)`. Layer-level `refresh:` is more general: it applies to both source data fetching **and** compute re-execution.

*Decided in [ADR-0015](/decisions/#adr-0015) D5*
