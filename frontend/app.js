const AGENTS = [
  {
    id: "resumen-llamadas",
    title: "Resumen operativo",
    short: "RS",
    endpoint: "/agentes/resumen-llamadas",
    description: "Volumen, abandono y lectura inicial por skill.",
    group: "operacion",
    tone: "blue",
  },
  {
    id: "tiempos-skill",
    title: "Tiempos por skill",
    short: "TS",
    endpoint: "/agentes/tiempos-skill",
    description: "Espera, conversacion, documentacion y alertas.",
    group: "operacion",
    tone: "orange",
  },
  {
    id: "asesores",
    title: "Desempeno de asesores",
    short: "AS",
    endpoint: "/agentes/asesores",
    description: "Productividad operativa sobre llamadas contestadas.",
    group: "personas",
    tone: "teal",
  },
  {
    id: "calidad",
    title: "Calidad de atencion",
    short: "CL",
    endpoint: "/agentes/calidad",
    description: "Encuestas, satisfaccion y skills con peor percepcion.",
    group: "calidad",
    tone: "violet",
  },
  {
    id: "eficiencia",
    title: "Eficiencia operativa",
    short: "EF",
    endpoint: "/agentes/eficiencia",
    description: "Abandono, cuellos de botella y casos criticos.",
    group: "riesgo",
    tone: "green",
  },
  {
    id: "anomalias",
    title: "Deteccion de anomalias",
    short: "AN",
    endpoint: "/agentes/anomalias",
    description: "Isolation Forest sobre tiempos y senales fuera de rango.",
    group: "riesgo",
    tone: "amber",
  },
];

const SUPERVISOR = {
  id: "supervisor",
  title: "Supervisor ejecutivo",
  short: "SV",
  endpoint: "/agentes/supervisor",
  description: "Consolida el analisis y redacta el informe final.",
  group: "supervisor",
  tone: "navy",
};

const STEP_ORDER = [...AGENTS, SUPERVISOR];

const state = {
  running: false,
  startedAt: null,
  lastElapsedMs: 0,
  elapsedTimer: null,
  steps: {},
  results: {},
  logs: [],
  backend: {
    label: "Verificando...",
    message: "Validando conexion con FastAPI.",
  },
};

const refs = {
  periodLabel: document.getElementById("periodLabel"),
  backendStatus: document.getElementById("backendStatus"),
  backendMessage: document.getElementById("backendMessage"),
  progressCount: document.getElementById("progressCount"),
  elapsedTime: document.getElementById("elapsedTime"),
  runState: document.getElementById("runState"),
  viewFilter: document.getElementById("viewFilter"),
  statusFilter: document.getElementById("statusFilter"),
  runAllBtn: document.getElementById("runAllBtn"),
  resetBtn: document.getElementById("resetBtn"),
  kpiStrip: document.getElementById("kpiStrip"),
  executionMatrixBody: document.getElementById("executionMatrixBody"),
  timelineChart: document.getElementById("timelineChart"),
  pipelineFunnel: document.getElementById("pipelineFunnel"),
  conversionRings: document.getElementById("conversionRings"),
  agentPanels: document.getElementById("agentPanels"),
  supervisorStatus: document.getElementById("supervisorStatus"),
  supervisorMeta: document.getElementById("supervisorMeta"),
  supervisorReport: document.getElementById("supervisorReport"),
  activityLog: document.getElementById("activityLog"),
};

