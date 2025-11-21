import React from 'react';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { Card } from './Card';
import { Table } from './Table';

interface ChartRendererProps {
  type: string;
  data: any[];
  config: any;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-text-secondary">
        No data available
      </div>
    );
  }

  switch (type) {
    case 'bar':
      return <BarChart data={data} config={config} />;
    case 'line':
      return <LineChart data={data} config={config} />;
    case 'pie':
      return <PieChart data={data} config={config} />;
    case 'card':
      return <Card data={data} config={config} />;
    case 'table':
      return <Table data={data} config={config} />;
    default:
      return (
        <div className="w-full h-64 flex items-center justify-center text-text-secondary">
          Unsupported chart type: {type}
        </div>
      );
  }
};
