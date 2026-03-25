const baseSkills = [
  {
    id: "appinsights-instrumentation",
    name: "appinsights-instrumentation",
    category: "Observability",
    path: "C:/Users/juan.a.mora/.agents/skills/appinsights-instrumentation",
    description:
      "Guia para instrumentar webapps con Azure Application Insights, telemetria y patrones APM."
  },
  {
    id: "azure-ai",
    name: "azure-ai",
    category: "Azure AI",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-ai",
    description:
      "Cobertura para Azure AI Search, Speech, Azure OpenAI, OCR y escenarios de IA aplicada."
  },
  {
    id: "azure-aigateway",
    name: "azure-aigateway",
    category: "Azure AI",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-aigateway",
    description:
      "Configura Azure API Management como AI Gateway con politicas, seguridad y control de costes."
  },
  {
    id: "azure-cloud-migrate",
    name: "azure-cloud-migrate",
    category: "Migration",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-cloud-migrate",
    description:
      "Evalua y migra workloads desde AWS, GCP u otros clouds hacia servicios equivalentes en Azure."
  },
  {
    id: "azure-compliance",
    name: "azure-compliance",
    category: "Security",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-compliance",
    description:
      "Auditoria de cumplimiento y seguridad de Azure, incluyendo secretos, certificados y posture."
  },
  {
    id: "azure-compute",
    name: "azure-compute",
    category: "Infrastructure",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-compute",
    description:
      "Recomienda tamaños de VM y configuraciones de VMSS segun carga, rendimiento y presupuesto."
  },
  {
    id: "azure-cost-optimization",
    name: "azure-cost-optimization",
    category: "FinOps",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-cost-optimization",
    description:
      "Analiza costes reales en Azure y propone acciones concretas de optimizacion y ahorro."
  },
  {
    id: "azure-deploy",
    name: "azure-deploy",
    category: "Deployment",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-deploy",
    description:
      "Ejecuta despliegues de aplicaciones ya preparadas en Azure con azd, Terraform o Bicep."
  },
  {
    id: "azure-diagnostics",
    name: "azure-diagnostics",
    category: "Operations",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-diagnostics",
    description:
      "Triage seguro para incidencias productivas en Azure usando Monitor, AppLens y Resource Health."
  },
  {
    id: "azure-hosted-copilot-sdk",
    name: "azure-hosted-copilot-sdk",
    category: "Developer Tools",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-hosted-copilot-sdk",
    description:
      "Construye y despliega aplicaciones con GitHub Copilot SDK alojadas en Azure."
  },
  {
    id: "azure-kusto",
    name: "azure-kusto",
    category: "Data",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-kusto",
    description:
      "Consultas y analitica sobre Azure Data Explorer y Log Analytics con KQL."
  },
  {
    id: "azure-messaging",
    name: "azure-messaging",
    category: "Integration",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-messaging",
    description:
      "Diagnostica problemas de SDKs de Event Hubs y Service Bus en varios lenguajes."
  },
  {
    id: "azure-observability",
    name: "azure-observability",
    category: "Observability",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-observability",
    description:
      "Trabaja con Azure Monitor, Application Insights, alertas, dashboards y workbooks."
  },
  {
    id: "azure-postgres",
    name: "azure-postgres",
    category: "Data",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-postgres",
    description:
      "Crea PostgreSQL Flexible Server y habilita autenticacion passwordless con Entra ID."
  },
  {
    id: "azure-prepare",
    name: "azure-prepare",
    category: "Deployment",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-prepare",
    description:
      "Prepara aplicaciones para Azure creando infraestructura, azure.yaml y artefactos de despliegue."
  },
  {
    id: "azure-quotas",
    name: "azure-quotas",
    category: "Infrastructure",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-quotas",
    description:
      "Consulta y gestiona cuotas y limites de Azure para planificar capacidad y regiones."
  },
  {
    id: "azure-rbac",
    name: "azure-rbac",
    category: "Security",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-rbac",
    description:
      "Ayuda a elegir el rol RBAC minimo necesario y genera comandos para asignarlo."
  },
  {
    id: "azure-resource-lookup",
    name: "azure-resource-lookup",
    category: "Infrastructure",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-resource-lookup",
    description:
      "Inventaria recursos de Azure mediante Resource Graph y consultas por tipo, tag o grupo."
  },
  {
    id: "azure-resource-visualizer",
    name: "azure-resource-visualizer",
    category: "Architecture",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-resource-visualizer",
    description:
      "Genera diagramas Mermaid detallando relaciones entre recursos de Azure."
  },
  {
    id: "azure-storage",
    name: "azure-storage",
    category: "Data",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-storage",
    description:
      "Soporte para Blob, Files, Queues, Tables y Data Lake con patrones de almacenamiento."
  },
  {
    id: "azure-upgrade",
    name: "azure-upgrade",
    category: "Migration",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-upgrade",
    description:
      "Evalua y automatiza upgrades de planes, tiers o SKUs entre servicios de Azure."
  },
  {
    id: "azure-validate",
    name: "azure-validate",
    category: "Deployment",
    path: "C:/Users/juan.a.mora/.agents/skills/azure-validate",
    description:
      "Valida configuracion, infraestructura y prerrequisitos antes de desplegar en Azure."
  },
  {
    id: "bbva-frontend-style",
    name: "bbva-frontend-style",
    category: "Frontend",
    path: "C:/Users/juan.a.mora/.codex/skills/bbva-frontend-style",
    description:
      "Patrones visuales para interfaces corporativas inspiradas en la web de BBVA."
  },
  {
    id: "capacity",
    name: "capacity",
    category: "Foundry",
    path: "C:/Users/juan.a.mora/.agents/skills/microsoft-foundry/models/deploy-model/capacity",
    description:
      "Descubre capacidad disponible para modelos Azure OpenAI entre regiones y proyectos."
  },
  {
    id: "customize",
    name: "customize",
    category: "Foundry",
    path: "C:/Users/juan.a.mora/.agents/skills/microsoft-foundry/models/deploy-model/customize",
    description:
      "Flujo guiado para despliegues de modelos con control completo sobre version, SKU y politicas."
  },
  {
    id: "deploy-model",
    name: "deploy-model",
    category: "Foundry",
    path: "C:/Users/juan.a.mora/.agents/skills/microsoft-foundry/models/deploy-model",
    description:
      "Skill unificada para desplegar modelos Azure OpenAI con enrutado inteligente por intencion."
  },
  {
    id: "entra-app-registration",
    name: "entra-app-registration",
    category: "Security",
    path: "C:/Users/juan.a.mora/.agents/skills/entra-app-registration",
    description:
      "Guia para app registrations en Entra ID, OAuth 2.0, permisos y MSAL."
  },
  {
    id: "find-skills",
    name: "find-skills",
    category: "Developer Tools",
    path: "C:/Users/juan.a.mora/.agents/skills/find-skills",
    description:
      "Ayuda a descubrir e instalar skills cuando el developer no sabe si ya existe una solucion."
  },
  {
    id: "frontend-improver",
    name: "frontend-improver",
    category: "Frontend",
    path: "C:/Users/juan.a.mora/.agents/skills/frontend-improver",
    description:
      "Mejora visual y de experiencia para la aplicacion UIGen basada en Next.js y Tailwind."
  },
  {
    id: "imagegen",
    name: "imagegen",
    category: "OpenAI",
    path: "C:/Users/juan.a.mora/.codex/skills/imagegen",
    description:
      "Generacion y edicion de imagenes con la OpenAI Image API usando el CLI empaquetado."
  },
  {
    id: "microsoft-foundry",
    name: "microsoft-foundry",
    category: "Foundry",
    path: "C:/Users/juan.a.mora/.agents/skills/microsoft-foundry",
    description:
      "Gestion end-to-end de agentes en Foundry: deploy, evaluacion, monitorizacion y optimizacion."
  },
  {
    id: "openai-docs",
    name: "openai-docs",
    category: "OpenAI",
    path: "C:/Users/juan.a.mora/.codex/skills/.system/openai-docs",
    description:
      "Usa la documentacion oficial de OpenAI como source of truth para APIs, SDKs y productos."
  },
  {
    id: "openai-frontend-style",
    name: "openai-frontend-style",
    category: "Frontend",
    path: "C:/Users/juan.a.mora/.codex/skills/openai-frontend-style",
    description:
      "Aterriza una estetica editorial y tecnica inspirada en OpenAI Docs sin copiar la marca."
  },
  {
    id: "playwright-interactive",
    name: "playwright-interactive",
    category: "Testing",
    path: "C:/Users/juan.a.mora/.codex/skills/playwright-interactive",
    description:
      "Depuracion interactiva con navegador persistente y Playwright para iterar rapido sobre UI."
  },
  {
    id: "pptx",
    name: "pptx",
    category: "Productivity",
    path: "C:/Users/juan.a.mora/.agents/skills/pptx",
    description:
      "Workflow completo para leer, crear, editar y combinar ficheros de presentacion .pptx."
  },
  {
    id: "preset",
    name: "preset",
    category: "Foundry",
    path: "C:/Users/juan.a.mora/.agents/skills/microsoft-foundry/models/deploy-model/preset",
    description:
      "Despliega modelos en la mejor region posible tras analizar capacidad disponible."
  },
  {
    id: "skill-creator-agents",
    name: "skill-creator",
    variant: "agents",
    category: "Developer Tools",
    path: "C:/Users/juan.a.mora/.agents/skills/skill-creator",
    description:
      "Guia para crear skills efectivas que amplian las capacidades del agente con workflows especializados."
  },
  {
    id: "skill-creator-system",
    name: "skill-creator",
    variant: "system",
    category: "Developer Tools",
    path: "C:/Users/juan.a.mora/.codex/skills/.system/skill-creator",
    description:
      "Version de sistema de la skill de creacion de skills, orientada a extensiones consistentes."
  },
  {
    id: "skill-installer",
    name: "skill-installer",
    category: "Developer Tools",
    path: "C:/Users/juan.a.mora/.codex/skills/.system/skill-installer",
    description:
      "Instala skills curated o desde repositorios GitHub dentro de CODEX_HOME."
  }
];

