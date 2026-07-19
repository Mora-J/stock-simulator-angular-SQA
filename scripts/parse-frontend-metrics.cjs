const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.resolve(__dirname, '../reports');
const OUTPUT_JSON = path.join(REPORTS_DIR, 'frontend-metrics-governance.json');
const OUTPUT_CSV = path.join(REPORTS_DIR, 'frontend-metrics-governance.csv');
const PIPELINE_START = path.join(REPORTS_DIR, 'pipeline-start.txt');
const SCHEDULED_E2E_CASES = 6;

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function listReportFiles() {
  if (!fs.existsSync(REPORTS_DIR)) {
    return [];
  }
  return fs.readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(REPORTS_DIR, entry.name))
    .filter((filePath) => !filePath.includes('frontend-metrics-governance'));
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function mergeReports(reportFiles) {
  const merged = {
    stats: {
      suites: 0,
      tests: 0,
      passes: 0,
      pending: 0,
      failures: 0,
      skipped: 0,
      duration: 0,
      testsRegistered: 0,
      start: null,
      end: null
    },
    results: []
  };

  for (const filePath of reportFiles) {
    const report = readJson(filePath);
    const stats = report.stats || {};

    merged.stats.suites += Number(stats.suites ?? 0);
    merged.stats.tests += Number(stats.tests ?? 0);
    merged.stats.passes += Number(stats.passes ?? 0);
    merged.stats.pending += Number(stats.pending ?? 0);
    merged.stats.failures += Number(stats.failures ?? 0);
    merged.stats.skipped += Number(stats.skipped ?? 0);
    merged.stats.duration += Number(stats.duration ?? 0);
    merged.stats.testsRegistered += Number(stats.testsRegistered ?? 0);

    if (stats.start) {
      const startTime = new Date(stats.start).getTime();
      if (!merged.stats.start || startTime < new Date(merged.stats.start).getTime()) {
        merged.stats.start = stats.start;
      }
    }

    if (stats.end) {
      const endTime = new Date(stats.end).getTime();
      if (!merged.stats.end || endTime > new Date(merged.stats.end).getTime()) {
        merged.stats.end = stats.end;
      }
    }

    if (Array.isArray(report.results)) {
      merged.results.push(...report.results);
    }
  }

  return merged;
}

function buildMetrics(report, reportPath, reportFiles) {
  const stats = report.stats || {};
  const totalSpecs = reportFiles.length;
  let failedSpecs = 0;

  if (Array.isArray(report.results)) {
    failedSpecs = report.results.filter((result) => {
      const suiteFailures = (result.stats?.failures ?? 0) > 0;
      const nestedSuiteFailures = JSON.stringify(result.suites ?? []).includes('"fail":true');
      return suiteFailures || nestedSuiteFailures;
    }).length;
  }

  const totalTests = Number(stats.tests ?? 0);
  const totalPassed = Number(stats.passes ?? 0);
  const totalFailed = Number(stats.failures ?? 0);
  const totalPending = Number(stats.pending ?? 0);
  const totalSkipped = Number(stats.skipped ?? 0);

  const e2ePassRatePercent = Number(((totalPassed / SCHEDULED_E2E_CASES) * 100).toFixed(2));
  const e2eExecutionPassRatePercent = Number(((totalPassed / Math.max(totalTests, 1)) * 100).toFixed(2));
  const blackBoxFailureDensity = Number((failedSpecs / Math.max(totalSpecs, 1)).toFixed(4));

  let pipelineLeadTimeSeconds = null;
  if (fs.existsSync(PIPELINE_START)) {
    const startTs = Number(fs.readFileSync(PIPELINE_START, 'utf8').trim());
    pipelineLeadTimeSeconds = Math.max(0, Math.floor(Date.now() / 1000) - startTs);
  }

  return {
    reportPath,
    reportFound: Boolean(reportPath),
    reportType: reportPath?.includes('mochawesome') ? 'mochawesome' : 'cypress-json',
    metrics: {
      scheduledE2eCases: {
        value: SCHEDULED_E2E_CASES,
        description: 'Cantidad total de flujos E2E programados para el pipeline.'
      },
      totalSpecsExecuted: {
        value: totalSpecs,
        description: 'Número de archivos de especificaciones de Cypress ejecutados.'
      },
      totalTestsExecuted: {
        value: totalTests,
        description: 'Total de tests ejecutados durante la corrida E2E.'
      },
      totalPassed: {
        value: totalPassed,
        description: 'Total de tests E2E que pasaron satisfactoriamente.'
      },
      totalFailed: {
        value: totalFailed,
        description: 'Total de tests E2E que fallaron durante la ejecución.'
      },
      totalPending: {
        value: totalPending,
        description: 'Total de tests marcados como pendientes.'
      },
      totalSkipped: {
        value: totalSkipped,
        description: 'Total de tests saltados.'
      },
      e2ePassRatePercent: {
        value: e2ePassRatePercent,
        description: 'Porcentaje de casos de prueba E2E exitosos respecto al total programado.'
      },
      e2eExecutionPassRatePercent: {
        value: e2eExecutionPassRatePercent,
        description: 'Porcentaje de pruebas E2E exitosas respecto al total de pruebas ejecutadas.'
      },
      blackBoxFailureDensity: {
        value: blackBoxFailureDensity,
        description: 'Densidad de fallas de caja negra por cantidad de specs ejecutados.'
      },
      failedSpecs: {
        value: failedSpecs,
        description: 'Cantidad de archivos de especificación que presentaron al menos una falla.'
      },
      successSpecs: {
        value: totalSpecs - failedSpecs,
        description: 'Cantidad de archivos de especificación E2E sin fallas.'
      },
      pipelineLeadTimeSeconds: {
        value: pipelineLeadTimeSeconds,
        description: 'Tiempo total del pipeline desde el inicio hasta el cálculo de métricas.'
      }
    }
  };
}

function writeOutputs(data) {
  ensureReportsDir();
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(data, null, 2), 'utf8');

  const csvLines = [
    'metric,value,description',
    ...Object.entries(data.metrics).map(([metric, payload]) => {
      const value = payload.value ?? '';
      const description = payload.description.replace(/"/g, '""');
      return `${metric},${value},"${description}"`;
    })
  ];
  fs.writeFileSync(OUTPUT_CSV, csvLines.join('\n'), 'utf8');
}

function main() {
  ensureReportsDir();

  const reportFiles = listReportFiles();
  let reportPath = null;
  let mergedReport = { stats: {}, results: [] };

  if (reportFiles.length > 0) {
    reportPath = reportFiles[0];
    mergedReport = mergeReports(reportFiles);
    console.log('Archivos de reporte encontrados:', reportFiles);
  } else {
    console.warn('No se encontró ningún reporte de Cypress. Los datos se generarán con valores por defecto.');
  }

  const metricsData = buildMetrics(mergedReport, reportPath, reportFiles);
  writeOutputs(metricsData);
  console.log(`Métricas generadas: ${OUTPUT_JSON} y ${OUTPUT_CSV}`);
}

main();