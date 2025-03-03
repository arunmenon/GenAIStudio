import { WorkflowNode } from "@shared/types";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = "claude-3-7-sonnet-20250219";

// Initialize the Anthropic client
const getAnthropicClient = async () => {
  // Try to get API key from environment or from credentials storage
  let apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    // Look for API key in credentials storage
    const credentials = await storage.listCredentials();
    const anthropicCred = credentials.find(cred => cred.type === "anthropic");
    
    if (anthropicCred && anthropicCred.config.apiKey) {
      apiKey = anthropicCred.config.apiKey;
    } else {
      console.warn("No Anthropic API key found - using mock mode");
      apiKey = "demo_key";
    }
  }
  
  return new Anthropic({ apiKey });
};

interface AINodeOptions {
  inputs?: Record<string, any>;
  context?: Record<string, any>;
}

// Extract a value from an input object using a path expression
function getInputValue(inputs: Record<string, any>, path: string): any {
  if (!path) return undefined;
  
  // Handle expressions starting with $
  if (path.startsWith('$')) {
    path = path.substring(1);
  }
  
  if (path === '_all') return inputs;
  
  const parts = path.split('.');
  let current = inputs;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

// Process a template string with variable substitution from inputs
function processTemplate(template: string, inputs: Record<string, any>): string {
  // Replace {{variable}} patterns with values from inputs
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getInputValue(inputs, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

export async function executeAINode(node: WorkflowNode, options: AINodeOptions = {}): Promise<any> {
  const config = node.data.config || {};
  const inputs = options.inputs || {};
  const context = options.context || {};
  
  console.log('Executing AI node:', node.type, 'with config:', config);

  try {
    // Check if we're in demo mode (no API key)
    const demoMode = !process.env.ANTHROPIC_API_KEY && 
                    !(await storage.listCredentials()).some(c => c.type === "anthropic");
    
    if (demoMode) {
      return executeMockAINode(node, options);
    }
    
    // Get the Anthropic client
    const anthropic = await getAnthropicClient();
    
    // Get the model from config or use default
    const model = config.model || DEFAULT_MODEL;
    
    // Process based on node type
    switch (node.type) {
      case "basic_llm_chain": {
        // Process prompt template with input variables
        const prompt = processTemplate(config.prompt || "", inputs);
        
        // Call the Anthropic API
        const response = await anthropic.messages.create({
          model,
          max_tokens: config.maxTokens || 1000,
          temperature: config.temperature || 0.7,
          messages: [{ role: "user", content: prompt }]
        });
        
        // Return the response text
        return (response.content[0] as { text: string }).text;
      }

      case "ai_transform": {
        // Get input content from the specified input path
        const inputContent = getInputValue(inputs, config.input || "_all");
        const prompt = processTemplate(config.prompt || "Transform this: {{_all}}", {
          _all: inputContent
        });
        
        const response = await anthropic.messages.create({
          model,
          max_tokens: config.maxTokens || 1000,
          temperature: config.temperature || 0.7,
          messages: [{ role: "user", content: prompt }]
        });
        
        return (response.content[0] as { text: string }).text;
      }
      
      case "information_extractor": {
        // Get the input content to extract information from
        const inputContent = getInputValue(inputs, config.input || "_all");
        const schema = config.schema || "{}";
        
        const prompt = `
Extract the following information from the text below according to this JSON schema:
${schema}

Text to extract from:
${inputContent}

Return only valid JSON matching the schema.`;
        
        const response = await anthropic.messages.create({
          model,
          max_tokens: config.maxTokens || 1000,
          temperature: 0.1, // Lower temperature for more deterministic extraction
          messages: [{ role: "user", content: prompt }]
        });
        
        // Try to parse the response as JSON
        try {
          const text = (response.content[0] as { text: string }).text;
          // Extract JSON if it's wrapped in markdown code blocks
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                           text.match(/\{[\s\S]*\}/);
          
          return jsonMatch 
            ? JSON.parse(jsonMatch[1] || jsonMatch[0]) 
            : text;
        } catch (error) {
          console.error("Failed to parse JSON from extraction:", error);
          return (response.content[0] as { text: string }).text;
        }
      }
      
      case "qa_chain": {
        // Get the context content
        const contextContent = getInputValue(inputs, config.context || "_all");
        const question = processTemplate(config.question || "", inputs);
        
        const prompt = `
I need you to answer a question based on the following context:

Context:
${contextContent}

Question:
${question}

Please answer concisely and only based on the information provided in the context.`;
        
        const response = await anthropic.messages.create({
          model,
          max_tokens: config.maxTokens || 1000,
          temperature: config.temperature || 0.7,
          messages: [{ role: "user", content: prompt }]
        });
        
        return (response.content[0] as { text: string }).text;
      }
      
      case "sentiment_analysis": {
        // Get the text to analyze
        const text = getInputValue(inputs, config.input || "_all");
        
        const prompt = `
Analyze the sentiment of the following text. 
Return a JSON object with:
- "sentiment": (one of "positive", "negative", "neutral")
- "score": (number between -1.0 and 1.0, where -1.0 is very negative, 0 is neutral, and 1.0 is very positive)
- "explanation": (brief explanation of your analysis)

Text to analyze:
${text}

Return only valid JSON.`;
        
        const response = await anthropic.messages.create({
          model,
          max_tokens: config.maxTokens || 1000,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }]
        });
        
        // Try to parse the response as JSON
        try {
          const text = (response.content[0] as { text: string }).text;
          // Extract JSON if it's wrapped in markdown code blocks
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                           text.match(/\{[\s\S]*\}/);
          
          return jsonMatch 
            ? JSON.parse(jsonMatch[1] || jsonMatch[0]) 
            : { sentiment: "neutral", score: 0, explanation: text };
        } catch (error) {
          console.error("Failed to parse JSON from sentiment analysis:", error);
          return { 
            sentiment: "neutral", 
            score: 0, 
            explanation: (response.content[0] as { text: string }).text 
          };
        }
      }
      
      case "summarization_chain": {
        // Get the text to summarize
        const text = getInputValue(inputs, config.input || "_all");
        const length = config.length || "medium"; // short, medium, long
        
        const prompt = `
Summarize the following text in a ${length} length summary:

${text}

Provide only the summary, without any other explanation.`;
        
        const response = await anthropic.messages.create({
          model,
          max_tokens: config.maxTokens || 1000,
          temperature: config.temperature || 0.7,
          messages: [{ role: "user", content: prompt }]
        });
        
        return (response.content[0] as { text: string }).text;
      }
      
      case "text_classifier": {
        // Get the text to classify
        const text = getInputValue(inputs, config.input || "_all");
        const categories = config.categories || ["positive", "negative", "neutral"];
        
        const prompt = `
Classify the following text into one of these categories: ${categories.join(", ")}

Text to classify:
${text}

Return a JSON object with:
- "category": (the best matching category from the list)
- "confidence": (number between 0 and 1)
- "explanation": (brief explanation of your classification)

Return only valid JSON.`;
        
        const response = await anthropic.messages.create({
          model,
          max_tokens: config.maxTokens || 1000,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }]
        });
        
        // Try to parse the response as JSON
        try {
          const text = (response.content[0] as { text: string }).text;
          // Extract JSON if it's wrapped in markdown code blocks
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                           text.match(/\{[\s\S]*\}/);
          
          return jsonMatch 
            ? JSON.parse(jsonMatch[1] || jsonMatch[0]) 
            : { 
                category: categories[0], 
                confidence: 0.5, 
                explanation: text 
              };
        } catch (error) {
          console.error("Failed to parse JSON from classification:", error);
          return { 
            category: categories[0], 
            confidence: 0.5, 
            explanation: (response.content[0] as { text: string }).text 
          };
        }
      }

      default:
        throw new Error(`Unsupported AI node type: ${node.type}`);
    }
  } catch (error) {
    console.error(`Error executing AI node (${node.type}):`, error);
    throw new Error(`AI node execution failed: ${error.message}`);
  }
}

