import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { containsDates, createAxisDateFormatter } from '../../utils/dateFormatter';

interface LineChartProps {
  data: any[];
  config: {
    xKey: string;
    yKey: string;
    title?: string;
    color?: string;
  };
}

export const LineChart: React.FC<LineChartProps> = ({ data, config }) => {
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

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 30, right: 40, bottom: 80, left: 70 };
    
    // Calcular ancho mínimo necesario basado en cantidad de puntos
    const minPointWidth = 30; // Ancho mínimo por punto de datos
    const minRequiredWidth = data.length * minPointWidth + margin.left + margin.right;
    
    // Usar el mayor entre el ancho del contenedor y el mínimo requerido
    const actualWidth = Math.max(containerWidth, minRequiredWidth);
    const width = actualWidth - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', actualWidth)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scalePoint()
      .domain(data.map(d => String(d[config.xKey])))
      .range([0, width])
      .padding(0.5);

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

    // Line generator
    const line = d3.line<any>()
      .x(d => x(String(d[config.xKey])) || 0)
      .y(d => y(+d[config.yKey]))
      .curve(d3.curveMonotoneX);

    // Draw line
    const path = svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', config.color || '#10b981')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Animate line
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1200)
      .attr('stroke-dashoffset', 0);

    // Add dots
    svg.selectAll('.dot')
      .data(data)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(String(d[config.xKey])) || 0)
      .attr('cy', d => y(+d[config.yKey]))
      .attr('r', 0)
      .attr('fill', config.color || '#10b981')
      .transition()
      .delay(1000)
      .duration(300)
      .attr('r', 5);

    // Add value labels - only if not too many points
    if (data.length <= 12) {
      svg.selectAll('.label')
        .data(data)
        .join('text')
        .attr('class', 'label')
        .attr('x', d => (x(String(d[config.xKey])) || 0))
        .attr('y', d => y(+d[config.yKey]) - 12)
        .attr('text-anchor', 'middle')
        .style('fill', '#1f2937')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('opacity', 0)
        .text(d => {
          const val = +d[config.yKey];
          return val >= 1000 ? d3.format('.2s')(val) : val.toLocaleString();
        })
        .transition()
        .delay(1200)
        .duration(300)
        .style('opacity', 1);
    }

  }, [data, config, isDateAxis, dateFormatter, containerWidth]);

  // Calcular si necesitamos scroll
  const minPointWidth = 30;
  const minRequiredWidth = data.length * minPointWidth + 110; // 110 = margins
  const needsScroll = containerWidth > 0 && minRequiredWidth > containerWidth;

  return (
    <div className="w-full h-full flex flex-col">
      {config.title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{config.title}</h3>
      )}
      <div ref={containerRef} className={`flex-1 ${needsScroll ? 'overflow-x-auto' : ''}`}>
        <svg 
          ref={svgRef} 
          style={{ 
            width: needsScroll ? `${minRequiredWidth}px` : '100%',
            height: '480px' 
          }} 
        />
      </div>
    </div>
  );
};
