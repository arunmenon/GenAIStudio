import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./node-types";

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
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
