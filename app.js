const app = document.querySelector("#app");

const FAVORITES_KEY = "codex-skills-favorites";
const PAGE_SIZE = 6;
const DEFAULT_TOPIC = {
  label: "Developer workflow",
  categories: ["Developer Tools", "OpenAI", "Frontend", "Testing"]
};

const formatNumber = (value) => new Intl.NumberFormat("es-ES").format(value || 0);
const formatDateLabel = (date) => (date ? `Review ${date}` : "Review pendiente");

const state = {
  catalog: null,
  adminMessage: "",
  adminSkillId: "",
  adminSaving: false,
  detailSkillId: "",
  detailData: null,
  detailLoading: false,
  detailError: "",
  favorites: new Set(),
  query: "",
  category: "All",
  sourceLabel: "All",
  repoName: "All",
  sortBy: "featured",
  page: 1,
  favoritesOnly: false,
  adminZipMessage: "",
  adminZipBusy: false,
  adminDiscoveryBusy: false
};

const getRepoName = (skill) => {
  const segments = String(skill?.path || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  const repoRootIndex = segments.findIndex((segment) => segment.toLowerCase().includes("repositorios"));
  if (repoRootIndex === -1) return "";
  return segments[repoRootIndex + 1] || "";
};

const getSourceDisplayLabel = (skill) => {
  const repoName = getRepoName(skill);
  if (repoName) return repoName;
  return skill?.sourceLabel || "Origen detectado";
};

const getSkillTypeLabel = (skill) => {
  if (getRepoName(skill)) return "Project skill";

  const family = String(skill?.sourceFamily || "").toLowerCase();
  if (family === "codex") return "Codex skill";
  if (family === "claude") return "Claude skill";
  if (family === "copilot") return "Copilot skill";

  return "Generic skill";
};

const loadFavorites = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]");
    state.favorites = new Set(Array.isArray(saved) ? saved : []);
  } catch {
    state.favorites = new Set();
  }
};

const saveFavorites = () => {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
};

const dateDiffInDays = (dateString) => {
  const reviewedAt = new Date(dateString);
  if (Number.isNaN(reviewedAt.getTime())) {
    return 999;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  reviewedAt.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - reviewedAt.getTime()) / 86400000);
};

const buildSummary = (skills) =>
  skills.reduce(
    (acc, skill) => {
      acc.totalDownloads += Number(skill.downloads || 0);
      acc.totalDetailViews += Number(skill.detailViews || 0);
      if (skill.securityStatus === "Passed") {
        acc.securityPassed += 1;
      }
      if (skill.validationStatus === "Verified") {
        acc.validationPassed += 1;
      }
      if (skill.validationStatus !== "Verified" || skill.securityStatus !== "Passed") {
        acc.attentionRequired += 1;
      }
      if (dateDiffInDays(skill.lastReviewed) > 10) {
        acc.reviewStale += 1;
      }
      return acc;
    },
    {
      totalSkills: skills.length,
      totalDownloads: 0,
      totalDetailViews: 0,
      securityPassed: 0,
      validationPassed: 0,
      attentionRequired: 0,
      reviewStale: 0
    }
  );

const syncCatalog = (skills, inventory = state.catalog?.inventory || null) => {
  state.catalog = {
    skills,
    summary: buildSummary(skills),
    inventory
  };
};

