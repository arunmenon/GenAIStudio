import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Play, Trash2, ArrowRight } from "lucide-react";

export default function WorkflowList() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");

  // Create mock data for demo
  const mockWorkflows = [
    {
      id: 1,
      name: "My Workflow",
      description: "A sample workflow with schedule trigger and code",
      isActive: false,
      createdAt: "2025-03-03T06:53:07.000Z",
      updatedAt: "2025-03-03T07:45:44.000Z"
    }
  ];

  // Query to fetch workflows
  const workflowsQuery = useQuery({
    queryKey: ["/api/workflows"],
    queryFn: async () => {
      const response = await fetch("/api/workflows");
      if (!response.ok) {
        throw new Error("Failed to fetch workflows");
      }
      return response.json();
    }
  });

  // Real workflow creation
  const createWorkflowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newWorkflowName || "Untitled Workflow",
          description: newWorkflowDescription || ""
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to create workflow");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Workflow created",
        description: "Your new workflow has been created.",
      });
      setIsCreateDialogOpen(false);
      setNewWorkflowName("");
      setNewWorkflowDescription("");
      
      // Invalidate query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      
      // Navigate to the new workflow
      setLocation(`/workflows/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error creating workflow",
        description: "There was a problem creating your workflow.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete workflow
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      return await fetch(`/api/workflows/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow deleted",
        description: "The workflow has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting workflow",
        description: "There was a problem deleting the workflow.",
        variant: "destructive",
      });
    },
  });

  // Handle create workflow
  const handleCreateWorkflow = () => {
    createWorkflowMutation.mutate();
  };

  // Handle delete workflow
  const handleDeleteWorkflow = (id: number) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      deleteWorkflowMutation.mutate(id);
    }
  };

  // Handle edit workflow
  const handleEditWorkflow = (id: number) => {
    setLocation(`/workflows/${id}`);
  };

  // Handle run workflow
  const handleRunWorkflow = async (id: number) => {
    try {
      await queryClient.apiRequest("POST", `/api/workflows/${id}/execute`);
      toast({
        title: "Workflow executed",
        description: "The workflow has been triggered successfully.",
      });
    } catch (error) {
      toast({
        title: "Error executing workflow",
        description: "There was a problem triggering the workflow.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Workflow
        </Button>
      </div>

      {workflowsQuery.isLoading ? (
        <div className="flex justify-center py-10">Loading workflows...</div>
      ) : workflowsQuery.isError ? (
        <div className="flex justify-center py-10 text-red-500">
          Error loading workflows
        </div>
      ) : workflowsQuery.data?.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">No workflows yet</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create your first workflow
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflowsQuery.data?.map((workflow) => (
            <Card key={workflow.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{workflow.name}</CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Last updated: {new Date(workflow.updatedAt).toLocaleString()}
                  </p>
                  <p className="mt-2 flex items-center">
                    Status: {" "}
                    <span className={`ml-2 flex items-center ${workflow.isActive ? "text-green-500" : "text-yellow-500"}`}>
                      {workflow.isActive ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" size="sm" onClick={() => handleEditWorkflow(workflow.id)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRunWorkflow(workflow.id)}>
                    <Play className="h-4 w-4 mr-2" /> Run
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleDeleteWorkflow(workflow.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new workflow</DialogTitle>
            <DialogDescription>
              Add a name and description for your new workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Workflow"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this workflow does"
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkflow} disabled={createWorkflowMutation.isPending}>
              {createWorkflowMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}