export function evaluateChartReadiness(chart, availableCols = [], sampleRows = []) {
  const issues = [];
  const checks = {
    dataAvailable: true,
    metricValid: true,
    dimensionValid: true,
    aggregationValid: true,
    chartTypeValid: true,
    groundedInData: true
  };

  if (!chart.data || chart.data.length === 0) {
    checks.dataAvailable = false;
    issues.push("No data available for this view.");
  }

  const { xAxis, yAxis, type, title } = chart;
  const isTimeChart = type === 'line' || type === 'area';
  
  if (xAxis && availableCols.length > 0 && !availableCols.includes(xAxis)) {
    checks.groundedInData = false;
    issues.push(`Dimension '${xAxis}' is not present in the dataset.`);
  }
  if (yAxis && yAxis !== 'count' && availableCols.length > 0 && !availableCols.includes(yAxis)) {
    checks.groundedInData = false;
    issues.push(`Metric '${yAxis}' is not present in the dataset.`);
  }

  if (isTimeChart) {
    if (xAxis && !/year|date|time|month|day|created|updated/i.test(xAxis)) {
      checks.dimensionValid = false;
      issues.push(`Time-series visualization requires a date/time dimension, got '${xAxis}'.`);
    }
  }

  if (yAxis && yAxis !== 'count') {
    const identRegex = /phone|email|name|contact|address|ssn|ip|id$|_id$|emergency/i;
    if (identRegex.test(yAxis)) {
      checks.metricValid = false;
      issues.push(`'${yAxis}' is an identifier/contact field and is not suitable for a metric.`);
    }

    if (sampleRows.length > 0) {
      const vals = sampleRows.map(r => r[yAxis]).filter(v => v != null && String(v).trim() !== '');
      if (vals.length > 0) {
        const numericCount = vals.filter(v => !isNaN(parseFloat(String(v).replace(/[^0-9.-]/g, '')))).length;
        if (numericCount / vals.length < 0.5) {
          checks.metricValid = false;
          issues.push(`Metric '${yAxis}' does not contain primarily numeric data.`);
        }
      }
    }
  }

  if (type === 'pie' && chart.data) {
    if (chart.data.length > 15) {
      checks.chartTypeValid = false;
      issues.push("Pie chart has too many categories (high cardinality). Use a bar chart or table instead.");
    }
  }

  if (yAxis && yAxis !== 'count' && /age|salary|price|score/i.test(yAxis)) {
    if (title && !title.toLowerCase().includes('avg') && !title.toLowerCase().includes('average')) {
      checks.aggregationValid = false;
      issues.push(`Summing '${yAxis}' is usually invalid. No meaningful numeric aggregation exists (use Average).`);
    }
  }

  const status = Object.values(checks).every(Boolean) ? 'approved' : 'rejected';
  
  return { status, checks, issues };
}
