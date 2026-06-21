require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addImageColumn() {
  try {
    await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT');
    console.log('✅ Columna image_url agregada exitosamente.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    pool.end();
  }
}

addImageColumn();