// Mock implementation for demo mode or when API key is not available
async function executeMockAINode(node: WorkflowNode, options: AINodeOptions = {}): Promise<any> {
  const config = node.data.config || {};
  const inputs = options.inputs || {};
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Executing MOCK AI node:', node.type);
  
  switch (node.type) {
    case "basic_llm_chain": {
      const prompt = processTemplate(config.prompt || "", inputs);
      return `[MOCK] Response to: ${prompt}`;
    }

    case "ai_transform": {
      const inputContent = getInputValue(inputs, config.input || "_all");
      return `[MOCK] Transformed: ${inputContent}`;
    }
    
    case "information_extractor": {
      return {
        name: "Mock Extraction",
        value: "This is a mock extraction result",
        confidence: 0.95
      };
    }
    
    case "qa_chain": {
      const question = processTemplate(config.question || "", inputs);
      return `[MOCK] Answer to question: ${question}`;
    }
    
    case "sentiment_analysis": {
      return {
        sentiment: "positive",
        score: 0.8,
        explanation: "This is a mock positive sentiment result"
      };
    }
    
    case "summarization_chain": {
      return "[MOCK] This is a mock summary of the input text.";
    }
    
    case "text_classifier": {
      const categories = config.categories || ["category1", "category2"];
      return {
        category: categories[0],
        confidence: 0.9,
        explanation: "This is a mock classification result"
      };
    }
    
    default:
      return "[MOCK] Response from unsupported AI node type";
  }
}
