import React from 'react';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface SimpleBarChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  data, 
  title,
  height = 300 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {title && (
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="space-y-4" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-24 text-sm font-medium text-gray-700 truncate">
                {item.label}
              </div>
              <div className="flex-1 relative">
                <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-8 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-3`}
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: item.color 
                    }}
                  >
                    <span className="text-white text-xs font-semibold">
                      {item.value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleBarChart;
