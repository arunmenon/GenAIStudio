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
import { nodeTypes } from "./node-types";
import { NextStepPanel } from "./next-step-panel";
import { type NodeType } from "@shared/types";

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
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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
        data: { label },
      };

      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);
      onNodesChange(updatedNodes);
    },
    [nodes, onNodesChange]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const newEdge: Edge = {
        id: `edge_${edges.length + 1}`,
        source: params.source,
        target: params.target,
      };

      const updatedEdges = [...edges, newEdge];
      setEdges(updatedEdges);
      onEdgesChange(updatedEdges);
    },
    [edges, onEdgesChange]
  );

  return (
    <div className="h-full w-full">
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
        onNodeClick={(_, node) => setSelectedNode(node)}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
      >
        <Background />
        <Controls />
        {selectedNode && (
          <Panel position="top-right" className="bg-white rounded-lg shadow-lg">
            <NextStepPanel 
              onAddNode={(type: string) => {
                const newNode: Node = {
                  id: `node_${nodes.length + 1}`,
                  type: type as NodeType,
                  position: {
                    x: selectedNode.position.x + 200,
                    y: selectedNode.position.y,
                  },
                  data: { label: type },
                };

                const updatedNodes = [...nodes, newNode];
                setNodes(updatedNodes);
                onNodesChange(updatedNodes);

                const newEdge: Edge = {
                  id: `edge_${edges.length + 1}`,
                  source: selectedNode.id,
                  target: newNode.id,
                };

                const updatedEdges = [...edges, newEdge];
                setEdges(updatedEdges);
                onEdgesChange(updatedEdges);
              }}
              onClose={() => setSelectedNode(null)}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}