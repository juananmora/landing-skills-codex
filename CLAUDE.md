# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Landing Skills Codex is an internal capability hub that discovers, catalogs, validates, and packages skills from multiple AI coding assistant ecosystems (Codex, Claude, Copilot, local agents, project repositories). The UI is entirely in Spanish.

## Commands

```bash
npm run dev              # Start HTTP server on http://localhost:3000
npm run check            # Run validation script
npm run discover:skills  # Scan disk for SKILL.md files and sync catalog
npm run package:skills   # Generate ZIP downloads for all cataloged skills
```

No build step, no transpilation, no bundler — files are served directly by the Node.js HTTP server.

## Architecture

**Zero-dependency vanilla stack.** No frameworks, no npm dependencies — only Node.js built-in modules.

### Backend (`server.mjs`)
- Built-in `node:http` server (port from `PORT` env var, default 3000)
- REST API under `/api/` for catalog CRUD, skill discovery, ZIP packaging, and downloads
- Serves static files (HTML, CSS, JS, assets) with path-traversal protection
- Catalog persisted as `data/skills.catalog.json` (file-based, no database)

### Frontend (`app.js` + `index.html` + `styles.css`)
- Single-page app with vanilla JavaScript, no client-side framework
- Client-side state object manages catalog data, filters, pagination (PAGE_SIZE=6), admin mode
- Favorites persisted in LocalStorage (`codex-skills-favorites`)
- OpenAI-inspired design system with CSS custom properties

### Skill Discovery (`data/discover-skills.mjs`)
- Walks 8 filesystem roots looking for `SKILL.md` files with YAML frontmatter
- Sources: `~/.agents/skills/`, `~/.codex/skills/`, `~/.codex/vendor_imports/`, `~/.copilot/skills/`, `~/.copilot/installed-plugins/`, `~/.claude/skills/`, `~/.claude/plugins/marketplaces/`, and `C:/02 - Accenture/03 - Repositorios` (project repos)
- Deduplicates by skill ID; multiple locations for the same skill are tracked as `locations[]`
- Category inferred from path segments and content keywords

### Packaging (`scripts/package-skills.mjs`)
- Generates ZIP/TAR archives in `downloads/` directory
- Includes a `manifest.json` with skill metadata
- Whitelists allowed file names and extensions for security

### Key API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/catalog` | Full skill catalog |
| PUT | `/api/catalog` | Save catalog changes |
| POST | `/api/catalog/skills` | Create skill |
| DELETE | `/api/catalog/skills/:id` | Delete skill |
| POST | `/api/catalog/discover` | Trigger disk discovery |
| POST | `/api/catalog/regenerate-zips` | Regenerate all ZIPs |
| GET | `/api/skills/:id/detail` | Skill detail (increments views) |
| GET | `/api/download/:id` | Download ZIP (increments counter) |

## Codex Agents

Eight specialized TOML agent configs live in `agents/`, wired together via `.codex/config.toml`. Each handles a specific concern (orchestration, frontend, catalog/data, content governance, QA, Playwright testing, security audit, data migration).

## Conventions

- ES modules throughout (`"type": "module"` in package.json, `.mjs` extensions for server-side)
- No TypeScript, no linter, no formatter configured
- All UI strings are hardcoded in Spanish
- Skill data model includes: `id`, `name`, `description`, `category`, `sourceFamily`, `sourceType`, `score`, `securityStatus`, `validationStatus`, `downloads`, `detailViews`, `lastReviewed`, `tags[]`, `locations[]`
