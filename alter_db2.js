const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Agregando columna cedula a la tabla users...');
    const query = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);
    `;
    await pool.query(query);
    console.log('✅ Columna cedula agregada exitosamente.');
  } catch (err) {
    console.error('❌ Error al modificar la base de datos:', err);
  } finally {
    pool.end();
  }
}

run();
