import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { type Workflow } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowCanvas from "@/components/workflow/canvas";
import Sidebar from "@/components/workflow/sidebar";
import { Play, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowEditor() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("editor");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const workflowQuery = useQuery<Workflow>({
    queryKey: ["/api/workflows/1"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await queryClient.apiRequest("PATCH", "/api/workflows/1", {
        nodes,
        edges,
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/1"] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      return await queryClient.apiRequest(
        "POST",
        "/api/workflows/1/execute",
        null
      );
    },
    onSuccess: () => {
      toast({
        title: "Workflow executed",
        description: "The workflow has been triggered successfully.",
      });
    },
  });

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Workflow Editor</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            Execute
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <Sidebar />
        
        <div className="flex-1">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="h-full">
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={setNodes}
                onEdgesChange={setEdges}
              />
            </TabsContent>

            <TabsContent value="executions">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Execution History</h2>
                {/* Add execution history table here */}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
