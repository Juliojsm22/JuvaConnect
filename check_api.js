const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-juva-key-2026';
const token = jwt.sign({ id: 54, email: 'mammamia@test.com', role: 'company' }, JWT_SECRET);

// We can just query directly exactly like the endpoint does
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  SELECT * FROM messages
  WHERE (sender_id = $1 AND receiver_id = $2)
     OR (sender_id = $2 AND receiver_id = $1)
  ORDER BY created_at ASC
`, [54, 51]).then(res => {
  console.log('API WOULD RETURN:', res.rows);
  pool.end();
});
