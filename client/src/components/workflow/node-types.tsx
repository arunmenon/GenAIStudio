import { Handle, Position, NodeProps } from "reactflow";
import { 
  Clock, Code, Wand2, CheckCircle2, AlertTriangle, Webhook, 
  Globe, SplitSquareVertical, Filter, Merge, GitCompare
} from "lucide-react";
import { Card, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BaseNode = ({ 
  data,
  children,
  isSource = true,
  isTarget = true 
}: NodeProps & { children: React.ReactNode; isSource?: boolean; isTarget?: boolean }) => {
  // Check if node has configuration
  const hasConfig = data.config && Object.keys(data.config).length > 0;
  
  return (
    <Card className={`p-3 min-w-[180px] ${hasConfig ? 'border-green-200' : 'border-yellow-200'}`}>
      {isTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-2 h-2 bg-muted-foreground"
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {children}
          <span className="font-medium">{data.label}</span>
        </div>
        
        <Badge variant={hasConfig ? "outline" : "secondary"} className="ml-2 h-5 px-1.5">
          {hasConfig ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
          )}
        </Badge>
      </div>
      
      {hasConfig && (
        <CardDescription className="text-xs mt-1 truncate opacity-70">
          {getConfigSummary(data)}
        </CardDescription>
      )}

      {isSource && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-2 h-2 bg-muted-foreground"
        />
      )}
    </Card>
  );
};

// Define which node types can have next steps
export const canHaveNextStep = (nodeType: string): boolean => {
  // Most nodes can have next steps, but some might be terminal nodes
  const terminalNodes = [
    "approval", // Human approval nodes might be terminal in some workflows
    "notification" // Notification nodes might be terminal
  ];
  
  return !terminalNodes.includes(nodeType);
};

// Helper to generate a short summary of the node configuration
function getConfigSummary(data: any): string {
  const config = data.config || {};
  
  if (Object.keys(config).length === 0) {
    return "Not configured";
  }
  
  // Handle different node types
  switch (data.type) {
    case "schedule_trigger":
      return `Runs: ${config.schedule || config.frequency || "daily"}`;
    case "basic_llm_chain":
    case "summarization_chain":
    case "qa_chain":
      return `Prompt: ${truncate(config.prompt || "Set")}`;
    case "code":
      return `${config.language || "JS"}: ${truncate(config.code || "Set")}`;
    default:
      return "Configured";
  }
}

// Helper to truncate text
function truncate(text: string, length = 15): string {
  if (!text) return "";
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

export const ScheduleTriggerNode = (props: NodeProps) => (
  <BaseNode {...props} isTarget={false}>
    <Clock className="w-4 h-4 text-blue-500" />
  </BaseNode>
);

export const WebhookTriggerNode = (props: NodeProps) => (
  <BaseNode {...props} isTarget={false}>
    <Webhook className="w-4 h-4 text-blue-500" />
  </BaseNode>
);

export const AppEventTriggerNode = (props: NodeProps) => (
  <BaseNode {...props} isTarget={false}>
    <Globe className="w-4 h-4 text-blue-500" />
  </BaseNode>
);

export const WorkflowTriggerNode = (props: NodeProps) => (
  <BaseNode {...props} isTarget={false}>
    <GitCompare className="w-4 h-4 text-blue-500" />
  </BaseNode>
);

export const CodeNode = (props: NodeProps) => (
  <BaseNode {...props}>
    <Code className="w-4 h-4 text-green-500" />
  </BaseNode>
);

export const AITransformNode = (props: NodeProps) => (
  <BaseNode {...props}>
    <Wand2 className="w-4 h-4 text-purple-500" />
  </BaseNode>
);

export const ConditionNode = (props: NodeProps) => (
  <BaseNode {...props}>
    <SplitSquareVertical className="w-4 h-4 text-orange-500" />
  </BaseNode>
);

export const SwitchNode = (props: NodeProps) => (
  <BaseNode {...props}>
    <SplitSquareVertical className="w-4 h-4 text-orange-500" />
  </BaseNode>
);

export const FilterNode = (props: NodeProps) => (
  <BaseNode {...props}>
    <Filter className="w-4 h-4 text-teal-500" />
  </BaseNode>
);

export const MergeNode = (props: NodeProps) => (
  <BaseNode {...props}>
    <Merge className="w-4 h-4 text-teal-500" />
  </BaseNode>
);

export const nodeTypes = {
  // Trigger nodes
  schedule_trigger: ScheduleTriggerNode,
  manual_trigger: ScheduleTriggerNode,
  webhook_trigger: WebhookTriggerNode,
  app_event_trigger: AppEventTriggerNode,
  workflow_trigger: WorkflowTriggerNode,
  
  // AI nodes
  basic_llm_chain: AITransformNode,
  information_extractor: AITransformNode,
  qa_chain: AITransformNode,
  sentiment_analysis: AITransformNode,
  ai_transform: AITransformNode,
  summarization_chain: AITransformNode,
  text_classifier: AITransformNode,
  
  // Flow control nodes
  condition: ConditionNode,
  switch: SwitchNode,
  loop: CodeNode,
  filter: FilterNode,
  merge: MergeNode,
  
  // Code nodes
  code: CodeNode,
};