import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PieChartProps {
  data: any[];
  config: {
    labelKey: string;
    valueKey: string;
    title?: string;
  };
}

export const PieChart: React.FC<PieChartProps> = ({ data, config }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
    const width = containerWidth;
    const height = 450;
    const radius = Math.min(width, height) / 2 - 60;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Pie generator
    const pie = d3.pie<any>()
      .value(d => +d[config.valueKey])
      .sort(null);

    // Arc generator
    const arc = d3.arc<any>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcHover = d3.arc<any>()
      .innerRadius(0)
      .outerRadius(radius + 10);

    // Draw slices
    const slices = svg.selectAll('.slice')
      .data(pie(data))
      .join('g')
      .attr('class', 'slice');

    slices.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => color(i.toString()))
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 2)
      .style('opacity', 0)
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc);
      })
      .transition()
      .duration(800)
      .style('opacity', 1)
      .attrTween('d', function(d: any) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t: number) {
          return arc(interpolate(t)) || '';
        };
      });

    // Add labels
    slices.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('opacity', 0)
      .text(d => {
        const percent = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
        return `${percent}%`;
      })
      .transition()
      .delay(800)
      .duration(300)
      .style('opacity', 1);

    // Legend
    const legend = svg.selectAll('.legend')
      .data(data)
      .join('g')
      .attr('class', 'legend')
      .attr('transform', (d, i) => `translate(${radius + 20}, ${-radius + i * 25})`);

    legend.append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', (d, i) => color(i.toString()))
      .attr('rx', 3);

    legend.append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('fill', '#374151')
      .style('font-size', '13px')
      .text(d => `${d[config.labelKey]}: ${d[config.valueKey]}`);

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
