import { describe, expect, it } from "vitest";
import {
  type CascadeGraph,
  type CascadeNode,
  TEMPLATES,
  validateGraph,
  topologicalSort,
  getChildren,
  getNodeById,
  generateNodeId,
} from "@/lib/graph-engine";
import {
  calculateNodeAllocation,
  getNextDepositAmount,
} from "@/lib/cascade-flow";

function makeNode(overrides: Partial<CascadeNode> & { id: string }): CascadeNode {
  return {
    type: "hold",
    label: "test",
    x: 0,
    y: 0,
    lockAmount: "0",
    splitAmount: "0",
    lockUntilDelta: 144,
    splitAddress: "",
    ...overrides,
  };
}

describe("graph-engine", () => {
  describe("validateGraph", () => {
    it("rejects a graph with no nodes", () => {
      const graph: CascadeGraph = { nodes: [], edges: [] };
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Add at least one node to the cascade.");
    });

    it("rejects a graph with a cycle", () => {
      const graph: CascadeGraph = {
        nodes: [
          makeNode({ id: "a", x: 0, y: 0 }),
          makeNode({ id: "b", x: 100, y: 100 }),
        ],
        edges: [
          { from: "a", to: "b" },
          { from: "b", to: "a" },
        ],
      };
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes("cycle"))).toBe(true);
    });

    it("rejects a graph with multiple roots", () => {
      const graph: CascadeGraph = {
        nodes: [
          makeNode({ id: "a", x: 0, y: 0 }),
          makeNode({ id: "b", x: 100, y: 0 }),
          makeNode({ id: "c", x: 50, y: 100 }),
        ],
        edges: [
          { from: "a", to: "c" },
          { from: "b", to: "c" },
        ],
      };
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
    });

    it("accepts a valid DAG", () => {
      const graph: CascadeGraph = {
        nodes: [
          makeNode({ id: "root", type: "lock", x: 200, y: 50, lockAmount: "50" }),
          makeNode({ id: "leaf", type: "hold", x: 200, y: 200 }),
        ],
        edges: [
          { from: "root", to: "leaf" },
        ],
      };
      const result = validateGraph(graph);
      expect(result.valid).toBe(true);
    });
  });

  describe("topologicalSort", () => {
    it("returns nodes in topological order", () => {
      const graph: CascadeGraph = {
        nodes: [
          makeNode({ id: "root", x: 200, y: 50 }),
          makeNode({ id: "mid", x: 200, y: 200 }),
          makeNode({ id: "leaf", x: 200, y: 350 }),
        ],
        edges: [
          { from: "root", to: "mid" },
          { from: "mid", to: "leaf" },
        ],
      };
      const sorted = topologicalSort(graph);
      expect(sorted).toEqual(["root", "mid", "leaf"]);
    });

    it("returns all node ids", () => {
      const graph = TEMPLATES[0].graph;
      const sorted = topologicalSort(graph);
      expect(sorted.length).toBe(graph.nodes.length);
    });
  });

  describe("getChildren", () => {
    it("returns child ids", () => {
      const graph: CascadeGraph = {
        nodes: [
          makeNode({ id: "a", x: 0, y: 0 }),
          makeNode({ id: "b", x: 0, y: 100 }),
          makeNode({ id: "c", x: 100, y: 100 }),
        ],
        edges: [
          { from: "a", to: "b" },
          { from: "a", to: "c" },
        ],
      };
      expect(getChildren("a", graph)).toEqual(["b", "c"]);
      expect(getChildren("b", graph)).toEqual([]);
    });
  });

  describe("TEMPLATES", () => {
    it("all templates are valid DAGs", () => {
      for (const template of TEMPLATES) {
        const result = validateGraph(template.graph);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("generateNodeId", () => {
    it("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateNodeId());
      }
      expect(ids.size).toBe(100);
    });
  });
});

describe("cascade-flow", () => {
  describe("calculateNodeAllocation", () => {
    it("calculates lock allocation for a lock node", () => {
      const node = makeNode({ id: "n1", type: "lock", lockAmount: "60" });
      const graph: CascadeGraph = { nodes: [node], edges: [] };
      const alloc = calculateNodeAllocation(node, 1000n, graph);
      expect(alloc.lockAmount).toBe(600n);
      expect(alloc.splitAmount).toBe(0n);
    });

    it("calculates split allocation for a split node", () => {
      const node = makeNode({ id: "n1", type: "split", splitAmount: "30", splitAddress: "ST123" });
      const graph: CascadeGraph = { nodes: [node], edges: [] };
      const alloc = calculateNodeAllocation(node, 1000n, graph);
      expect(alloc.splitAmount).toBe(300n);
      expect(alloc.splitAddress).toBe("ST123");
    });

    it("calculates hold amount as remainder", () => {
      const node = makeNode({ id: "n1", type: "lock", lockAmount: "40" });
      const graph: CascadeGraph = { nodes: [node], edges: [] };
      const alloc = calculateNodeAllocation(node, 1000n, graph);
      expect(alloc.holdAmount).toBe(600n);
    });

    it("does not internally cap percentages (caller must validate)", () => {
      const node = makeNode({ id: "n1", type: "lock", lockAmount: "200" });
      const graph: CascadeGraph = { nodes: [node], edges: [] };
      const alloc = calculateNodeAllocation(node, 1000n, graph);
      expect(alloc.lockAmount).toBe(2000n);
    });
  });

  describe("getNextDepositAmount", () => {
    it("returns 0 for node with no children", () => {
      const node = makeNode({ id: "n1", type: "hold" });
      const graph: CascadeGraph = { nodes: [node], edges: [] };
      expect(getNextDepositAmount(node, 1000n, [], graph)).toBe(0n);
    });

    it("splits equally for hold node with children", () => {
      const node = makeNode({ id: "n1", type: "hold" });
      const children = [
        makeNode({ id: "c1" }),
        makeNode({ id: "c2" }),
      ];
      const graph: CascadeGraph = {
        nodes: [node, ...children],
        edges: [{ from: "n1", to: "c1" }, { from: "n1", to: "c2" }],
      };
      expect(getNextDepositAmount(node, 1000n, children, graph)).toBe(500n);
    });

    it("returns holdAmount for lock node with children", () => {
      const node = makeNode({ id: "n1", type: "lock", lockAmount: "40" });
      const children = [makeNode({ id: "c1" })];
      const graph: CascadeGraph = {
        nodes: [node, ...children],
        edges: [{ from: "n1", to: "c1" }],
      };
      const result = getNextDepositAmount(node, 1000n, children, graph);
      expect(result).toBe(600n);
    });
  });
});

// ── Note ──
// Contract-level tests (cascade-registry.clar) require the Clarinet runtime.
// Run `clarinet test --coverage` for smart contract testing.
// This file covers the TypeScript-side graph engine and cascade flow logic.
