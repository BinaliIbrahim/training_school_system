// src/components/dashboard/MainChart.jsx
import React, { useEffect, useRef } from 'react';
import { CChartBar } from '@coreui/react-chartjs';
import { getStyle } from '@coreui/utils';

const MainChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      if (chartRef.current) {
        setTimeout(() => {
          const ch = chartRef.current;
          ch.options.scales.x.grid.borderColor = getStyle(
            '--cui-border-color-translucent'
          );
          ch.options.scales.x.grid.color = getStyle(
            '--cui-border-color-translucent'
          );
          ch.options.scales.x.ticks.color = getStyle('--cui-body-color');
          ch.options.scales.y.grid.borderColor = getStyle(
            '--cui-border-color-translucent'
          );
          ch.options.scales.y.grid.color = getStyle(
            '--cui-border-color-translucent'
          );
          ch.options.scales.y.ticks.color = getStyle('--cui-body-color');
          ch.update();
        });
      }
    };
    document.documentElement.addEventListener('ColorSchemeChange', handler);
    return () =>
      document.documentElement.removeEventListener(
        'ColorSchemeChange',
        handler
      );
  }, []);

  const labels = data.map((c) => c.title);
  const values = data.map((c) => c.value);

  return (
    <CChartBar
      ref={chartRef}
      style={{ height: '300px', marginTop: '40px' }}
      data={{
        labels,
        datasets: [
          {
            label: 'Students Enrolled',
            backgroundColor: [
              `rgba(${getStyle('--cui-info-rgb')},0.8)`,
              `rgba(${getStyle('--cui-success-rgb')},0.8)`,
              `rgba(${getStyle('--cui-warning-rgb')},0.8)`,
              `rgba(${getStyle('--cui-danger-rgb')},0.8)`,
              `rgba(${getStyle('--cui-primary-rgb')},0.8)`,
            ].slice(0, labels.length),
            borderWidth: 1,
            data: values,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          title: {
            display: true,
            text: 'Student Enrollment by Course',
          },
        },
        scales: {
          x: {
            grid: { drawOnChartArea: false },
            ticks: { color: getStyle('--cui-body-color') },
            title: { display: true, text: 'Courses' },
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: getStyle('--cui-body-color') },
            title: { display: true, text: 'Number of Students' },
          },
        },
      }}
    />
  );
};

export default MainChart;