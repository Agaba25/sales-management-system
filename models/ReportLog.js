import pool from "../config/db.js";

class ReportLog {
  // Insert a new report log entry
  static async create({ reportType, generatedBy = null, params = {} }) {
    const result = await pool.query(
      `INSERT INTO report_logs (report_type, generated_by, params)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reportType, generatedBy, params]
    );

    return result.rows[0];
  }
}

export default ReportLog;
