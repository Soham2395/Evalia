"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface InterviewTypeDistributionProps {
  interviews: Array<{
    id: string;
    type: string;
  }>;
}

const COLORS = {
  Technical: '#dddfff',
  Behavioral: '#cac5fe',
  Mixed: '#6870a6',
};

export default function InterviewTypeDistribution({ interviews }: InterviewTypeDistributionProps) {
  // Count interview types
  const typeCounts = interviews.reduce((acc, interview) => {
    const type = /technical/i.test(interview.type) ? 'Technical' 
      : /behavioral/i.test(interview.type) ? 'Behavioral' 
      : 'Mixed';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 h-full flex flex-col hover:border-primary-100/30 transition-all">
      <h3 className="text-xl font-semibold text-light-100 mb-6">Interview Types</h3>
      
      {chartData.length > 0 ? (
        <div className="flex-1 flex flex-col justify-between">
          {/* Pie Chart */}
          <div className="w-full h-[180px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name as keyof typeof COLORS] || '#6870a6'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#27282f', 
                    border: '1px solid #dddfff',
                    borderRadius: '8px',
                    color: '#d6e0ff'
                  }}
                  labelStyle={{ color: '#d6e0ff' }}
                  itemStyle={{ color: '#d6e0ff' }}
                  cursor={{ fill: 'rgba(221, 223, 255, 0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend with counts */}
          <div className="space-y-3">
            {chartData.map((item) => {
              const percentage = ((item.value / total) * 100).toFixed(0);
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] }}
                    />
                    <span className="text-light-100 text-sm truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-light-100 font-semibold text-sm">{item.value}</span>
                    <span className="text-light-100/50 text-xs">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-dark-100/20">
            <div className="flex items-center justify-between">
              <span className="text-light-100/70 text-sm">Total Interviews</span>
              <span className="text-primary-100 font-bold text-lg">{total}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
          <p className="text-light-100/70 text-center px-4 mb-2">No interviews created yet.</p>
          <p className="text-light-100/50 text-xs text-center px-4">Create your first interview to see the distribution</p>
        </div>
      )}
    </div>
  );
}
