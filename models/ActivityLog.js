import pool from "../config/db.js";

class ActivityLog {
  static async create({ userId, role, action, description, entityType = null, entityId = null }) {
    const result = await pool.query(
      `INSERT INTO activity_logs
        (user_id, role, action, description, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, role, action, description, entityType, entityId]
    );

    return result.rows[0];
  }

  static async findFiltered({ start, end, action = "", role = "", search = "", limit = 200 } = {}) {
    const clauses = [];
    const values = [];

    if (start) {
      values.push(start);
      clauses.push(`activity_logs.created_at >= $${values.length}`);
    }

    if (end) {
      values.push(end);
      clauses.push(`activity_logs.created_at < $${values.length}`);
    }

    if (action) {
      values.push(action);
      clauses.push(`activity_logs.action = $${values.length}`);
    }

    if (role) {
      values.push(role);
      clauses.push(`activity_logs.role = $${values.length}`);
    }

    if (search?.trim()) {
      values.push(`%${search.trim()}%`);
      clauses.push(
        `(activity_logs.description ILIKE $${values.length}
          OR activity_logs.action ILIKE $${values.length}
          OR users.name ILIKE $${values.length}
          OR users.email ILIKE $${values.length})`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    values.push(limit);

    const result = await pool.query(
      `SELECT
         activity_logs.id,
         activity_logs.user_id,
         activity_logs.role,
         activity_logs.action,
         activity_logs.description,
         activity_logs.entity_type,
         activity_logs.entity_id,
         activity_logs.created_at,
         users.name AS user_name,
         users.email AS user_email
       FROM activity_logs
       LEFT JOIN users ON activity_logs.user_id = users.id
       ${where}
       ORDER BY activity_logs.created_at DESC
       LIMIT $${values.length}`,
      values
    );

    return result.rows;
  }

  static async countInRange(start, end) {
    const clauses = [];
    const values = [];

    if (start) {
      values.push(start);
      clauses.push(`created_at >= $${values.length}`);
    }

    if (end) {
      values.push(end);
      clauses.push(`created_at < $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT COUNT(*)::int AS total FROM activity_logs ${where}`,
      values
    );

    return result.rows[0].total;
  }

  static async listActions() {
    const result = await pool.query(
      `SELECT DISTINCT action FROM activity_logs ORDER BY action ASC`
    );
    return result.rows.map((row) => row.action);
  }

  static async findAll() {
    return this.findFiltered({ limit: 200 });
  }
}

export default ActivityLog;
