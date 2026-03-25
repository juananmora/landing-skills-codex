# Codex Skills Hub

Hub editorial interno para descubrir, validar y descargar skills disponibles para asistentes de código (Codex, Claude, Copilot, agentes locales y repositorios de proyecto).

Unifica catálogo, scorecards, fichas técnicas y descargas en una misma superficie para que los equipos puedan evaluar capacidades antes de activarlas.

## Inicio rápido

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). No requiere `npm install` — el proyecto no tiene dependencias externas.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor HTTP en el puerto 3000 |
| `npm run check` | Ejecuta validaciones del proyecto |
| `npm run discover:skills` | Escanea el disco buscando archivos `SKILL.md` y sincroniza el catálogo |
| `npm run package:skills` | Genera paquetes ZIP descargables para todas las skills |

## Stack técnico

**Zero dependencias.** Solo módulos nativos de Node.js.

| Capa | Tecnología |
|------|------------|
| Backend | `node:http` — servidor HTTP sin frameworks |
| Frontend | Vanilla JavaScript — SPA sin frameworks |
| Estilos | CSS custom properties — diseño inspirado en OpenAI |
| Persistencia | JSON en disco (`data/skills.catalog.json`) |
| Empaquetado | ZIP/TAR generados con módulos nativos |
| Módulos | ES modules (`"type": "module"`) |

No hay paso de build, transpilación ni bundler. Los archivos se sirven directamente.

## Estructura del proyecto

```
├── server.mjs                 # Servidor HTTP y API REST
├── app.js                     # SPA: estado, filtros, renderizado, admin
├── index.html                 # Shell HTML (idioma: español)
├── styles.css                 # Sistema de diseño completo
├── data/
│   ├── skills.catalog.json    # Catálogo persistido (~600KB)
│   ├── discover-skills.mjs    # Motor de descubrimiento desde disco
│   └── skills.js              # Definiciones base de skills
├── scripts/
│   ├── validate.mjs           # Validación del proyecto
│   ├── discover-skills.mjs    # CLI para descubrimiento
│   └── package-skills.mjs     # Generación de ZIPs
├── downloads/                 # ZIPs generados
├── public/assets/             # Logos (codex, copilot, claude)
├── agents/                    # Configuraciones de agentes Codex (TOML)
├── .codex/config.toml         # Orquestación de agentes Codex
└── .claude/agents/            # Agentes equivalentes para Claude Code (MD)
```

## Fuentes de descubrimiento

El motor de descubrimiento escanea estas rutas buscando archivos `SKILL.md` con frontmatter YAML:

| Ruta | Familia | Tipo |
|------|---------|------|
| `~/.agents/skills/` | Agents | local |
| `~/.codex/skills/` | Codex | local |
| `~/.codex/vendor_imports/skills/skills/.curated` | Codex | vendor |
| `~/.copilot/skills/` | Copilot | local |
| `~/.copilot/installed-plugins/` | Copilot | plugin |
| `~/.claude/skills/` | Claude | local |
| `~/.claude/plugins/marketplaces/` | Claude | marketplace |
| `C:/02 /03 - Repositorios` | Projects | repo |

Las skills duplicadas se agrupan por ID, manteniendo las distintas ubicaciones como `locations[]`.

## API REST

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | `/api/catalog` | Catálogo completo |
| PUT | `/api/catalog` | Guardar cambios del catálogo |
| POST | `/api/catalog/skills` | Crear skill |
| DELETE | `/api/catalog/skills/:id` | Eliminar skill |
| POST | `/api/catalog/discover` | Lanzar descubrimiento desde disco |
| POST | `/api/catalog/regenerate-zips` | Regenerar todos los ZIPs |
| GET | `/api/skills/:id/detail` | Detalle de skill (incrementa vistas) |
| GET | `/api/download/:id` | Descargar ZIP (incrementa contador) |

## Secciones del portal

- **Landing** — presentación editorial con jerarquía visual
- **Catálogo** — búsqueda, filtros por categoría/fuente/repositorio, paginación y cards
- **Scorecards** — estado de seguridad, validación, reviews y métricas
- **Descargas** — paquetes ZIP con manifest
- **Admin** — CRUD de skills, descubrimiento desde disco, regeneración de ZIPs

## Modelo de datos de una skill

```javascript
{
  id, name, description, category,
  sourceFamily,      // Codex, Claude, Copilot, Agents, Projects
  sourceType,        // local, vendor, repo, plugin, marketplace
  sourceLabel,       // Etiqueta visible
  score,             // 0–100
  securityStatus,    // Passed | Unknown | Review
  validationStatus,  // Verified | Pending | Unknown
  downloads,         // Contador
  detailViews,       // Contador
  lastReviewed,      // Fecha ISO
  tags,              // Array derivado
  locations,         // Ubicaciones alternativas
  path, downloadPath, markdownPath
}
```

## Agentes

El proyecto incluye 8 agentes especializados disponibles en dos formatos:

- **Codex** (TOML): `agents/*.toml`, orquestados desde `.codex/config.toml`
- **Claude Code** (Markdown): `.claude/agents/*.md`

| Agente | Rol |
|--------|-----|
| `app-orchestrator` | Planificación, descomposición y coordinación general |
| `frontend-surface` | UI/UX, layout, jerarquía visual |
| `catalog-platform` | Discovery, APIs, empaquetado, persistencia |
| `content-governance` | Taxonomía, naming, labels, copy |
| `quality-guardian` | QA, confianza, regresiones, accesibilidad |
| `playwright-qa` | Validación E2E en navegador |
| `security-audit` | Seguridad de paths, packaging y superficie admin |
| `data-migration` | Evolución de esquema, migraciones, normalización |

Ver [`agents/README.md`](agents/README.md) y [`.claude/agents/README.md`](.claude/agents/README.md) para instrucciones de uso y ejemplos.

## Validación

```bash
node --check app.js            # Verifica sintaxis del frontend
node --check server.mjs        # Verifica sintaxis del backend
npm run check                  # Validación completa del proyecto
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor HTTP |
