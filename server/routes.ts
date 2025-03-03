import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWorkflowSchema, insertCredentialSchema } from "@shared/schema";
import { executeWorkflow } from "./services/workflow";
import crypto from "crypto";

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
    
    console.log("PATCH Workflow Request Body:", JSON.stringify(req.body, null, 2));
    
    // Extract steps and edges from request body
    const { steps, edges, ...workflowData } = req.body;
    
    const parsed = insertWorkflowSchema.partial().safeParse(workflowData);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    
    // Include steps and edges in the update
    const updateData = {
      ...parsed.data,
      steps: steps || [],
      edges: edges || []
    };
    
    console.log("Updating workflow with full data:", JSON.stringify(updateData, null, 2));
    
    const updated = await storage.updateWorkflow(workflow.id, updateData);
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

  // Webhook endpoint for triggering workflows
  app.post("/api/webhooks/:webhookId", async (req, res) => {
    try {
      const { webhookId } = req.params;
      
      // Find workflow with matching webhook trigger
      const workflows = await storage.listWorkflows();
      const workflowsWithWebhooks = [];
      
      for (const workflow of workflows) {
        const steps = await storage.getWorkflowSteps(workflow.id);
        const webhookTriggers = steps.filter(
          step => step.type === "webhook_trigger" && 
                  step.config?.webhookId === webhookId
        );
        
        if (webhookTriggers.length > 0) {
          workflowsWithWebhooks.push({ 
            workflow, 
            triggerStep: webhookTriggers[0] 
          });
        }
      }
      
      if (workflowsWithWebhooks.length === 0) {
        return res.status(404).json({ 
          message: "No workflow found with matching webhook ID" 
        });
      }
      
      // Validate webhook secret if provided
      const { workflow, triggerStep } = workflowsWithWebhooks[0];
      if (triggerStep.config?.secret) {
        const providedSignature = req.headers['x-webhook-signature'];
        if (!providedSignature) {
          return res.status(401).json({ 
            message: "Missing webhook signature" 
          });
        }
        
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', triggerStep.config.secret)
          .update(payload)
          .digest('hex');
        
        if (providedSignature !== expectedSignature) {
          return res.status(401).json({ 
            message: "Invalid webhook signature" 
          });
        }
      }
      
      // Execute workflow with webhook payload
      const execution = await executeWorkflow(workflow, {
        trigger: {
          type: "webhook",
          payload: req.body,
          headers: req.headers,
          params: req.params,
          query: req.query
        }
      });
      
      res.status(202).json({ 
        message: "Workflow triggered successfully", 
        executionId: execution.id 
      });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ 
        message: "Error processing webhook", 
        error: error.message 
      });
    }
  });
  
  // App Event endpoint for triggering workflows
  app.post("/api/events", async (req, res) => {
    try {
      const { eventType, payload } = req.body;
      
      if (!eventType) {
        return res.status(400).json({ message: "Missing eventType" });
      }
      
      // Find workflows with matching app event trigger
      const workflows = await storage.listWorkflows();
      const matchingWorkflows = [];
      
      for (const workflow of workflows) {
        if (!workflow.isActive) continue;
        
        const steps = await storage.getWorkflowSteps(workflow.id);
        const eventTriggers = steps.filter(
          step => step.type === "app_event_trigger" && 
                  step.config?.eventType === eventType
        );
        
        if (eventTriggers.length > 0) {
          matchingWorkflows.push({ 
            workflow, 
            triggerStep: eventTriggers[0] 
          });
        }
      }
      
      if (matchingWorkflows.length === 0) {
        return res.status(404).json({ 
          message: `No workflows found for event type: ${eventType}` 
        });
      }
      
      // Execute all matching workflows
      const executions = await Promise.all(
        matchingWorkflows.map(({ workflow }) => 
          executeWorkflow(workflow, {
            trigger: {
              type: "app_event",
              eventType,
              payload
            }
          })
        )
      );
      
      res.status(202).json({ 
        message: `Triggered ${executions.length} workflows`, 
        executionIds: executions.map(exec => exec.id)
      });
    } catch (error) {
      console.error("App event error:", error);
      res.status(500).json({ 
        message: "Error processing app event", 
        error: error.message 
      });
    }
  });
  
  // Workflow chaining endpoint - trigger workflows after completion
  app.post("/api/workflows/:id/chain", async (req, res) => {
    try {
      const { targetWorkflowId } = req.body;
      const sourceWorkflowId = parseInt(req.params.id);
      
      if (!targetWorkflowId) {
        return res.status(400).json({ message: "Missing targetWorkflowId" });
      }
      
      const sourceWorkflow = await storage.getWorkflow(sourceWorkflowId);
      const targetWorkflow = await storage.getWorkflow(targetWorkflowId);
      
      if (!sourceWorkflow || !targetWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      // Get latest execution of source workflow
      const executions = await storage.listExecutions(sourceWorkflowId);
      const latestExecution = executions[0];
      
      if (!latestExecution || latestExecution.status !== "completed") {
        return res.status(400).json({ 
          message: "Source workflow has no successful execution" 
        });
      }
      
      // Execute target workflow with source outputs
      const execution = await executeWorkflow(targetWorkflow, {
        trigger: {
          type: "workflow",
          sourceWorkflowId,
          sourceExecutionId: latestExecution.id,
          outputs: latestExecution.outputs
        }
      });
      
      res.status(202).json({ 
        message: "Chained workflow triggered successfully", 
        executionId: execution.id 
      });
    } catch (error) {
      console.error("Workflow chain error:", error);
      res.status(500).json({ 
        message: "Error chaining workflow", 
        error: error.message 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