const getAvailableSkills = () => {
  const normalizedQuery = state.query.trim().toLowerCase();

  return (state.catalog?.skills || []).filter((skill) => {
    const matchesFavorite = !state.favoritesOnly || state.favorites.has(skill.id);
    const matchesSource = state.sourceLabel === "All" || skill.sourceLabel === state.sourceLabel;
    const matchesRepo = state.repoName === "All" || getRepoName(skill) === state.repoName;
    if (!normalizedQuery) return matchesFavorite && matchesSource && matchesRepo;

    const haystack = [skill.name, skill.variant, skill.category, skill.description, skill.maintainer, ...(skill.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesFavorite && matchesSource && matchesRepo && haystack.includes(normalizedQuery);
  });
};

const getSourceLabels = () => {
  const counts = getAvailableSkills().reduce((acc, skill) => {
    const label = skill.sourceLabel || "Unknown source";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return [
    "All",
    ...Object.entries(counts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([label]) => label)
  ];
};

const getRepoOptions = () => {
  const counts = getAvailableSkills()
    .filter((skill) => state.sourceLabel === "All" || skill.sourceLabel === state.sourceLabel)
    .reduce((acc, skill) => {
      const repoName = getRepoName(skill);
      if (!repoName) return acc;
      acc[repoName] = (acc[repoName] || 0) + 1;
      return acc;
    }, {});

  return [
    "All",
    ...Object.entries(counts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([repoName]) => repoName)
  ];
};

const getCategories = () => {
  const usingDefaultTopic =
    !state.query.trim() &&
    state.category === "All" &&
    state.sourceLabel === "All" &&
    state.repoName === "All" &&
    !state.favoritesOnly;
  const skills = usingDefaultTopic
    ? getAvailableSkills().filter((skill) => DEFAULT_TOPIC.categories.includes(skill.category))
    : getAvailableSkills();
  const counts = skills.reduce((acc, skill) => {
    acc[skill.category] = (acc[skill.category] || 0) + 1;
    return acc;
  }, {});

  return [
    "All",
    ...Object.entries(counts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([category]) => category)
  ];
};

const getStatusTone = (status) => (status === "Passed" || status === "Verified" ? "is-good" : "is-warn");

const getSkillOwnerBrand = (skill) => {
  const source = String(skill?.sourceFamily || "").toLowerCase();
  if (source === "codex") return { label: "Codex", icon: "/assets/codex.png" };
  if (source === "claude") return { label: "Claude", icon: "/assets/claude.svg" };
  if (source === "copilot") return { label: "Copilot", icon: "/assets/copilot.png" };
  return null;
};

const renderOwnerBrand = (skill, extraClass = "") => {
  const brand = getSkillOwnerBrand(skill);
  if (!brand) return "";

  return `
    <span class="owner-brand ${extraClass}">
      <img src="${brand.icon}" alt="${brand.label}" />
      <span>${brand.label}</span>
    </span>
  `;
};

const getAdminSkill = () =>
  state.catalog?.skills.find((skill) => skill.id === state.adminSkillId) || state.catalog?.skills[0];

const getDetailSkill = () =>
  state.catalog?.skills.find((skill) => skill.id === state.detailSkillId) || null;

const getSkillBadges = (skill) => {
  const badges = [];
  if (state.favorites.has(skill.id)) badges.push("Favorita");
  if (skill.tags?.includes("OpenAI")) badges.push("OpenAI");
  if (skill.tags?.includes("Azure")) badges.push("Azure");
  if (skill.tags?.includes("System")) badges.push("System");
  if (Number(skill.locationCount || 0) > 1) badges.push(`${skill.locationCount} ubicaciones`);
  if (getRepoName(skill)) badges.push(getRepoName(skill));
  if (skill.downloads >= 1200) badges.push("Top descargada");
  if (dateDiffInDays(skill.lastReviewed) <= 3) badges.push("Recien revisada");
  return badges.slice(0, 4);
};

const getSkillAlerts = (skill) => {
  const alerts = [];
  if (skill.securityStatus !== "Passed") alerts.push({ tone: "warn", label: "Security review pendiente" });
  if (skill.validationStatus !== "Verified") alerts.push({ tone: "warn", label: "Validacion pendiente" });
  if (dateDiffInDays(skill.lastReviewed) > 10) alerts.push({ tone: "muted", label: "Review antigua" });
  return alerts;
};

const compareBySort = (left, right) => {
  if (state.sortBy === "downloads") return right.downloads - left.downloads;
  if (state.sortBy === "score") return right.score - left.score;
  if (state.sortBy === "review") return right.lastReviewed.localeCompare(left.lastReviewed);
  if (state.sortBy === "name") return left.name.localeCompare(right.name);

  const leftPriority =
    (state.favorites.has(left.id) ? 40 : 0) +
    (left.validationStatus === "Verified" ? 20 : 0) +
    (left.securityStatus === "Passed" ? 20 : 0) +
    Math.min(Math.round(left.downloads / 50), 20);
  const rightPriority =
    (state.favorites.has(right.id) ? 40 : 0) +
    (right.validationStatus === "Verified" ? 20 : 0) +
    (right.securityStatus === "Passed" ? 20 : 0) +
    Math.min(Math.round(right.downloads / 50), 20);

  return rightPriority - leftPriority || right.score - left.score;
};

const getFilteredSkills = () =>
  getAvailableSkills()
    .filter((skill) => {
      const matchesCategory = state.category === "All" || skill.category === state.category;
      return matchesCategory;
    })
    .sort(compareBySort);

const getDefaultTopicSkills = () =>
  getAvailableSkills()
    .filter((skill) => DEFAULT_TOPIC.categories.includes(skill.category))
    .sort(compareBySort)
    .slice(0, PAGE_SIZE);

const renderMessage = (title, body) => {
  app.innerHTML = `
    <section class="system-state">
      <p class="eyebrow">Catalog service</p>
      <h2>${title}</h2>
      <p class="hero-text">${body}</p>
    </section>
  `;
};

const updateSkillInCatalog = (nextSkill) => {
  const nextSkills = state.catalog.skills.map((skill) => (skill.id === nextSkill.id ? nextSkill : skill));
  syncCatalog(nextSkills);
};

const toggleFavorite = (skillId) => {
  if (state.favorites.has(skillId)) state.favorites.delete(skillId);
  else state.favorites.add(skillId);
  saveFavorites();
  render();
};

const createDraftSkill = () => {
  const timestamp = Date.now().toString().slice(-6);
  const nextSkill = {
    id: `new-skill-${timestamp}`,
    name: "new-skill",
    category: "General",
    path: "C:/ruta/a/la/skill",
    description: "Nueva skill pendiente de completar desde el admin.",
    downloads: 0,
    detailViews: 0,
    securityStatus: "Review",
    validationStatus: "Pending",
    score: 70,
    lastReviewed: new Date().toISOString().slice(0, 10),
    maintainer: "Platform Engineering",
    tags: ["General", "Review", "Pending"],
    downloadPath: `/api/download/new-skill-${timestamp}`
  };

  syncCatalog([nextSkill, ...state.catalog.skills]);
  state.adminSkillId = nextSkill.id;
  state.adminMessage = "Nueva skill creada en local. Guardala para persistirla.";
  render();
};
const deleteSelectedSkill = () => {
  const selectedSkill = getAdminSkill();
  if (!selectedSkill) return;

  const nextSkills = state.catalog.skills.filter((skill) => skill.id !== selectedSkill.id);
  syncCatalog(nextSkills);
  state.adminSkillId = nextSkills[0]?.id || "";
  state.adminMessage = `Skill ${selectedSkill.name} eliminada en local. Guarda para confirmar.`;
  if (state.detailSkillId === selectedSkill.id) {
    state.detailSkillId = "";
    state.detailData = null;
  }
  render();
};

const persistCatalog = async () => {
  state.adminSaving = true;
  state.adminMessage = "Guardando cambios en el catalogo...";
  render();

  try {
    const response = await fetch("/api/catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills: state.catalog.skills })
    });

    if (!response.ok) throw new Error(`Save failed with status ${response.status}`);

    state.catalog = await response.json();
    state.adminMessage = "Catalogo guardado correctamente.";
  } catch (error) {
    state.adminMessage = `No se pudo guardar el catalogo. ${error instanceof Error ? error.message : "Unknown error"}.`;
  } finally {
    state.adminSaving = false;
    render();
  }
};

const regenerateZips = async () => {
  state.adminZipBusy = true;
  state.adminZipMessage = "Regenerando paquetes ZIP...";
  render();

  try {
    const response = await fetch("/api/catalog/regenerate-zips", { method: "POST" });
    if (!response.ok) throw new Error(`Zip generation failed with status ${response.status}`);

    const payload = await response.json();
    const packaged = payload.results.filter((entry) => entry.status === "packaged").length;
    const skipped = payload.results.filter((entry) => entry.status === "skipped").length;
    state.adminZipMessage = `ZIPs regenerados. ${packaged} empaquetadas, ${skipped} omitidas.`;
  } catch (error) {
    state.adminZipMessage = `No se pudieron regenerar los ZIPs. ${error instanceof Error ? error.message : "Unknown error"}.`;
  } finally {
    state.adminZipBusy = false;
    render();
  }
};

const discoverSkills = async () => {
  state.adminDiscoveryBusy = true;
  state.adminMessage = "Rastreando skills en disco y sincronizando el catalogo...";
  render();

  try {
    const response = await fetch("/api/catalog/discover", { method: "POST" });
    if (!response.ok) throw new Error(`Discovery failed with status ${response.status}`);

    state.catalog = await response.json();
    state.adminMessage = `Catalogo sincronizado desde disco. ${state.catalog.summary.totalSkills} skills detectadas.`;
  } catch (error) {
    state.adminMessage = `No se pudo sincronizar el catalogo desde disco. ${error instanceof Error ? error.message : "Unknown error"}.`;
  } finally {
    state.adminDiscoveryBusy = false;
    render();
  }
};

const openSkillDetail = async (skillId) => {
  state.detailSkillId = skillId;
  state.detailLoading = true;
  state.detailError = "";
  state.detailData = null;
  render();

  try {
    const response = await fetch(`/api/skills/${encodeURIComponent(skillId)}/detail`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Detail request failed with status ${response.status}`);

    const payload = await response.json();
    updateSkillInCatalog(payload.skill);
    state.detailData = payload.detail;
  } catch (error) {
    state.detailError = error instanceof Error ? error.message : "Unknown error";
  } finally {
    state.detailLoading = false;
    render();
    document.querySelector(".skill-modal")?.focus?.();
  }
};

const closeSkillDetail = () => {
  state.detailSkillId = "";
  state.detailLoading = false;
  state.detailError = "";
  state.detailData = null;
  render();
};

const handleDownload = (skillId) => {
  const skill = state.catalog.skills.find((entry) => entry.id === skillId);
  if (!skill) return;

  updateSkillInCatalog({ ...skill, downloads: Number(skill.downloads || 0) + 1 });
  const anchor = document.createElement("a");
  anchor.href = skill.downloadPath;
  anchor.download = "";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

const copyPath = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    window.prompt("Copia la ruta manualmente", value);
  }
};

const renderModalBody = (detailSkill) => {
  if (state.detailLoading) {
    return '<div class="modal-placeholder">Recuperando resumen real de la skill y su markdown tecnico...</div>';
  }

  if (state.detailError) {
    return `<div class="modal-placeholder is-error">No se pudo cargar la ficha tecnica. ${state.detailError}</div>`;
  }

  const detail = state.detailData;
  if (!detail) {
    return '<div class="modal-placeholder">Sin detalle disponible.</div>';
  }

  return `
    <p class="modal-description" id="skill-modal-description">${detail.overview}</p>

    <div class="modal-meta">
      <span class="section-pill">${detailSkill.category}</span>
      ${renderOwnerBrand(detailSkill, "owner-brand-inline")}
      <span>${getSourceDisplayLabel(detailSkill)}</span>
      <span>${detailSkill.maintainer}</span>
      <span>${formatDateLabel(detailSkill.lastReviewed)}</span>
      <span>${formatNumber(detailSkill.detailViews)} aperturas</span>
      ${detail.locationCount > 1 ? `<span>${detail.locationCount} carpetas detectadas</span>` : ""}
    </div>

    ${detail.usageHint ? `<section class="modal-section"><p class="eyebrow">Usage hint</p><p class="modal-inline-copy">${detail.usageHint}</p></section>` : ""}

    ${detail.highlights.length ? `
      <section class="modal-section">
        <p class="eyebrow">Highlights</p>
        <ul class="modal-list">
          ${detail.highlights.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </section>
    ` : ""}

    ${detail.headings.length ? `
      <section class="modal-section">
        <p class="eyebrow">Secciones del markdown</p>
        <div class="modal-pills">
          ${detail.headings.map((item) => `<span class="tag">${item}</span>`).join("")}
        </div>
      </section>
    ` : ""}

    <dl class="modal-grid">
      <div><dt>Seguridad</dt><dd class="${getStatusTone(detailSkill.securityStatus)}">${detailSkill.securityStatus}</dd></div>
      <div><dt>Validacion</dt><dd class="${getStatusTone(detailSkill.validationStatus)}">${detailSkill.validationStatus}</dd></div>
      <div><dt>Descargas</dt><dd>${formatNumber(detailSkill.downloads)}</dd></div>
      <div><dt>Ubicaciones</dt><dd>${detail.locationCount || 1}</dd></div>
      <div><dt>Tags</dt><dd>${detailSkill.tags.join(" · ")}</dd></div>
      <div><dt>Ruta principal</dt><dd class="mono">${detailSkill.path}</dd></div>
    </dl>

    ${detail.locations?.length ? `
      <section class="modal-section">
        <p class="eyebrow">Carpetas detectadas</p>
        <div class="location-list">
          ${detail.locations.map((location, index) => `
            <article class="location-item">
              <div class="location-topline">
                <strong>${index === 0 ? "Principal" : `Ubicacion ${index + 1}`}</strong>
                <div class="location-brandline">
                  ${renderOwnerBrand(location, "owner-brand-compact")}
                  <span class="tag">${getSourceDisplayLabel(location)}</span>
                </div>
              </div>
              <p class="mono">${location.path}</p>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}

    ${detail.relatedSkills?.length ? `
      <section class="modal-section">
        <p class="eyebrow">Skills relacionadas</p>
        <div class="location-list">
          ${detail.relatedSkills.map((relatedSkill) => `
            <article class="location-item">
              <div class="location-topline">
                <strong>${relatedSkill.name}</strong>
                <div class="location-brandline">
                  ${renderOwnerBrand(relatedSkill, "owner-brand-compact")}
                  <span class="tag">${getSourceDisplayLabel(relatedSkill)}</span>
                </div>
              </div>
              <p>${relatedSkill.description}</p>
              <div class="hero-preview-meta">
                <span>${relatedSkill.category}</span>
                <span>${formatDateLabel(relatedSkill.lastReviewed)}</span>
                ${relatedSkill.locationCount > 1 ? `<span>${relatedSkill.locationCount} ubicaciones</span>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}

    ${detail.markdownAvailable ? `
      <section class="modal-section">
        <p class="eyebrow">Markdown preview</p>
        <pre class="markdown-preview"><code>${detail.markdownPreview
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</code></pre>
      </section>
    ` : ""}

    <div class="modal-actions">
      <button class="button button-primary" type="button" data-download-skill="${detailSkill.id}" ${detailSkill.zipAvailable ? "" : "disabled"}>${detailSkill.zipAvailable ? "Descargar ZIP" : "ZIP pendiente"}</button>
      <button class="button button-secondary" type="button" data-copy-path="${detailSkill.path}">Copiar path</button>
      <button class="button button-secondary" type="button" data-close-modal="true">Volver al catalogo</button>
    </div>
  `;
};

const getRenderSnapshot = () => {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return null;
  }

  const isSearch = activeElement.id === "skill-search";
  const isSort = activeElement.id === "skill-sort";
  const isAdminField = activeElement.hasAttribute("data-admin-field");
  const isAdminSelect = activeElement.id === "admin-skill-select";

  if (!isSearch && !isSort && !isAdminField && !isAdminSelect) {
    return null;
  }

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    selector: isSearch
      ? "#skill-search"
      : isSort
        ? "#skill-sort"
        : isAdminSelect
          ? "#admin-skill-select"
          : `[data-admin-field="${activeElement.dataset.adminField}"]`,
    selectionStart: typeof activeElement.selectionStart === "number" ? activeElement.selectionStart : null,
    selectionEnd: typeof activeElement.selectionEnd === "number" ? activeElement.selectionEnd : null
  };
};

const restoreRenderSnapshot = (snapshot) => {
  if (!snapshot) {
    return;
  }

  window.scrollTo(snapshot.scrollX, snapshot.scrollY);

  const nextElement = document.querySelector(snapshot.selector);
  if (!nextElement) {
    return;
  }

  nextElement.focus({ preventScroll: true });

  if (typeof nextElement.setSelectionRange === "function" && snapshot.selectionStart !== null && snapshot.selectionEnd !== null) {
    nextElement.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  }
};

const render = () => {
  const renderSnapshot = getRenderSnapshot();

  if (!state.catalog) {
    renderMessage(
      "Cargando catalogo de skills...",
      "Estamos recuperando la fuente de datos versionada del hub para montar la portada y las scorecards."
    );
    return;
  }

  const { skills, summary } = state.catalog;
  const hubOpsStatus = state.adminDiscoveryBusy ? "Descubriendo..." : state.adminZipBusy ? "Empaquetando..." : "Disponible";
  if (!state.adminSkillId && skills.length > 0) state.adminSkillId = skills[0].id;

  const categories = getCategories();
  const sourceLabels = getSourceLabels();
  const repoOptions = getRepoOptions();
  if (state.category !== "All" && !categories.includes(state.category)) {
    state.category = "All";
  }
  if (state.sourceLabel !== "All" && !sourceLabels.includes(state.sourceLabel)) {
    state.sourceLabel = "All";
  }
  if (state.repoName !== "All" && !repoOptions.includes(state.repoName)) {
    state.repoName = "All";
  }

  const filteredSkills = getFilteredSkills();
  const usingDefaultTopic =
    !state.query.trim() &&
    state.category === "All" &&
    state.sourceLabel === "All" &&
    state.repoName === "All" &&
    !state.favoritesOnly;
  const defaultTopicSkills = usingDefaultTopic ? getDefaultTopicSkills() : [];
  const visibleSkillsSource = usingDefaultTopic ? defaultTopicSkills : filteredSkills;
  const totalPages = Math.max(1, Math.ceil(Math.max(visibleSkillsSource.length, 1) / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const pageStart = (state.page - 1) * PAGE_SIZE;
  const paginatedSkills = visibleSkillsSource.slice(pageStart, pageStart + PAGE_SIZE);
  const heroPreviewSkills = (usingDefaultTopic ? defaultTopicSkills : filteredSkills).slice(0, 3);
  const featuredSkills = [...skills].sort((a, b) => b.downloads - a.downloads).slice(0, 3);
  const adminSkill = getAdminSkill();
  const detailSkill = getDetailSkill();
  const latestReviews = [...skills].sort((a, b) => b.lastReviewed.localeCompare(a.lastReviewed)).slice(0, 4);
  const attentionQueue = [...skills]
    .filter((skill) => skill.securityStatus !== "Passed" || skill.validationStatus !== "Verified" || dateDiffInDays(skill.lastReviewed) > 10)
    .sort((a, b) => {
      const aAlerts = getSkillAlerts(a).length;
      const bAlerts = getSkillAlerts(b).length;
      return bAlerts - aAlerts || b.lastReviewed.localeCompare(a.lastReviewed);
    })
    .slice(0, 4);
  const favoriteCount = state.favorites.size;
  const discoverySources = state.catalog.inventory?.sources?.slice(0, 6) || [];

  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Skill governance para developers</p>
        <h2>El catalogo de skills de Codex para descubrir, validar y activar capacidades.</h2>
        <p class="hero-text">
          Descubre capacidades listas para usar, revisa scorecards de seguridad y validacion,
          abre fichas tecnicas con resumen real de markdown y descarga cada skill empaquetada desde un unico hub.
        </p>
        <dl class="hero-proof">
          <div><dt>Catalogo activo</dt><dd>${summary.totalSkills} skills publicadas</dd></div>
          <div><dt>Confianza operativa</dt><dd>${summary.securityPassed} con seguridad aprobada</dd></div>
          <div><dt>Adopcion</dt><dd>${formatNumber(summary.totalDownloads)} descargas acumuladas</dd></div>
        </dl>
        <div class="hero-actions">
          <a class="button button-primary" href="#catalogo">Explorar catalogo</a>
          <button class="button button-secondary" type="button" data-toggle-favorites="true">${state.favoritesOnly ? "Ver todas" : "Solo favoritas"}</button>
        </div>
      </div>

      <aside class="hero-panel" aria-label="Resumen operacional">
        <div class="panel-header"><span class="panel-dot"></span><span>release-status</span></div>
        <pre class="code-block"><code>skills.total         = ${summary.totalSkills}
security.passed     = ${summary.securityPassed}
validations.passed  = ${summary.validationPassed}
downloads.aggregate = ${formatNumber(summary.totalDownloads)}
detail.views        = ${formatNumber(summary.totalDetailViews)}
runtime             = "npm run dev"</code></pre>
        <div class="hero-preview-list" aria-label="Preview del catalogo">
          ${heroPreviewSkills.map((skill) => `
            <article class="hero-preview-card">
              <div class="hero-preview-topline"><span class="section-pill">${skill.category}</span><strong>${skill.score}/100</strong></div>
              <h3>${skill.name}</h3>
              <p>${skill.description}</p>
              <div class="hero-preview-meta"><span>${skill.securityStatus}</span><span>${skill.validationStatus}</span>${renderOwnerBrand(skill, "owner-brand-compact")}</div>
            </article>
          `).join("")}
        </div>
      </aside>
    </section>

    <section class="editorial-rail">
      ${featuredSkills.map((skill) => `
        <article class="rail-card">
          <p class="eyebrow">Top adoption / ${skill.category}</p>
          <h3>${skill.name}</h3>
          <p>${skill.description}</p>
          <div class="rail-meta"><span>${formatNumber(skill.downloads)} descargas</span><span>${formatNumber(skill.detailViews || 0)} aperturas</span></div>
        </article>
      `).join("")}
    </section>

    <section class="stats-strip" id="scorecards">
      <article class="metric-card"><span>Total de skills</span><strong>${summary.totalSkills}</strong><small>Cobertura centralizada para catalogo y descubrimiento.</small></article>
      <article class="metric-card"><span>Seguridad aprobada</span><strong>${summary.securityPassed}</strong><small>Skills con scorecard en estado passed.</small></article>
      <article class="metric-card"><span>Validaciones OK</span><strong>${summary.validationPassed}</strong><small>Verificaciones funcionales registradas en la ficha.</small></article>
      <article class="metric-card"><span>Aperturas de ficha</span><strong>${formatNumber(summary.totalDetailViews)}</strong><small>Uso real del hub para discovery y lectura tecnica.</small></article>
      <article class="metric-card"><span>Atencion requerida</span><strong>${summary.attentionRequired}</strong><small>Skills con review o validacion pendiente.</small></article>
      <article class="metric-card"><span>Favoritas guardadas</span><strong>${favoriteCount}</strong><small>Shortlist personal persistida en este navegador.</small></article>
    </section>

    <section class="dashboard-layout">
      <div class="dashboard-main">
        <section class="controls" id="catalogo">
          <div class="controls-topline">
            <div>
              <p class="eyebrow">Catalogo operativo</p>
              <h3 class="controls-title">Busca, filtra y compara skills listas para adopcion.</h3>
            </div>
            <div class="control-stack">
              <div class="searchbox">
                <label for="skill-search">Buscar skill</label>
                <input id="skill-search" type="search" placeholder="OpenAI, Azure, frontend, deploy..." value="${state.query}" />
              </div>
              <label class="sortbox">
                <span>Ordenar por</span>
                <select id="skill-sort">
                  <option value="featured" ${state.sortBy === "featured" ? "selected" : ""}>Featured</option>
                  <option value="downloads" ${state.sortBy === "downloads" ? "selected" : ""}>Descargas</option>
                  <option value="score" ${state.sortBy === "score" ? "selected" : ""}>Score</option>
                  <option value="review" ${state.sortBy === "review" ? "selected" : ""}>Ultima review</option>
                  <option value="name" ${state.sortBy === "name" ? "selected" : ""}>Nombre</option>
                </select>
              </label>
            </div>
          </div>

          <div class="controls-secondary">
            <label class="sortbox">
              <span>Origen</span>
              <select id="skill-source">
                ${sourceLabels.map((label) => `<option value="${label}" ${state.sourceLabel === label ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label class="sortbox">
              <span>Repositorio</span>
              <select id="skill-repo">
                ${repoOptions.map((repoName) => `<option value="${repoName}" ${state.repoName === repoName ? "selected" : ""}>${repoName}</option>`).join("")}
              </select>
            </label>
          </div>

          <div class="filters" aria-label="Filtrar por categoria">
            ${categories.map((category) => `<button class="filter-chip ${state.category === category ? "is-active" : ""}" data-category="${category}">${category}</button>`).join("")}
            <button class="filter-chip ${state.favoritesOnly ? "is-active" : ""}" data-toggle-favorites="true">Favoritas</button>
          </div>

          <div class="controls-summary">
            <p class="results-copy">${usingDefaultTopic ? `${defaultTopicSkills.length} skills destacadas del topic ${DEFAULT_TOPIC.label}.` : `${filteredSkills.length} skills visibles en la seleccion actual.`}</p>
            <p class="results-copy">${usingDefaultTopic ? "Vista inicial curada para evitar ruido y reducir scroll en discovery." : `${state.sourceLabel !== "All" ? `Origen: ${state.sourceLabel}. ` : ""}${state.repoName !== "All" ? `Repo: ${state.repoName}. ` : ""}Pagina ${state.page} de ${totalPages} con navegacion acotada.`}</p>
          </div>
        </section>

        <section class="catalog-grid" id="descargas">
          ${paginatedSkills.map((skill) => {
            const alerts = getSkillAlerts(skill);
            const badges = getSkillBadges(skill);
            return `
              <article class="skill-card ${alerts.length ? "has-alerts" : ""}">
                <div class="article-kicker">
                  <div class="card-titleline">
                    <span class="section-pill">${skill.category}</span>
                    <span class="article-date">${formatDateLabel(skill.lastReviewed)}</span>
                  </div>
                  <button class="favorite-button ${state.favorites.has(skill.id) ? "is-active" : ""}" type="button" aria-label="Marcar ${skill.name} como favorita" data-favorite-skill="${skill.id}">★</button>
                </div>

                <div class="skill-card-header">
                  <div>
                    <p class="eyebrow">${getSkillTypeLabel(skill)}${skill.variant ? ` / ${skill.variant}` : ""}</p>
                    <h3>${skill.name}</h3>
                    ${renderOwnerBrand(skill)}
                  </div>
                  <span class="score-badge">${skill.score}/100</span>
                </div>

                <p class="skill-description">${skill.description}</p>
                ${badges.length ? `<div class="badge-row">${badges.map((badge) => `<span class="badge">${badge}</span>`).join("")}</div>` : ""}
                ${alerts.length ? `<div class="alert-row">${alerts.map((alert) => `<span class="alert-pill is-${alert.tone}">${alert.label}</span>`).join("")}</div>` : ""}
                <div class="tag-row">${(skill.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
                <dl class="scorecard">
                  <div><dt>Security</dt><dd class="${getStatusTone(skill.securityStatus)}">${skill.securityStatus}</dd></div>
                  <div><dt>Validation</dt><dd class="${getStatusTone(skill.validationStatus)}">${skill.validationStatus}</dd></div>
                  <div><dt>Downloads</dt><dd>${formatNumber(skill.downloads)}</dd></div>
                  <div><dt>Views</dt><dd>${formatNumber(skill.detailViews || 0)}</dd></div>
                  <div><dt>Owner</dt><dd>${skill.maintainer}</dd></div>
                  <div><dt>Source path</dt><dd class="mono">${skill.path}</dd></div>
                </dl>
                <div class="card-actions">
                  <button class="button button-primary" type="button" data-download-skill="${skill.id}" ${skill.zipAvailable ? "" : "disabled"}>${skill.zipAvailable ? "Descargar" : "ZIP pendiente"}</button>
                  <button class="button button-secondary" type="button" data-skill-detail="${skill.id}">Ficha tecnica</button>
                </div>
              </article>
            `;
          }).join("")}
        </section>

        <div class="catalog-pagination">
          <button class="button button-secondary" type="button" data-page-action="prev" ${state.page <= 1 ? "disabled" : ""}>Anterior</button>
          <p class="results-copy">Mostrando ${paginatedSkills.length} de ${visibleSkillsSource.length} skills.</p>
          <button class="button button-secondary" type="button" data-page-action="next" ${state.page >= totalPages ? "disabled" : ""}>Siguiente</button>
        </div>
      </div>

      <aside class="dashboard-side">
        <section class="side-panel hub-ops-panel">
          <div class="admin-header">
            <div><p class="eyebrow">Hub operations</p><h4>Mantenimiento del hub</h4></div>
            <span class="admin-status ${state.adminZipBusy || state.adminDiscoveryBusy ? "is-saving" : ""}">${hubOpsStatus}</span>
          </div>
          <p class="side-copy">Estas acciones operan sobre el hub completo. No pertenecen a la edición de una ficha concreta del catálogo.</p>
          <div class="hub-ops-grid">
            <button class="button button-secondary" id="admin-discover" type="button">Descubrir en disco</button>
            <button class="button button-secondary" id="admin-regenerate" type="button">Regenerar ZIPs</button>
          </div>
          <p class="admin-message">${state.adminZipMessage || "Descubrir sincroniza el inventario detectado. Regenerar rehace los paquetes descargables del catálogo actual."}</p>
          <p class="admin-message">${state.adminDiscoveryBusy ? "Buscando SKILL.md en las rutas soportadas y refrescando el inventario..." : "Las operaciones globales se ejecutan sin modificar la ficha que estás editando."}</p>
        </section>

        <section class="side-panel admin-panel">
          <div class="admin-header">
            <div><p class="eyebrow">Admin studio</p><h4>Editar catalogo</h4></div>
            <span class="admin-status ${state.adminSaving ? "is-saving" : ""}">${state.adminSaving ? "Guardando..." : "Editable"}</span>
          </div>
          <div class="admin-form">
            <label class="admin-field">
              <span>Skill</span>
              <select id="admin-skill-select">
                ${skills.map((skill) => `<option value="${skill.id}" ${skill.id === adminSkill?.id ? "selected" : ""}>${skill.name}${skill.variant ? ` / ${skill.variant}` : ""}${skill.locationCount > 1 ? ` (${skill.locationCount} ubicaciones)` : ""}${skill.sourceLabel ? ` - ${skill.sourceLabel}` : ""}</option>`).join("")}
              </select>
            </label>

            <div class="admin-toolbar">
              <button class="button button-secondary" id="admin-create" type="button">Nueva skill</button>
              <button class="button button-secondary" id="admin-delete" type="button">Eliminar</button>
            </div>

            <div class="admin-grid">
              <label class="admin-field"><span>Id</span><input data-admin-field="id" value="${adminSkill?.id || ""}" /></label>
              <label class="admin-field"><span>Name</span><input data-admin-field="name" value="${adminSkill?.name || ""}" /></label>
              <label class="admin-field"><span>Category</span><input data-admin-field="category" value="${adminSkill?.category || ""}" /></label>
              <label class="admin-field"><span>Maintainer</span><input data-admin-field="maintainer" value="${adminSkill?.maintainer || ""}" /></label>
              <label class="admin-field"><span>Last review</span><input data-admin-field="lastReviewed" value="${adminSkill?.lastReviewed || ""}" /></label>
              <label class="admin-field"><span>Variant</span><input data-admin-field="variant" value="${adminSkill?.variant || ""}" /></label>
              <label class="admin-field"><span>Downloads</span><input data-admin-field="downloads" type="number" value="${adminSkill?.downloads || 0}" /></label>
              <label class="admin-field"><span>Views</span><input data-admin-field="detailViews" type="number" value="${adminSkill?.detailViews || 0}" /></label>
              <label class="admin-field"><span>Score</span><input data-admin-field="score" type="number" value="${adminSkill?.score || 0}" /></label>
              <label class="admin-field"><span>Security</span><select data-admin-field="securityStatus">${["Passed", "Review", "Unknown"].map((value) => `<option value="${value}" ${adminSkill?.securityStatus === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
              <label class="admin-field"><span>Validation</span><select data-admin-field="validationStatus">${["Verified", "Pending", "Unknown"].map((value) => `<option value="${value}" ${adminSkill?.validationStatus === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
              <label class="admin-field"><span>Path</span><input data-admin-field="path" value="${adminSkill?.path || ""}" /></label>
            </div>

            <label class="admin-field"><span>Description</span><textarea data-admin-field="description" rows="5">${adminSkill?.description || ""}</textarea></label>

            <div class="admin-actions">
              <button class="button button-primary" id="admin-save" type="button">Guardar cambios</button>
              <button class="button button-secondary" id="admin-reset" type="button">Reset visual</button>
            </div>
            <p class="admin-message">${state.adminMessage || "Los cambios se guardan en data/skills.catalog.json."}</p>
          </div>
        </section>

        <section class="side-panel">
          <p class="eyebrow">Latest review</p>
          <h4>Ultimas skills revisadas</h4>
          <div class="review-list">
            ${latestReviews.map((skill) => `<article class="review-item"><span class="review-date">${skill.lastReviewed}</span><strong>${skill.name}</strong><p>${skill.maintainer}</p></article>`).join("")}
          </div>
        </section>

        ${discoverySources.length ? `
          <section class="side-panel">
            <p class="eyebrow">Discovery map</p>
            <h4>Donde se han encontrado</h4>
            <div class="review-list">
              ${discoverySources.map((source) => `
                <article class="review-item">
                  <span class="review-date">${formatNumber(source.count)} skills</span>
                  <strong>${source.label}</strong>
                  <p>Inventario sincronizado desde disco local.</p>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}

        <section class="side-panel side-panel-accent">
          <p class="eyebrow">Needs attention</p>
          <h4>Skills a revisar</h4>
          <div class="review-list">
            ${attentionQueue.map((skill) => `
              <article class="review-item">
                <span class="review-date">${skill.lastReviewed}</span>
                <strong>${skill.name}</strong>
                <p>${getSkillAlerts(skill).map((alert) => alert.label).join(" · ")}</p>
              </article>
            `).join("")}
          </div>
        </section>

      </aside>
    </section>

    ${detailSkill ? `
      <div class="modal-backdrop" data-close-modal="true">
        <section class="skill-modal" role="dialog" aria-modal="true" aria-labelledby="skill-modal-title" aria-describedby="skill-modal-description" tabindex="-1">
          <button class="modal-close" type="button" aria-label="Cerrar ficha tecnica" data-close-modal="true">Cerrar</button>
          <div class="modal-header">
            <div><p class="eyebrow">Ficha tecnica</p><h3 id="skill-modal-title">${detailSkill.name}</h3></div>
            <div class="modal-score"><span>Scorecard</span><strong>${detailSkill.score}/100</strong></div>
          </div>
          ${renderModalBody(detailSkill)}
        </section>
      </div>
    ` : ""}
  `;

  document.querySelector("#skill-search")?.addEventListener("input", (event) => { state.query = event.target.value; state.page = 1; render(); });
  document.querySelector("#skill-sort")?.addEventListener("change", (event) => { state.sortBy = event.target.value; state.page = 1; render(); });
  document.querySelector("#skill-source")?.addEventListener("change", (event) => {
    state.sourceLabel = event.target.value;
    state.repoName = "All";
    state.page = 1;
    render();
  });
  document.querySelector("#skill-repo")?.addEventListener("change", (event) => {
    state.repoName = event.target.value;
    state.page = 1;
    render();
  });
  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => { state.category = button.dataset.category; state.page = 1; render(); }));
  document.querySelectorAll("[data-toggle-favorites]").forEach((button) => button.addEventListener("click", () => { state.favoritesOnly = !state.favoritesOnly; state.page = 1; render(); }));
  document.querySelectorAll("[data-page-action]").forEach((button) => button.addEventListener("click", () => {
    state.page = button.dataset.pageAction === "next" ? state.page + 1 : Math.max(1, state.page - 1);
    render();
  }));
  document.querySelectorAll("[data-favorite-skill]").forEach((button) => button.addEventListener("click", () => toggleFavorite(button.dataset.favoriteSkill)));

  document.querySelector("#admin-skill-select")?.addEventListener("change", (event) => { state.adminSkillId = event.target.value; state.adminMessage = ""; render(); });
  document.querySelector("#admin-create")?.addEventListener("click", createDraftSkill);
  document.querySelector("#admin-delete")?.addEventListener("click", deleteSelectedSkill);
  document.querySelector("#admin-discover")?.addEventListener("click", discoverSkills);
  document.querySelector("#admin-regenerate")?.addEventListener("click", regenerateZips);
  document.querySelector("#admin-reset")?.addEventListener("click", () => { state.adminMessage = "Cambios locales descartados. Recargando catalogo..."; bootstrap(); });
  document.querySelector("#admin-save")?.addEventListener("click", persistCatalog);

  const handleAdminFieldUpdate = (event) => {
    const selectedSkill = getAdminSkill();
    if (!selectedSkill) return;

    const { adminField } = event.target.dataset;
    const nextValue = event.target.type === "number" ? Number(event.target.value || 0) : event.target.value;
    const nextSkills = state.catalog.skills.map((skill) =>
      skill.id === selectedSkill.id ? { ...skill, [adminField]: nextValue } : skill
    );

    syncCatalog(nextSkills.map((skill) => ({
      ...skill,
      downloadPath: `/api/download/${skill.id}`,
      tags: [...new Set([skill.category, skill.securityStatus, skill.validationStatus, ...(skill.tags || [])].filter(Boolean))]
    })));
    if (adminField === "id") state.adminSkillId = nextValue;
    state.adminMessage = "Cambios locales pendientes de guardar.";
  };

  document.querySelectorAll("[data-admin-field]").forEach((field) => {
    field.addEventListener("input", handleAdminFieldUpdate);
    field.addEventListener("change", handleAdminFieldUpdate);
  });

  document.querySelectorAll("[data-skill-detail]").forEach((button) => button.addEventListener("click", () => openSkillDetail(button.dataset.skillDetail)));
  document.querySelectorAll("[data-download-skill]").forEach((button) => button.addEventListener("click", () => handleDownload(button.dataset.downloadSkill)));
  document.querySelectorAll("[data-copy-path]").forEach((button) => button.addEventListener("click", () => copyPath(button.dataset.copyPath)));
  document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", (event) => {
    if (element.classList.contains("modal-backdrop") && event.target !== element) return;
    closeSkillDetail();
  }));

  restoreRenderSnapshot(renderSnapshot);
};

const bootstrap = async () => {
  state.adminSaving = false;
  state.adminZipBusy = false;
  state.adminDiscoveryBusy = false;
  loadFavorites();
  render();

  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error(`Catalog request failed with status ${response.status}`);
    state.catalog = await response.json();
    render();
  } catch (error) {
    renderMessage(
      "No se pudo cargar el catalogo.",
      `La landing no ha podido recuperar /api/catalog. ${error instanceof Error ? error.message : "Unknown error"}.`
    );
  }
};

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.detailSkillId) closeSkillDetail();
});

bootstrap();
