const axios = require('axios');

async function run() {
  try {
    const data = [
      { date: '2021-01-01', sales: '9.8K' },
      { date: '2021-01-02', sales: '1.2L' },
      { date: '2021-01-03', sales: '105' },
    ];
    const res = await axios.post('http://127.0.0.1:5005/api/ml/forecast', {
      data,
      time_column: 'date',
      metric_column: 'sales',
      steps: 5
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.data : err.message);
  }
}

run();
