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

  static async findAll() {
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
       ORDER BY activity_logs.created_at DESC
       LIMIT 200`
    );

    return result.rows;
  }
}

export default ActivityLog;
