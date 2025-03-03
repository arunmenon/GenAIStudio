import { Handle, Position, NodeProps } from "reactflow";
import { Clock, Code, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const BaseNode = ({ 
  data,
  children,
  isSource = true,
  isTarget = true 
}: NodeProps & { children: React.ReactNode; isSource?: boolean; isTarget?: boolean }) => {
  return (
    <Card className="p-3 min-w-[150px]">
      {isTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-2 h-2 bg-muted-foreground"
        />
      )}

      <div className="flex items-center gap-2">
        {children}
        <span className="font-medium">{data.label}</span>
      </div>

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

export const ScheduleTriggerNode = (props: NodeProps) => (
  <BaseNode {...props} isTarget={false}>
    <Clock className="w-4 h-4 text-blue-500" />
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

export const nodeTypes = {
  schedule_trigger: ScheduleTriggerNode,
  code: CodeNode,
  ai_transform: AITransformNode,
  basic_llm_chain: AITransformNode,
  information_extractor: AITransformNode,
  qa_chain: AITransformNode,
  sentiment_analysis: AITransformNode,
  summarization_chain: AITransformNode,
  text_classifier: AITransformNode,
  loop: CodeNode,
  webhook_trigger: ScheduleTriggerNode,
};