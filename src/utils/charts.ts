import QuickChart from 'quickchart-js';

export function createChartURL(labels: string[], datasets: { label: string, data: number[], backgroundColor: string, borderColor: string }[]) {
  const chart = new QuickChart();
  chart.setConfig({
    type: 'bar', 
    data: {
      labels,
      datasets: datasets.map(dataset => ({
        ...dataset,
        type: 'bar', 
      }))
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
        },
      },
    },
  });
  chart.setWidth(1200)
  return chart.getUrl();
}

export function createMarketingChart(expensesData: Record<string, number>) {
  try {
    const labels = Object.keys(expensesData);
    const data = Object.values(expensesData);
  
    const chartURL = createChartURL(labels, [{
      label: 'Расходы на рекламу',
      data: data,
      backgroundColor: 'rgba(255, 99, 132, 0.8)',
      borderColor: 'rgba(75, 192, 192, 1)',
    }]);
  
    return chartURL
  } catch (e) {
    console.error('error creating marketing chart '+e)
  }
}