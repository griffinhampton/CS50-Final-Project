"use client";

//created with the heavy assistance of chatgpt (as i was running out of time at this point)
// and also using xyflow react documentation

import "@xyflow/react/dist/style.css";
import React, { useEffect, useMemo, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    addEdge,
    Handle,
    useEdgesState,
    useNodesState,
    Position,
    type ReactFlowInstance,
    type Connection,
    type Edge,
    type Node,
    type NodeProps,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { useTheme } from "next-themes";

import type { WorkflowCondition, WorkflowGraphDefinition, WorkflowNodeActionKind, WorkflowNodeKind } from "@/types/workflow";

const elk = new ELK();

type WorkflowNodeData = {
    label: string;
    kind: WorkflowNodeKind;
    condition: WorkflowCondition;
    config: Record<string, unknown>;
};

function IfDiamondNode({ data, selected }: NodeProps<Node<WorkflowNodeData>>) {
    return (
        <div
            className={
                "relative flex items-center justify-center text-center " +
                (selected ? "ring-2 ring-zinc-300 dark:ring-zinc-700" : "")
            }
            style={{
                width: 220,
                height: 110,
                background: "var(--wf-node-bg)",
                color: "var(--wf-node-fg)",
                border: "var(--wf-node-border)",
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                fontSize: 14,
                fontWeight: 700,
            }}
        >
            <Handle type="target" id="in" position={Position.Top} style={{ background: "transparent", border: "none" }} />
            <Handle type="source" id="false" position={Position.Left} style={{ background: "transparent", border: "none" }} />
            <Handle type="source" id="true" position={Position.Right} style={{ background: "transparent", border: "none" }} />
            <div className="mx-3 leading-snug">
                <div>IF</div>
                <div className="text-xs font-semibold opacity-80">{String(data.label ?? "")}</div>
            </div>
        </div>
    );
}

const START_NODE_ID = "start";

function computeLabel(kind: WorkflowNodeActionKind | "start", config: Record<string, unknown>) {
    if (kind === "start") return "Start";
    if (kind === "gmailEnsureLabel") {
        const name = typeof config.name === "string" ? config.name : "";
        return name.trim() ? `Ensure label: ${name}` : "Ensure label";
    }
    if (kind === "gmailSend") {
        const to = typeof config.to === "string" ? config.to : "";
        return to.trim() ? `Send email → ${to}` : "Send email";
    }
    if (kind === "gmailSummarizeEmails") {
        const maxEmails = typeof config.maxEmails === "number" ? config.maxEmails : 10;
        return `Summarize emails (${maxEmails})`;
    }
    return "Action";
}

function computeNodeLabel(kind: WorkflowNodeKind, config: Record<string, unknown>) {
    if (kind === "if") return "IF";
    return computeLabel(kind, config);
}

function normalizeCondition(input: unknown): WorkflowCondition {
    if (!input) return { type: "none" };
    if (typeof input === "string") {
        const value = input.trim();
        return value ? { type: "emailContains", value } : { type: "none" };
    }
    if (typeof input === "object") {
        const t = (input as { type?: unknown }).type;
        if (t === "emailHasAttachment") return { type: "emailHasAttachment" };
        if (t === "emailContains") {
            const value = String((input as { value?: unknown }).value ?? "").trim();
            return value ? { type: "emailContains", value } : { type: "none" };
        }
        if (t === "timeBetween") {
            const start = String((input as { start?: unknown }).start ?? "").trim();
            const end = String((input as { end?: unknown }).end ?? "").trim();
            const tz = Number((input as { timezoneOffsetMinutes?: unknown }).timezoneOffsetMinutes);
            return {
                type: "timeBetween",
                start: start || "09:00",
                end: end || "17:00",
                timezoneOffsetMinutes: Number.isFinite(tz) ? tz : new Date().getTimezoneOffset(),
            };
        }
        if (t === "none") return { type: "none" };
    }
    return { type: "none" };
}

function buildChainEdges(nodeIds: string[]): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < nodeIds.length - 1; i++) {
        edges.push({
            id: `e${nodeIds[i]}-${nodeIds[i + 1]}`,
            source: nodeIds[i],
            target: nodeIds[i + 1],
            animated: true,
        });
    }
    return edges;
}

