// Tests for GenAIStudio new features
import fetch from 'node-fetch';
import crypto from 'crypto';

const API_URL = 'http://localhost:8080/api';

// Utility functions
async function request(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// 1. Test Task Execution Engine with Conditional Logic
async function testConditionalWorkflow() {
  console.log('=== TESTING CONDITIONAL WORKFLOW ===');
  
  // Create a test workflow
  const workflow = await request('/workflows', 'POST', {
    name: 'Test Conditional Workflow',
    description: 'Tests the condition node and branching logic'
  });
  console.log(`Created workflow with ID: ${workflow.id}`);
  
  // Add steps
  console.log('Adding workflow steps...');
  
  // Create a workflow with trigger → code → condition → two branches
  const steps = [];
  const edges = [];
  
  // 1. Manual trigger
  const triggerStep = {
    workflowId: workflow.id,
    type: 'manual_trigger',
    label: 'Start',
    position: { x: 100, y: 100 },
    config: {},
    order: 1
  };
  const trigger = await request(`/workflows/${workflow.id}/steps`, 'POST', triggerStep);
  steps.push(trigger);
  
  // 2. Code node to generate random boolean
  const codeStep = {
    workflowId: workflow.id,
    type: 'code',
    label: 'Generate Random Value',
    position: { x: 100, y: 200 },
    config: {
      language: 'javascript',
      code: 'return { value: Math.random() > 0.5 };'
    },
    order: 2
  };
  const code = await request(`/workflows/${workflow.id}/steps`, 'POST', codeStep);
  steps.push(code);
  
  // Connect trigger to code
  const edge1 = {
    workflowId: workflow.id,
    sourceId: trigger.id,
    targetId: code.id
  };
  await request(`/workflows/${workflow.id}/edges`, 'POST', edge1);
  edges.push(edge1);
  
  // 3. Condition node
  const conditionStep = {
    workflowId: workflow.id,
    type: 'condition',
    label: 'Check Value',
    position: { x: 100, y: 300 },
    config: {
      condition: `inputs._all['${code.id}'].value`
    },
    order: 3
  };
  const condition = await request(`/workflows/${workflow.id}/steps`, 'POST', conditionStep);
  steps.push(condition);
  
  // Connect code to condition
  const edge2 = {
    workflowId: workflow.id,
    sourceId: code.id,
    targetId: condition.id
  };
  await request(`/workflows/${workflow.id}/edges`, 'POST', edge2);
  edges.push(edge2);
  
  // 4. True branch - AI node
  const trueStep = {
    workflowId: workflow.id,
    type: 'basic_llm_chain',
    label: 'True Path',
    position: { x: 0, y: 400 },
    config: {
      prompt: 'Generate a happy message'
    },
    order: 4
  };
  const truePath = await request(`/workflows/${workflow.id}/steps`, 'POST', trueStep);
  steps.push(truePath);
  
  // Connect condition to true path with label
  const edge3 = {
    workflowId: workflow.id,
    sourceId: condition.id,
    targetId: truePath.id,
    label: 'true'
  };
  await request(`/workflows/${workflow.id}/edges`, 'POST', edge3);
  edges.push(edge3);
  
  // 5. False branch - AI node
  const falseStep = {
    workflowId: workflow.id,
    type: 'basic_llm_chain',
    label: 'False Path',
    position: { x: 200, y: 400 },
    config: {
      prompt: 'Generate a sad message'
    },
    order: 5
  };
  const falsePath = await request(`/workflows/${workflow.id}/steps`, 'POST', falseStep);
  steps.push(falsePath);
  
  // Connect condition to false path with label
  const edge4 = {
    workflowId: workflow.id,
    sourceId: condition.id,
    targetId: falsePath.id,
    label: 'false'
  };
  await request(`/workflows/${workflow.id}/edges`, 'POST', edge4);
  edges.push(edge4);
  
  console.log(`Added ${steps.length} steps and ${edges.length} edges to workflow`);
  
  // Execute the workflow
  console.log('Executing workflow...');
  const execution = await request(`/workflows/${workflow.id}/execute`, 'POST');
  console.log(`Workflow execution started: ${execution.id}, status: ${execution.status}`);
  
  // Wait for execution to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check execution result
  const finalExecution = await request(`/executions/${execution.id}`, 'GET');
  console.log('Execution complete:');
  console.log(`Status: ${finalExecution.status}`);
  
  if (finalExecution.outputs) {
    console.log('Outputs:');
    // Check which branch was executed
    const didExecuteTruePath = finalExecution.outputs[truePath.id] !== undefined;
    const didExecuteFalsePath = finalExecution.outputs[falsePath.id] !== undefined;
    
    console.log(`True path executed: ${didExecuteTruePath}`);
    console.log(`False path executed: ${didExecuteFalsePath}`);
    
    // Verify only one path was taken
    if (didExecuteTruePath && !didExecuteFalsePath) {
      console.log('PASSED: Only true path was executed');
    } else if (!didExecuteTruePath && didExecuteFalsePath) {
      console.log('PASSED: Only false path was executed');
    } else {
      console.log('FAILED: Unexpected branch execution behavior');
    }
  }
  
  // Clean up - delete the workflow
  await request(`/workflows/${workflow.id}`, 'DELETE');
  console.log(`Deleted test workflow ${workflow.id}`);
  
  return finalExecution;
}

// 2. Test Webhook Trigger
async function testWebhookTrigger() {
  console.log('\n=== TESTING WEBHOOK TRIGGER ===');
  
  // Create a unique webhook ID
  const webhookId = `test-${Date.now()}`;
  const webhookSecret = 'test-secret';
  
  // Create a test workflow with webhook trigger
  const workflow = await request('/workflows', 'POST', {
    name: 'Test Webhook Workflow',
    description: 'Tests the webhook trigger functionality'
  });
  console.log(`Created workflow with ID: ${workflow.id}`);
  
  // Add webhook trigger step
  const webhookStep = {
    workflowId: workflow.id,
    type: 'webhook_trigger',
    label: 'Webhook Trigger',
    position: { x: 100, y: 100 },
    config: {
      webhookId,
      secret: webhookSecret
    },
    order: 1
  };
  const trigger = await request(`/workflows/${workflow.id}/steps`, 'POST', webhookStep);
  
  // Add AI step to process webhook data
  const aiStep = {
    workflowId: workflow.id,
    type: 'ai_transform',
    label: 'Process Webhook',
    position: { x: 100, y: 200 },
    config: {
      prompt: 'Summarize this webhook data: {{_all}}',
    },
    order: 2
  };
  const ai = await request(`/workflows/${workflow.id}/steps`, 'POST', aiStep);
  
  // Connect webhook to AI
  await request(`/workflows/${workflow.id}/edges`, 'POST', {
    workflowId: workflow.id,
    sourceId: trigger.id,
    targetId: ai.id
  });
  
  console.log(`Created webhook trigger with ID: ${webhookId}`);
  
  // Prepare webhook payload
  const payload = {
    event: 'test',
    data: {
      message: 'Hello from webhook test',
      timestamp: new Date().toISOString()
    }
  };
  
  // Calculate signature
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString)
    .digest('hex');
  
  // Trigger the webhook
  console.log('Triggering webhook...');
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature
    },
    body: payloadString
  };
  
  const response = await fetch(`${API_URL}/webhooks/${webhookId}`, options);
  
  if (response.ok) {
    const result = await response.json();
    console.log('Webhook triggered successfully');
    console.log(`Execution ID: ${result.executionId}`);
    
    // Wait for execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check execution result
    const execution = await request(`/executions/${result.executionId}`, 'GET');
    console.log(`Execution status: ${execution.status}`);
    
    if (execution.outputs && execution.outputs[ai.id]) {
      console.log('AI response:', execution.outputs[ai.id].substring(0, 100) + '...');
      console.log('PASSED: Webhook trigger executed workflow successfully');
    } else {
      console.log('FAILED: Webhook trigger did not produce expected output');
    }
  } else {
    console.log(`Webhook request failed: ${response.status} ${response.statusText}`);
    console.log('FAILED: Webhook trigger test');
  }
  
  // Clean up - delete the workflow
  await request(`/workflows/${workflow.id}`, 'DELETE');
  console.log(`Deleted test workflow ${workflow.id}`);
}

