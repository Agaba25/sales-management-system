import pool from "../config/db.js";
import { runMigrations } from "./migrations.js";

const initDatabase = async () => {
  try {
    await runMigrations(pool);
    console.log("\nAll migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

initDatabase();
