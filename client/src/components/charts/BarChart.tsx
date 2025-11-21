import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions - Dynamic height based on data count
    const margin = { top: 30, right: 40, bottom: 100, left: 80 };
    const minWidth = Math.max(800, data.length * 60); // Minimum 60px per bar
    const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
    const width = Math.max(containerWidth - margin.left - margin.right, minWidth - margin.left - margin.right);
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
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

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '11px')
      .style('fill', '#d1d5db');

    svg.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('fill', '#9ca3af');

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
        .style('fill', '#f3f4f6')
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

  }, [data, config]);

  return (
    <div className="w-full h-full flex flex-col">
      {config.title && (
        <h3 className="text-sm font-semibold text-text mb-2">{config.title}</h3>
      )}
      <div className="overflow-x-auto overflow-y-visible flex-1">
        <svg ref={svgRef} style={{ minWidth: `${Math.max(800, data.length * 60)}px`, height: '530px' }} />
      </div>
    </div>
  );
};