const securityStatuses = ["Passed", "Passed", "Passed", "Review"];
const validationStatuses = ["Verified", "Verified", "Verified", "Pending"];

export const skills = baseSkills.map((skill, index) => {
  const downloads = 120 + index * 37 + (index % 5) * 19;
  const securityStatus = securityStatuses[index % securityStatuses.length];
  const validationStatus = validationStatuses[(index + 1) % validationStatuses.length];
  const downloadSlug = `${skill.id}.zip`;
  const score = 78 + (index % 6) * 3 + (securityStatus === "Passed" ? 4 : 0);

  return {
    ...skill,
    downloads,
    securityStatus,
    validationStatus,
    score: Math.min(score, 98),
    lastReviewed: `2026-03-${String((index % 9) + 12).padStart(2, "0")}`,
    maintainer: index % 2 === 0 ? "Platform Engineering" : "AI Enablement",
    tags: [skill.category, securityStatus, validationStatus],
    downloadPath: `/downloads/${downloadSlug}`
  };
});

export const summary = skills.reduce(
  (acc, skill) => {
    acc.totalDownloads += skill.downloads;
    if (skill.securityStatus === "Passed") {
      acc.securityPassed += 1;
    }
    if (skill.validationStatus === "Verified") {
      acc.validationPassed += 1;
    }
    return acc;
  },
  {
    totalSkills: skills.length,
    totalDownloads: 0,
    securityPassed: 0,
    validationPassed: 0
  }
);
