import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { NodeType, TriggerType } from "./types";

export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  isActive: boolean("is_active").notNull().default(false),
  triggerType: text("trigger_type", { enum: ["manual", "schedule", "webhook"] }).notNull(),
  triggerConfig: jsonb("trigger_config"),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
});

export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").notNull(),
});

export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  error: text("error"),
  outputs: jsonb("outputs"),
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({ 
  id: true,
  lastRun: true,
  nextRun: true 
});

export const insertCredentialSchema = createInsertSchema(credentials).omit({ 
  id: true 
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
