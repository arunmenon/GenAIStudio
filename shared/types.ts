export type NodeType = 
  | "schedule_trigger"
  | "manual_trigger"
  | "webhook_trigger"
  | "app_event_trigger"
  | "workflow_trigger"
  | "basic_llm_chain"
  | "information_extractor"
  | "qa_chain"
  | "sentiment_analysis"
  | "ai_transform"
  | "summarization_chain"
  | "text_classifier"
  | "code"
  | "loop"
  | "condition"
  | "switch"
  | "merge"
  | "filter";

export type TriggerType = "manual" | "schedule" | "webhook" | "app_event" | "workflow";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, any>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface NodeTypeInfo {
  type: NodeType;
  label: string;
  description: string;
  category: "triggers" | "ai" | "flow" | "code";
  icon: string;
}

export interface NodeConfig {
  type: NodeType;
  fields: {
    name: string;
    type: "text" | "select" | "code" | "number";
    label: string;
    required?: boolean;
    options?: { label: string; value: string }[];
  }[];
}