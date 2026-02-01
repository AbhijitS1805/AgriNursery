// Script to run schema.sql on your Railway PostgreSQL database
// Usage: node run-schema.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const schemaPath = path.join(__dirname, 'database', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

(async () => {
  try {
    await pool.query(schema);
    console.log('✅ Schema applied successfully!');
  } catch (err) {
    console.error('❌ Error applying schema:', err);
  } finally {
    await pool.end();
  }
})();
