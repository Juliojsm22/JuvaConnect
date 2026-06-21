require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addSubPlan() {
  try {
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'basico'");
    console.log("Column subscription_plan added successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error adding column:", err);
    process.exit(1);
  }
}

addSubPlan();
