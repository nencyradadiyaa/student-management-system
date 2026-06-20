const { pool } = require('../config/db');

class Admin {
  /**
   * Find an admin by username
   * @param {string} username 
   * @returns {Object|null}
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error in Admin.findByUsername:', error);
      throw error;
    }
  }

  /**
   * Find an admin by their ID (excludes password hash for security)
   * @param {number} id 
   * @returns {Object|null}
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, email, full_name, created_at FROM admins WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in Admin.findById:', error);
      throw error;
    }
  }
}

module.exports = Admin;
