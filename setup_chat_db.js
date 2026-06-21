const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INT REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Tabla messages creada con éxito');
  } catch (err) {
    console.error('Error creando tabla messages:', err);
  } finally {
    pool.end();
  }
}

createTable();
