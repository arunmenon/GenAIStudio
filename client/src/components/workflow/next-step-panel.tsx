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

  const filteredCategories = categories.filter(
    (category) =>
      category.label.toLowerCase().includes(search.toLowerCase()) ||
      category.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-96 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">What happens next?</h2>
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
        <div className="space-y-2">
          {filteredCategories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onAddNode(category.id)}
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
      </ScrollArea>
    </div>
  );
}