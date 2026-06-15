const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Agregando nuevas columnas a la tabla companies...');
    const query = `
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS logo_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ruc VARCHAR(20),
      ADD COLUMN IF NOT EXISTS founded_year INT;
    `;
    await pool.query(query);
    console.log('✅ Columnas agregadas exitosamente a companies.');
  } catch (err) {
    console.error('❌ Error al modificar la base de datos:', err);
  } finally {
    pool.end();
  }
}

run();
