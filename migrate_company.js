const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS banner_url TEXT,
      ADD COLUMN IF NOT EXISTS gallery_urls TEXT,
      ADD COLUMN IF NOT EXISTS company_size VARCHAR(50),
      ADD COLUMN IF NOT EXISTS benefits TEXT,
      ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS twitter_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS video_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100)
    `);
    console.log('Company columns added successfully.');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    await pool.end();
  }
}

migrate();
