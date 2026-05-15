import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { AIAgent, AgentTask, DataSource } from '../types';

interface SwarmGraphProps {
  agents: AIAgent[];
  tasks: AgentTask[];
  dataSources: DataSource[];
  onNodeClick?: (id: string, type: 'agent' | 'task') => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group: 'agent' | 'task';
  status: string;
  isSPOF?: boolean;
  hasRedundantData?: boolean;
  radius: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'hierarchy' | 'dependency' | 'assignment';
}

export default function SwarmGraph({ agents, tasks, dataSources }: SwarmGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    if (agents.length === 0 && tasks.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;

    d3.select(svgRef.current).selectAll("*").remove();

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Analyze Agent Redundancy
    const getAgentRedundancy = (agent: AIAgent) => {
      if (!agent.trainingDataSources) return false;
      const types = new Set();
      for (const src of agent.trainingDataSources) {
        const ds = dataSources.find(d => d.id === src.id);
        if (ds) {
          if (types.has(ds.type)) return true; // redundant!
          types.add(ds.type);
        }
      }
      return false;
    };

    // Analyze Agent SPOF
    // SPOF = an agent that is the sole dependency/parent for multiple other agents or tasks?
    // Let's say if an agent has multiple children, AND it's their only parent (which in this tree setup it is),
    // it's a SPOF. Let's define it as having > 1 child agents or > 1 assigned tasks.
    const getAgentDependentCount = (agentId: string) => {
      let count = 0;
      count += agents.filter(a => a.parentAgentId === agentId).length;
      count += tasks.filter(t => t.assignedAgentId === agentId).length;
      return count;
    };

    agents.forEach(agent => {
      nodes.push({
        id: agent.id,
        name: agent.name,
        group: 'agent',
        status: agent.status,
        isSPOF: getAgentDependentCount(agent.id) > 1,
        hasRedundantData: getAgentRedundancy(agent),
        radius: 30
      });
      if (agent.parentAgentId) {
        links.push({
          source: agent.id,
          target: agent.parentAgentId,
          type: 'hierarchy'
        });
      }
    });

    tasks.forEach(task => {
      nodes.push({
        id: task.id,
        name: task.title,
        group: 'task',
        status: task.status,
        radius: 15
      });
      if (task.assignedAgentId) {
        links.push({
          source: task.id,
          target: task.assignedAgentId,
          type: 'assignment'
        });
      }
      if (task.dependencies) {
        task.dependencies.forEach(dep => {
          links.push({
            source: task.id,
            target: dep,
            type: 'dependency'
          });
        });
      }
    });

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
      
    // Defs for arrows, filters
    const defs = svg.append('defs');
    
    // Arrow marker
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#6b7280");
      
    // SPOF Glow
    const filter = defs.append('filter')
      .attr('id', 'spof-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom as any);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(d => d.type === 'hierarchy' ? 120 : 80))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => d.radius + 15).iterations(2));

    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", d => {
        if (d.type === 'hierarchy') return '#a855f7'; // Purple
        if (d.type === 'assignment') return '#3b82f6'; // Blue
        return '#6b7280'; // Gray
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => d.type === 'hierarchy' ? 2 : 1)
      .attr("stroke-dasharray", d => d.type === 'assignment' ? "4,4" : "none")
      .attr("marker-end", d => d.type !== 'assignment' ? "url(#arrowhead)" : "");

    const nodeGroup = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onNodeClick) {
          onNodeClick(d.id, d.group);
        }
      });

    // SPOF Glow animation
    nodeGroup.append('circle')
      .filter(d => !!d.isSPOF)
      .attr('r', d => d.radius + 8)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e') // Rose for SPOF
      .attr('stroke-width', 2)
      .attr('filter', 'url(#spof-glow)')
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.3;1;0.3')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');

    nodeGroup.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => {
        if (d.group === 'agent') {
            if (d.status === 'training') return '#d97706';
            if (d.status === 'ready') return '#059669';
            return '#4b5563';
        } else {
            if (d.status === 'completed') return '#10b981';
            if (d.status === 'in_progress') return '#f59e0b';
            if (d.status === 'failed') return '#f43f5e';
            return '#374151';
        }
      })
      .attr("stroke", d => {
        if (d.group === 'agent') {
            if (d.isSPOF) return '#be123c';
            if (d.hasRedundantData) return '#ca8a04';
            return '#a855f7';
        }
        return '#1f2937';
      })
      .attr("stroke-width", d => (d.group === 'agent' && (d.isSPOF || d.hasRedundantData)) ? 3 : 2)
      .attr("stroke-dasharray", d => d.hasRedundantData ? "4,4" : "none");

    // Labels
    nodeGroup.append("text")
      .text(d => d.name)
      .attr('dy', d => d.radius + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#d1d5db')
      .attr('font-size', d => d.group === 'agent' ? '12px' : '10px')
      .attr('font-weight', d => d.group === 'agent' ? 'bold' : 'normal');
      
    // Badges / Icons for highlights
    nodeGroup.append('text')
      .filter(d => !!d.isSPOF)
      .text('⚠️ SPOF')
      .attr('dy', d => -d.radius - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f43f5e')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold');

    nodeGroup.append('text')
      .filter(d => !!d.hasRedundantData && !d.isSPOF)
      .text('🔁 Redundant')
      .attr('dy', d => -d.radius - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#eab308')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold');

    // Drag behavior
    nodeGroup.call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }) as any);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [agents, tasks, dataSources]);

  return (
    <div className="flex-1 w-full h-full relative" ref={containerRef}>
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-800 text-xs text-gray-300">
            <div className="font-bold mb-2 text-white">Legend</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Task Completed / Agent Ready</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div> Task In Progress / Agent Training</div>
            <div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full bg-[#4b5563]"></div> Idle / Todo</div>
            <div className="w-full h-px bg-gray-700 my-2"></div>
            <div className="flex items-center gap-2 mb-1 text-rose-400 font-bold">⚠️ Critical Single Point of Failure</div>
            <div className="flex items-center gap-2 text-amber-400 font-bold">🔁 Redundant Data Sources</div>
        </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
