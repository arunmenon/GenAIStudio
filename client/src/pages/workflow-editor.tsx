// Last modified: 2025-03-03 11:30:00
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation, useRoute } from "wouter";
import { type Workflow } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowCanvas from "@/components/workflow/canvas";
import Sidebar from "@/components/workflow/sidebar";
import { Play, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Node, type Edge } from "reactflow";

export default function WorkflowEditor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("editor");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowName, setWorkflowName] = useState("Loading workflow...");

  // Get workflow ID from URL
  const [, params] = useLocation();
  const workflowId = params?.id || "1";

  // Collection of mock workflows for demo
  const mockWorkflows = {
    "1": {
      id: 1,
      name: "My Workflow",
      description: "A sample workflow with schedule trigger and code",
      isActive: false,
      steps: [
        {
          id: 1,
          workflowId: 1,
          type: "schedule_trigger",
          label: "Schedule",
          position: { x: 197, y: 178 },
          config: {
            frequency: "daily",
            hour: "4",
            minute: "7",
            timezone: "UTC",
            schedule: "07 04 * * *"
          },
          order: 0,
          is_configured: 1
        },
        {
          id: 2,
          workflowId: 1,
          type: "code",
          label: "code",
          position: { x: 397, y: 178 },
          config: {},
          order: 1,
          is_configured: 0
        }
      ],
      edges: [
        {
          id: 1,
          workflowId: 1,
          sourceId: 1,
          targetId: 2
        }
      ],
      createdAt: "2025-03-03T06:53:07.000Z",
      updatedAt: "2025-03-03T07:45:44.000Z"
    }
  };
  
  // Add a generic template for new workflows
  const newWorkflowTemplate = (id) => ({
    id: parseInt(id),
    name: "New Workflow",
    description: "A newly created workflow",
    isActive: false,
    steps: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Query to fetch workflow data (use mock for demo)
  const workflowQuery = useQuery({
    queryKey: [`/api/workflows/${workflowId}`],
    queryFn: () => {
      // Get the mock workflow or create a new template if it doesn't exist
      return mockWorkflows[workflowId] || newWorkflowTemplate(workflowId);
    },
    onSuccess: (data) => {
      if (data) {
        console.log("Loaded workflow data:", data);
        
        // Set workflow name
        setWorkflowName(data.name || "Untitled Workflow");
        
        // Load workflow data from database
        const workflowSteps = data.steps || [];
        const workflowEdges = data.edges || [];
        
        console.log("Loaded steps:", workflowSteps);
        console.log("Loaded edges:", workflowEdges);

        if (workflowSteps.length > 0) {
          // Convert database format to ReactFlow format
          const flowNodes = workflowSteps.map(step => ({
            id: `node_${step.id}`,
            type: step.type,
            position: step.position,
            data: { 
              label: step.label,
              config: step.config
            }
          }));
          
          console.log("Created flow nodes:", flowNodes);
          setNodes(flowNodes);
          
          if (workflowEdges.length > 0) {
            const flowEdges = workflowEdges.map(edge => ({
              id: `edge_${edge.id}`,
              source: `node_${edge.sourceId}`,
              target: `node_${edge.targetId}`,
              type: 'default'
            }));
            
            console.log("Created flow edges:", flowEdges);
            setEdges(flowEdges);
          }
        }
      }
    }
  });

  // Mutation to save workflow changes - mock for demo
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Convert ReactFlow format to database format
      const steps = nodes.map((node, index) => {
        // Get order from node ID or use index as fallback
        let order;
        try {
          order = node.id.startsWith('node_') 
            ? parseInt(node.id.replace('node_', '')) 
            : index;
        } catch (e) {
          order = index; // Fallback to index if parsing fails
        }

        return {
          type: node.type,
          label: node.data.label,
          position: node.position,
          config: node.data.config || {},
          order: order
        };
      });

      const workflowEdges = edges.map(edge => {
        // Strip 'node_' prefix if it exists
        const sourceId = edge.source.startsWith('node_') 
          ? parseInt(edge.source.replace('node_', '')) 
          : parseInt(edge.source);
          
        const targetId = edge.target.startsWith('node_') 
          ? parseInt(edge.target.replace('node_', '')) 
          : parseInt(edge.target);
          
        return {
          sourceId,
          targetId
        };
      });

      console.log('Saving workflow with steps:', steps); // Debug log
      console.log('Saving workflow edges:', workflowEdges);
      
      // Update our mock workflows collection
      mockWorkflows[workflowId] = {
        id: parseInt(workflowId),
        name: workflowName,
        description: "Updated workflow",
        isActive: false,
        steps,
        edges: workflowEdges,
        createdAt: mockWorkflows[workflowId]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Updated mock workflow:', mockWorkflows[workflowId]);
      return mockWorkflows[workflowId];
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

  // Mock execution for demo
  const executeMutation = useMutation({
    mutationFn: async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Executing workflow:', workflowId);
      return { status: "success" };
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/workflows")}
            className="mr-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        
          <h1 className="text-2xl font-bold">{workflowName}</h1>
          
          <Button
            variant={nodes.length > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || nodes.length === 0}
            className={nodes.length > 0 ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Workflow"}
          </Button>
          
          <Button
            size="sm"
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending || nodes.length === 0}
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