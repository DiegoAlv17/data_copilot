import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 30, right: 40, bottom: 80, left: 70 };
    const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
    const width = containerWidth - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
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
      .style('font-size', '11px')
      .style('fill', '#d1d5db');

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
        .style('fill', '#f3f4f6')
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

  }, [data, config]);

  return (
    <div className="w-full h-full flex flex-col">
      {config.title && (
        <h3 className="text-sm font-semibold text-text mb-2">{config.title}</h3>
      )}
      <div className="flex-1">
        <svg ref={svgRef} style={{ width: '100%', height: '480px' }} />
      </div>
    </div>
  );
};
