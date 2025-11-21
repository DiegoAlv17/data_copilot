import React from 'react';
import { ChartRenderer } from './charts/ChartRenderer';
import type { DashboardWidget } from '../types';

interface DashboardGridProps {
  title?: string;
  widgets: DashboardWidget[];
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ title, widgets }) => {
  if (!widgets || widgets.length === 0) return null;

  // Determinar layout basado en número de widgets
  const getGridCols = () => {
    if (widgets.length === 1) return 'grid-cols-1';
    if (widgets.length === 2) return 'grid-cols-1 lg:grid-cols-2';
    if (widgets.length === 3) return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
    return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
  };
  
  // Determinar si el widget necesita más altura (gráficos vs KPIs)
  const getWidgetHeight = (widget: DashboardWidget) => {
    if (widget.chartType === 'card') return 'min-h-[180px]';
    if (widget.chartType === 'table') return 'min-h-[500px]';
    return 'min-h-[600px]'; // Bar charts, line charts, pie charts
  };

  return (
    <div className="w-full mt-6">
      {title && (
        <h2 className="text-2xl font-bold text-text mb-6 border-b border-white/10 pb-3">
          {title}
        </h2>
      )}
      
      <div className={`grid ${getGridCols()} gap-6`}>
        {widgets.map((widget, idx) => {
          const heightClass = getWidgetHeight(widget);
          return (
            <div 
              key={idx}
              className={`bg-gray-800/50 rounded-lg border border-gray-700 hover:border-primary/50 transition-colors overflow-hidden ${heightClass}`}
            >
              {widget.description && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-sm font-medium text-gray-300">
                    {widget.description}
                  </h3>
                </div>
              )}
              {widget.data && widget.chartType ? (
                <ChartRenderer 
                  type={widget.chartType} 
                  data={widget.data} 
                  config={widget.chartConfig || {}}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-text-secondary">
                  No hay datos disponibles
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
