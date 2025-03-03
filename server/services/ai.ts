import { WorkflowNode } from "@shared/types";
import Anthropic from "@anthropic-ai/sdk";

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "default_key"
});

export async function executeAINode(node: WorkflowNode): Promise<any> {
  const config = node.data.config || {};

  switch (node.type) {
    case "basic_llm_chain": {
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: config.maxTokens || 1000,
        messages: [{ 
          role: "user", 
          content: config.prompt || "Hello" 
        }]
      });
      return response.content[0].text;
    }

    case "ai_transform": {
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        system: config.systemPrompt || "Transform the input according to instructions",
        max_tokens: config.maxTokens || 1000,
        messages: [{
          role: "user",
          content: config.input || ""
        }]
      });
      return response.content[0].text;
    }

    default:
      throw new Error(`Unknown AI node type: ${node.type}`);
  }
}
