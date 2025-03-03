import { Workflow, WorkflowExecution, StepExecution } from "@shared/schema";
import { storage } from "../storage";
import { executeAINode } from "./ai";

// Interface for tracking node execution context
interface ExecutionContext {
  workflowExecution: WorkflowExecution;
  outputs: Record<string, any>;
  visited: Set<string>;
  currentPath: string[];
  stepExecutions: Record<string, StepExecution>;
}

// Define trigger data interface
interface TriggerData {
  type: "manual" | "schedule" | "webhook" | "app_event" | "workflow";
  payload?: any;
  headers?: any;
  params?: any;
  query?: any;
  eventType?: string;
  sourceWorkflowId?: number;
  sourceExecutionId?: number;
  outputs?: Record<string, any>;
}

export async function executeWorkflow(
  workflow: Workflow, 
  triggerData?: { trigger: TriggerData }
): Promise<WorkflowExecution> {
  console.log('Executing workflow:', workflow.id);
  
  // Get workflow steps and edges from storage
  const steps = await storage.getWorkflowSteps(workflow.id);
  const edges = await storage.getWorkflowEdges(workflow.id);
  
  console.log('Workflow steps:', steps);
  console.log('Workflow edges:', edges);
  
  const execution = await storage.createExecution({
    workflowId: workflow.id,
    status: "running",
    startTime: new Date(),
    outputs: {},
  });

  try {
    // Convert DB steps to nodes for execution
    const nodes = steps.map(step => ({
      id: step.id.toString(),
      type: step.type,
      data: {
        label: step.label,
        config: step.config
      }
    }));
    
    // Build enhanced node dependency graph that includes edge labels and handles
    const graph = new Map<string, Array<{
      targetId: string;
      label?: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>>();
    
    for (const edge of edges) {
      const sourceId = edge.sourceId.toString();
      const targetId = edge.targetId.toString();
      
      if (!graph.has(sourceId)) {
        graph.set(sourceId, []);
      }
      
      graph.get(sourceId)!.push({
        targetId,
        label: edge.label || undefined,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      });
    }

    // Find start nodes (nodes with no incoming edges)
    const startNodes = nodes.filter(node => 
      !edges.some(edge => edge.targetId.toString() === node.id)
    );

    // Initialize execution context with trigger data if available
    const initialOutputs: Record<string, any> = {};
    
    // If we have trigger data, add it to the initial outputs
    if (triggerData) {
      const { trigger } = triggerData;
      
      // Find trigger node matching the trigger type
      const triggerNode = nodes.find(node => {
        switch (trigger.type) {
          case "webhook":
            return node.type === "webhook_trigger";
          case "app_event":
            return node.type === "app_event_trigger" && 
                   node.data.config?.eventType === trigger.eventType;
          case "workflow":
            return node.type === "workflow_trigger";
          default:
            return false;
        }
      });
      
      if (triggerNode) {
        initialOutputs[triggerNode.id] = {
          triggered: true,
          triggerType: trigger.type,
          ...trigger
        };
      }
      
      // For workflow triggers, include the source workflow's outputs
      if (trigger.type === "workflow" && trigger.outputs) {
        Object.assign(initialOutputs, trigger.outputs);
      }
    }
    
    // Initialize execution context
    const context: ExecutionContext = {
      workflowExecution: execution,
      outputs: initialOutputs,
      visited: new Set<string>(),
      currentPath: [],
      stepExecutions: {}
    };

    // Execute nodes starting from trigger nodes
    for (const node of startNodes) {
      await executeNode(node.id, context);
    }

    // Update execution status with all outputs
    await storage.updateExecution(execution.id, {
      status: "completed",
      endTime: new Date(),
      outputs: context.outputs
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

// Main node execution function with enhanced flow control
async function executeNode(nodeId: string, context: ExecutionContext): Promise<any> {
  // Skip if already visited to prevent cycles
  if (context.visited.has(nodeId)) {
    return context.outputs[nodeId];
  }
  
  // For type safety
  let result: any = null;
  
  // Find the node definition
  const steps = await storage.getWorkflowSteps(context.workflowExecution.workflowId);
  const step = steps.find(s => s.id.toString() === nodeId);
  if (!step) return null;
  
  // Convert step to node format for execution
  const node = {
    id: step.id.toString(),
    type: step.type,
    position: step.position,
    data: {
      label: step.label,
      config: step.config
    }
  };
  
  // Create step execution record
  const stepExecution = await storage.createStepExecution({
    workflowExecutionId: context.workflowExecution.id,
    stepId: step.id,
    status: "running",
    startTime: new Date(),
    input: getNodeInputs(nodeId, context)
  });
  
  context.stepExecutions[nodeId] = stepExecution;
  
  try {
    // Track execution path to avoid infinite recursion
    if (context.currentPath.includes(nodeId)) {
      throw new Error(`Circular dependency detected in execution path: ${context.currentPath.join(' -> ')} -> ${nodeId}`);
    }
    
    context.currentPath.push(nodeId);
    
    // Execute node based on type
    let result;
    
    switch (node.type) {
      case "basic_llm_chain":
      case "ai_transform":
      case "information_extractor":
      case "qa_chain":
      case "sentiment_analysis":
      case "summarization_chain":
      case "text_classifier":
        // Execute AI node with inputs from context
        const inputs = getNodeInputs(nodeId, context);
        result = await executeAINode(node, { 
          inputs,
          context: { outputs: context.outputs }
        });
        break;
        
      case "code":
        // Execute JavaScript code in a safe context with access to inputs
        const codeInputs = getNodeInputs(nodeId, context);
        const fn = new Function("inputs", "context", node.data.config?.code || "return null;");
        result = fn(codeInputs, { outputs: context.outputs });
        break;
        
      case "condition":
        // Evaluate condition and choose path
        const condition = evaluateCondition(node, context);
        result = { condition, result: condition };
        
        // Get appropriate edges based on condition result
        const edges = await storage.getWorkflowEdges(context.workflowExecution.workflowId);
        const outgoingEdges = edges.filter(e => e.sourceId.toString() === nodeId);
        
        // Find correct branch based on condition result (true/false)
        const nextEdges = outgoingEdges.filter(e => 
          (condition && e.label === "true") || (!condition && e.label === "false")
        );
        
        // Execute the correct branch only
        for (const edge of nextEdges) {
          await executeNode(edge.targetId.toString(), context);
        }
        break;
        
      case "switch":
        // Evaluate switch expression
        const switchValue = evaluateSwitchExpression(node, context);
        result = { switchValue };
        
        // Get all outgoing edges
        const switchEdges = await storage.getWorkflowEdges(context.workflowExecution.workflowId);
        const caseEdges = switchEdges.filter(e => e.sourceId.toString() === nodeId);
        
        // Find matching case or default
        const matchingEdge = caseEdges.find(e => e.label === switchValue.toString()) || 
                             caseEdges.find(e => e.label === "default");
        
        // Execute matching branch if found
        if (matchingEdge) {
          await executeNode(matchingEdge.targetId.toString(), context);
        }
        break;
        
      case "loop":
        // Get items to iterate over
        const configInput = node.data.config?.input || "";
        const items = configInput.startsWith("$") 
          ? getValueFromPath(context.outputs, configInput.substring(1)) 
          : context.outputs[configInput] || [];
        
        if (!Array.isArray(items)) {
          throw new Error("Loop input must be an array");
        }
        
        result = [];
        
        // Get loop child nodes
        const loopEdges = await storage.getWorkflowEdges(context.workflowExecution.workflowId);
        const childEdges = loopEdges.filter(e => e.sourceId.toString() === nodeId);
        
        // Execute child nodes for each item
        for (const item of items) {
          // Create a new isolated context for this iteration
          const iterationContext: ExecutionContext = {
            ...context,
            outputs: { ...context.outputs, currentItem: item },
            currentPath: [...context.currentPath]
          };
          
          const itemResults = [];
          
          // Execute each child node with the iteration context
          for (const edge of childEdges) {
            const childResult = await executeNode(edge.targetId.toString(), iterationContext);
            itemResults.push(childResult);
          }
          
          result.push(itemResults);
        }
        break;
        
      case "filter":
        // Get input array and filter predicate
        const inputArray = getValueFromPath(context.outputs, node.data.config?.input || "");
        if (!Array.isArray(inputArray)) {
          throw new Error("Filter input must be an array");
        }
        
        // Apply filter predicate to each item
        const filterFn = new Function("item", "index", "array", node.data.config?.predicate || "return true;");
        result = inputArray.filter((item, index, array) => filterFn(item, index, array));
        break;
        
      case "merge":
        // Merge inputs from multiple nodes
        result = {};
        const inputSources = node.data.config?.inputs || [];
        
        for (const source of inputSources) {
          const inputValue = getValueFromPath(context.outputs, source);
          if (inputValue !== undefined) {
            if (source.includes('.')) {
              const key = source.split('.').pop();
              result[key] = inputValue;
            } else {
              Object.assign(result, inputValue);
            }
          }
        }
        break;
        
      default:
        // For trigger nodes or other node types, just pass through
        result = { triggered: true };
        break;
    }

    // Store result in outputs
    context.outputs[nodeId] = result;
    context.visited.add(nodeId);
    
    // Remove node from current path
    context.currentPath.pop();
    
    // Update step execution
    await storage.updateStepExecution(stepExecution.id, {
      status: "completed",
      endTime: new Date(),
      output: result
    });
    
    // Execute child nodes for non-branching nodes
    if (!["condition", "switch", "loop"].includes(node.type)) {
      const edgeMeta = await storage.getWorkflowEdges(context.workflowExecution.workflowId);
      const childEdges = edgeMeta.filter(e => e.sourceId.toString() === nodeId);
      
      for (const edge of childEdges) {
        await executeNode(edge.targetId.toString(), context);
      }
    }
    
    return result;
  } catch (error) {
    // Handle node execution error
    await storage.updateStepExecution(stepExecution.id, {
      status: "failed",
      endTime: new Date(),
      error: error.message
    });
    
    // Remove from current path
    context.currentPath.pop();
    
    throw error;
  }
}

// Helper functions for node execution

// Get inputs for a node from its incoming edges
function getNodeInputs(nodeId: string, context: ExecutionContext): Record<string, any> {
  const inputs: Record<string, any> = {};
  
  // Default input is all outputs (for backward compatibility)
  inputs._all = context.outputs;
  
  return inputs;
}

// Evaluate a condition node
function evaluateCondition(node: any, context: ExecutionContext): boolean {
  try {
    const conditionExpression = node.data.config?.condition || "false";
    const fn = new Function("inputs", "context", `return Boolean(${conditionExpression});`);
    const inputs = getNodeInputs(node.id, context);
    return fn(inputs, { outputs: context.outputs });
  } catch (error) {
    console.error("Error evaluating condition:", error);
    return false;
  }
}

// Evaluate a switch expression
function evaluateSwitchExpression(node: any, context: ExecutionContext): any {
  try {
    const switchExpression = node.data.config?.expression || "";
    const fn = new Function("inputs", "context", `return ${switchExpression};`);
    const inputs = getNodeInputs(node.id, context);
    return fn(inputs, { outputs: context.outputs });
  } catch (error) {
    console.error("Error evaluating switch expression:", error);
    return null;
  }
}

// Helper to get a value from a path expression like "node1.data.value"
function getValueFromPath(obj: any, path: string): any {
  if (!path) return undefined;
  
  // Handle expressions starting with $ (JSONPath-like)
  if (path.startsWith('$')) {
    path = path.substring(1);
  }
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}
