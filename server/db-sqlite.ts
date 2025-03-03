import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure db directory exists
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create SQLite database
const dbPath = path.join(dbDir, 'workflow.db');
const db = new Database(dbPath);

// Initialize tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS workflow_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    position TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL,
    is_configured INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS workflow_edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY(source_id) REFERENCES workflow_steps(id),
    FOREIGN KEY(target_id) REFERENCES workflow_steps(id)
  );
  
  CREATE TABLE IF NOT EXISTS workflow_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    error TEXT,
    outputs TEXT,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id)
  );
  
  CREATE TABLE IF NOT EXISTS step_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_execution_id INTEGER NOT NULL,
    step_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    error TEXT,
    input TEXT,
    output TEXT,
    FOREIGN KEY(workflow_execution_id) REFERENCES workflow_executions(id),
    FOREIGN KEY(step_id) REFERENCES workflow_steps(id)
  );
  
  CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL
  );
`);

// Add a default workflow if none exists
const workflowCount = db.prepare('SELECT COUNT(*) as count FROM workflows').get().count;
if (workflowCount === 0) {
  db.prepare(`
    INSERT INTO workflows (name, description, is_active) 
    VALUES (?, ?, ?)
  `).run('Default Workflow', 'Created automatically', 0);
}

// Helper to convert between snake_case and camelCase
function snakeToCamel(str) {
  return str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to convert row object keys
function convertRowKeys(row, toSnake = false) {
  if (!row) return row;
  
  const result = {};
  Object.keys(row).forEach(key => {
    const newKey = toSnake ? camelToSnake(key) : snakeToCamel(key);
    result[newKey] = row[key];
  });
  return result;
}

// SQLite storage implementation
export class SQLiteStorage {
  // Workflow operations
  async getWorkflow(id) {
    console.log('Getting workflow:', id);
    
    // Get the workflow
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id);
    if (!workflow) return undefined;
    
    // Get associated steps
    const steps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY "order"').all(id);
    
    // Get associated edges
    const edges = db.prepare('SELECT * FROM workflow_edges WHERE workflow_id = ?').all(id);
    
    // Convert to camelCase and parse JSON fields
    const camelWorkflow = convertRowKeys(workflow);
    
    const camelSteps = steps.map(step => {
      const camelStep = convertRowKeys(step);
      camelStep.position = JSON.parse(camelStep.position);
      camelStep.config = JSON.parse(camelStep.config);
      return camelStep;
    });
    
    const camelEdges = edges.map(edge => convertRowKeys(edge));
    
    // Return combined result
    return {
      ...camelWorkflow,
      steps: camelSteps,
      edges: camelEdges
    };
  }

  async listWorkflows() {
    const workflows = db.prepare('SELECT * FROM workflows ORDER BY id').all();
    return workflows.map(workflow => convertRowKeys(workflow));
  }

  async createWorkflow(workflow) {
    const stmt = db.prepare(`
      INSERT INTO workflows (name, description, is_active) 
      VALUES (?, ?, ?)
    `);
    
    const info = stmt.run(
      workflow.name, 
      workflow.description || null, 
      workflow.isActive ? 1 : 0
    );
    
    return this.getWorkflow(info.lastInsertRowid);
  }

  async updateWorkflow(id, updates) {
    console.log('Updating workflow with data:', updates);
    
    const workflowStmt = db.prepare(`
      UPDATE workflows 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    workflowStmt.run(
      updates.name || null, 
      updates.description || null, 
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
      id
    );
    
    // Handle steps if provided
    if (updates.steps) {
      console.log('Saving steps:', updates.steps);
      
      // Delete all edges first to prevent foreign key constraint failures
      db.prepare('DELETE FROM workflow_edges WHERE workflow_id = ?').run(id);
      
      // Then clear existing steps
      db.prepare('DELETE FROM workflow_steps WHERE workflow_id = ?').run(id);
      
      // Add new steps
      const stepStmt = db.prepare(`
        INSERT INTO workflow_steps (
          workflow_id, type, label, position, config, "order", is_configured
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      updates.steps.forEach((step, index) => {
        // Check if step is configured
        const stepConfig = step.config || {};
        const isConfigured = Object.keys(stepConfig).length > 0;
        
        stepStmt.run(
          id,
          step.type,
          step.label,
          JSON.stringify(step.position),
          JSON.stringify(stepConfig),
          step.order || index,
          isConfigured ? 1 : 0
        );
      });
    }
    
    // Handle edges if provided
    if (updates.edges) {
      console.log('Saving edges:', updates.edges);
      
      // Get all steps to map node IDs to step IDs
      const steps = db.prepare('SELECT id FROM workflow_steps WHERE workflow_id = ? ORDER BY "order"').all(id);
      
      // Clear existing edges
      db.prepare('DELETE FROM workflow_edges WHERE workflow_id = ?').run(id);
      
      // Add new edges if we have steps
      if (steps.length > 0) {
        const edgeStmt = db.prepare(`
          INSERT INTO workflow_edges (workflow_id, source_id, target_id)
          VALUES (?, ?, ?)
        `);
        
        updates.edges.forEach(edge => {
          // Map virtual IDs to actual database IDs
          const sourceIdIndex = parseInt(edge.sourceId) - 1;
          const targetIdIndex = parseInt(edge.targetId) - 1;
          
          if (sourceIdIndex >= 0 && sourceIdIndex < steps.length &&
              targetIdIndex >= 0 && targetIdIndex < steps.length) {
            edgeStmt.run(
              id,
              steps[sourceIdIndex].id,
              steps[targetIdIndex].id
            );
          }
        });
      }
    }
    
    return this.getWorkflow(id);
  }

  async deleteWorkflow(id) {
    // SQLite cascades deletes
    db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
  }

  // Steps and edges operations
  async getWorkflowSteps(workflowId) {
    const steps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY "order"').all(workflowId);
    
    return steps.map(step => {
      const camelStep = convertRowKeys(step);
      camelStep.position = JSON.parse(camelStep.position);
      camelStep.config = JSON.parse(camelStep.config);
      return camelStep;
    });
  }

  async getWorkflowEdges(workflowId) {
    const edges = db.prepare('SELECT * FROM workflow_edges WHERE workflow_id = ?').all(workflowId);
    return edges.map(edge => convertRowKeys(edge));
  }

  // Execution operations (simplified for this example)
  async createExecution(execution) {
    const stmt = db.prepare(`
      INSERT INTO workflow_executions (workflow_id, status, start_time, outputs)
      VALUES (?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      execution.workflowId,
      execution.status,
      execution.startTime.toISOString(),
      JSON.stringify(execution.outputs || {})
    );
    
    const inserted = db.prepare('SELECT * FROM workflow_executions WHERE id = ?').get(info.lastInsertRowid);
    return convertRowKeys(inserted);
  }

  async updateExecution(id, updates) {
    let setClause = '';
    const params = [];
    
    if (updates.status) {
      setClause += 'status = ?, ';
      params.push(updates.status);
    }
    
    if (updates.endTime) {
      setClause += 'end_time = ?, ';
      params.push(updates.endTime.toISOString());
    }
    
    if (updates.error) {
      setClause += 'error = ?, ';
      params.push(updates.error);
    }
    
    if (updates.outputs) {
      setClause += 'outputs = ?, ';
      params.push(JSON.stringify(updates.outputs));
    }
    
    if (setClause) {
      setClause = setClause.slice(0, -2); // Remove trailing comma and space
      
      const stmt = db.prepare(`
        UPDATE workflow_executions
        SET ${setClause}
        WHERE id = ?
      `);
      
      params.push(id);
      stmt.run(...params);
    }
    
    const updated = db.prepare('SELECT * FROM workflow_executions WHERE id = ?').get(id);
    return convertRowKeys(updated);
  }

  async getExecution(id) {
    const execution = db.prepare('SELECT * FROM workflow_executions WHERE id = ?').get(id);
    if (!execution) return undefined;
    
    const camelExecution = convertRowKeys(execution);
    
    // Parse JSON fields
    if (camelExecution.outputs) {
      camelExecution.outputs = JSON.parse(camelExecution.outputs);
    }
    
    return camelExecution;
  }
}

export const sqliteStorage = new SQLiteStorage();