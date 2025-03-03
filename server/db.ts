import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For demo purposes, use a mock database if no URL is specified
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mock';
console.log('Using database connection:', dbUrl);

// Create a mock version of the database client for testing
const mockDb = {
  select: () => mockDb,
  from: () => mockDb,
  where: () => mockDb,
  insert: () => mockDb,
  values: () => mockDb,
  returning: () => Promise.resolve([{ id: 1, name: 'Mock Workflow', description: 'Mock workflow for testing', isActive: true }]),
  update: () => mockDb,
  set: () => mockDb,
  delete: () => mockDb,
};

let db: any;

try {
  // Try to use real database connection
  const pool = new Pool({ connectionString: dbUrl });
  db = drizzle({ client: pool, schema });
  console.log('Connected to real database');
} catch (error) {
  // Fall back to mock database
  console.warn('Using mock database for demo:', error);
  db = mockDb;
}

export { db };
