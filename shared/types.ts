export type NodeType = 
  | "schedule_trigger"
  | "manual_trigger"
  | "webhook_trigger"
  | "basic_llm_chain"
  | "information_extractor"
  | "qa_chain"
  | "sentiment_analysis"
  | "ai_transform"
  | "summarization_chain"
  | "text_classifier"
  | "code"
  | "loop";

export type TriggerType = "manual" | "schedule" | "webhook";

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