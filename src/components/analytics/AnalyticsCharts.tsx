import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const gridColor = "rgba(113, 113, 122, 0.16)";
const tickColor = "#6b7280";

const defaultPalette = [
  "#0f766e",
  "#2563eb",
  "#d97706",
  "#db2777",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#0891b2",
  "#65a30d",
  "#ea580c",
];

interface SeriesConfig {
  label: string;
  values: number[];
  color: string;
  fill?: boolean;
  yAxisID?: string;
}

function getSeriesFill(color: string): string {
  if (color.startsWith("rgba")) {
    return color;
  }

  return `${color}22`;
}

export function AnalyticsLineChart({
  labels,
  series,
  dualAxis = false,
  height = 320,
}: {
  labels: string[];
  series: SeriesConfig[];
  dualAxis?: boolean;
  height?: number;
}) {
  const chartData: ChartData<"line"> = {
    labels,
    datasets: series.map((dataset) => ({
      label: dataset.label,
      data: dataset.values,
      borderColor: dataset.color,
      backgroundColor: getSeriesFill(dataset.color),
      tension: 0.35,
      fill: dataset.fill ?? false,
      borderWidth: 2,
      pointRadius: 2.5,
      pointHoverRadius: 4,
      yAxisID: dataset.yAxisID,
    })),
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: tickColor,
          boxWidth: 12,
          usePointStyle: true,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, maxTicksLimit: 8 },
      },
      y: {
        type: "linear" as const,
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: tickColor },
      },
      ...(dualAxis && {
        y1: {
          type: "linear" as const,
          display: true,
          position: "right" as const,
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { color: tickColor },
        },
      }),
    },
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}

export function AnalyticsBarChart({
  labels,
  series,
  horizontal = false,
  stacked = false,
  height = 320,
}: {
  labels: string[];
  series: SeriesConfig[];
  horizontal?: boolean;
  stacked?: boolean;
  height?: number;
}) {
  const chartData: ChartData<"bar"> = {
    labels,
    datasets: series.map((dataset) => ({
      label: dataset.label,
      data: dataset.values,
      borderRadius: 10,
      borderSkipped: false,
      backgroundColor: dataset.color,
      maxBarThickness: horizontal ? 24 : 40,
    })),
  };

  const chartOptions: ChartOptions<"bar"> = {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: series.length > 1,
        labels: {
          color: tickColor,
          boxWidth: 12,
          usePointStyle: true,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        stacked,
        grid: { color: gridColor },
        ticks: { color: tickColor },
      },
      y: {
        stacked,
        grid: { display: false },
        ticks: { color: tickColor },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

export function AnalyticsDoughnutChart({
  labels,
  values,
  colors,
  height = 320,
}: {
  labels: string[];
  values: number[];
  colors?: string[];
  height?: number;
}) {
  const chartData: ChartData<"doughnut"> = {
    labels,
    datasets: [
      {
        label: "Value",
        data: values,
        backgroundColor: colors ?? defaultPalette.slice(0, values.length),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: "64%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: tickColor,
          boxWidth: 10,
          padding: 16,
          usePointStyle: true,
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Doughnut data={chartData} options={chartOptions} />
    </div>
  );
}

export function buildChartPalette(size: number): string[] {
  return Array.from(
    { length: size },
    (_, index) => defaultPalette[index % defaultPalette.length],
  );
}
