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

  if (graph.nodes.length === 0) {
    errors.push("Add at least one node to the cascade.");
    return { valid: false, errors };
  }

  if (graph.edges.length === 0) {
    errors.push("Add at least one edge to connect nodes.");
    return { valid: false, errors };
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge source "${edge.from}" does not exist.`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge target "${edge.to}" does not exist.`);
    }
  }

  const hasCycle = detectCycle(graph);
  if (hasCycle) {
    errors.push("Graph contains a cycle. Cascades must be acyclic (DAG).");
  }

  const rootNodes = findRoots(graph);
  if (rootNodes.length === 0) {
    errors.push("No root node found. At least one node must have no incoming edges.");
  }
  if (rootNodes.length > 1) {
    errors.push("Multiple root nodes. A cascade must have a single entry point.");
  }

  for (const node of graph.nodes) {
    const hasChildren = graph.edges.some((e) => e.from === node.id);
    if (node.type === "split" && !hasChildren && (!node.splitAddress || !node.splitAddress.trim())) {
      errors.push(`Split node "${node.label}" has no children and no recipient address.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function detectCycle(graph: CascadeGraph): boolean {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const edge of graph.edges) {
    adj.get(edge.from)?.push(edge.to);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) {
      if (dfs(id)) return true;
    }
  }
  return false;
}

export function findRoots(graph: CascadeGraph): string[] {
  const hasIncoming = new Set<string>();
  for (const edge of graph.edges) {
    hasIncoming.add(edge.to);
  }
  return graph.nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
}

export function topologicalSort(graph: CascadeGraph): string[] {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    adj.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adj.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return sorted;
}

export function getChildren(nodeId: string, graph: CascadeGraph): string[] {
  return graph.edges.filter((e) => e.from === nodeId).map((e) => e.to);
}

export function getNodeById(id: string, graph: CascadeGraph): CascadeNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export const TEMPLATES: { name: string; description: string; graph: CascadeGraph }[] = [
  {
    name: "Startup Payroll",
    description: "Revenue → Treasury lock + Tax reserve + Team payroll via Split→Hold chain",
    graph: {
      nodes: [
        { id: "root", type: "split", label: "Revenue", x: 400, y: 40, splitAddress: "", splitAmount: "0" },
        { id: "treasury", type: "lock", label: "Treasury 40%", x: 100, y: 200, lockAmount: "40", lockUntilDelta: 43200 },
        { id: "tax", type: "lock", label: "Tax Reserve 10%", x: 400, y: 200, lockAmount: "10", lockUntilDelta: 21600 },
        { id: "payroll", type: "split", label: "Payroll 50%", x: 700, y: 200, splitAmount: "0", splitAddress: "" },
        { id: "eng", type: "hold", label: "Engineer", x: 550, y: 380 },
        { id: "design", type: "hold", label: "Designer", x: 700, y: 380 },
        { id: "pm", type: "hold", label: "PM", x: 850, y: 380 },
      ],
      edges: [
        { from: "root", to: "treasury" },
        { from: "root", to: "tax" },
        { from: "root", to: "payroll" },
        { from: "payroll", to: "eng" },
        { from: "payroll", to: "design" },
        { from: "payroll", to: "pm" },
      ],
    },
  },
  {
    name: "Creator Economy",
    description: "Revenue → Creator payout + Editor + Community pool + Emergency reserve",
    graph: {
      nodes: [
        { id: "root", type: "split", label: "Revenue", x: 400, y: 40, splitAddress: "", splitAmount: "0" },
        { id: "creator", type: "split", label: "Creator 70%", x: 100, y: 200, splitAmount: "70", splitAddress: "" },
        { id: "editor", type: "hold", label: "Editor 15%", x: 400, y: 200 },
        { id: "community", type: "hold", label: "Community 10%", x: 700, y: 200 },
        { id: "reserve", type: "lock", label: "Reserve 5%", x: 200, y: 380, lockAmount: "5", lockUntilDelta: 1440 },
        { id: "sub1", type: "hold", label: "Music", x: 500, y: 380 },
        { id: "sub2", type: "hold", label: "Art", x: 800, y: 380 },
      ],
      edges: [
        { from: "root", to: "creator" },
        { from: "root", to: "editor" },
        { from: "root", to: "community" },
        { from: "root", to: "reserve" },
        { from: "creator", to: "sub1" },
        { from: "creator", to: "sub2" },
      ],
    },
  },
  {
    name: "AI Treasury",
    description: "Revenue → Agent ops + Compute budget + Safety reserve + Profit vault",
    graph: {
      nodes: [
        { id: "root", type: "split", label: "Revenue", x: 400, y: 40, splitAddress: "", splitAmount: "0" },
        { id: "ops", type: "split", label: "Agent Ops", x: 150, y: 200, splitAmount: "40", splitAddress: "" },
        { id: "compute", type: "lock", label: "Compute Budget", x: 650, y: 200, lockAmount: "35", lockUntilDelta: 1008 },
        { id: "safety", type: "lock", label: "Safety Reserve", x: 80, y: 380, lockAmount: "15", lockUntilDelta: 43200 },
        { id: "profit", type: "hold", label: "Profit Vault", x: 300, y: 380 },
        { id: "infra", type: "hold", label: "Infrastructure", x: 650, y: 380 },
      ],
      edges: [
        { from: "root", to: "ops" },
        { from: "root", to: "compute" },
        { from: "root", to: "safety" },
        { from: "ops", to: "profit" },
        { from: "ops", to: "infra" },
      ],
    },
  },
  {
    name: "Milestone Escrow",
    description: "Client deposit → phased milestone unlocks → subcontractor cascades",
    graph: {
      nodes: [
        { id: "root", type: "lock", label: "Client Deposit", x: 400, y: 40, lockAmount: "100", lockUntilDelta: 432 },
        { id: "m1", type: "split", label: "Milestone 1", x: 200, y: 200, splitAmount: "40", splitAddress: "" },
        { id: "m2", type: "split", label: "Milestone 2", x: 600, y: 200, splitAmount: "35", splitAddress: "" },
        { id: "m3", type: "hold", label: "Final Payout", x: 400, y: 380 },
      ],
      edges: [
        { from: "root", to: "m1" },
        { from: "root", to: "m2" },
        { from: "m1", to: "m3" },
        { from: "m2", to: "m3" },
      ],
    },
  },
  {
    name: "Payroll Cascade",
    description: "Deposit → Lock runway + Split salaries → Developer payouts",
    graph: {
      nodes: [
        { id: "root", type: "split", label: "Company Deposit", x: 400, y: 40, splitAddress: "", splitAmount: "0" },
        { id: "runway", type: "lock", label: "90-Day Runway", x: 200, y: 200, lockAmount: "60", lockUntilDelta: 12960 },
        { id: "salaries", type: "split", label: "Salary Pool", x: 600, y: 200, splitAddress: "", splitAmount: "0" },
        { id: "dev1", type: "hold", label: "Dev Lead", x: 450, y: 380 },
        { id: "dev2", type: "hold", label: "Frontend Dev", x: 750, y: 380 },
      ],
      edges: [
        { from: "root", to: "runway" },
        { from: "root", to: "salaries" },
        { from: "salaries", to: "dev1" },
        { from: "salaries", to: "dev2" },
      ],
    },
  },
  {
    name: "Treasury DAO",
    description: "Deposit → Reserve lock + Operations split → Emergency fund",
    graph: {
      nodes: [
        { id: "root", type: "split", label: "DAO Treasury", x: 400, y: 40, splitAddress: "", splitAmount: "0" },
        { id: "reserve", type: "lock", label: "Core Reserve", x: 150, y: 200, lockAmount: "50", lockUntilDelta: 43200 },
        { id: "ops", type: "split", label: "Operations", x: 650, y: 200, splitAddress: "", splitAmount: "0" },
        { id: "contrib", type: "hold", label: "Contributors", x: 500, y: 380 },
        { id: "emergency", type: "hold", label: "Emergency Fund", x: 800, y: 380 },
      ],
      edges: [
        { from: "root", to: "reserve" },
        { from: "root", to: "ops" },
        { from: "ops", to: "contrib" },
        { from: "ops", to: "emergency" },
      ],
    },
  },
];

export function generateNodeId(): string {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
