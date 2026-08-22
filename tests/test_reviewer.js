import { evaluateChartReadiness } from './frontend/src/lib/contentReviewer.js';

const testCases = [
  {
    chart: { yAxis: 'age', xAxis: 'gender', title: 'Average age by gender', data: [1] },
    name: 'age by gender (average)'
  },
  {
    chart: { yAxis: 'age', xAxis: 'gender', title: 'Total age by gender', data: [1] },
    name: 'age by gender (sum)'
  },
  {
    chart: { yAxis: 'salary', xAxis: 'department', title: 'Average salary by department', data: [1] },
    name: 'average salary by department'
  },
  {
    chart: { yAxis: 'revenue', xAxis: 'date', type: 'line', title: 'revenue over time', data: [1] },
    name: 'revenue over time'
  },
  {
    chart: { yAxis: 'phone', xAxis: 'date', type: 'line', title: 'phone over time', data: [1] },
    name: 'phone over time'
  },
  {
    chart: { yAxis: 'email', xAxis: 'age', title: 'email by age', data: [1] },
    name: 'email by age'
  },
  {
    chart: { yAxis: 'emergency_contact', xAxis: 'date', type: 'line', title: 'emergency contact over time', data: [1] },
    name: 'emergency contact over time'
  },
  {
    chart: { yAxis: 'full_name', title: 'average full name', data: [1] },
    name: 'average full name'
  }
];

for (const tc of testCases) {
  const res = evaluateChartReadiness(tc.chart, [], []);
  console.log(`Test: ${tc.name} -> ${res.status}`);
  if (res.status === 'rejected') {
    console.log(`  Issues: ${res.issues.join(', ')}`);
  }
}
