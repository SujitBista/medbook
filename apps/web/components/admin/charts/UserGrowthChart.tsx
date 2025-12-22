"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface UserGrowthChartProps {
  data: Array<{
    month: string;
    patients: number;
    doctors: number;
    admins: number;
  }>;
}

// Mock data generator - in real implementation, this would come from API
function generateMockData() {
  const months = 6;
  const data = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    data.push({
      month: monthNames[date.getMonth()],
      patients: Math.floor(Math.random() * 50) + 20,
      doctors: Math.floor(Math.random() * 10) + 2,
      admins: Math.floor(Math.random() * 3) + 1,
    });
  }

  return data;
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const chartData = data.length > 0 ? data : generateMockData();

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        User Growth (Last 6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Bar
            dataKey="patients"
            fill="#3b82f6"
            name="Patients"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="doctors"
            fill="#10b981"
            name="Doctors"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="admins"
            fill="#8b5cf6"
            name="Admins"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
