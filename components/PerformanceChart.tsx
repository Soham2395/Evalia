"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import dayjs from 'dayjs';

interface PerformanceChartProps {
  data: Array<{
    id: string;
    totalScore: number;
    createdAt: string;
  }>;
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = data.map((item, index) => ({
    name: dayjs(item.createdAt).format('MMM D'),
    score: item.totalScore,
    interview: index + 1,
  }));

  return (
    <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 overflow-hidden">
      <h3 className="text-xl font-semibold text-light-100 mb-6">Performance Over Time</h3>
      {chartData.length > 0 ? (
        <div className="w-full" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27282f" />
              <XAxis 
                dataKey="name" 
                stroke="#d6e0ff" 
                style={{ fontSize: '11px' }}
                tick={{ fill: '#d6e0ff' }}
              />
              <YAxis 
                stroke="#d6e0ff" 
                style={{ fontSize: '11px' }}
                domain={[0, 100]}
                tick={{ fill: '#d6e0ff' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#27282f', 
                  border: '1px solid #dddfff',
                  borderRadius: '8px',
                  color: '#d6e0ff'
                }}
              />
              <Legend 
                wrapperStyle={{ color: '#d6e0ff' }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#dddfff" 
                strokeWidth={3}
                dot={{ fill: '#cac5fe', r: 5 }}
                activeDot={{ r: 7 }}
                name="Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center px-4">
          <p className="text-light-100/70 text-center">No performance data available yet. Take some interviews to see your progress!</p>
        </div>
      )}
    </div>
  );
}