function initState() {
  state.running = false;
  state.startedAt = null;
  state.lastElapsedMs = 0;
  state.results = {};
  state.logs = [];
  state.steps = {};

  for (const step of STEP_ORDER) {
    state.steps[step.id] = {
      status: "idle",
      durationMs: null,
      error: null,
    };
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function humanizeKey(text) {
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncate(text, max = 90) {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function setPeriodLabel() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  refs.periodLabel.textContent = `${formatDate(firstDay)} - ${formatDate(today)}`;
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Sin dato";
  }

  if (typeof value === "number") {
    const abs = Math.abs(value);
    const digits = Number.isInteger(value) || abs >= 100 ? 0 : 2;
    return formatNumber(value, digits);
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  return String(value);
}

function formatDuration(ms) {
  if (!ms && ms !== 0) {
    return "--";
  }

  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatPercentFromRatio(ratio) {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 0;
  return `${formatNumber(safeRatio * 100, 0)}%`;
}

function nowTime() {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusText(status) {
  return {
    idle: "Pendiente",
    running: "Ejecutando",
    complete: "Completado",
    error: "Error",
  }[status];
}

function getStepProgress(step) {
  return {
    idle: 0.08,
    running: 0.58,
    complete: 1,
    error: 1,
  }[step.status] ?? 0;
}

function getGroupLabel(group) {
  return {
    all: "Todas",
    operacion: "Operacion",
    personas: "Asesores",
    calidad: "Calidad",
    riesgo: "Riesgo",
    supervisor: "Supervisor",
  }[group] ?? group;
}

function addLog(message, tone = "neutral") {
  state.logs.unshift({
    message,
    tone,
    time: nowTime(),
  });

  refs.activityLog.innerHTML = state.logs
    .slice(0, 30)
    .map(
      (entry) => `
        <div class="log-entry ${entry.tone}">
          <span class="log-time">${entry.time}</span>
          <p>${escapeHtml(entry.message)}</p>
        </div>
      `
    )
    .join("");
}

function flattenMetrics(obj, prefix = "") {
  const items = [];

  if (!obj || typeof obj !== "object") {
    return items;
  }

  for (const [key, value] of Object.entries(obj)) {
    const label = prefix ? `${prefix} · ${humanizeKey(key)}` : humanizeKey(key);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      items.push(...flattenMetrics(value, label));
      continue;
    }

    items.push({ label, value });
  }

  return items;
}

function renderMetricDeck(entries) {
  if (!entries.length) {
    return "";
  }

  return `
    <div class="metric-deck">
      ${entries
        .map(
          (entry) => `
            <article class="metric-card">
              <span>${escapeHtml(entry.label)}</span>
              <strong>${escapeHtml(formatValue(entry.value))}</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderArraySection(title, items) {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }

  const firstItem = items[0];

  if (typeof firstItem === "object" && firstItem !== null && !Array.isArray(firstItem)) {
    const columns = Object.keys(firstItem).slice(0, 6);

    return `
      <section class="section-block">
        <h4>${escapeHtml(humanizeKey(title))}</h4>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                ${columns.map((column) => `<th>${escapeHtml(humanizeKey(column))}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${items
                .slice(0, 10)
                .map(
                  (item) => `
                    <tr>
                      ${columns.map((column) => `<td>${escapeHtml(formatValue(item[column]))}</td>`).join("")}
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  return `
    <section class="section-block">
      <h4>${escapeHtml(humanizeKey(title))}</h4>
      <div class="pill-list">
        ${items.slice(0, 12).map((item) => `<span class="pill">${escapeHtml(formatValue(item))}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderObjectSection(title, obj) {
  const metrics = flattenMetrics(obj);
  if (!metrics.length) {
    return "";
  }

  return `
    <section class="section-block">
      <h4>${escapeHtml(humanizeKey(title))}</h4>
      ${renderMetricDeck(metrics)}
    </section>
  `;
}

function renderAlertSection(alerts) {
  if (!Array.isArray(alerts) || !alerts.length) {
    return "";
  }

  return `
    <section class="section-block">
      <h4>Alertas clave</h4>
      <div class="alert-list">
        ${alerts
          .slice(0, 8)
          .map(
            (alert) => `
              <article class="alert-card">
                <strong>${escapeHtml(formatValue(alert.tipo || alert.skill || alert.departamento || "Alerta"))}</strong>
                <p>${escapeHtml(formatValue(alert.comentario || alert.valor || "Sin detalle"))}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function getLeadMetric(agent, step, result) {
  const durationLabel = step.durationMs ? ` · ${formatDuration(step.durationMs)}` : "";

  if (step.status === "idle") {
    return {
      value: "--",
      label: "Aun sin ejecutar",
      note: agent.description,
      footer: `Pendiente${durationLabel}`,
      progress: getStepProgress(step),
    };
  }

  if (step.status === "running") {
    return {
      value: "...",
      label: "Consultando backend",
      note: "Procesando resultados del agente.",
      footer: `Ejecutando${durationLabel}`,
      progress: getStepProgress(step),
    };
  }

  if (step.status === "error") {
    return {
      value: "Error",
      label: "No se pudo completar",
      note: truncate(step.error || "Ocurrio un error inesperado.", 82),
      footer: `Error${durationLabel}`,
      progress: getStepProgress(step),
    };
  }

  const kpis = result?.kpis || {};

  switch (agent.id) {
    case "resumen-llamadas":
      return {
        value: formatValue(kpis.total_llamadas),
        label: "Llamadas analizadas",
        note: `${formatValue(kpis.total_abandonadas)} abandonadas`,
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
    case "tiempos-skill":
      return {
        value: `${formatValue(kpis.tiempo_espera_promedio_global)} s`,
        label: "Espera promedio",
        note: `Skill critica: ${formatValue(kpis.skill_mayor_espera)}`,
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
    case "asesores":
      return {
        value: formatValue(kpis.total_asesores),
        label: "Asesores analizados",
        note: `${formatValue(kpis.total_llamadas_atendidas)} llamadas atendidas`,
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
    case "calidad":
      return {
        value: formatValue(kpis.total_encuestas),
        label: "Encuestas validas",
        note: `${formatValue(kpis.porcentaje_baja_satisfaccion)}% baja satisfaccion`,
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
    case "eficiencia":
      return {
        value: `${formatValue(kpis.tasa_abandono)}%`,
        label: "Tasa de abandono",
        note: `${formatValue(kpis.cantidad_casos_criticos)} casos criticos`,
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
    case "anomalias":
      return {
        value: formatValue(kpis.total_anomalias),
        label: "Anomalias detectadas",
        note: `${formatValue(kpis.porcentaje_anomalias)}% del total`,
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
    case "supervisor":
      return {
        value: formatValue(result?.agentes_analizados?.length || 0),
        label: "Agentes consolidados",
        note: `Modelo: ${result?.modelo || "Sin dato"}`,
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
    default:
      return {
        value: "OK",
        label: "Respuesta recibida",
        note: "Sin resumen disponible",
        footer: `Completado${durationLabel}`,
        progress: 1,
      };
  }
}

function getVisibleSteps(includeSupervisor = true) {
  const selectedView = refs.viewFilter.value;
  const selectedStatus = refs.statusFilter.value;

  return STEP_ORDER.filter((agent) => {
    if (!includeSupervisor && agent.id === SUPERVISOR.id) {
      return false;
    }

    if (selectedView !== "all" && agent.group !== selectedView) {
      return false;
    }

    if (selectedStatus !== "all" && state.steps[agent.id].status !== selectedStatus) {
      return false;
    }

    return true;
  });
}

function renderHeaderMeta() {
  const processedCount = STEP_ORDER.filter((agent) =>
    ["complete", "error"].includes(state.steps[agent.id].status)
  ).length;
  const errorCount = STEP_ORDER.filter((agent) => state.steps[agent.id].status === "error").length;

  refs.backendStatus.textContent = state.backend.label;
  refs.backendMessage.textContent = state.backend.message;
  refs.progressCount.textContent = `${processedCount} / ${STEP_ORDER.length}`;
  refs.elapsedTime.textContent = formatDuration(state.lastElapsedMs);

  if (state.running) {
    refs.runState.textContent = errorCount
      ? `Corrida en curso con ${errorCount} error(es).`
      : "Corrida en curso.";
  } else if (processedCount === 0) {
    refs.runState.textContent = "Listo para iniciar.";
  } else if (errorCount) {
    refs.runState.textContent = `Finalizado con ${errorCount} error(es).`;
  } else {
    refs.runState.textContent = "Analisis completo.";
  }
}

function renderKpiStrip() {
  const visibleSteps = getVisibleSteps(true);

  if (!visibleSteps.length) {
    refs.kpiStrip.innerHTML = `
      <div class="empty-note">No hay agentes que coincidan con los filtros actuales.</div>
    `;
    return;
  }

  refs.kpiStrip.innerHTML = visibleSteps
    .map((agent) => {
      const step = state.steps[agent.id];
      const result = state.results[agent.id];
      const metric = getLeadMetric(agent, step, result);
      const progress = Math.round(metric.progress * 100);

      return `
        <article class="kpi-card tone-${agent.tone} ${step.status}">
          <div class="kpi-head">
            <div class="kpi-icon">${escapeHtml(agent.short)}</div>
            <p class="kpi-title">${escapeHtml(agent.title)}</p>
          </div>
          <div class="kpi-main">
            <strong class="kpi-number">${escapeHtml(metric.value)}</strong>
            <p class="kpi-caption">${escapeHtml(metric.label)}</p>
          </div>
          <div class="kpi-foot">
            <span class="kpi-state">${escapeHtml(metric.note)}</span>
            <div class="kpi-progress"><span style="width:${progress}%"></span></div>
            <span class="kpi-state">${escapeHtml(metric.footer)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderExecutionMatrix() {
  const visibleSteps = getVisibleSteps(true);

  if (!visibleSteps.length) {
    refs.executionMatrixBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-muted">No hay filas para los filtros seleccionados.</td>
      </tr>
    `;
    return;
  }

  refs.executionMatrixBody.innerHTML = visibleSteps
    .map((agent) => {
      const step = state.steps[agent.id];
      const result = state.results[agent.id];
      const metric = getLeadMetric(agent, step, result);
      const anchor = agent.id === SUPERVISOR.id ? "#supervisorReport" : `#panel-${agent.id}`;

      return `
        <tr>
          <td>
            <span class="group-badge tone-${agent.tone}">${escapeHtml(getGroupLabel(agent.group))}</span>
          </td>
          <td>
            <div class="table-agent">
              <strong>${escapeHtml(agent.title)}</strong>
              <small>${escapeHtml(agent.endpoint)}</small>
            </div>
          </td>
          <td>
            <span class="status-pill status-${step.status}">${escapeHtml(getStatusText(step.status))}</span>
          </td>
          <td class="mono">${escapeHtml(formatDuration(step.durationMs))}</td>
          <td>
            <strong>${escapeHtml(metric.value)}</strong>
            <div class="table-caption">${escapeHtml(metric.label)}</div>
          </td>
          <td>
            <div class="table-caption">${escapeHtml(metric.note)}</div>
            <a class="table-link" href="${anchor}">Ver bloque</a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderTimelineChart() {
  const visibleSteps = getVisibleSteps(true);

  if (!visibleSteps.length) {
    refs.timelineChart.innerHTML = `<div class="empty-note">Sin datos para esta vista.</div>`;
    return;
  }

  const maxDuration = Math.max(
    ...visibleSteps.map((agent) => state.steps[agent.id].durationMs || 0),
    1
  );

  refs.timelineChart.innerHTML = visibleSteps
    .map((agent) => {
      const step = state.steps[agent.id];
      const width = step.durationMs
        ? Math.max(8, Math.round((step.durationMs / maxDuration) * 100))
        : Math.round(getStepProgress(step) * 100);

      return `
        <div class="chart-row">
          <span class="chart-label">${escapeHtml(agent.short)}</span>
          <div class="chart-track">
            <div class="chart-bar tone-${agent.tone}" style="width:${width}%"></div>
          </div>
          <span class="chart-value">${escapeHtml(formatDuration(step.durationMs))}</span>
        </div>
      `;
    })
    .join("");
}

function renderPipelineFunnel() {
  const processedCount = STEP_ORDER.filter((agent) =>
    ["complete", "error"].includes(state.steps[agent.id].status)
  ).length;
  const completeCount = STEP_ORDER.filter((agent) => state.steps[agent.id].status === "complete").length;
  const supervisorReady = state.steps[SUPERVISOR.id].status === "complete" ? 1 : 0;

  const stages = [
    { label: "Planificados", count: STEP_ORDER.length, tone: "blue" },
    { label: "Procesados", count: processedCount, tone: "orange" },
    { label: "Completados", count: completeCount, tone: "green" },
    { label: "Supervisor listo", count: supervisorReady, tone: "violet" },
  ];

  refs.pipelineFunnel.innerHTML = stages
    .map((stage) => {
      const ratio = STEP_ORDER.length ? stage.count / STEP_ORDER.length : 0;
      const width = `${42 + ratio * 58}%`;

      return `
        <div class="funnel-row">
          <div class="funnel-shape tone-${stage.tone}" style="--shape-width:${width}">
            ${escapeHtml(formatValue(stage.count))}
          </div>
          <div class="funnel-copy">
            <span>${escapeHtml(stage.label)}</span>
            <small>${escapeHtml(formatPercentFromRatio(ratio))} del total</small>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderConversionRings() {
  const total = STEP_ORDER.length;
  const processed = STEP_ORDER.filter((agent) =>
    ["complete", "error"].includes(state.steps[agent.id].status)
  ).length;
  const complete = STEP_ORDER.filter((agent) => state.steps[agent.id].status === "complete").length;
  const errors = STEP_ORDER.filter((agent) => state.steps[agent.id].status === "error").length;

  const ratios = [
    {
      label: "Procesados / Total",
      ratio: total ? processed / total : 0,
      tone: "blue",
    },
    {
      label: "Completados / Procesados",
      ratio: processed ? complete / processed : 0,
      tone: "green",
    },
    {
      label: "Sin error / Procesados",
      ratio: processed ? Math.max(0, processed - errors) / processed : 0,
      tone: "violet",
    },
  ];

  refs.conversionRings.innerHTML = ratios
    .map(
      (item) => `
        <article class="ring-card">
          <div class="ring-visual tone-${item.tone}" style="--value:${Math.round(item.ratio * 100)}%">
            <span>${escapeHtml(formatPercentFromRatio(item.ratio))}</span>
          </div>
          <p>${escapeHtml(item.label)}</p>
        </article>
      `
    )
    .join("");
}

function renderAgentDetails(result) {
  if (!result || typeof result !== "object") {
    return "";
  }

  const blocks = [];

  if (result.kpis) {
    blocks.push(`
      <section class="section-block">
        <h4>KPIs</h4>
        ${renderMetricDeck(flattenMetrics(result.kpis))}
      </section>
    `);
  }

  for (const [key, value] of Object.entries(result)) {
    if (["agente", "kpis", "modelo", "datos_analizados", "uso_tokens", "agentes_analizados", "informe"].includes(key)) {
      continue;
    }

    if (key === "alertas") {
      blocks.push(renderAlertSection(value));
      continue;
    }

    if (Array.isArray(value)) {
      blocks.push(renderArraySection(key, value));
      continue;
    }

    if (value && typeof value === "object") {
      blocks.push(renderObjectSection(key, value));
    }
  }

  return blocks.filter(Boolean).join("");
}

function renderAgentPanels() {
  const visibleAgents = getVisibleSteps(false);
  const panels = [];

  for (const agent of visibleAgents) {
    const step = state.steps[agent.id];
    const result = state.results[agent.id];

    if (step.status === "idle") {
      continue;
    }

    if (step.status === "error") {
      panels.push(`
        <article class="agent-panel" id="panel-${agent.id}">
          <div class="agent-panel-header">
            <div>
              <h3>${escapeHtml(agent.title)}</h3>
              <p>${escapeHtml(agent.description)}</p>
            </div>
            <span class="status-pill status-error">Error</span>
          </div>
          <div class="alert-card">
            <strong>No se pudo completar este agente</strong>
            <p>${escapeHtml(step.error || "Ocurrio un error inesperado.")}</p>
          </div>
        </article>
      `);
      continue;
    }

    if (step.status === "running" && !result) {
      panels.push(`
        <article class="agent-panel" id="panel-${agent.id}">
          <div class="agent-panel-header">
            <div>
              <h3>${escapeHtml(agent.title)}</h3>
              <p>${escapeHtml(agent.description)}</p>
            </div>
            <span class="status-pill status-running">Ejecutando</span>
          </div>
          <p class="signal-copy">Procesando informacion del backend.</p>
        </article>
      `);
      continue;
    }

    panels.push(`
      <article class="agent-panel" id="panel-${agent.id}">
        <div class="agent-panel-header">
          <div>
            <h3>${escapeHtml(agent.title)}</h3>
            <p>${escapeHtml(agent.description)}</p>
          </div>
          <div class="agent-meta">
            <span class="group-badge tone-${agent.tone}">${escapeHtml(getGroupLabel(agent.group))}</span>
            <span class="status-pill status-complete">Completado</span>
            <span class="mono">${escapeHtml(formatDuration(step.durationMs))}</span>
          </div>
        </div>
        ${renderAgentDetails(result)}
      </article>
    `);
  }

  refs.agentPanels.innerHTML =
    panels.join("") ||
    `
      <div class="empty-state">
        <h3>Sin coincidencias</h3>
        <p>No hay agentes visibles para los filtros seleccionados o aun no se ejecuto ninguno.</p>
      </div>
    `;
}

function renderSupervisor() {
  const step = state.steps[SUPERVISOR.id];
  const result = state.results[SUPERVISOR.id];

  refs.supervisorStatus.className = `supervisor-status ${step.status}`;

  if (step.status === "idle") {
    refs.supervisorStatus.textContent = "Aun no se ejecuto el supervisor.";
    refs.supervisorMeta.innerHTML = "";
    refs.supervisorReport.className = "report-card empty-report";
    refs.supervisorReport.innerHTML = `
      <h3>Informe ejecutivo</h3>
      <p>Al finalizar la corrida vas a ver aqui el diagnostico general, los hallazgos prioritarios y las recomendaciones accionables.</p>
    `;
    return;
  }

  if (step.status === "running") {
    refs.supervisorStatus.textContent = "El supervisor esta consolidando resultados.";
    refs.supervisorMeta.innerHTML = "";
    refs.supervisorReport.className = "report-card";
    refs.supervisorReport.innerHTML = `
      <h3>Informe en preparacion</h3>
      <p>Esperando la respuesta del modelo para mostrar el cierre ejecutivo.</p>
    `;
    return;
  }

  if (step.status === "error") {
    refs.supervisorStatus.textContent = "El supervisor no pudo completar el informe.";
    refs.supervisorMeta.innerHTML = "";
    refs.supervisorReport.className = "report-card";
    refs.supervisorReport.innerHTML = `
      <h3>Informe no disponible</h3>
      <p>${escapeHtml(step.error || "Ocurrio un error durante la ejecucion.")}</p>
    `;
    return;
  }

  const meta = [];
  if (result?.modelo) {
    meta.push({ label: "Modelo", value: result.modelo });
  }
  if (result?.agentes_analizados?.length) {
    meta.push({ label: "Agentes analizados", value: result.agentes_analizados.length });
  }
  if (result?.uso_tokens) {
    meta.push(...flattenMetrics(result.uso_tokens, "Tokens"));
  }

  refs.supervisorStatus.textContent = "Informe ejecutivo disponible.";
  refs.supervisorMeta.innerHTML = renderMetricDeck(meta);
  refs.supervisorReport.className = "report-card";
  refs.supervisorReport.innerHTML = `
    <h3>Informe ejecutivo</h3>
    <div class="report-body">${escapeHtml(result?.informe || "Sin informe disponible.")}</div>
  `;
}

function render() {
  renderHeaderMeta();
  renderKpiStrip();
  renderExecutionMatrix();
  renderTimelineChart();
  renderPipelineFunnel();
  renderConversionRings();
  renderAgentPanels();
  renderSupervisor();
  refs.runAllBtn.disabled = state.running;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `HTTP ${response.status}`);
  }

  return response.json();
}

function startElapsedTimer() {
  stopElapsedTimer();
  state.lastElapsedMs = 0;

  state.elapsedTimer = window.setInterval(() => {
    if (!state.startedAt) {
      state.lastElapsedMs = 0;
      renderHeaderMeta();
      return;
    }

    state.lastElapsedMs = Date.now() - state.startedAt;
    renderHeaderMeta();
  }, 1000);
}

function stopElapsedTimer() {
  if (state.elapsedTimer) {
    window.clearInterval(state.elapsedTimer);
    state.elapsedTimer = null;
  }
}

async function runStep(agent) {
  state.steps[agent.id].status = "running";
  state.steps[agent.id].error = null;
  render();
  addLog(`Iniciando ${agent.title}.`, "running");

  const startedAt = performance.now();

  try {
    const data = await fetchJson(agent.endpoint);
    state.results[agent.id] = data;
    state.steps[agent.id].status = "complete";
    state.steps[agent.id].durationMs = performance.now() - startedAt;
    addLog(`${agent.title} completado en ${formatDuration(state.steps[agent.id].durationMs)}.`, "success");
  } catch (error) {
    state.steps[agent.id].status = "error";
    state.steps[agent.id].durationMs = performance.now() - startedAt;
    state.steps[agent.id].error = error.message;
    addLog(`${agent.title} fallo: ${error.message}`, "error");
  }

  render();
}

async function runAnalysis() {
  if (state.running) {
    return;
  }

  initState();
  state.running = true;
  state.startedAt = Date.now();
  startElapsedTimer();
  addLog("Se lanzo una nueva corrida multiagente.", "running");
  render();

  for (const agent of AGENTS) {
    await runStep(agent);
  }

  await runStep(SUPERVISOR);

  state.running = false;
  stopElapsedTimer();
  state.lastElapsedMs = Date.now() - state.startedAt;

  const errorCount = STEP_ORDER.filter((agent) => state.steps[agent.id].status === "error").length;

  addLog(
    errorCount
      ? `La corrida finalizo con ${errorCount} error(es).`
      : "La corrida finalizo correctamente.",
    errorCount ? "error" : "success"
  );

  render();
}

function resetView() {
  stopElapsedTimer();
  initState();
  refs.viewFilter.value = "all";
  refs.statusFilter.value = "all";
  refs.activityLog.innerHTML = `
    <div class="log-entry neutral">
      <span class="log-time">--:--:--</span>
      <p>La sesion esta lista para iniciar.</p>
    </div>
  `;
  render();
}

async function checkBackend() {
  try {
    const data = await fetchJson("/");
    state.backend.label = "Conectado";
    state.backend.message = data.mensaje || "FastAPI respondio correctamente.";
  } catch (error) {
    state.backend.label = "Sin conexion";
    state.backend.message = "No se pudo conectar con el backend.";
    addLog(`No se pudo verificar el backend: ${error.message}`, "error");
  }

  renderHeaderMeta();
}

refs.runAllBtn.addEventListener("click", runAnalysis);
refs.resetBtn.addEventListener("click", resetView);
refs.viewFilter.addEventListener("change", render);
refs.statusFilter.addEventListener("change", render);

initState();
setPeriodLabel();
render();
checkBackend();
