import { useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  Panel,
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
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: WorkflowCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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
          onEdgesChange(updatedEdges);
        }}
        onConnect={(connection) => {
          const newEdge: Edge = {
            id: `e${edges.length + 1}`,
            source: connection.source!,
            target: connection.target!,
          };
          onEdgesChange([...edges, newEdge]);
        }}
        onNodeClick={(_, node) => setSelectedNode(node)}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        {selectedNode && (
          <Panel position="top-right" className="bg-white rounded-lg shadow-lg">
            <NextStepPanel 
              onAddNode={(type: string) => {
                const newNode: Node = {
                  id: `n${nodes.length + 1}`,
                  type: type as NodeType,
                  position: {
                    x: selectedNode.position.x + 200,
                    y: selectedNode.position.y,
                  },
                  data: { label: type },
                };
                onNodesChange([...nodes, newNode]);

                const newEdge: Edge = {
                  id: `e${edges.length + 1}`,
                  source: selectedNode.id,
                  target: newNode.id,
                };
                onEdgesChange([...edges, newEdge]);
              }}
              onClose={() => setSelectedNode(null)}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}