import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download } from 'lucide-react';

export default function TrainingMetricsChart({ isTraining }: { isTraining: boolean }) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ epoch: number; loss: number }[]>([]);

  // Simulate loss reduction over epochs
  useEffect(() => {
    if (!isTraining) {
      return;
    }
    
    // Initial data
    setData([{ epoch: 0, loss: 1.0 }]);
    let currentEpoch = 0;
    
    const interval = setInterval(() => {
      currentEpoch += 1;
      setData(prev => {
        const lastLoss = prev[prev.length - 1]?.loss || 1.0;
        // Decrease loss over time with some noise
        const decrease = (Math.random() * 0.05 + 0.01) * (lastLoss / 2 + 0.1);
        const newLoss = Math.max(0.01, lastLoss - decrease + (Math.random() * 0.02 - 0.01));
        const newData = [...prev, { epoch: currentEpoch, loss: newLoss }];
        if (newData.length > 50) return newData.slice(newData.length - 50);
        return newData;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isTraining]);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove(); // Clear previous drawing

    const container = svg.node()?.parentElement;
    const width = container ? container.clientWidth : 300;
    const height = 150;
    const margin = { top: 10, right: 10, bottom: 20, left: 30 };

    svg.attr('width', width).attr('height', height);

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.epoch) as [number, number])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, 1.2])
      .range([height - margin.bottom, margin.top]);

    const line = d3.line<{ epoch: number; loss: number }>()
      .x(d => x(d.epoch))
      .y(d => y(d.loss))
      .curve(d3.curveMonotoneX);

    // Axes
    const xAxis = d3.axisBottom(x).ticks(5).tickSizeOuter(0);
    const yAxis = d3.axisLeft(y).ticks(4).tickSizeOuter(0);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .call(g => g.select(".domain").attr("stroke", "#4b5563"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#4b5563"))
      .call(g => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", "10px"));

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis)
      .call(g => g.select(".domain").remove()) // Remove y-axis line
      .call(g => g.selectAll(".tick line").attr("stroke", "#4b5563").attr("x2", width - margin.left - margin.right).attr("stroke-opacity", 0.2)) // Grid lines
      .call(g => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", "10px"));

    // Path
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b") // amber-500
      .attr("stroke-width", 2)
      .attr("d", line);

    // Area
    const area = d3.area<{ epoch: number; loss: number }>()
      .x(d => x(d.epoch))
      .y0(height - margin.bottom)
      .y1(d => y(d.loss))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("fill", "url(#loss-gradient)")
      .attr("d", area);

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "loss-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0.3);
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0);

  }, [data]);

  const downloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "epoch,loss\n"
      + data.map(row => `${row.epoch},${row.loss.toFixed(6)}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "training_loss_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full min-h-[150px] relative">
      <button 
        onClick={downloadCSV}
        className="absolute top-0 right-4 z-10 flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs border border-gray-700 transition"
      >
        <Download className="w-3 h-3" />
        Download Logs
      </button>
      <svg ref={chartRef} className="w-full h-full" />
    </div>
  );
}
