import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { DataSource } from '../types';

interface DataSourceGraphProps {
  dataSources: DataSource[];
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  status: string;
  effectiveStatus?: string;
  priority: number;
  radius: number;
  isSinglePointOfFailure: boolean;
  isRedundant: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

const DataSourceGraph: React.FC<DataSourceGraphProps> = ({ dataSources }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || dataSources.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll("*").remove();

    // Map to Nodes
    const nodes: Node[] = dataSources.map(ds => ({
      ...ds,
      radius: 20 + (ds.priority || 50) / 5,
      isSinglePointOfFailure: false,
      isRedundant: false,
    }));

    const links: Link[] = [];
    dataSources.forEach(ds => {
      if (ds.dependencies) {
        ds.dependencies.forEach(depId => {
          if (nodes.find(n => n.id === depId)) {
            links.push({
              source: depId,
              target: ds.id
            });
          }
        });
      }
    });

    // Determine Single Point of Failure and Redundancy
    // Single Point of Failure: A node that is the sole dependency for multiple nodes, and has no fallbacks or it's a root node
    nodes.forEach(node => {
      const dependents = links.filter(l => l.source === node.id || (l.source as Node).id === node.id);
      if (dependents.length > 1) {
        node.isSinglePointOfFailure = true;
      }
      
      const outgoingLinks = links.filter(l => l.target === node.id || (l.target as Node).id === node.id);
      // If multiple sources point to this, the sources themselves might be redundant depending on the business logic.
      // Actually let's define a node as redundant if there are multiple nodes of the SAME TYPE that don't depend on each other?
      const sameTypeNodes = nodes.filter(n => n.type === node.type && n.id !== node.id);
      if (sameTypeNodes.length > 0) {
        node.isRedundant = true;
      }
    });

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', 'transparent');

    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#4b5563')
      .style('stroke', 'none');

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => (d as Node).radius + 10));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    nodeGroup.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        if (d.status === 'error' || d.effectiveStatus === 'error') return '#ef4444'; // Red
        if (d.status === 'disconnected') return '#f59e0b'; // Amber
        return '#3b82f6'; // Blue
      })
      .attr('stroke', d => d.isSinglePointOfFailure ? '#f43f5e' : (d.isRedundant ? '#eab308' : '#1e3a8a'))
      .attr('stroke-width', d => d.isSinglePointOfFailure ? 4 : (d.isRedundant ? 3 : 1))
      .attr('stroke-dasharray', d => d.isRedundant ? '4,4' : 'none')
      .style('cursor', 'pointer');
      
    // Pulse animation for SPOF
    nodeGroup.selectAll('circle')
      .filter((d: any) => d.isSinglePointOfFailure)
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.5;1;0.5')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');

    nodeGroup.append('text')
      .text(d => d.name)
      .attr('dy', d => d.radius + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#d1d5db')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold');

    nodeGroup.append('title')
      .text(d => `${d.name} \nType: ${d.type} \nStatus: ${d.effectiveStatus || d.status} \n${d.isSinglePointOfFailure ? '⚠️ Root / Single Point of Failure' : ''}\n${d.isRedundant ? 'ℹ️ Redundant Type' : ''}`);

    simulation.on('tick', () => {
      link
        .attr('x1', d => {
          const source = d.source as Node;
          return source.x || 0;
        })
        .attr('y1', d => {
          const source = d.source as Node;
          return source.y || 0;
        })
        .attr('x2', d => {
          const target = d.target as Node;
          // Calculate intersection with target circle radius
          const source = d.source as Node;
          const dx = (target.x || 0) - (source.x || 0);
          const dy = (target.y || 0) - (source.y || 0);
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length === 0) return target.x || 0;
          return (target.x || 0) - (dx / length) * (target.radius + 5);
        })
        .attr('y2', d => {
          const target = d.target as Node;
          const source = d.source as Node;
          const dx = (target.x || 0) - (source.x || 0);
          const dy = (target.y || 0) - (source.y || 0);
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length === 0) return target.y || 0;
          return (target.y || 0) - (dy / length) * (target.radius + 5);
        });

      nodeGroup
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [dataSources]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 border border-gray-800 rounded-xl relative overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
        
        <div className="absolute top-4 right-4 bg-gray-800/80 backdrop-blur border border-gray-700 p-3 rounded-lg text-xs">
            <div className="font-bold text-gray-300 mb-2 uppercase tracking-widest border-b border-gray-700 pb-1">Legend</div>
            <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-400">Connected</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-gray-400">Disconnected</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400">Error</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
                <div className="w-3 h-3 rounded-full border-2 border-rose-500 bg-transparent flex items-center justify-center">
                    <div className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-gray-400">Single Point of Failure</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-transparent"></div>
                <span className="text-gray-400">Redundant Type</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[9px] text-gray-500 italic">
                * Node size indicates priority
            </div>
        </div>
    </div>
  );
};

export default DataSourceGraph;
