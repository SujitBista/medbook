"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AppointmentTrendsChartProps {
  data: Array<{
    date: string;
    appointments: number;
    confirmed: number;
    completed: number;
  }>;
}

// Mock data generator - in real implementation, this would come from API
function generateMockData() {
  const days = 7;
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      appointments: Math.floor(Math.random() * 20) + 10,
      confirmed: Math.floor(Math.random() * 15) + 8,
      completed: Math.floor(Math.random() * 12) + 5,
    });
  }

  return data;
}

export function AppointmentTrendsChart({ data }: AppointmentTrendsChartProps) {
  const chartData = data.length > 0 ? data : generateMockData();

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Appointment Trends (Last 7 Days)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px" }} />
          <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="appointments"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Total Appointments"
            dot={{ fill: "#3b82f6", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="confirmed"
            stroke="#10b981"
            strokeWidth={2}
            name="Confirmed"
            dot={{ fill: "#10b981", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Completed"
            dot={{ fill: "#8b5cf6", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
