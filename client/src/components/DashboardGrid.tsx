import React from 'react';
import { ChartRenderer } from './charts/ChartRenderer';
import type { DashboardWidget } from '../types';

interface DashboardGridProps {
  title?: string;
  widgets: DashboardWidget[];
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ title, widgets }) => {
  if (!widgets || widgets.length === 0) return null;

  // Determinar el número de columnas según la cantidad de widgets
  const getColumnsCount = () => {
    if (widgets.length === 1) return 1;
    if (widgets.length === 2) return 2;
    if (widgets.length <= 4) return 2;
    return 3; // Para 5+ widgets usar 3 columnas
  };

  const columnsCount = getColumnsCount();
  
  // Calcular si el último widget debe expandirse para llenar el espacio
  const getWidgetSpan = (idx: number): string => {
    const totalWidgets = widgets.length;
    const remainder = totalWidgets % columnsCount;
    
    // Si es el último widget y hay espacio sobrante
    if (idx === totalWidgets - 1 && remainder !== 0) {
      // El último widget ocupa las columnas restantes
      const colsToSpan = columnsCount - remainder + 1;
      if (colsToSpan === 2) return 'lg:col-span-2';
      if (colsToSpan === 3) return 'xl:col-span-3';
    }
    
    // Para casos especiales: si hay 2 widgets sobrantes en grid de 3
    if (columnsCount === 3 && remainder === 2) {
      // Los últimos 2 widgets pueden ocupar 1.5 columnas cada uno (no posible en CSS grid)
      // Alternativa: dejar que ocupen su espacio normal o hacer que ambos ocupen más
      // Opción: el penúltimo ocupa 1, el último ocupa 2
      if (idx === totalWidgets - 1) return 'xl:col-span-2';
    }
    
    return '';
  };
  
  // Determinar si el widget necesita más altura (gráficos vs KPIs)
  const getWidgetHeight = (widget: DashboardWidget) => {
    if (widget.chartType === 'card') return 'min-h-[180px]';
    if (widget.chartType === 'table') return 'min-h-[500px]';
    return 'min-h-[600px]'; // Bar charts, line charts, pie charts
  };

  // Generar clases de grid responsivas
  const getGridClasses = () => {
    if (columnsCount === 1) return 'grid-cols-1';
    if (columnsCount === 2) return 'grid-cols-1 lg:grid-cols-2';
    return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
  };

  return (
    <div className="w-full mt-6">
      {title && (
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-3">
          {title}
        </h2>
      )}
      
      <div className={`grid ${getGridClasses()} gap-6`}>
        {widgets.map((widget, idx) => {
          const heightClass = getWidgetHeight(widget);
          const spanClass = getWidgetSpan(idx);
          
          return (
            <div 
              key={idx}
              className={`bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.2)] transition-all duration-300 overflow-hidden ${heightClass} ${spanClass}`}
            >
              {widget.description && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    {widget.description}
                  </h3>
                </div>
              )}
              <div className="overflow-x-auto">
                {widget.data && widget.chartType ? (
                  <ChartRenderer 
                    type={widget.chartType} 
                    data={widget.data} 
                    config={widget.chartConfig || {}}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No hay datos disponibles
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
