import { 
  Workflow, WorkflowStep, WorkflowEdge, WorkflowExecution, StepExecution,
  InsertWorkflow, InsertWorkflowStep, InsertWorkflowEdge, InsertWorkflowExecution, InsertStepExecution,
  workflows, workflowSteps, workflowEdges, workflowExecutions, stepExecutions
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Workflow operations
  getWorkflow(id: number): Promise<Workflow | undefined>;
  listWorkflows(): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: number, workflow: Partial<InsertWorkflow>): Promise<Workflow>;
  deleteWorkflow(id: number): Promise<void>;

  // Step operations
  getWorkflowSteps(workflowId: number): Promise<WorkflowStep[]>;
  createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep>;
  updateWorkflowStep(id: number, step: Partial<InsertWorkflowStep>): Promise<WorkflowStep>;
  deleteWorkflowStep(id: number): Promise<void>;

  // Edge operations
  getWorkflowEdges(workflowId: number): Promise<WorkflowEdge[]>;
  createWorkflowEdge(edge: InsertWorkflowEdge): Promise<WorkflowEdge>;
  deleteWorkflowEdge(id: number): Promise<void>;

  // Execution operations
  getExecution(id: number): Promise<WorkflowExecution | undefined>;
  createExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateExecution(id: number, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution>;
  getStepExecutions(executionId: number): Promise<StepExecution[]>;
  createStepExecution(execution: InsertStepExecution): Promise<StepExecution>;
  updateStepExecution(id: number, updates: Partial<StepExecution>): Promise<StepExecution>;
}

// For demo purposes, we'll use in-memory storage
export class MockStorage implements IStorage {
  private workflows: Map<number, Workflow> = new Map();
  private steps: Map<number, WorkflowStep[]> = new Map();
  private edges: Map<number, WorkflowEdge[]> = new Map();
  private executions: Map<number, WorkflowExecution> = new Map();
  private stepExecutions: Map<number, StepExecution[]> = new Map();
  
  constructor() {
    // Add a default workflow
    const defaultWorkflow: Workflow = {
      id: 1,
      name: "My First Workflow",
      description: "A demo workflow",
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.workflows.set(1, defaultWorkflow);
    this.steps.set(1, []);
    this.edges.set(1, []);
  }

  async getWorkflow(id: number): Promise<Workflow | undefined> {
    console.log('Getting workflow:', id);
    return this.workflows.get(id);
  }

  async listWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const id = this.workflows.size + 1;
    const newWorkflow: Workflow = {
      id,
      ...workflow,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workflows.set(id, newWorkflow);
    return newWorkflow;
  }

  async updateWorkflow(id: number, updates: Partial<InsertWorkflow> & { steps?: any[], edges?: any[] }): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) throw new Error(`Workflow ${id} not found`);
    
    console.log('Updating workflow with data:', updates);
    
    const updated = {
      ...workflow,
      ...updates,
      updatedAt: new Date()
    };
    
    // Handle steps and edges if provided
    if (updates.steps) {
      console.log('Saving steps:', updates.steps);
      const workflowSteps = updates.steps.map((step, index) => ({
        id: index + 1,
        workflowId: id,
        type: step.type,
        label: step.label,
        position: step.position,
        config: step.config || {},
        order: step.order || index
      }));
      this.steps.set(id, workflowSteps);
    }
    
    if (updates.edges) {
      console.log('Saving edges:', updates.edges);
      const workflowEdges = updates.edges.map((edge, index) => ({
        id: index + 1,
        workflowId: id,
        sourceId: edge.sourceId,
        targetId: edge.targetId
      }));
      this.edges.set(id, workflowEdges);
    }
    
    this.workflows.set(id, updated);
    
