# AGENTS.md

## Purpose

This project is an internal product-style web application for cataloging, discovering, validating, and downloading skills.

The product is not a simple static landing page. It combines:
- editorial landing and navigation
- searchable catalog browsing
- skill detail inspection
- admin editing
- operational actions such as discovery and ZIP regeneration
- lightweight local backend behavior

Agents working in this repository should optimize for end-to-end product coherence, not isolated code changes.

## Source Of Truth

- Frontend shell and UI behavior live in [app.js](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\app.js), [styles.css](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\styles.css), and [index.html](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\index.html)
- Backend and file-serving behavior live in [server.mjs](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\server.mjs)
- Catalog state lives in [skills.catalog.json](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\data\skills.catalog.json)
- Disk discovery logic lives in [discover-skills.mjs](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\data\discover-skills.mjs)
- Packaging logic lives in [package-skills.mjs](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\scripts\package-skills.mjs)
- Project-scoped agent configuration lives in [.codex/config.toml](C:\02 - Accenture\03 - Repositorios\landing-skills-codex\.codex\config.toml)

## Working Style

- Prefer real metadata over decorative abstraction.
- Prefer specific source names over generic labels.
- Treat browsing, admin, and maintenance as separate user concerns.
- Avoid adding UI sections that do not serve a clear user journey.
- When changing discovery or packaging, verify the user-visible impact in the catalog.
- When changing labels, align cards, filters, modal content, and admin terminology.

## Agent Roles

### `app_orchestrator`

Use for:
- broad product requests
- section reorganization
- deciding what belongs in the landing, catalog, sidebar, or admin area
- coordinating multiple other agents

Owns:
- overall flow
- prioritization
- integration quality

### `frontend_surface`

Use for:
- visual redesign
- interaction cleanup
- layout improvements
- responsive adjustments
- improving scanability and density

Owns:
- UI structure
- visual hierarchy
- affordances and spacing

### `catalog_platform`

Use for:
- discovery from disk
- source normalization
- grouping
- backend endpoints
- ZIP generation
- catalog persistence

Owns:
- metadata truth
- API correctness
- packaging behavior

### `content_governance`

Use for:
- naming cleanup
- taxonomy changes
- filter labels
- badge wording
- admin copy
- modal terminology

Owns:
- clarity of labels and categories
- consistency of wording across the product

### `quality_guardian`

Use for:
- review requests
- risk scans
- validating trust-sensitive flows
- checking for misleading UI or broken operational logic

Owns:
- product trust
- regression awareness
- user-impact framing

### `playwright_qa`

Use for:
- browser walkthroughs
- filter and modal validation
- search behavior issues
- critical-path UI verification

Owns:
- in-browser validation
- interaction correctness

### `security_audit`

Use for:
- file serving review
- local disk discovery risk
- ZIP content review
- admin action boundary checks

Owns:
- security posture of discovery, download, and operations

### `data_migration`

Use for:
- schema evolution
- metadata backfills
- changing grouping logic
- introducing new derived fields
- preserving ids and counters during model changes

Owns:
- safe catalog evolution
- compatibility between stored data and UI assumptions

## Recommended Multi-Agent Workflow

For a new portal or a major redesign:

1. Start with `app_orchestrator`
   - define the user journeys
   - decide what the product actually needs

2. Split implementation
   - `frontend_surface` for layout and component structure
   - `catalog_platform` for data, API, discovery, and packaging
   - `content_governance` for labels, filters, badges, and taxonomy

3. Validate before closing
   - `playwright_qa` for browser behavior
   - `quality_guardian` for trust, regression, and UX risk
   - `security_audit` if file, admin, or download behavior changed

4. Use `data_migration` whenever changing catalog shape
   - new fields
   - new grouping rules
   - new source families
   - renamed provenance labels

## Practical Rules

- If the request changes only layout, do not default to backend edits.
- If the request changes discovery or packaging, update the UI labels if needed.
- If a button does more than its label suggests, fix either the behavior or the label.
- If a generic label can be replaced by a real repository name, replace it.
- If a sidebar section has no operational value, remove or relocate it.
- If a view grows too long, reduce noise before adding more UI.

## Validation

Minimum expected validation for non-trivial changes:

- `node --check app.js`
- `node --check server.mjs` when backend changes
- `node scripts/validate.mjs`

When interaction changes are involved, prefer browser validation as well.
