const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runSchema() {
  try {
    console.log('Reading schema.sql...');
    const schema = fs.readFileSync('schema.sql', 'utf8');
    console.log('Executing schema.sql...');
    await pool.query(schema);
    console.log('Schema executed successfully.');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await pool.end();
  }
}

runSchema();
