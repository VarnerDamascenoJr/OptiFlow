const sampleScenario = {
  id: "small-delivery-v1",
  name: "Cenario pequeno de entregas",
  operation: {
    startTimeMinutes: 480
  },
  costs: {
    distanceUnitCost: 4,
    lateMinutePenalty: 2,
    unassignedOrderPenalty: 500
  },
  locations: [
    { id: "depot", name: "Centro de distribuicao" },
    { id: "north", name: "Cliente Norte" },
    { id: "east", name: "Cliente Leste" },
    { id: "south", name: "Cliente Sul" },
    { id: "west", name: "Cliente Oeste" }
  ],
  vehicles: [
    { id: "truck-1", capacity: 10, startLocationId: "depot" },
    { id: "van-1", capacity: 6, startLocationId: "depot" }
  ],
  orders: [
    {
      id: "order-north",
      locationId: "north",
      demand: 4,
      serviceTimeMinutes: 15,
      timeWindow: { startMinutes: 510, endMinutes: 600 }
    },
    {
      id: "order-east",
      locationId: "east",
      demand: 5,
      serviceTimeMinutes: 20,
      timeWindow: { startMinutes: 540, endMinutes: 660 }
    },
    {
      id: "order-south",
      locationId: "south",
      demand: 6,
      serviceTimeMinutes: 20,
      timeWindow: { startMinutes: 570, endMinutes: 720 }
    },
    {
      id: "order-west",
      locationId: "west",
      demand: 3,
      serviceTimeMinutes: 10,
      timeWindow: { startMinutes: 500, endMinutes: 620 }
    }
  ],
  distanceMatrix: {
    depot: { depot: 0, north: 12, east: 18, south: 25, west: 10 },
    north: { depot: 12, north: 0, east: 11, south: 20, west: 15 },
    east: { depot: 18, north: 11, east: 0, south: 13, west: 22 },
    south: { depot: 25, north: 20, east: 13, south: 0, west: 16 },
    west: { depot: 10, north: 15, east: 22, south: 16, west: 0 }
  }
};

const editor = document.querySelector("#scenarioEditor");
const scenarioStatus = document.querySelector("#scenarioStatus");
const runStatus = document.querySelector("#runStatus");
const metricGrid = document.querySelector("#metricGrid");
const comparisonRows = document.querySelector("#comparisonRows");
const messageLog = document.querySelector("#messageLog");
let scenarioRecordId = null;

document.querySelector("#loadSampleButton").addEventListener("click", loadSample);
document.querySelector("#duplicateButton").addEventListener("click", duplicateScenario);
document.querySelector("#validateButton").addEventListener("click", validateScenario);
document.querySelector("#saveButton").addEventListener("click", saveScenario);
document.querySelector("#runButton").addEventListener("click", runComparison);

loadSample();
renderMetrics(null);

function loadSample() {
  editor.value = JSON.stringify(sampleScenario, null, 2);
  scenarioRecordId = null;
  setStatus(scenarioStatus, "Draft", "neutral");
  log("Sample scenario loaded.");
}

function duplicateScenario() {
  const scenario = readEditorScenario();
  scenario.id = scenario.id + "-copy-" + Date.now();
  scenario.name = (scenario.name || scenario.id) + " copy";
  editor.value = JSON.stringify(scenario, null, 2);
  scenarioRecordId = null;
  setStatus(scenarioStatus, "Draft copy", "neutral");
  log("Scenario duplicated as " + scenario.id + ".");
}

async function validateScenario() {
  const scenario = readEditorScenario();
  const response = await postJson("/scenarios/validate", { scenario });

  if (response.valid) {
    setStatus(scenarioStatus, "Valid", "good");
    log("Scenario " + response.scenarioId + " is valid.");
    return;
  }

  setStatus(scenarioStatus, "Invalid", "bad");
  logError(response.error);
}

async function saveScenario() {
  const scenario = readEditorScenario();
  const response = await postJson("/scenarios", { scenario });

  if (response.error) {
    setStatus(scenarioStatus, "Invalid", "bad");
    logError(response.error);
    return;
  }

  scenarioRecordId = response.scenarioRecordId;
  setStatus(scenarioStatus, "Saved", "good");
  log("Scenario saved as " + scenarioRecordId + ".");
}

