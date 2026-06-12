const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Agregando nuevas columnas a la tabla users...');
    const query = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS dob DATE,
      ADD COLUMN IF NOT EXISTS age INT,
      ADD COLUMN IF NOT EXISTS address VARCHAR(255);
    `;
    await pool.query(query);
    console.log('✅ Columnas agregadas exitosamente.');
    
    // Y actualizamos schema.sql también para que se refleje allí
  } catch (err) {
    console.error('❌ Error al modificar la base de datos:', err);
  } finally {
    pool.end();
  }
}

run();
