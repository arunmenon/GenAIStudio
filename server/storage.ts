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

export class DatabaseStorage implements IStorage {
  async getWorkflow(id: number): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow;
  }

  async listWorkflows(): Promise<Workflow[]> {
    return await db.select().from(workflows);
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const [created] = await db.insert(workflows).values(workflow).returning();
    return created;
  }

  async updateWorkflow(id: number, updates: Partial<InsertWorkflow>): Promise<Workflow> {
    const [updated] = await db
      .update(workflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return updated;
  }

  async deleteWorkflow(id: number): Promise<void> {
    await db.delete(workflows).where(eq(workflows.id, id));
  }

  async getWorkflowSteps(workflowId: number): Promise<WorkflowStep[]> {
    return await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId));
  }

  async createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep> {
    const [created] = await db.insert(workflowSteps).values(step).returning();
    return created;
  }

  async updateWorkflowStep(id: number, updates: Partial<InsertWorkflowStep>): Promise<WorkflowStep> {
    const [updated] = await db
      .update(workflowSteps)
      .set(updates)
      .where(eq(workflowSteps.id, id))
      .returning();
    return updated;
  }

  async deleteWorkflowStep(id: number): Promise<void> {
    await db.delete(workflowSteps).where(eq(workflowSteps.id, id));
  }

  async getWorkflowEdges(workflowId: number): Promise<WorkflowEdge[]> {
    return await db
      .select()
      .from(workflowEdges)
      .where(eq(workflowEdges.workflowId, workflowId));
  }

  async createWorkflowEdge(edge: InsertWorkflowEdge): Promise<WorkflowEdge> {
    const [created] = await db.insert(workflowEdges).values(edge).returning();
    return created;
  }

  async deleteWorkflowEdge(id: number): Promise<void> {
    await db.delete(workflowEdges).where(eq(workflowEdges.id, id));
  }

  async getExecution(id: number): Promise<WorkflowExecution | undefined> {
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, id));
    return execution;
  }

  async createExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const [created] = await db.insert(workflowExecutions).values(execution).returning();
    return created;
  }

  async updateExecution(id: number, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution> {
    const [updated] = await db
      .update(workflowExecutions)
      .set(updates)
      .where(eq(workflowExecutions.id, id))
      .returning();
    return updated;
  }

  async getStepExecutions(executionId: number): Promise<StepExecution[]> {
    return await db
      .select()
      .from(stepExecutions)
      .where(eq(stepExecutions.workflowExecutionId, executionId));
  }

  async createStepExecution(execution: InsertStepExecution): Promise<StepExecution> {
    const [created] = await db.insert(stepExecutions).values(execution).returning();
    return created;
  }

  async updateStepExecution(id: number, updates: Partial<StepExecution>): Promise<StepExecution> {
    const [updated] = await db
      .update(stepExecutions)
      .set(updates)
      .where(eq(stepExecutions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();