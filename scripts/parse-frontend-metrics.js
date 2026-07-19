import fs from 'fs/promises';
import path from 'path';

const REPORTS_DIR = path.resolve('reports');
const CYPRESS_JSON = path.join(REPORTS_DIR, 'cypress-report.json');
const PIPELINE_START = path.join(REPORTS_DIR, 'pipeline-start.txt');
const OUTPUT_JSON = path.join(REPORTS_DIR, 'frontend-metrics-governance.json');
const OUTPUT_CSV = path.join(REPORTS_DIR, 'frontend-metrics-governance.csv');

const SCHEDULED_E2E_CASES = 2;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  let report = { stats: {}, results: [] };
  let foundReportPath = null;

  // 1. Buscamos de forma dinámica cualquier JSON en la carpeta de reportes
  if (await exists(REPORTS_DIR)) {
    const files = await fs.readdir(REPORTS_DIR);
    // Buscamos un archivo que termine en .json y no sea el de gobernanza que creamos nosotros
    const jsonReport = files.find(f => f.endsWith('.json') && !f.includes('frontend-metrics-governance'));
    
    if (jsonReport) {
      foundReportPath = path.join(REPORTS_DIR, jsonReport);
    }
  }

  // 2. Si no lo encuentra en la carpeta reports, revisamos la ruta por defecto original
  if (!foundReportPath && await exists(CYPRESS_JSON)) {
    foundReportPath = CYPRESS_JSON;
  }

  // 3. Procesamos el archivo encontrado
  if (!foundReportPath) {
    console.warn(`⚠️ Advertencia: No se detectó ningún reporte físico de Cypress en la carpeta. Se generarán métricas en cero.`);
  } else {
    try {
      console.log(`📊 Procesando reporte de Cypress hallado en: ${foundReportPath}`);
      report = await readJson(foundReportPath);
    } catch (err) {
      console.error("⚠️ Error leyendo el archivo JSON de Cypress:", err);
    }
  }

  // --- El resto de tu lógica de mapeo se mantiene exactamente igual ---
  const stats = report.stats ?? {};
  
  // Mochawesome guarda las pruebas dentro de 'results' o de un árbol de 'suites'. 
  // Adaptamos la lectura para que soporte tanto el formato nativo de Cypress como el de Mochawesome:
  let totalSpecs = 0;
  let failedSpecs = 0;
  
  if (Array.isArray(report.results)) {
    totalSpecs = report.results.length;
    failedSpecs = report.results.filter((spec) => spec.stats?.failures > 0 || (spec.suites && JSON.stringify(spec.suites).includes('"fail":true'))).length;
  } else if (stats.suites) {
    totalSpecs = Number(stats.suites);
    failedSpecs = Number(stats.failures > 0 ? 1 : 0); // Aproximación segura si viene aplanado
  }

  const totalTests = Number(stats.tests ?? 0);
  const totalPassed = Number(stats.passes ?? 0);
  const totalFailed = Number(stats.failures ?? 0);
  const totalPending = Number(stats.pending ?? 0);
  const totalSkipped = Number(stats.skipped ?? 0);

  const scheduledPassRate = Number(((totalPassed / SCHEDULED_E2E_CASES) * 100).toFixed(2));
  const actualPassRate = Number(((totalPassed / Math.max(totalTests, 1)) * 100).toFixed(2));
  const blackBoxFailureDensity = Number((failedSpecs / Math.max(totalSpecs, 1)).toFixed(4));

  let pipelineLeadTimeSeconds = null;
  if (await exists(PIPELINE_START)) {
    const startTs = Number((await fs.readFile(PIPELINE_START, 'utf8')).trim());
    pipelineLeadTimeSeconds = Math.max(0, Math.floor(Date.now() / 1000) - startTs);
  }

  const metrics = {
    reportGeneratedAt: new Date().toISOString(),
    scheduledE2eCases: SCHEDULED_E2E_CASES,
    totalSpecsExecuted: totalSpecs,
    totalTestsExecuted: totalTests,
    totalPassed: totalPassed,
    totalFailed: totalFailed,
    totalPending: totalPending,
    totalSkipped: totalSkipped,
    e2ePassRatePercent: scheduledPassRate,
    e2eExecutionPassRatePercent: actualPassRate,
    blackBoxFailureDensity: blackBoxFailureDensity,
    failedSpecs: failedSpecs,
    successSpecs: totalSpecs - failedSpecs,
    pipelineLeadTimeSeconds: pipelineLeadTimeSeconds,
  };

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(metrics, null, 2), 'utf8');

  const csvLines = [
    'metric,value',
    `scheduledE2eCases,${metrics.scheduledE2eCases}`,
    `totalSpecsExecuted,${metrics.totalSpecsExecuted}`,
    `totalTestsExecuted,${metrics.totalTestsExecuted}`,
    `totalPassed,${metrics.totalPassed}`,
    `totalFailed,${metrics.totalFailed}`,
    `totalPending,${metrics.totalPending}`,
    `totalSkipped,${metrics.totalSkipped}`,
    `e2ePassRatePercent,${metrics.e2ePassRatePercent}`,
    `e2eExecutionPassRatePercent,${metrics.e2eExecutionPassRatePercent}`,
    `blackBoxFailureDensity,${metrics.blackBoxFailureDensity}`,
    `failedSpecs,${metrics.failedSpecs}`,
    `successSpecs,${metrics.successSpecs}`,
    `pipelineLeadTimeSeconds,${metrics.pipelineLeadTimeSeconds ?? ''}`,
  ];

  await fs.writeFile(OUTPUT_CSV, csvLines.join('\n'), 'utf8');
  console.log(`Métricas generadas con éxito en: ${OUTPUT_JSON}`);
}