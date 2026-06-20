const { pool } = require('../config/db');

class Marks {
  /**
   * Fetch marks records for a specific student, grouped by semester
   * @param {number} studentId 
   * @returns {Array}
   */
  static async getByStudentId(studentId) {
    try {
      const [rows] = await pool.query(
        `SELECT id, subject_name, marks_obtained, max_marks, semester, exam_date 
         FROM marks 
         WHERE student_id = ? 
         ORDER BY semester DESC, subject_name ASC`,
        [studentId]
      );
      return rows;
    } catch (error) {
      console.error('Error in Marks.getByStudentId:', error);
      throw error;
    }
  }

  /**
   * Save (insert or update) a mark entry
   * @param {Object} markData - { student_id, subject_name, marks_obtained, max_marks, semester, exam_date }
   * @returns {number} Inserted or updated record ID
   */
  static async save(markData) {
    const { id, student_id, subject_name, marks_obtained, max_marks, semester, exam_date } = markData;

    try {
      if (id) {
        // Update existing record
        await pool.query(
          `UPDATE marks 
           SET subject_name = ?, marks_obtained = ?, max_marks = ?, semester = ?, exam_date = ? 
           WHERE id = ?`,
          [subject_name, marks_obtained, max_marks, semester, exam_date || null, id]
        );
        return id;
      } else {
        // Insert new record
        const [result] = await pool.query(
          `INSERT INTO marks (student_id, subject_name, marks_obtained, max_marks, semester, exam_date) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [student_id, subject_name, marks_obtained, max_marks, semester, exam_date || null]
        );
        return result.insertId;
      }
    } catch (error) {
      console.error('Error in Marks.save:', error);
      throw error;
    }
  }

  /**
   * Delete a marks record by ID
   * @param {number} id 
   * @returns {boolean}
   */
  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM marks WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Marks.delete:', error);
      throw error;
    }
  }

  /**
   * Get average performance statistics for students (e.g. overall GPA/average grade percentage)
   * @returns {number}
   */
  static async getAverageGrade() {
    try {
      const [rows] = await pool.query(`
        SELECT AVG(marks_obtained / max_marks * 100) as average_grade 
        FROM marks
      `);
      return rows[0].average_grade ? parseFloat(rows[0].average_grade).toFixed(1) : '0.0';
    } catch (error) {
      console.error('Error in Marks.getAverageGrade:', error);
      throw error;
    }
  }

  /**
   * Get subject performance analysis for a department and semester
   * @param {number} departmentId 
   * @param {number} semester 
   * @returns {Array}
   */
  static async getClassPerformance(departmentId, semester) {
    try {
      const query = `
        SELECT m.subject_name, 
               AVG(m.marks_obtained) as avg_obtained, 
               MAX(m.marks_obtained) as max_obtained,
               MIN(m.marks_obtained) as min_obtained,
               COUNT(m.id) as students_tested
        FROM marks m
        JOIN students s ON m.student_id = s.id
        WHERE s.department_id = ? AND s.semester = ?
        GROUP BY m.subject_name
        ORDER BY m.subject_name ASC
      `;
      const [rows] = await pool.query(query, [departmentId, semester]);
      return rows;
    } catch (error) {
      console.error('Error in Marks.getClassPerformance:', error);
      throw error;
    }
  }
}

module.exports = Marks;
