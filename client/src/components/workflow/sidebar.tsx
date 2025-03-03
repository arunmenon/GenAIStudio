import {
  Bot,
  Code,
  Wand2,
  Repeat,
  MessageSquare,
  Webhook,
  FileText,
  HelpCircle,
  Scale,
  FileSearch,
  Sparkles,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type NodeType } from "@shared/types";

const nodeCategories = [
  {
    label: "Triggers",
    items: [
      {
        type: "schedule_trigger" as NodeType,
        label: "Schedule",
        icon: Webhook,
        description: "Runs the flow on a schedule",
      },
      {
        type: "webhook_trigger" as NodeType,
        label: "Webhook",
        icon: Webhook,
        description: "Triggers on HTTP request",
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        type: "basic_llm_chain" as NodeType,
        label: "Basic LLM Chain",
        icon: MessageSquare,
        description: "Basic language model chain",
      },
      {
        type: "information_extractor" as NodeType,
        label: "Information Extractor",
        icon: FileSearch,
        description: "Extract structured information from text",
      },
      {
        type: "qa_chain" as NodeType,
        label: "Q&A Chain",
        icon: HelpCircle,
        description: "Answer questions about documents",
      },
      {
        type: "sentiment_analysis" as NodeType,
        label: "Sentiment Analysis",
        icon: Scale,
        description: "Analyze text sentiment",
      },
      {
        type: "ai_transform" as NodeType,
        label: "AI Transform",
        icon: Wand2,
        description: "Transform data using AI",
      },
      {
        type: "summarization_chain" as NodeType,
        label: "Summarization Chain",
        icon: FileText,
        description: "Create concise summaries",
      },
      {
        type: "text_classifier" as NodeType,
        label: "Text Classifier",
        icon: Sparkles,
        description: "Classify text into categories",
      },
    ],
  },
  {
    label: "Flow",
    items: [
      {
        type: "loop" as NodeType,
        label: "Loop",
        icon: Repeat,
        description: "Iterate over items",
      },
    ],
  },
  {
    label: "Code",
    items: [
      {
        type: "code" as NodeType,
        label: "JavaScript",
        icon: Code,
        description: "Run custom JavaScript code",
      },
    ],
  },
];

export default function Sidebar() {
  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
    nodeLabel: string
  ) => {
    // Set the drag data
    const data = {
      type: nodeType,
      label: nodeLabel,
    };
    event.dataTransfer.setData("application/reactflow", JSON.stringify(data));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-80 border-r bg-muted/10 p-4 overflow-y-auto">
      <h2 className="font-semibold mb-4">Add Node</h2>

      <Accordion type="single" collapsible className="w-full">
        {nodeCategories.map((category) => (
          <AccordionItem key={category.label} value={category.label}>
            <AccordionTrigger>{category.label}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-move"
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type, item.label)}
                  >
                    <item.icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}