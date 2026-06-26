export type NodeType = "lock" | "split" | "hold";

export interface CascadeNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  lockAmount?: string;
  lockUntilDelta?: number;
  splitAddress?: string;
  splitAmount?: string;
}

export interface CascadeEdge {
  from: string;
  to: string;
}

export interface CascadeGraph {
  nodes: CascadeNode[];
  edges: CascadeEdge[];
}

export function validateGraph(graph: CascadeGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  if (graph.nodes.length === 0) { errors.push("Add at least one node."); return { valid: false, errors }; }
  if (graph.edges.length === 0) { errors.push("Add at least one edge."); return { valid: false, errors }; }
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) errors.push(`Edge source "${edge.from}" does not exist.`);
    if (!nodeIds.has(edge.to)) errors.push(`Edge target "${edge.to}" does not exist.`);
  }
  const hasCycle = detectCycle(graph);
  if (hasCycle) errors.push("Graph contains a cycle. Cascades must be acyclic (DAG).");
  const rootNodes = findRoots(graph);
  if (rootNodes.length === 0) errors.push("No root node found.");
  if (rootNodes.length > 1) errors.push("Multiple root nodes. Cascade needs a single entry point.");
  return { valid: errors.length === 0, errors };
}

function detectCycle(graph: CascadeGraph): boolean {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const edge of graph.edges) adj.get(edge.from)?.push(edge.to);
  const visited = new Set<string>();
  const recStack = new Set<string>();
  function dfs(node: string): boolean {
    visited.add(node); recStack.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) { if (dfs(neighbor)) return true; }
      else if (recStack.has(neighbor)) return true;
    }
    recStack.delete(node); return false;
  }
  for (const id of nodeIds) { if (!visited.has(id)) { if (dfs(id)) return true; } }
  return false;
}

export function findRoots(graph: CascadeGraph): string[] {
  const hasIncoming = new Set<string>();
  for (const edge of graph.edges) hasIncoming.add(edge.to);
  return graph.nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
}

export function topologicalSort(graph: CascadeGraph): string[] {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) { adj.set(node.id, []); inDegree.set(node.id, 0); }
  for (const edge of graph.edges) { adj.get(edge.from)?.push(edge.to); inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1); }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) { if (deg === 0) queue.push(id); }
  const sorted: string[] = [];
  while (queue.length > 0) { const current = queue.shift()!; sorted.push(current); for (const neighbor of adj.get(current) ?? []) { const newDeg = (inDegree.get(neighbor) ?? 1) - 1; inDegree.set(neighbor, newDeg); if (newDeg === 0) queue.push(neighbor); } }
  return sorted;
}

export function generateNodeId(): string {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const TEMPLATES: { name: string; description: string; graph: CascadeGraph }[] = [
  { name: "Startup Payroll", description: "Revenue → Treasury lock + Tax reserve + Team payroll", graph: { nodes: [
    { id: "root", type: "split", label: "Revenue", x: 400, y: 40, splitAddress: "", splitAmount: "0" },
    { id: "treasury", type: "lock", label: "Treasury 40%", x: 100, y: 200, lockAmount: "40", lockUntilDelta: 43200 },
    { id: "tax", type: "lock", label: "Tax Reserve 10%", x: 400, y: 200, lockAmount: "10", lockUntilDelta: 21600 },
    { id: "payroll", type: "split", label: "Payroll 50%", x: 700, y: 200, splitAmount: "0", splitAddress: "" },
    { id: "eng", type: "hold", label: "Engineer", x: 550, y: 380 },
    { id: "design", type: "hold", label: "Designer", x: 700, y: 380 },
    { id: "pm", type: "hold", label: "PM", x: 850, y: 380 },
  ], edges: [
    { from: "root", to: "treasury" }, { from: "root", to: "tax" }, { from: "root", to: "payroll" },
    { from: "payroll", to: "eng" }, { from: "payroll", to: "design" }, { from: "payroll", to: "pm" },
  ] } },
  { name: "AI Treasury", description: "Revenue → Agent ops + Compute + Safety + Profit vault", graph: { nodes: [
    { id: "root", type: "split", label: "Revenue", x: 400, y: 40, splitAddress: "", splitAmount: "0" },
    { id: "ops", type: "split", label: "Agent Ops", x: 150, y: 200, splitAmount: "40", splitAddress: "" },
    { id: "compute", type: "lock", label: "Compute Budget", x: 650, y: 200, lockAmount: "35", lockUntilDelta: 1008 },
    { id: "safety", type: "lock", label: "Safety Reserve", x: 80, y: 380, lockAmount: "15", lockUntilDelta: 43200 },
    { id: "profit", type: "hold", label: "Profit Vault", x: 300, y: 380 },
    { id: "infra", type: "hold", label: "Infrastructure", x: 650, y: 380 },
  ], edges: [
    { from: "root", to: "ops" }, { from: "root", to: "compute" }, { from: "root", to: "safety" },
    { from: "ops", to: "profit" }, { from: "ops", to: "infra" },
  ] } },
  { name: "Milestone Escrow", description: "Client deposit → phased milestone unlocks → subcontractor cascades", graph: { nodes: [
    { id: "root", type: "lock", label: "Client Deposit", x: 400, y: 40, lockAmount: "100", lockUntilDelta: 432 },
    { id: "m1", type: "split", label: "Milestone 1", x: 200, y: 200, splitAmount: "40", splitAddress: "" },
    { id: "m2", type: "split", label: "Milestone 2", x: 600, y: 200, splitAmount: "35", splitAddress: "" },
    { id: "m3", type: "hold", label: "Final Payout", x: 400, y: 380 },
  ], edges: [
    { from: "root", to: "m1" }, { from: "root", to: "m2" },
    { from: "m1", to: "m3" }, { from: "m2", to: "m3" },
  ] } },
  { name: "Vesting Schedule", description: "Token allocation → Cliff lock → Quarterly unlocks → Team wallets", graph: { nodes: [
    { id: "root", type: "lock", label: "Token Pool", x: 400, y: 40, lockAmount: "100", lockUntilDelta: 21600 },
    { id: "cliff", type: "lock", label: "1-Year Cliff", x: 400, y: 200, lockAmount: "25", lockUntilDelta: 210240 },
    { id: "vested", type: "split", label: "Quarterly Unlock", x: 400, y: 360, splitAmount: "0", splitAddress: "" },
    { id: "founder", type: "hold", label: "Founder", x: 200, y: 520 },
    { id: "team_a", type: "hold", label: "Core Team A", x: 400, y: 520 },
    { id: "team_b", type: "hold", label: "Core Team B", x: 600, y: 520 },
  ], edges: [
    { from: "root", to: "cliff" }, { from: "cliff", to: "vested" },
    { from: "vested", to: "founder" }, { from: "vested", to: "team_a" }, { from: "vested", to: "team_b" },
  ] } },
];