    // For client convenience, add steps and edges to the returned workflow
    return {
      ...updated,
      steps: this.steps.get(id) || [],
      edges: this.edges.get(id) || []
    };
  }

  async deleteWorkflow(id: number): Promise<void> {
    this.workflows.delete(id);
    this.steps.delete(id);
    this.edges.delete(id);
  }

  async getWorkflowSteps(workflowId: number): Promise<WorkflowStep[]> {
    return this.steps.get(workflowId) || [];
  }

  async createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep> {
    const workflowSteps = this.steps.get(step.workflowId) || [];
    const id = workflowSteps.length + 1;
    
    const newStep = {
      id,
      ...step,
      config: step.config || {}
    };
    
    workflowSteps.push(newStep);
    this.steps.set(step.workflowId, workflowSteps);
    
    return newStep;
  }

  async updateWorkflowStep(id: number, updates: Partial<InsertWorkflowStep>): Promise<WorkflowStep> {
    let updatedStep: WorkflowStep | undefined;
    
    for (const [workflowId, steps] of this.steps.entries()) {
      const stepIndex = steps.findIndex(s => s.id === id);
      if (stepIndex >= 0) {
        const step = steps[stepIndex];
        updatedStep = { ...step, ...updates };
        steps[stepIndex] = updatedStep;
        this.steps.set(workflowId, steps);
        break;
      }
    }
    
    if (!updatedStep) {
      throw new Error(`Step ${id} not found`);
    }
    
    return updatedStep;
  }

  async deleteWorkflowStep(id: number): Promise<void> {
    for (const [workflowId, steps] of this.steps.entries()) {
      const filteredSteps = steps.filter(s => s.id !== id);
      if (filteredSteps.length !== steps.length) {
        this.steps.set(workflowId, filteredSteps);
        break;
      }
    }
  }

  async getWorkflowEdges(workflowId: number): Promise<WorkflowEdge[]> {
    return this.edges.get(workflowId) || [];
  }

  async createWorkflowEdge(edge: InsertWorkflowEdge): Promise<WorkflowEdge> {
    const workflowEdges = this.edges.get(edge.workflowId) || [];
    const id = workflowEdges.length + 1;
    
    const newEdge = {
      id,
      ...edge,
      label: edge.label || null,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null
    };
    
    workflowEdges.push(newEdge);
    this.edges.set(edge.workflowId, workflowEdges);
    
    return newEdge;
  }

  async deleteWorkflowEdge(id: number): Promise<void> {
    for (const [workflowId, edges] of this.edges.entries()) {
      const filteredEdges = edges.filter(e => e.id !== id);
      if (filteredEdges.length !== edges.length) {
        this.edges.set(workflowId, filteredEdges);
        break;
      }
    }
  }

  async getExecution(id: number): Promise<WorkflowExecution | undefined> {
    return this.executions.get(id);
  }

  async createExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const id = this.executions.size + 1;
    const newExecution = {
      id,
      ...execution
    };
    this.executions.set(id, newExecution);
    return newExecution;
  }

  async updateExecution(id: number, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution> {
    const execution = this.executions.get(id);
    if (!execution) throw new Error(`Execution ${id} not found`);
    
    const updated = {
      ...execution,
      ...updates
    };
    
    this.executions.set(id, updated);
    return updated;
  }

  async getStepExecutions(executionId: number): Promise<StepExecution[]> {
    return this.stepExecutions.get(executionId) || [];
  }

  async createStepExecution(execution: InsertStepExecution): Promise<StepExecution> {
    const executionSteps = this.stepExecutions.get(execution.workflowExecutionId) || [];
    const id = executionSteps.length + 1;
    
    const newExecution = {
      id,
      ...execution,
      input: execution.input || {},
      output: execution.output || {},
      error: execution.error || null,
      endTime: execution.endTime || null
    };
    
    executionSteps.push(newExecution);
    this.stepExecutions.set(execution.workflowExecutionId, executionSteps);
    
    return newExecution;
  }

  async updateStepExecution(id: number, updates: Partial<StepExecution>): Promise<StepExecution> {
    let updatedExecution: StepExecution | undefined;
    
    for (const [executionId, executions] of this.stepExecutions.entries()) {
      const executionIndex = executions.findIndex(e => e.id === id);
      if (executionIndex >= 0) {
        const execution = executions[executionIndex];
        updatedExecution = { ...execution, ...updates };
        executions[executionIndex] = updatedExecution;
        this.stepExecutions.set(executionId, executions);
        break;
      }
    }
    
    if (!updatedExecution) {
      throw new Error(`Step execution ${id} not found`);
    }
    
    return updatedExecution;
  }
}

// Import SQLite storage instead of using mock storage
import { sqliteStorage } from './db-sqlite.ts';
export const storage = sqliteStorage;