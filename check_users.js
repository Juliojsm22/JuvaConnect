require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, name, role, company_id FROM users WHERE id IN (51, 54)').then(res => {
  console.log('USERS:', res.rows);
  pool.end();
});
