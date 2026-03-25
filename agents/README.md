# Project Agents

These TOML files are project-scoped Codex agent roles for internal applications like this skills hub.

Files:

- `app-orchestrator.toml`: lead agent for sequencing and integration
- `frontend-surface.toml`: UI and interaction specialist
- `catalog-platform.toml`: discovery, metadata, packaging, and API specialist
- `content-governance.toml`: taxonomy and copy specialist
- `quality-guardian.toml`: QA, accessibility, and regression specialist
- `playwright-qa.toml`: browser-driven validation specialist
- `security-audit.toml`: packaging, file-serving, and admin-surface security specialist
- `data-migration.toml`: schema, normalization, and metadata evolution specialist

The project wiring lives in [`.codex/config.toml`](/C:/02%20-%20Accenture/03%20-%20Repositorios/landing-skills-codex/.codex/config.toml).

This follows the Codex config model where `config.toml` can declare `[agents.<name>]` entries and each role can point at a dedicated TOML `config_file`.
