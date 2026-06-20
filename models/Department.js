const { pool } = require('../config/db');

class Department {
  /**
   * Fetch all departments ordered alphabetically by name
   * @returns {Array}
   */
  static async getAll() {
    try {
      const [rows] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
      return rows;
    } catch (error) {
      console.error('Error in Department.getAll:', error);
      throw error;
    }
  }

  /**
   * Fetch a single department by its ID
   * @param {number} id 
   * @returns {Object|null}
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error in Department.findById:', error);
      throw error;
    }
  }
}

module.exports = Department;
