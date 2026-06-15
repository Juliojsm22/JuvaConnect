const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function alterDatabase() {
  try {
    console.log('⏳ Añadiendo columnas cv_file y cv_filename a la tabla users...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS cv_file TEXT,
      ADD COLUMN IF NOT EXISTS cv_filename VARCHAR(255);
    `);
    console.log('✅ Columnas añadidas exitosamente.');
  } catch (error) {
    console.error('❌ Error alterando la base de datos:', error.message);
  } finally {
    pool.end();
  }
}

alterDatabase();
