import { Workflow, WorkflowExecution, Credential, InsertWorkflow, InsertCredential } from "@shared/schema";

export interface IStorage {
  // Workflow operations
  getWorkflow(id: number): Promise<Workflow | undefined>;
  listWorkflows(): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: number, workflow: Partial<InsertWorkflow>): Promise<Workflow>;
  deleteWorkflow(id: number): Promise<void>;

  // Execution operations  
  getExecution(id: number): Promise<WorkflowExecution | undefined>;
  createExecution(execution: Omit<WorkflowExecution, "id">): Promise<WorkflowExecution>;
  updateExecution(id: number, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution>;
  
  // Credential operations
  getCredential(id: number): Promise<Credential | undefined>;
  listCredentials(): Promise<Credential[]>;
  createCredential(credential: InsertCredential): Promise<Credential>;
  deleteCredential(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private workflows: Map<number, Workflow>;
  private executions: Map<number, WorkflowExecution>;
  private credentials: Map<number, Credential>;
  private currentIds: { [key: string]: number };

  constructor() {
    this.workflows = new Map();
    this.executions = new Map();
    this.credentials = new Map();
    this.currentIds = {
      workflow: 1,
      execution: 1,
      credential: 1
    };
  }

  async getWorkflow(id: number): Promise<Workflow | undefined> {
    return this.workflows.get(id);
  }

  async listWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const id = this.currentIds.workflow++;
    const newWorkflow = { ...workflow, id } as Workflow;
    this.workflows.set(id, newWorkflow);
    return newWorkflow;
  }

  async updateWorkflow(id: number, updates: Partial<InsertWorkflow>): Promise<Workflow> {
    const workflow = await this.getWorkflow(id);
    if (!workflow) throw new Error("Workflow not found");
    
    const updated = { ...workflow, ...updates };
    this.workflows.set(id, updated);
    return updated;
  }

  async deleteWorkflow(id: number): Promise<void> {
    this.workflows.delete(id);
  }

  async getExecution(id: number): Promise<WorkflowExecution | undefined> {
    return this.executions.get(id);
  }

  async createExecution(execution: Omit<WorkflowExecution, "id">): Promise<WorkflowExecution> {
    const id = this.currentIds.execution++;
    const newExecution = { ...execution, id };
    this.executions.set(id, newExecution);
    return newExecution;
  }

  async updateExecution(id: number, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution> {
    const execution = await this.getExecution(id);
    if (!execution) throw new Error("Execution not found");
    
    const updated = { ...execution, ...updates };
    this.executions.set(id, updated);
    return updated;
  }

  async getCredential(id: number): Promise<Credential | undefined> {
    return this.credentials.get(id);
  }

  async listCredentials(): Promise<Credential[]> {
    return Array.from(this.credentials.values());
  }

  async createCredential(credential: InsertCredential): Promise<Credential> {
    const id = this.currentIds.credential++;
    const newCredential = { ...credential, id };
    this.credentials.set(id, newCredential);
    return newCredential;
  }

  async deleteCredential(id: number): Promise<void> {
    this.credentials.delete(id);
  }
}

export const storage = new MemStorage();
