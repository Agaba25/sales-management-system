import fs from "fs";
import path from "path";

const SQL_FILES = [
  "users.sql",
  "products.sql",
  "inventory.sql",
  "sales.sql",
  "report_logs.sql",
];

export const runMigrations = async (pool) => {
  for (const file of SQL_FILES) {
    const filePath = path.join(process.cwd(), "database", file);
    const sql = fs.readFileSync(filePath, "utf8");

    console.log(`Running ${file}...`);
    await pool.query(sql);
    console.log(`${file} completed`);
  }
};
