import fs from 'fs/promises';
import path from 'path';

const REPORTS_DIR = path.resolve('reports');
const CYPRESS_JSON = path.join(REPORTS_DIR, 'cypress-report.json');
const PIPELINE_START = path.join(REPORTS_DIR, 'pipeline-start.txt');
const OUTPUT_JSON = path.join(REPORTS_DIR, 'frontend-metrics-governance.json');
const OUTPUT_CSV = path.join(REPORTS_DIR, 'frontend-metrics-governance.csv');

const SCHEDULED_E2E_CASES = 11;

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

  // Corrección: Si no se encuentra el archivo, no rompemos el flujo. 
  // Capturamos datos vacíos de control para que el pipeline continúe con éxito.
  if (!await exists(CYPRESS_JSON)) {
    console.warn(`⚠️ Advertencia: No se encontró el reporte en ${CYPRESS_JSON}. Se generarán métricas en cero.`);
  } else {
    try {
      report = await readJson(CYPRESS_JSON);
    } catch (err) {
      console.error("⚠️ Error leyendo el archivo JSON de Cypress:", err);
    }
  }

  const stats = report.stats ?? {};
  const totalSpecs = Array.isArray(report.results) ? report.results.length : 0;
  const failedSpecs = Array.isArray(report.results)
    ? report.results.filter((spec) => spec.stats?.failures > 0).length
    : 0;

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});