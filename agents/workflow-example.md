# Workflow Example

## Scenario

Build or evolve an internal portal like this one:
- landing page
- searchable catalog
- skill detail modal
- admin editing
- discovery from disk
- ZIP downloads

## Agent Sequence

### 1. `app_orchestrator`

Prompt example:

```text
Define the product structure for a skills portal with landing, catalog, modal detail, admin, local discovery, and downloadable ZIPs. Keep it compact and reduce noise. Separate user browsing from operator maintenance.
```

Expected output:
- section map
- user journeys
- work split for specialists

### 2. `frontend_surface`

Prompt example:

```text
Implement the visual and interaction layer for the portal structure. Improve hierarchy, reduce scroll, separate browsing controls from operations, and make the catalog easy to scan.
```

Expected output:
- layout changes
- card/detail improvements
- filter and sidebar cleanup

### 3. `catalog_platform`

Prompt example:

```text
Implement the catalog backend and discovery model. Support real source provenance, grouping, repository-aware labels, ZIP packaging, and maintenance operations such as discovery and regeneration.
```

Expected output:
- discovery logic
- API updates
- packaging logic
- stable metadata behavior

### 4. `content_governance`

Prompt example:

```text
Review all labels, taxonomy, source naming, badges, filter names, and admin copy. Replace generic wording with specific repository or source terminology wherever possible.
```

Expected output:
- naming cleanup
- filter and modal wording improvements
- reduced ambiguity

### 5. `data_migration`

Prompt example:

```text
Adapt the stored catalog to the new data model. Preserve ids and counters while introducing derived fields like repository name and refined source labels.
```

Expected output:
- safe catalog evolution
- compatible JSON structure

### 6. `playwright_qa`

Prompt example:

```text
Validate the main user journeys in browser: landing load, search, filters, source selector, repository selector, modal open/close, and download button behavior.
```

Expected output:
- reproducible browser findings
- confirmation of working flows

### 7. `quality_guardian`

Prompt example:

```text
Review the product for trust issues, misleading labels, confusing admin placement, noisy sections, broken filter expectations, and operational regressions.
```

Expected output:
- prioritized findings
- user-impact explanation

### 8. `security_audit`

Prompt example:

```text
Audit local discovery, file serving, ZIP generation, and maintenance operations for security and trust risks. Focus on path handling, unintended content inclusion, and misleading operator actions.
```

Expected output:
- concrete risks
- hardening recommendations

## Good Delegation Pattern

- Let `app_orchestrator` keep the critical path.
- Run `frontend_surface`, `catalog_platform`, and `content_governance` in parallel when the write areas do not overlap too much.
- Run `playwright_qa` and `quality_guardian` after implementation stabilizes.
- Run `security_audit` whenever downloads, file paths, or admin operations change.
- Bring in `data_migration` whenever the catalog schema or grouping logic changes.

## When Not To Overuse Agents

- Do not spawn multiple agents for a one-line CSS tweak.
- Do not run QA before the data model is stable.
- Do not ask content-focused agents to solve backend packaging behavior.
- Do not let a review agent define the product structure.