async function runComparison() {
  if (!scenarioRecordId) {
    await saveScenario();
  }

  if (!scenarioRecordId) {
    return;
  }

  setStatus(runStatus, "Queued", "warn");
  renderRows([]);
  renderMetrics(null);

  const baseline = await enqueueRun("nearest-neighbor-capacity");
  const candidate = await enqueueRun("exact-enumeration");
  const completed = await Promise.all([
    waitForRun(baseline.optimizationRun.id),
    waitForRun(candidate.optimizationRun.id)
  ]);

  renderRows(completed);
  renderMetrics(completed);
  setStatus(runStatus, "Complete", "good");
  log("Comparison finished.");
}

async function enqueueRun(strategy) {
  const response = await postJson("/optimization-runs", {
    scenarioRecordId,
    strategy,
    metadata: {
      optimizationRunId: "run-ui-" + strategy + "-" + Date.now()
    }
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response;
}

async function waitForRun(optimizationRunId) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await getJson("/optimization-runs/" + optimizationRunId);
    const status = response.optimizationRun.status;

    setStatus(runStatus, status, status === "FAILED" ? "bad" : "warn");

    if (status === "SUCCEEDED" || status === "FAILED") {
      return response;
    }

    await delay(100);
  }

  throw new Error("Timed out waiting for " + optimizationRunId);
}

function renderRows(results) {
  comparisonRows.innerHTML = "";

  for (const result of results) {
    const metrics = result.metrics || {};
    const row = document.createElement("tr");
    row.innerHTML = [
      result.optimizationRun.strategy,
      formatNumber(metrics.totalCost),
      formatNumber(metrics.totalDistance),
      formatNumber(metrics.totalLateMinutes),
      formatNumber(metrics.servedOrders),
      formatNumber(metrics.unassignedOrders)
    ]
      .map(function mapCell(value) {
        return "<td>" + value + "</td>";
      })
      .join("");
    comparisonRows.appendChild(row);
  }
}

function renderMetrics(results) {
  const completed = Array.isArray(results) ? results.filter(function keepResult(result) {
    return result.metrics;
  }) : [];
  const best = completed.slice().sort(function sortCost(left, right) {
    return left.metrics.totalCost - right.metrics.totalCost;
  })[0];
  const metrics = best ? best.metrics : null;
  const values = [
    ["Best cost", metrics ? metrics.totalCost : "-"],
    ["Distance", metrics ? metrics.totalDistance : "-"],
    ["Late minutes", metrics ? metrics.totalLateMinutes : "-"],
    ["Served", metrics ? metrics.servedOrders : "-"],
    ["Unassigned", metrics ? metrics.unassignedOrders : "-"],
    ["Best strategy", best ? best.optimizationRun.strategy : "-"]
  ];

  metricGrid.innerHTML = values
    .map(function renderMetric(entry) {
      return "<div class=\"metric\"><span>" + entry[0] + "</span><strong>" + entry[1] + "</strong></div>";
    })
    .join("");
}

async function postJson(pathname, body) {
  const response = await fetch(pathname, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  return response.json();
}

async function getJson(pathname) {
  const response = await fetch(pathname);
  return response.json();
}

function readEditorScenario() {
  try {
    return JSON.parse(editor.value);
  } catch (_error) {
    setStatus(scenarioStatus, "Invalid JSON", "bad");
    throw new Error("Scenario editor contains invalid JSON.");
  }
}

function setStatus(element, text, tone) {
  element.textContent = text;
  element.className = "status " + tone;
}

function log(message) {
  messageLog.textContent = message + "\n" + messageLog.textContent;
}

function logError(error) {
  log(error.code + ": " + error.message);
}

function formatNumber(value) {
  return typeof value === "number" ? String(value) : value;
}

function delay(ms) {
  return new Promise(function delayPromise(resolve) {
    setTimeout(resolve, ms);
  });
}
