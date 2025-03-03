import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWorkflowSchema, insertCredentialSchema } from "@shared/schema";
import { executeWorkflow } from "./services/workflow";

export async function registerRoutes(app: Express): Promise<Server> {
  // Workflow routes
  app.get("/api/workflows", async (_req, res) => {
    const workflows = await storage.listWorkflows();
    res.json(workflows);
  });

  app.get("/api/workflows/:id", async (req, res) => {
    const workflow = await storage.getWorkflow(parseInt(req.params.id));
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    res.json(workflow);
  });

  app.post("/api/workflows", async (req, res) => {
    const parsed = insertWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const workflow = await storage.createWorkflow(parsed.data);
    res.json(workflow);
  });

  app.patch("/api/workflows/:id", async (req, res) => {
    const workflow = await storage.getWorkflow(parseInt(req.params.id));
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    
    const parsed = insertWorkflowSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    
    const updated = await storage.updateWorkflow(workflow.id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/workflows/:id", async (req, res) => {
    await storage.deleteWorkflow(parseInt(req.params.id));
    res.status(204).end();
  });

  // Workflow execution
  app.post("/api/workflows/:id/execute", async (req, res) => {
    const workflow = await storage.getWorkflow(parseInt(req.params.id));
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    
    const execution = await executeWorkflow(workflow);
    res.json(execution);
  });

  app.get("/api/executions/:id", async (req, res) => {
    const execution = await storage.getExecution(parseInt(req.params.id));
    if (!execution) return res.status(404).json({ message: "Execution not found" });
    res.json(execution);
  });

  // Credential routes
  app.get("/api/credentials", async (_req, res) => {
    const credentials = await storage.listCredentials();
    res.json(credentials);
  });

  app.post("/api/credentials", async (req, res) => {
    const parsed = insertCredentialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const credential = await storage.createCredential(parsed.data);
    res.json(credential);
  });

  app.delete("/api/credentials/:id", async (req, res) => {
    await storage.deleteCredential(parseInt(req.params.id));
    res.status(204).end();
  });

  const httpServer = createServer(app);
  return httpServer;
}
