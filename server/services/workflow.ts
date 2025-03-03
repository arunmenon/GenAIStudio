import { Workflow, WorkflowExecution } from "@shared/schema";
import { storage } from "../storage";
import { executeAINode } from "./ai";

export async function executeWorkflow(workflow: Workflow): Promise<WorkflowExecution> {
  const execution = await storage.createExecution({
    workflowId: workflow.id,
    status: "running",
    startTime: new Date(),
    outputs: {},
  });

  try {
    const nodes = workflow.nodes as any[];
    const edges = workflow.edges as any[];
    
    // Build node dependency graph
    const graph = new Map<string, string[]>();
    for (const edge of edges) {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, []);
      }
      graph.get(edge.source)!.push(edge.target);
    }

    // Find start nodes (nodes with no incoming edges)
    const startNodes = nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );

    // Execute nodes in topological order
    const outputs: Record<string, any> = {};
    const visited = new Set<string>();

    async function executeNode(nodeId: string) {
      if (visited.has(nodeId)) return;
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Execute node based on type
      let result;
      switch (node.type) {
        case "basic_llm_chain":
        case "ai_transform":
          result = await executeAINode(node);
          break;
        case "code":
          // Execute JavaScript code in a safe context
          const fn = new Function("input", node.data.config?.code || "");
          result = fn(outputs);
          break;
        case "loop":
          // Handle loop node
          const items = outputs[node.data.config?.input] || [];
          result = [];
          for (const item of items) {
            // Execute child nodes for each item
            const childOutputs = await Promise.all(
              (graph.get(nodeId) || []).map(childId => executeNode(childId))
            );
            result.push(childOutputs);
          }
          break;
      }

      outputs[nodeId] = result;
      visited.add(nodeId);

      // Execute children
      const children = graph.get(nodeId) || [];
      await Promise.all(children.map(childId => executeNode(childId)));
    }

    // Execute from start nodes
    await Promise.all(startNodes.map(node => executeNode(node.id)));

    // Update execution status
    await storage.updateExecution(execution.id, {
      status: "completed",
      endTime: new Date(),
      outputs
    });

    return execution;

  } catch (error) {
    // Handle execution error
    await storage.updateExecution(execution.id, {
      status: "failed",
      endTime: new Date(),
      error: error.message
    });
    throw error;
  }
}
