import { pgTable, text, serial, integer, boolean, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { NodeType, TriggerType } from "./types";

// Main workflow table
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual steps/nodes within a workflow
export const workflowSteps = pgTable("workflow_steps", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["schedule_trigger", "manual_trigger", "webhook_trigger", "basic_llm_chain", 
    "information_extractor", "qa_chain", "sentiment_analysis", "ai_transform", 
    "summarization_chain", "text_classifier", "code", "loop"] }).notNull(),
  label: text("label").notNull(),
  position: jsonb("position").notNull(), // {x: number, y: number}
  config: jsonb("config").notNull().default({}), // Store node-specific configuration
  order: integer("order").notNull(), // Execution order
});

// Store edges between nodes
export const workflowEdges = pgTable("workflow_edges", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  sourceId: integer("source_id")
    .notNull()
    .references(() => workflowSteps.id),
  targetId: integer("target_id")
    .notNull()
    .references(() => workflowSteps.id),
});

// Track workflow executions
export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id")
    .notNull()
    .references(() => workflows.id),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  error: text("error"),
  outputs: jsonb("outputs"), // Store step outputs
});

// Track individual step executions
export const stepExecutions = pgTable("step_executions", {
  id: serial("id").primaryKey(),
  workflowExecutionId: integer("workflow_execution_id")
    .notNull()
    .references(() => workflowExecutions.id),
  stepId: integer("step_id")
    .notNull()
    .references(() => workflowSteps.id),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  error: text("error"),
  input: jsonb("input"),
  output: jsonb("output"),
});

// Create insert schemas
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true 
});

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).omit({ 
  id: true 
});

export const insertWorkflowEdgeSchema = createInsertSchema(workflowEdges).omit({ 
  id: true 
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({ 
  id: true 
});

export const insertStepExecutionSchema = createInsertSchema(stepExecutions).omit({ 
  id: true 
});

// Export types
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;

export type WorkflowEdge = typeof workflowEdges.$inferSelect;
export type InsertWorkflowEdge = z.infer<typeof insertWorkflowEdgeSchema>;

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

export type StepExecution = typeof stepExecutions.$inferSelect;
export type InsertStepExecution = z.infer<typeof insertStepExecutionSchema>;

export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").notNull(),
});

export const insertCredentialSchema = createInsertSchema(credentials).omit({ 
  id: true 
});

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;