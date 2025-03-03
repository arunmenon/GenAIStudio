import {
  Bot,
  Globe,
  FileText,
  GitFork,
  Terminal,
  UserCog,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface NextStepPanelProps {
  onAddNode: (type: string) => void;
  onClose: () => void;
}

const nodeTypes = {
  "advanced-ai": [
    { id: "basic_llm_chain", label: "Text Generation", description: "Generate text using a large language model" },
    { id: "summarization_chain", label: "Summarization", description: "Create summaries of long text" },
    { id: "qa_chain", label: "Question & Answer", description: "Answer questions based on documents" },
    { id: "text_classifier", label: "Text Classification", description: "Categorize text into predefined classes" },
    { id: "sentiment_analysis", label: "Sentiment Analysis", description: "Determine sentiment of text" },
    { id: "information_extractor", label: "Information Extraction", description: "Extract structured data from text" }
  ],
  "app-action": [
    { id: "http_request", label: "HTTP Request", description: "Make API calls to external services" },
    { id: "notification", label: "Send Notification", description: "Send notifications via email, SMS, etc." },
    { id: "database", label: "Database Operation", description: "Store or retrieve data from database" }
  ],
  "data-transform": [
    { id: "ai_transform", label: "AI Transform", description: "Transform data using AI" },
    { id: "filter", label: "Filter Data", description: "Filter data based on conditions" },
    { id: "aggregation", label: "Aggregate Data", description: "Group and summarize data" }
  ],
  "flow": [
    { id: "condition", label: "Condition", description: "Create conditional paths in your workflow" },
    { id: "switch", label: "Switch", description: "Create multiple conditional paths based on a value" },
    { id: "loop", label: "Loop", description: "Repeat operations for each item in a collection" },
    { id: "filter", label: "Filter", description: "Filter items in a collection" },
    { id: "merge", label: "Merge", description: "Combine multiple paths into one" }
  ],
  "core": [
    { id: "code", label: "JavaScript/Python", description: "Run custom code" },
    { id: "webhook", label: "Webhook", description: "Receive data from external services" },
    { id: "schedule_trigger", label: "Schedule", description: "Run workflow on a schedule" }
  ],
  "human": [
    { id: "approval", label: "Approval Request", description: "Wait for human approval" },
    { id: "form_input", label: "Form Input", description: "Get input from a form" }
  ],
  "trigger": [
    { id: "manual_trigger", label: "Manual Trigger", description: "Start workflow manually" },
    { id: "webhook_trigger", label: "Webhook Trigger", description: "Start workflow via HTTP request" },
    { id: "schedule_trigger", label: "Schedule Trigger", description: "Start workflow on a schedule" },
    { id: "app_event_trigger", label: "App Event Trigger", description: "Start workflow when app event occurs" },
    { id: "workflow_trigger", label: "Workflow Trigger", description: "Start workflow when another workflow completes" }
  ]
};

const categories = [
  {
    id: "advanced-ai",
    label: "Advanced AI",
    icon: Bot,
    description: "Build autonomous agents, summarize or search documents, etc.",
  },
  {
    id: "app-action",
    label: "Action in an app",
    icon: Globe,
    description: "Do something in an app or service like Google Sheets, Telegram or Notion",
  },
  {
    id: "data-transform",
    label: "Data transformation",
    icon: FileText,
    description: "Manipulate, filter or convert data",
  },
  {
    id: "flow",
    label: "Flow",
    icon: GitFork,
    description: "Branch, merge or loop the flow, etc.",
  },
  {
    id: "core",
    label: "Core",
    icon: Terminal,
    description: "Run code, make HTTP requests, set webhooks, etc.",
  },
  {
    id: "human",
    label: "Human in the loop",
    icon: UserCog,
    description: "Wait for approval or human input before continuing",
  },
  {
    id: "trigger",
    label: "Add another trigger",
    icon: Zap,
    description: "Triggers start your workflow. Workflows can have multiple triggers",
  },
];

export function NextStepPanel({ onAddNode, onClose }: NextStepPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = categories.filter(
    (category) =>
      category.label.toLowerCase().includes(search.toLowerCase()) ||
      category.description.toLowerCase().includes(search.toLowerCase())
  );

  // Handle back button click
  const handleBack = () => {
    setSelectedCategory(null);
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // Handle node type selection
  const handleNodeSelect = (nodeType: string) => {
    onAddNode(nodeType);
  };

  return (
    <div className="w-96 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {selectedCategory 
            ? <>
                <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">←</Button>
                {categories.find(c => c.id === selectedCategory)?.label}
              </> 
            : "What happens next?"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
      </div>

      <Input
        type="search"
        placeholder="Search nodes..."
        className="mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ScrollArea className="h-[400px]">
        {!selectedCategory ? (
          // Show categories
          <div className="space-y-2">
            {filteredCategories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleCategorySelect(category.id)}
              >
                <div className="flex items-start gap-3">
                  <category.icon className="w-5 h-5 mt-1" />
                  <div className="text-left">
                    <div className="font-medium">{category.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          // Show node types for selected category
          <div className="space-y-2">
            {nodeTypes[selectedCategory]?.map((node) => (
              <Button
                key={node.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleNodeSelect(node.id)}
              >
                <div className="flex flex-col items-start">
                  <div className="font-medium">{node.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {node.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}