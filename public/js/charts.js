document.addEventListener('DOMContentLoaded', () => {
  const deptCanvas = document.getElementById('deptChart');
  const genderCanvas = document.getElementById('genderChart');

  if (!deptCanvas && !genderCanvas) return;

  let deptChart = null;
  let genderChart = null;

  // Derive colors matching the dark or light dashboard styles
  const getThemePalette = (theme) => {
    const isDark = theme === 'dark';
    return {
      textColor: isDark ? '#9ca3af' : '#475569',
      gridColor: isDark ? '#374151' : '#f1f5f9',
    };
  };

  async function loadAndDrawCharts() {
    try {
      const response = await fetch('/dashboard/api/chart-data');
      if (!response.ok) throw new Error('Network error fetching analytics details.');
      const data = await response.json();

      const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const colors = getThemePalette(initialTheme);

      // 1. Department Student Distribution (Bar Chart)
      if (deptCanvas) {
        const ctx = deptCanvas.getContext('2d');
        const labels = data.departments.map(d => d.department_code);
        const counts = data.departments.map(d => d.student_count);

        deptChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Students enrolled',
              data: counts,
              backgroundColor: 'rgba(79, 70, 229, 0.75)',
              hoverBackgroundColor: 'rgba(79, 70, 229, 0.95)',
              borderColor: 'rgb(79, 70, 229)',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { padding: 10, cornerRadius: 6 }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: colors.textColor, font: { family: 'Outfit' } }
              },
              y: {
                grid: { color: colors.gridColor },
                ticks: { 
                  color: colors.textColor, 
                  font: { family: 'Outfit' },
                  stepSize: 1,
                  beginAtZero: true
                }
              }
            }
          }
        });
      }

      // 2. Gender Ratio Distribution (Doughnut Chart)
      if (genderCanvas) {
        const ctx = genderCanvas.getContext('2d');
        const labels = data.gender.map(g => g.gender);
        const counts = data.gender.map(g => g.count);

        genderChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: counts,
              backgroundColor: [
                'rgba(99, 102, 241, 0.85)', // Indigo
                'rgba(236, 72, 153, 0.85)', // Pink
                'rgba(245, 158, 11, 0.85)'  // Amber
              ],
              borderColor: 'transparent',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: colors.textColor,
                  font: { family: 'Outfit', size: 12 },
                  padding: 14
                }
              },
              tooltip: { padding: 10, cornerRadius: 6 }
            },
            cutout: '65%'
          }
        });
      }

      // Handle Theme Updates
      window.addEventListener('themeChanged', (e) => {
        const newPalette = getThemePalette(e.detail.theme);

        if (deptChart) {
          deptChart.options.scales.x.ticks.color = newPalette.textColor;
          deptChart.options.scales.y.ticks.color = newPalette.textColor;
          deptChart.options.scales.y.grid.color = newPalette.gridColor;
          deptChart.update();
        }

        if (genderChart) {
          genderChart.options.plugins.legend.labels.color = newPalette.textColor;
          genderChart.update();
        }
      });

    } catch (err) {
      console.error('Chart.js Loading Error:', err.message);
    }
  }

  loadAndDrawCharts();
});
