# Architectural Decision Records

folia uses ADRs to document architectural decisions. Each ADR is **permanent**: superseded, never edited. When a decision is reversed or evolved, a new ADR is created that explicitly supersedes the old one.

## Key Decisions

| ADR | Title | Status | Key Decision |
|---|---|---|---|
| 0001 | Unified Layer Abstraction | Accepted | Everything is a layer. `ref` pattern for cross-workspace references. Domain-agnostic core with `geo:` as an extension. |
| 0005 | Data Strategy & Compute Unification | Accepted | DATA + COMPUTE + STYLE per layer. Pipeline eliminated. `op:`/`engine:`/`steps:` mutually exclusive. |
| 0006 | Domain Modules | Implemented | Pluggable `folia/domains/` - geo, tabular, temporal. Each domain adds schema extensions and operations. |
| 0007 | Engines, Connectors, Drivers | Implemented | Three orthogonal concerns: engines (compute), connectors (data access), drivers (output format). |
| 0009 | Operation View Hints | Implemented | Operations declare `display_hints`. Resolution: layer style > op hints > type defaults. |
| 0013 | Publish, Serve, URLs | Accepted | `data.folia.sh`, `@tag` versioning, artifact-first URLs. |
| 0014 | Connector vs Operation | Accepted | Three-level pattern: managed workspace + connector bot + user operation. |
| 0015 | UI Taxonomy & Multi-View | Proposed | `display:` replaces `views:` on layers. Multi-view tabs. Panels/Components/Interactions taxonomy. `refresh:` strategies. |
| 0025 | Crosswalks & Dataset Compatibility | Proposed | YAML crosswalk registry over knowledge graph. SKOS predicates. Crosswalks feed ops (harmonize, reclassify). |
| 0026 | Catalog & Discovery | Proposed | `#concept`/`@source`/dataset hierarchy. `commons/sources.yaml` replaces hardcoded connectors. Agent-mediated discovery. |
| 0028 | Catalog Namespace Model | Proposed | `@owner/project/dataset` two-level identity. Everything is a workspace. OGC Records native. `#theme/concept` hierarchy. |

## ADR Lifecycle

```
draft → proposed → accepted → implemented
                           ↘ superseded (by ADR-XXXX)
                           ↘ deprecated
```

- **Draft** - under discussion, not yet proposed
- **Proposed** - formally proposed, awaiting acceptance
- **Accepted** - decision made, implementation may be in progress
- **Implemented** - fully built and tested
- **Superseded** - replaced by a newer ADR (original is preserved, never edited)
- **Deprecated** - no longer relevant

## Reading ADRs

Each ADR follows a standard structure:

1. **Title and metadata** - date, status, supersedes/superseded-by
2. **Context** - what problem prompted this decision
3. **Decision** - what was decided and why
4. **Consequences** - what changes as a result
5. **Alternatives considered** - what was rejected and why

## Cross-Reference Convention

ADRs reference each other using `[[adr:XXXX]]` notation:

```markdown
This builds on [[adr:0005]] and supersedes [[adr:0003]].
```

Specs reference the ADRs that decided their design:

```markdown
*Decided in [ADR-0005](/decisions/#adr-0005)*
```
