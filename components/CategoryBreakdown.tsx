interface CategoryBreakdownProps {
  categories: { [key: string]: number };
}

export default function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const categoryList = Object.entries(categories).map(([name, score]) => ({
    name,
    score,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-success-100';
    if (score >= 60) return 'bg-primary-100';
    if (score >= 40) return 'bg-primary-200';
    return 'bg-light-400';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-success-100';
    if (score >= 60) return 'text-primary-100';
    if (score >= 40) return 'text-primary-200';
    return 'text-light-400';
  };

  return (
    <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 overflow-hidden">
      <h3 className="text-xl font-semibold text-light-100 mb-6">Category Breakdown</h3>
      
      {categoryList.length > 0 ? (
        <div className="space-y-4">
          {categoryList.map(({ name, score }) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-2 gap-4">
                <span className="text-light-100 text-sm font-medium break-words flex-1">
                  {name}
                </span>
                <span className={`text-sm font-bold ${getScoreTextColor(score)} whitespace-nowrap`}>
                  {score}/100
                </span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-light-100/70">No category data available yet.</p>
        </div>
      )}
    </div>
  );
}
