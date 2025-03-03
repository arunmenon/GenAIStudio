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
import NodeConfig from "./node-config";

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
      const updatedNodes = nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      );
      setNodes(updatedNodes);
      onNodesChange(updatedNodes);
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
        {selectedNode && (
          <Panel position="top-right" className="bg-background rounded-lg shadow-lg">
            {showNodeConfig ? (
              <NodeConfig
                nodeId={selectedNode.id}
                nodeType={selectedNode.type as NodeType}
                config={selectedNode.data.config || {}}
                onConfigChange={onConfigChange}
                onNextStep={() => setShowNodeConfig(false)}
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