"use client"

import "@xyflow/react/dist/style.css";
import React, { useEffect, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useEdgesState,
    useNodesState,
    type Edge,
    type Node,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { useTheme } from "next-themes";

const elk = new ELK();

const initialNodes: Node [] = [
    {
        id: "1", 
        data: { label: "Start" }, 
        position: {x:0, y:0 },
        style: { 
            background: '#fff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: 600,
            width: 120,
        }
    },
    {
        id: "2", 
        data: { label: "Task A" }, 
        position: {x:0, y:0 },
        style: { 
            background: '#fff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: 600,
            width: 120,
        }
    }, 
    {
        id: "3", 
        data: { label: "Task B" }, 
        position: {x:0, y:0 },
        style: { 
            background: '#fff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: 600,
            width: 120,
        }
    },  
];

const initialEdges: Edge[] = [
    {id:"e1-2", source: "1", target: "2", animated: true, style: { stroke: '#3b82f6' }},
    {id:"e2-3", source: "2", target: "3", animated: true, style: { stroke: '#3b82f6' }}
];

export default function WorkflowCanvas() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    useEffect(()=>{
        async function layout(){
            const graph = {
                id: "root",
                layoutOptions: {
                "elk.algorithm": "layered",
                "elk.direction": "RIGHT",
                "elk.layered.spacing.nodeNodeBetweenLayers": "60",
                "elk.spacing.nodeNode": "40",
                },
                children: nodes.map((n) => ({
                    id: n.id,
                    width: (n.measured?.width as number) || 180,
                    height: (n.measured?.height as number) || 40,
                })),
                edges: edges.map((e)=> ({
                    id:e.id,
                    sources: [e.source],
                    targets: [e.target],
                })),
            };

            const res = await elk.layout(graph);
            const laidOut =
                res.children?.reduce<Record<string, {x:number; y:number}>>((acc,c) => {
                    if (c.id && typeof c.x === "number" && typeof c.y === "number") {
                        acc[c.id] = { x: c.x, y: c.y};
                    }
                    return acc;
                }, {}) ?? {};
            setNodes((nds)=>
            nds.map((n)=> ({
                ...n,
                position: laidOut[n.id]?? n.position,
            })),
        );
    }
    layout();
    }, [nodes.length, edges.length, setNodes]);

    if (!mounted) return null;

    const isDark = resolvedTheme === 'dark';
    const activeNode = activeNodeId ? nodes.find((n) => n.id === activeNodeId) : undefined;
    const activeLabel = activeNode ? String((activeNode.data as any)?.label ?? activeNode.id) : "";

    return (
        <div className="relative h-full w-full bg-white dark:bg-zinc-950">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodesDraggable={true}
                fitView
                className="bg-white dark:bg-zinc-950"
                onPaneClick={() => setActiveNodeId(null)}
                onNodeClick={(_, node) => setActiveNodeId(node.id)}
                onNodeDragStart={(_, node) => setActiveNodeId(node.id)}
                fitViewOptions={{ padding: 0.25 }}
            >
                <Controls />
                <Background 
                    gap={16} 
                    color={isDark ? "#ffffff" : "#a1a1aa"}
                />
            </ReactFlow>

            {activeNode ? (
                <aside className="absolute right-4 top-4 z-20 w-80 max-w-[calc(100%-2rem)] rounded-lg border border-zinc-200 bg-white/95 p-4 text-sm text-zinc-900 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/85 dark:text-zinc-100">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Node</div>
                            <div className="truncate text-base font-medium">{activeLabel}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveNodeId(null)}
                            className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                            aria-label="Close node info"
                        >
                            ×
                        </button>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                        <div><span className="text-zinc-500 dark:text-zinc-400">id:</span> {activeNode.id}</div>
                        <div><span className="text-zinc-500 dark:text-zinc-400">x:</span> {Math.round(activeNode.position.x)}</div>
                        <div><span className="text-zinc-500 dark:text-zinc-400">y:</span> {Math.round(activeNode.position.y)}</div>
                    </div>
                </aside>
            ) : null}
        </div>
    );
}
