import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { containsDates, createAxisDateFormatter } from '../../utils/dateFormatter';

interface BarChartProps {
  data: any[];
  config: {
    xKey: string;
    yKey: string;
    title?: string;
    color?: string;
  };
}

export const BarChart: React.FC<BarChartProps> = ({ data, config }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Detectar si el eje X contiene fechas y crear el formateador apropiado
  const { isDateAxis, dateFormatter } = useMemo(() => {
    const isDate = containsDates(data, config.xKey);
    const formatter = isDate ? createAxisDateFormatter(data, config.xKey) : null;
    return { isDateAxis: isDate, dateFormatter: formatter };
  }, [data, config.xKey]);

  // Observar cambios en el tamaño del contenedor
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || containerWidth === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions - calcular ancho mínimo necesario basado en cantidad de datos
    const margin = { top: 30, right: 40, bottom: 100, left: 80 };
    const minBarWidth = 40; // Ancho mínimo por barra
    const minRequiredWidth = data.length * minBarWidth + margin.left + margin.right;
    
    // Usar el mayor entre el ancho del contenedor y el mínimo requerido
    const actualWidth = Math.max(containerWidth, minRequiredWidth);
    const width = actualWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', actualWidth)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(data.map(d => String(d[config.xKey])))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => +d[config.yKey]) || 0])
      .nice()
      .range([height, 0]);

    // Axes con formato de fecha si corresponde
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => {
        if (isDateAxis && dateFormatter) {
          return dateFormatter(String(d));
        }
        return String(d);
      }))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '11px')
      .style('fill', '#4b5563');

    svg.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#374151');

    // Bars
    svg.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(String(d[config.xKey])) || 0)
      .attr('y', height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', config.color || '#3b82f6')
      .attr('rx', 4)
      .transition()
      .duration(800)
      .attr('y', d => y(+d[config.yKey]))
      .attr('height', d => height - y(+d[config.yKey]));

    // Add value labels on top of bars - only show if there's space
    if (data.length <= 20) {
      svg.selectAll('.label')
        .data(data)
        .join('text')
        .attr('class', 'label')
        .attr('x', d => (x(String(d[config.xKey])) || 0) + x.bandwidth() / 2)
        .attr('y', d => y(+d[config.yKey]) - 8)
        .attr('text-anchor', 'middle')
        .style('fill', '#1f2937')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('opacity', 0)
        .text(d => {
          const val = +d[config.yKey];
          return val >= 1000 ? d3.format('.2s')(val) : val.toLocaleString();
        })
        .transition()
        .duration(800)
        .style('opacity', 1);
    }

  }, [data, config, isDateAxis, dateFormatter, containerWidth]);

  // Calcular si necesitamos scroll (cuando hay muchos datos)
  const minBarWidth = 40;
  const minRequiredWidth = data.length * minBarWidth + 120; // 120 = margins
  const needsScroll = containerWidth > 0 && minRequiredWidth > containerWidth;

  return (
    <div className="w-full h-full flex flex-col">
      {config.title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{config.title}</h3>
      )}
      <div ref={containerRef} className={`flex-1 ${needsScroll ? 'overflow-x-auto' : ''} overflow-y-visible`}>
        <svg 
          ref={svgRef} 
          style={{ 
            width: needsScroll ? `${minRequiredWidth}px` : '100%',
            height: '530px' 
          }} 
        />
      </div>
    </div>
  );
};
