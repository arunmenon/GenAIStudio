import { useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  Panel,
  addEdge,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes, canHaveNextStep } from "./node-types";
import { NextStepPanel } from "./next-step-panel";
import { type NodeType } from "@shared/types";
import NodeConfig from "./node-config";
import { Button } from "@/components/ui/button";

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
}

export default function WorkflowCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange,
  onEdgesChange,
}: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(true);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/reactflow");

      if (!data) return;

      const { type, label } = JSON.parse(data);
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `node_${nodes.length + 1}`,
        type: type as NodeType,
        position,
        data: { label, config: {} },
      };

      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);
      onNodesChange(updatedNodes);

      // Automatically select the newly created node
      setSelectedNode(newNode);
      setShowNodeConfig(true);
    },
    [nodes, onNodesChange]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const newEdge = {
        id: `edge_${edges.length + 1}`,
        source: params.source,
        target: params.target,
      };

      const updatedEdges = addEdge(newEdge, edges);
      setEdges(updatedEdges);
      onEdgesChange(updatedEdges);
    },
    [edges, onEdgesChange]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  }, []);

  const onConfigChange = useCallback(
    (nodeId: string, config: Record<string, any>) => {
      console.log('Canvas received config update:', nodeId, config);
      
      const updatedNodes = nodes.map((node) => {
        if (node.id === nodeId) {
          console.log('Updating node:', node.id, 'Type:', node.type);
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              config: config
            }
          };
          console.log('Updated node data:', updatedNode.data);
          return updatedNode;
        }
        return node;
      });
      
      setNodes(updatedNodes);
      onNodesChange(updatedNodes);
      
      console.log('All nodes after update:', updatedNodes);
    },
    [nodes, onNodesChange]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          const updatedNodes = [...nodes];
          changes.forEach((change) => {
            if (change.type === "position" && change.id) {
              const node = updatedNodes.find((n) => n.id === change.id);
              if (node && change.position) {
                node.position = change.position;
              }
            }
          });
          setNodes(updatedNodes);
          onNodesChange(updatedNodes);
        }}
        onEdgesChange={(changes) => {
          const updatedEdges = [...edges];
          changes.forEach((change) => {
            if (change.type === "remove" && change.id) {
              const index = updatedEdges.findIndex((e) => e.id === change.id);
              if (index !== -1) {
                updatedEdges.splice(index, 1);
              }
            }
          });
          setEdges(updatedEdges);
          onEdgesChange(updatedEdges);
        }}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
      >
        <Background />
        <Controls />
        
        {/* Debug Save Button */}
        <Panel position="top-left">
          <Button 
            onClick={() => {
              console.log("Manual save triggered");
              
              console.log("Nodes:", nodes);
              console.log("Edges:", edges);
              
              // Create steps and edges arrays for saving
              const stepsToSave = nodes.map((node, index) => {
                console.log(`Node ${index}:`, node.id, node.type, node.data);
                return {
                  type: node.type,
                  label: node.data.label || node.type,
                  position: node.position,
                  config: node.data.config || {},
                  order: index
                };
              });
              
              const edgesToSave = edges.map(edge => {
                console.log(`Edge:`, edge.id, edge.source, edge.target);
                // Extract numeric IDs from node_X format
                const sourceId = parseInt(edge.source.replace(/\D/g, '')) || 1;
                const targetId = parseInt(edge.target.replace(/\D/g, '')) || 2;
                return { sourceId, targetId };
              });
              
              console.log("Saving steps:", stepsToSave);
              console.log("Saving edges:", edgesToSave);
              
              // Directly trigger a save by calling the API
              fetch('/api/workflows/1', {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: "My Workflow",
                  steps: stepsToSave,
                  edges: edgesToSave
                })
              })
              .then(response => response.json())
              .then(data => {
                console.log("Save successful:", data);
                alert("Workflow saved successfully!");
              })
              .catch(error => {
                console.error("Save failed:", error);
                alert("Failed to save workflow: " + error.message);
              });
            }}
            variant="outline"
          >
            DEBUG: Save Workflow
          </Button>
        </Panel>
        
        {selectedNode && (
          <Panel position="top-right" className="bg-background rounded-lg shadow-lg">
            {showNodeConfig ? (
              <NodeConfig
                nodeId={selectedNode.id}
                nodeType={selectedNode.type as NodeType}
                config={selectedNode.data.config || {}}
                onConfigChange={onConfigChange}
                // Only provide onNextStep for nodes that can have next steps
                onNextStep={canHaveNextStep(selectedNode.type) ? () => setShowNodeConfig(false) : undefined}
              />
            ) : (
              <NextStepPanel
                onAddNode={(type: string) => {
                  const newNode: Node = {
                    id: `node_${nodes.length + 1}`,
                    type: type as NodeType,
                    position: {
                      x: selectedNode.position.x + 200,
                      y: selectedNode.position.y,
                    },
                    data: { label: type, config: {} },
                  };

                  const updatedNodes = [...nodes, newNode];
                  setNodes(updatedNodes);
                  onNodesChange(updatedNodes);

                  const newEdge: Edge = {
                    id: `edge_${edges.length + 1}`,
                    source: selectedNode.id,
                    target: newNode.id,
                  };

                  const updatedEdges = addEdge(newEdge, edges);
                  setEdges(updatedEdges);
                  onEdgesChange(updatedEdges);

                  // Select the newly created node
                  setSelectedNode(newNode);
                  setShowNodeConfig(true);
                }}
                onClose={() => {
                  setSelectedNode(null);
                  setShowNodeConfig(true);
                }}
              />
            )}
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}