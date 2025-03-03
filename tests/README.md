# GenAIStudio Feature Tests

This directory contains tests for the new features implemented in GenAIStudio, specifically focused on:
1. Task Execution Engine with conditional branching and flow control
2. Webhook Triggers
3. AI Integration with multiple models and node types

## Running the Tests

### Prerequisites

Before running the tests, ensure:

1. The GenAIStudio server is running on http://localhost:8080
2. You have installed the required dependencies:
   ```
   npm install node-fetch crypto
   ```

### Execute Tests

Run the test script from the project root:

```bash
# Install the dependencies first if needed
npm install node-fetch crypto

# Run the tests
node tests/feature-tests.js
```

## Test Coverage

The tests verify:

### 1. Conditional Workflow Execution

Tests a workflow with:
- Code node that generates a random boolean
- Condition node that checks the value
- Different branches for true/false conditions
- Verification that only the appropriate branch executes

### 2. Webhook Triggers

Tests webhook functionality with:
- Creating a webhook trigger with secret key
- Signing webhook payloads with HMAC
- Triggering the workflow via webhook
- Verifying the workflow executes with webhook data

### 3. AI Integration

Tests multiple AI nodes:
- Basic LLM Chain
- Sentiment Analysis
- Summarization
- Verifies variable substitution in prompts
- Checks AI node output format

## Expected Results

When successful, the tests will output:
- Status messages for each test stage
- Execution IDs and results
- PASSED/FAILED status for each test case
- Samples of output from nodes

Each test automatically cleans up after itself by deleting the created workflows.

## Troubleshooting

If tests fail:
1. Verify the server is running and accessible
2. Check API credentials are configured correctly (for AI nodes)
3. Examine server logs for error messages
4. Ensure you have the latest code with all features implemented