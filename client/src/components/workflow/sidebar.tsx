import { useDrag } from "react-use-gesture";
import {
  Clock,
  Code,
  Wand2,
  Repeat,
  MessageSquare,
  Webhook,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const nodeCategories = [
  {
    label: "Triggers",
    items: [
      {
        type: "schedule_trigger",
        label: "Schedule",
        icon: Clock,
        description: "Runs the flow on a schedule",
      },
      {
        type: "webhook_trigger",
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
        type: "basic_llm_chain",
        label: "LLM Chain",
        icon: MessageSquare,
        description: "Basic language model chain",
      },
      {
        type: "ai_transform",
        label: "AI Transform",
        icon: Wand2,
        description: "Transform data using AI",
      },
    ],
  },
  {
    label: "Flow",
    items: [
      {
        type: "loop",
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
        type: "code",
        label: "JavaScript",
        icon: Code,
        description: "Run custom JavaScript code",
      },
    ],
  },
];

export default function Sidebar() {
  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    label: string
  ) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ type: nodeType, label })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-64 border-r bg-muted/10 p-4">
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
