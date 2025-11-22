"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryScoresChartProps {
  userScores: { [key: string]: number };
  peerScores: { [key: string]: number };
}

export default function CategoryScoresChart({ userScores, peerScores }: CategoryScoresChartProps) {
  const chartData = Object.keys(userScores).map((category) => ({
    category: category.replace(' Skills', '').replace(' and ', ' & '),
    you: userScores[category] || 0,
    peers: peerScores[category] || 0,
  }));

  return (
    <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 overflow-hidden">
      <h3 className="text-xl font-semibold text-light-100 mb-6">Skills Comparison</h3>
      {chartData.length > 0 ? (
        <div className="w-full" style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="#27282f" />
              <PolarAngleAxis 
                dataKey="category" 
                stroke="#d6e0ff"
                style={{ fontSize: '11px' }}
                tick={{ fill: '#d6e0ff' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={false}
              />
              <Radar 
                name="You" 
                dataKey="you" 
                stroke="#dddfff" 
                fill="#dddfff" 
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Radar 
                name="Peers Average" 
                dataKey="peers" 
                stroke="#6870a6" 
                fill="#6870a6" 
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Legend 
                wrapperStyle={{ color: '#d6e0ff' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#27282f', 
                  border: '1px solid #dddfff',
                  borderRadius: '8px',
                  color: '#d6e0ff'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[350px] flex items-center justify-center px-4">
          <p className="text-light-100/70 text-center">No category data available yet.</p>
        </div>
      )}
    </div>
  );
}