// 3. Test AI Integration
async function testAIIntegration() {
  console.log('\n=== TESTING AI INTEGRATION ===');
  
  // Create a test workflow
  const workflow = await request('/workflows', 'POST', {
    name: 'Test AI Integration',
    description: 'Tests all AI node types'
  });
  console.log(`Created workflow with ID: ${workflow.id}`);
  
  // Add trigger
  const triggerStep = {
    workflowId: workflow.id,
    type: 'manual_trigger',
    label: 'Start',
    position: { x: 100, y: 100 },
    config: {},
    order: 1
  };
  const trigger = await request(`/workflows/${workflow.id}/steps`, 'POST', triggerStep);
  
  // Test multiple AI node types
  const aiNodeTypes = [
    {
      type: 'basic_llm_chain',
      label: 'Basic LLM',
      config: {
        prompt: 'List 3 benefits of workflow automation',
        model: 'claude-3-7-sonnet-20250219',
        temperature: 0.7
      }
    },
    {
      type: 'sentiment_analysis',
      label: 'Sentiment Analysis',
      config: {
        input: `${trigger.id}`,
        model: 'claude-3-7-sonnet-20250219'
      }
    },
    {
      type: 'summarization_chain',
      label: 'Summarization',
      config: {
        input: `${trigger.id}`,
        length: 'short',
        model: 'claude-3-7-sonnet-20250219'
      }
    }
  ];
  
  const aiNodes = [];
  
  // Add all AI nodes
  for (let i = 0; i < aiNodeTypes.length; i++) {
    const nodeInfo = aiNodeTypes[i];
    const step = {
      workflowId: workflow.id,
      type: nodeInfo.type,
      label: nodeInfo.label,
      position: { x: 100, y: 200 + (i * 100) },
      config: nodeInfo.config,
      order: i + 2
    };
    
    const node = await request(`/workflows/${workflow.id}/steps`, 'POST', step);
    aiNodes.push(node);
    
    // Connect to trigger or previous node
    const sourceId = i === 0 ? trigger.id : aiNodes[i-1].id;
    await request(`/workflows/${workflow.id}/edges`, 'POST', {
      workflowId: workflow.id,
      sourceId,
      targetId: node.id
    });
  }
  
  console.log(`Added ${aiNodes.length} AI nodes to workflow`);
  
  // Execute the workflow
  console.log('Executing workflow...');
  const execution = await request(`/workflows/${workflow.id}/execute`, 'POST');
  console.log(`Workflow execution started: ${execution.id}, status: ${execution.status}`);
  
  // Wait for execution to complete (AI nodes can take time)
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check execution result
  const finalExecution = await request(`/executions/${execution.id}`, 'GET');
  console.log('Execution complete:');
  console.log(`Status: ${finalExecution.status}`);
  
  if (finalExecution.outputs) {
    let passed = true;
    
    // Check outputs of each AI node
    for (let i = 0; i < aiNodes.length; i++) {
      const nodeId = aiNodes[i].id;
      const nodeOutput = finalExecution.outputs[nodeId];
      
      console.log(`\nNode type: ${aiNodeTypes[i].type}`);
      
      if (nodeOutput) {
        if (typeof nodeOutput === 'object') {
          console.log('Output:', JSON.stringify(nodeOutput).substring(0, 100) + '...');
        } else {
          console.log('Output:', String(nodeOutput).substring(0, 100) + '...');
        }
        console.log('PASSED: Got output from AI node');
      } else {
        console.log('FAILED: No output from AI node');
        passed = false;
      }
    }
    
    if (passed) {
      console.log('\nOVERALL: All AI nodes produced output');
    } else {
      console.log('\nOVERALL: Some AI nodes failed');
    }
  }
  
  // Clean up - delete the workflow
  await request(`/workflows/${workflow.id}`, 'DELETE');
  console.log(`Deleted test workflow ${workflow.id}`);
}

// Main test runner
async function runTests() {
  try {
    console.log('Starting GenAIStudio feature tests...\n');
    
    // Run all tests
    await testConditionalWorkflow();
    await testWebhookTrigger();
    await testAIIntegration();
    
    console.log('\nAll tests complete!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run tests
runTests();