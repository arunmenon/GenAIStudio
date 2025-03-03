// Last modified: 2025-03-03 11:30:00
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { type Workflow } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowCanvas from "@/components/workflow/canvas";
import Sidebar from "@/components/workflow/sidebar";
import { Play, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Node, type Edge } from "reactflow";

export default function WorkflowEditor() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("editor");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Query to fetch workflow data
  const workflowQuery = useQuery({
    queryKey: ["/api/workflows/1"],
    onSuccess: (data) => {
      if (data) {
        // Load workflow data from database
        const workflowSteps = data.steps || [];
        const workflowEdges = data.edges || [];

        // Convert database format to ReactFlow format
        setNodes(workflowSteps.map(step => ({
          id: step.id.toString(),
          type: step.type,
          position: step.position,
          data: { 
            label: step.label,
            config: step.config
          }
        })));

        setEdges(workflowEdges.map(edge => ({
          id: edge.id.toString(),
          source: edge.sourceId.toString(),
          target: edge.targetId.toString()
        })));
      }
    }
  });

  // Mutation to save workflow changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Convert ReactFlow format to database format
      const steps = nodes.map(node => ({
        type: node.type,
        label: node.data.label,
        position: node.position,
        config: node.data.config || {},
        order: parseInt(node.id.replace('node_', ''))
      }));

      const workflowEdges = edges.map(edge => ({
        sourceId: parseInt(edge.source),
        targetId: parseInt(edge.target)
      }));

      console.log('Saving workflow with steps:', steps); // Debug log

      await queryClient.apiRequest("PATCH", "/api/workflows/1", {
        name: "My Workflow", // Add a default name if not exists
        steps,
        edges: workflowEdges
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/1"] });
    },
    onError: (error) => {
      console.error('Error saving workflow:', error);
      toast({
        title: "Error saving workflow",
        description: "There was a problem saving your changes.",
        variant: "destructive",
      });
    }
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

            <TabsContent value="editor" className="h-[calc(100vh-10rem)]">
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