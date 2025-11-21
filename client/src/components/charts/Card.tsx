import React from 'react';

interface CardProps {
  data: any[];
  config: {
    valueKey: string;
    label: string;
    title?: string;
    format?: 'number' | 'currency' | 'percentage';
    color?: string;
  };
}

export const Card: React.FC<CardProps> = ({ data, config }) => {
  if (!data || data.length === 0) return null;

  const value = data[0][config.valueKey];
  
  const formatValue = (val: any) => {
    const num = +val;
    if (isNaN(num)) return val;
    
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(num);
      case 'percentage':
        return `${num.toFixed(2)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(num);
    }
  };

  return (
    <div className="w-full h-full p-6 bg-gradient-to-br from-gray-800/60 to-gray-800/30 rounded-lg border border-gray-700 flex flex-col justify-center hover:border-primary/50 transition-colors">
      {config.title && (
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{config.title}</h3>
      )}
      <div className={`text-5xl font-bold ${config.color || 'text-blue-400'} mb-3 tabular-nums`}>
        {formatValue(value)}
      </div>
      <div className="text-sm text-gray-300 font-medium">{config.label}</div>
    </div>
  );
};
