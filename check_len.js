require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, content, length(image_url) as img_len FROM messages').then(res => {
  console.log('MESSAGES:', res.rows);
  pool.end();
});
