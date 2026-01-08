import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function VehicleCostChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        No data to display chart.
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.vehicle.name,
    cost: parseFloat(item.totalCost.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 10,
          left: -20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip
          formatter={(value) => [`$${value.toFixed(2)}`, 'Cost']}
          labelFormatter={(label) => `Vehicle: ${label}`}
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
          }}
          labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
          itemStyle={{ color: '#0f172a' }}
        />
        <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}