function graphFromState(nodes: Node<WorkflowNodeData>[], edges: Edge[]): WorkflowGraphDefinition {
    return {
        nodes: nodes.map((n) => ({
            id: n.id,
            kind: n.data.kind,
            condition: n.data.condition,
            config: n.data.config,
        })),
        edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? undefined,
            targetHandle: e.targetHandle ?? undefined,
        })),
    };
}

type Props = {
    initialGraph?: WorkflowGraphDefinition;
    onGraphChange?: (graph: WorkflowGraphDefinition) => void;
};

export default function WorkflowCanvas({ initialGraph, onGraphChange }: Props) {
    const initialNodes: Node<WorkflowNodeData>[] = useMemo(() => {
        if (initialGraph?.nodes?.length) {
            return initialGraph.nodes.map((n) => ({
                id: n.id,
                data: {
                    label: computeNodeLabel(n.kind, n.config ?? {}),
                    kind: n.kind,
                    condition: normalizeCondition((n as { condition?: unknown }).condition),
                    config: (n.config ?? {}) as Record<string, unknown>,
                },
                position: { x: 0, y: 0 },
            }));
        }

        return [
            {
                id: START_NODE_ID,
                data: { label: "Start", kind: "start", condition: { type: "none" }, config: {} },
                position: { x: 0, y: 0 },
            },
            {
                id: "node-1",
                data: {
                    label: "Send email",
                    kind: "gmailSend",
                    condition: { type: "none" },
                    config: { to: "", subject: "", bodyText: "" },
                },
                position: { x: 0, y: 0 },
            },
        ];
    }, [initialGraph]);

    const initialEdges: Edge[] = useMemo(() => {
        if (initialGraph?.edges?.length) {
            return initialGraph.edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: (e as { sourceHandle?: string }).sourceHandle,
                targetHandle: (e as { targetHandle?: string }).targetHandle,
                animated: true,
            }));
        }
        return buildChainEdges(initialNodes.map((n) => n.id));
    }, [initialGraph, initialNodes]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node<WorkflowNodeData>, Edge> | null>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isNarrowScreen, setIsNarrowScreen] = useState(false);
    const [connectFromNodeId, setConnectFromNodeId] = useState<string | null>(null);
    const [connectFromHandleId, setConnectFromHandleId] = useState<string | null>(null);
    const [addMenu, setAddMenu] = useState<null | { clientX: number; clientY: number; sourceId: string; sourceHandle?: string }>(null);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const mediaQuery = window.matchMedia("(max-width: 640px)");
        const onChange = (event: MediaQueryListEvent | MediaQueryList) => {
            // MediaQueryListEvent on modern browsers, MediaQueryList fallback on initial run
            setIsNarrowScreen("matches" in event ? event.matches : mediaQuery.matches);
        };

        // initial
        onChange(mediaQuery);

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", onChange);
            return () => mediaQuery.removeEventListener("change", onChange);
        }

        // Safari fallback
        mediaQuery.addListener(onChange as unknown as (this: MediaQueryList, ev: MediaQueryListEvent) => unknown);
        return () => mediaQuery.removeListener(onChange as unknown as (this: MediaQueryList, ev: MediaQueryListEvent) => unknown);
    }, [mounted]);
    
	useEffect(() => {
		async function layout() {
            const direction = isNarrowScreen ? "DOWN" : "RIGHT";
			const graph = {
				id: "root",
				layoutOptions: {
					"elk.algorithm": "layered",
                    "elk.direction": direction,
					"elk.layered.spacing.nodeNodeBetweenLayers": "60",
					"elk.spacing.nodeNode": "40",
				},
				children: nodes.map((n) => ({
					id: n.id,
					width: (n.measured?.width as number) || 220,
					height: (n.measured?.height as number) || 44,
				})),
				edges: edges.map((e) => ({
					id: e.id,
					sources: [e.source],
					targets: [e.target],
				})),
			};

			const res = await elk.layout(graph);
			const laidOut =
				res.children?.reduce<Record<string, { x: number; y: number }>>((acc, c) => {
					if (c.id && typeof c.x === "number" && typeof c.y === "number") {
						acc[c.id] = { x: c.x, y: c.y };
					}
					return acc;
				}, {}) ?? {};
            setNodes((nds) =>
				nds.map((n) => ({
					...n,
					position: laidOut[n.id] ?? n.position,
				})),
			);

            // Ensure the graph is visible (especially on small screens)
            requestAnimationFrame(() => {
                reactFlowInstance?.fitView({ padding: isNarrowScreen ? 0.2 : 0.6 });
            });
		}
		layout();
    }, [nodes.length, edges.length, isNarrowScreen, reactFlowInstance, setNodes]);

	const isDark = resolvedTheme === "dark";

    useEffect(() => {
        if (!mounted) return;

        const nodeBg = isDark ? "#18181b" : "#ffffff";
        const nodeFg = isDark ? "#f4f4f5" : "#0f172a";
        const nodeBorder = isDark ? "2px solid #60a5fa" : "2px solid #3b82f6";
        const edgeStroke = isDark ? "#a1a1aa" : "#3b82f6";

        setNodes((nds) =>
            nds.map((n) => ({
                ...n,
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top,
                type: n.id !== START_NODE_ID && n.data.condition.type !== "none" ? "conditional" : undefined,
                data: {
                    ...n.data,
                    label: computeNodeLabel(n.data.kind, n.data.config),
                },
                style: {
                    ...(n.style ?? {}),
                    background: nodeBg,
                    color: nodeFg,
                    border: nodeBorder,
                    borderRadius: "8px",
                    padding: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    width: 220,
                    height: n.id !== START_NODE_ID && n.data.condition.type !== "none" ? 110 : undefined,
                    // Used by the custom conditional node renderer.
                    ["--wf-node-bg" as never]: nodeBg,
                    ["--wf-node-fg" as never]: nodeFg,
                    ["--wf-node-border" as never]: nodeBorder,
                },
            })),
        );

        setEdges((eds) =>
            eds.map((e) => ({
                ...e,
                style: {
                    ...(e.style ?? {}),
                    stroke: edgeStroke,
                },
            })),
        );
        // Also re-apply styles when nodes are added/removed so new nodes don't keep default styling.
    }, [isDark, mounted, nodes.length, setEdges, setNodes]);

    useEffect(() => {
        if (!onGraphChange) return;
        onGraphChange(graphFromState(nodes, edges));
    }, [edges, nodes, onGraphChange]);

    if (!mounted) return null;

    const activeNode = activeNodeId ? (nodes.find((n) => n.id === activeNodeId) as Node<WorkflowNodeData> | undefined) : undefined;
    const activeLabel = activeNode ? String(activeNode.data.label ?? activeNode.id) : "";

    function createNodeId() {
        // Avoid crypto.randomUUID() for maximum compatibility.
        return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function addWorkflowEdge(source: string, target: string, sourceHandle?: string) {
        if (!source || !target) return;
        setEdges((eds) => {
            if (eds.some((e) => e.source === source && e.target === target && e.sourceHandle === sourceHandle)) return eds;
            const id = `e${source}-${target}-${Date.now().toString(36)}`;
            return addEdge({ id, source, target, sourceHandle, animated: true }, eds);
        });
    }

    function getClientPoint(evt: MouseEvent | TouchEvent) {
        const touch = "changedTouches" in evt ? evt.changedTouches?.[0] : undefined;
        return {
            x: touch ? touch.clientX : (evt as MouseEvent).clientX,
            y: touch ? touch.clientY : (evt as MouseEvent).clientY,
        };
    }

    function addNode() {
        const id = createNodeId();
        const newNode: Node<WorkflowNodeData> = {
            id,
            data: {
                label: "Send email",
                kind: "gmailSend",
                condition: { type: "none" },
                config: { to: "", subject: "", bodyText: "" },
            },
            position: { x: 0, y: 0 },
        };

        setNodes((nds) => [...nds, newNode]);

        const parentId = activeNodeId ?? START_NODE_ID;
        addWorkflowEdge(parentId, id);
        setActiveNodeId(id);
    }

    function setNodeData(nodeId: string, patch: Partial<WorkflowNodeData>) {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id !== nodeId) return n;
                const data = { ...(n.data as WorkflowNodeData), ...patch };
                return {
                    ...n,
                    data: {
                        ...data,
                        label: computeNodeLabel(data.kind, data.config),
                    },
                };
            }),
        );
    }

    function removeNode(nodeId: string) {
        if (nodeId === START_NODE_ID) return;
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setActiveNodeId(null);
    }

    function moveNode(nodeId: string, direction: "up" | "down") {
        if (nodeId === START_NODE_ID) return;
        setNodes((nds) => {
            const start = nds.find((n) => n.id === START_NODE_ID);
            const others = nds.filter((n) => n.id !== START_NODE_ID);
            const index = others.findIndex((n) => n.id === nodeId);
            if (index === -1) return nds;
            const swapWith = direction === "up" ? index - 1 : index + 1;
            if (swapWith < 0 || swapWith >= others.length) return nds;
            const nextOthers = [...others];
            [nextOthers[index], nextOthers[swapWith]] = [nextOthers[swapWith], nextOthers[index]];
            const nextNodes = start ? [start, ...nextOthers] : nextOthers;
            return nextNodes;
        });
    }

    function getNodeSize(n: Node<WorkflowNodeData>) {
        const width = (n.measured?.width as number) || (typeof n.style?.width === "number" ? (n.style.width as number) : 220);
        const height =
            (n.measured?.height as number) || (typeof n.style?.height === "number" ? (n.style.height as number) : n.data.condition.type !== "none" ? 110 : 44);
        return { width, height };
    }

    function nodeCenter(n: Node<WorkflowNodeData>) {
        const { width, height } = getNodeSize(n);
        return { x: n.position.x + width / 2, y: n.position.y + height / 2, width, height };
    }

    return (
        <div className="relative h-full w-full bg-white dark:bg-zinc-950">
            <ReactFlow<Node<WorkflowNodeData>, Edge>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={{ if: IfDiamondNode }}
                onConnect={(connection: Connection) => {
                    if (!connection.source || !connection.target) return;
                    addWorkflowEdge(connection.source, connection.target);
                }}
                onConnectStart={(_, params) => {
                    const nodeId = (params as { nodeId?: string | null }).nodeId;
                    if (typeof nodeId === "string" && nodeId) setConnectFromNodeId(nodeId);
                }}
                onConnectEnd={(event) => {
                    if (!connectFromNodeId) return;
                    const target = event.target as HTMLElement | null;
                    const droppedOnPane = !!target?.closest?.(".react-flow__pane");
                    if (!droppedOnPane) {
                        setConnectFromNodeId(null);
                        return;
                    }

                    const client = getClientPoint(event as unknown as MouseEvent | TouchEvent);
                    const position = reactFlowInstance?.screenToFlowPosition(client) ?? { x: 0, y: 0 };
                    const id = createNodeId();
                    const newNode: Node<WorkflowNodeData> = {
                        id,
                        data: {
                            label: "Send email",
                            kind: "gmailSend",
                            condition: { type: "none" },
                            config: { to: "", subject: "", bodyText: "" },
                        },
                        position,
                    };

                    setNodes((nds) => [...nds, newNode]);
                    addWorkflowEdge(connectFromNodeId, id);
                    setActiveNodeId(id);
                    setConnectFromNodeId(null);
                }}
                nodesDraggable={true}
                fitView
                className="bg-white dark:bg-zinc-950"
                onInit={setReactFlowInstance}
                onPaneClick={() => setActiveNodeId(null)}
                onNodeClick={(_, node) => setActiveNodeId(node.id)}
                onNodeDragStart={(_, node) => setActiveNodeId(node.id)}
                onNodeDragStop={(_, node) => {
                    // Snap conditional (triangle) nodes onto the nearest edge midpoint.
                    const current = nodes.find((n) => n.id === node.id);
                    if (!current) return;
                    if (current.id === START_NODE_ID) return;
                    if (current.data.condition.type === "none") return;

                    const dragged = nodeCenter(current);
                    let best: { edge: Edge; mid: { x: number; y: number }; dist: number } | null = null;

                    for (const e of edges) {
                        if (e.source === current.id || e.target === current.id) continue;
                        const src = nodes.find((n) => n.id === e.source);
                        const tgt = nodes.find((n) => n.id === e.target);
                        if (!src || !tgt) continue;

                        const c1 = nodeCenter(src);
                        const c2 = nodeCenter(tgt);
                        const mid = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
                        const dx = dragged.x - mid.x;
                        const dy = dragged.y - mid.y;
                        const dist = Math.hypot(dx, dy);
                        if (!best || dist < best.dist) best = { edge: e, mid, dist };
                    }

                    if (!best) return;
                    const SNAP_DISTANCE = 90;
                    if (best.dist > SNAP_DISTANCE) return;

                    setEdges((eds) => {
                        const withoutCurrent = eds.filter((e) => e.source !== current.id && e.target !== current.id);
                        const withoutTargetEdge = withoutCurrent.filter((e) => e.id !== best!.edge.id);

                        const src = best!.edge.source;
                        const tgt = best!.edge.target;
                        const e1: Edge = { id: `e${src}-${current.id}-${Date.now().toString(36)}`, source: src, target: current.id, animated: true };
                        const e2: Edge = { id: `e${current.id}-${tgt}-${Date.now().toString(36)}b`, source: current.id, target: tgt, animated: true };
                        return [...withoutTargetEdge, e1, e2];
                    });

                    setNodes((nds) =>
                        nds.map((n) => {
                            if (n.id !== current.id) return n;
                            const { width, height } = getNodeSize(n);
                            return {
                                ...n,
                                position: { x: best!.mid.x - width / 2, y: best!.mid.y - height / 2 },
                            };
                        }),
                    );
                }}
                fitViewOptions={{ padding: isNarrowScreen ? 0.2 : 0.6 }}
                minZoom={0.1}
                maxZoom={1}
            >
                <Controls className="bg-white/95 border border-zinc-200 shadow-sm dark:bg-zinc-900/90 dark:border-zinc-700" />
                <Background gap={16} color={isDark ? "#ffffff" : "#a1a1aa"} />
            </ReactFlow>

            <button
                type="button"
                onClick={addNode}
                className="absolute bottom-4 right-4 z-30 rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
                Add node
            </button>

            {activeNode ? (
                <aside className="absolute right-4 top-4 z-20 w-96 max-w-[calc(100%-2rem)] rounded-lg border border-zinc-200 bg-white/95 p-4 text-sm text-zinc-900 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/85 dark:text-zinc-100">
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

                    {activeNode.id === START_NODE_ID ? (
                        <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">Start node. Add nodes to build your workflow.</div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            <label className="block">
                                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Action</div>
                                <select
                                    value={activeNode.data.kind}
                                    onChange={(e) => {
                                        const nextKind = e.target.value as WorkflowNodeActionKind;
                                        const nextConfig =
                                            nextKind === "gmailEnsureLabel"
                                                ? { name: "" }
                                                : nextKind === "gmailSummarizeEmails"
                                                  ? { maxEmails: 10 }
                                                  : { to: "", subject: "", bodyText: "" };
                                        setNodeData(activeNode.id, { kind: nextKind, config: nextConfig });
                                    }}
                                    className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                >
                                    <option value="gmailSend">Gmail: Send email</option>
                                    <option value="gmailEnsureLabel">Gmail: Ensure label</option>
                                    <option value="gmailSummarizeEmails">Gmail: Summarize emails</option>
                                </select>
                            </label>

                            <label className="block">
                                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Condition</div>
                                <select
                                    value={activeNode.data.condition.type}
                                    onChange={(e) => {
                                        const t = e.target.value as WorkflowCondition["type"];
                                        if (t === "none") return setNodeData(activeNode.id, { condition: { type: "none" } });
                                        if (t === "emailHasAttachment") return setNodeData(activeNode.id, { condition: { type: "emailHasAttachment" } });
                                        if (t === "timeBetween") {
                                            return setNodeData(activeNode.id, {
                                                condition: {
                                                    type: "timeBetween",
                                                    start: "09:00",
                                                    end: "17:00",
                                                    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
                                                },
                                            });
                                        }
                                        return setNodeData(activeNode.id, { condition: { type: "emailContains", value: "" } });
                                    }}
                                    className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                >
                                    <option value="none">None</option>
                                    <option value="emailContains">Email contains…</option>
                                    <option value="emailHasAttachment">Email has attachment</option>
                                    <option value="timeBetween">Time between…</option>
                                </select>

                                {activeNode.data.condition.type === "emailContains" ? (
                                    <input
                                        value={activeNode.data.condition.value}
                                        onChange={(e) =>
                                            setNodeData(activeNode.id, { condition: { type: "emailContains", value: e.target.value } })
                                        }
                                        placeholder='e.g. "greg"'
                                        className="mt-2 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                    />
                                ) : activeNode.data.condition.type === "timeBetween" ? (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <input
                                            type="time"
                                            value={activeNode.data.condition.start}
                                            onChange={(e) => {
                                                const prev = activeNode.data.condition;
                                                if (prev.type !== "timeBetween") return;
                                                setNodeData(activeNode.id, {
                                                    condition: { ...prev, start: e.target.value },
                                                });
                                            }}
                                            className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                        />
                                        <input
                                            type="time"
                                            value={activeNode.data.condition.end}
                                            onChange={(e) => {
                                                const prev = activeNode.data.condition;
                                                if (prev.type !== "timeBetween") return;
                                                setNodeData(activeNode.id, {
                                                    condition: { ...prev, end: e.target.value },
                                                });
                                            }}
                                            className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                        />
                                    </div>
                                ) : null}
                            </label>

                            {activeNode.data.kind === "gmailEnsureLabel" ? (
                                <label className="block">
                                    <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Label name</div>
                                    <input
                                        value={typeof activeNode.data.config.name === "string" ? activeNode.data.config.name : ""}
                                        onChange={(e) => setNodeData(activeNode.id, { config: { ...activeNode.data.config, name: e.target.value } })}
                                        placeholder="Important"
                                        className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                    />
                                </label>
                            ) : activeNode.data.kind === "gmailSummarizeEmails" ? (
                                <label className="block">
                                    <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Max emails</div>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={typeof activeNode.data.config.maxEmails === "number" ? activeNode.data.config.maxEmails : 10}
                                        onChange={(e) =>
                                            setNodeData(activeNode.id, {
                                                config: {
                                                    ...activeNode.data.config,
                                                    maxEmails: Math.min(Math.max(Number(e.target.value) || 1, 1), 50),
                                                },
                                            })
                                        }
                                        className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                    />
                                </label>
                            ) : (
                                <label className="block">
                                    <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Send email</div>
                                    <input
                                        value={typeof activeNode.data.config.to === "string" ? activeNode.data.config.to : ""}
                                        onChange={(e) => setNodeData(activeNode.id, { config: { ...activeNode.data.config, to: e.target.value } })}
                                        placeholder="to@example.com"
                                        className="mt-1 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                    />
                                    <input
                                        value={typeof activeNode.data.config.subject === "string" ? activeNode.data.config.subject : ""}
                                        onChange={(e) => setNodeData(activeNode.id, { config: { ...activeNode.data.config, subject: e.target.value } })}
                                        placeholder="Subject"
                                        className="mt-2 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                    />
                                    <textarea
                                        value={typeof activeNode.data.config.bodyText === "string" ? activeNode.data.config.bodyText : ""}
                                        onChange={(e) => setNodeData(activeNode.id, { config: { ...activeNode.data.config, bodyText: e.target.value } })}
                                        placeholder="Body"
                                        className="mt-2 min-h-24 w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-700"
                                    />
                                </label>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => moveNode(activeNode.id, "up")}
                                    className="w-full rounded border border-zinc-200 bg-white px-4 py-2 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                                >
                                    Move up
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveNode(activeNode.id, "down")}
                                    className="w-full rounded border border-zinc-200 bg-white px-4 py-2 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                                >
                                    Move down
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeNode(activeNode.id)}
                                className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                Delete node
                            </button>
                        </div>
                    )}
                </aside>
            ) : null}
        </div>
    );
}
