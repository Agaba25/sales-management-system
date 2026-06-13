import fs from "fs";
import path from "path";
import pool from "../config/db.js";

const runMigrations = async () => {
  try {
    const sqlFiles = [
      "users.sql",
      "products.sql",
      "inventory.sql",
      "sales.sql",
      "report_logs.sql",
    ];

    for (const file of sqlFiles) {
      const filePath = path.join(process.cwd(), "database", file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`Running ${file}...`);
      await pool.query(sql);
      console.log(`✓ ${file} completed`);
    }

    console.log("\n✓ All migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();
