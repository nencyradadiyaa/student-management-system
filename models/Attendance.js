const { pool } = require('../config/db');

class Attendance {
  /**
   * Save or update attendance records in bulk
   * @param {Array} records - Array of [student_id, date, status, remarks]
   * @returns {boolean}
   */
  static async bulkSave(records) {
    if (!records || records.length === 0) return true;

    try {
      const query = `
        INSERT INTO attendance (student_id, date, status, remarks)
        VALUES ?
        ON DUPLICATE KEY UPDATE 
          status = VALUES(status),
          remarks = VALUES(remarks)
      `;
      const [result] = await pool.query(query, [records]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Attendance.bulkSave:', error);
      throw error;
    }
  }

  /**
   * Get attendance for a class (department and semester) on a specific date
   * Includes all students, mapping active attendance status if recorded.
   * @param {string} date - YYYY-MM-DD
   * @param {number} departmentId 
   * @param {number} semester 
   * @returns {Array}
   */
  static async getAttendanceSheet(date, departmentId, semester) {
    try {
      const query = `
        SELECT s.id as student_id, s.full_name, s.enrollment_number, 
               a.status, a.remarks, a.date
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
        WHERE s.department_id = ? AND s.semester = ?
        ORDER BY s.full_name ASC
      `;
      const [rows] = await pool.query(query, [date, departmentId, semester]);
      return rows;
    } catch (error) {
      console.error('Error in Attendance.getAttendanceSheet:', error);
      throw error;
    }
  }

  /**
   * Get attendance statistics for the dashboard
   * @returns {Object} { totalDays, overallPresentPercent, todayStats }
   */
  static async getGlobalStats() {
    try {
      // 1. Overall attendance rate
      const overallQuery = `
        SELECT 
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count
        FROM attendance
      `;
      const [overallRows] = await pool.query(overallQuery);
      const total = overallRows[0].total_records || 0;
      const present = overallRows[0].present_count || 0;
      const overallRate = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';

      // 2. Today's attendance distribution
      const todayQuery = `
        SELECT status, COUNT(*) as count 
        FROM attendance 
        WHERE date = CURDATE()
        GROUP BY status
      `;
      const [todayRows] = await pool.query(todayQuery);
      
      const todayStats = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
      todayRows.forEach(row => {
        if (todayStats[row.status] !== undefined) {
          todayStats[row.status] = row.count;
        }
      });

      return {
        overallRate,
        todayStats
      };
    } catch (error) {
      console.error('Error in Attendance.getGlobalStats:', error);
      throw error;
    }
  }

  /**
   * Get a detailed attendance history for a single student
   * @param {number} studentId 
   * @returns {Object} { history, statistics }
   */
  static async getStudentHistory(studentId) {
    try {
      const [history] = await pool.query(
        'SELECT date, status, remarks FROM attendance WHERE student_id = ? ORDER BY date DESC',
        [studentId]
      );

      const stats = { Total: history.length, Present: 0, Absent: 0, Late: 0, Excused: 0, Rate: '0.0' };
      
      history.forEach(h => {
        if (stats[h.status] !== undefined) {
          stats[h.status]++;
        }
      });

      if (stats.Total > 0) {
        // Attendance percentage counts Present and Late (as partial/full attendance)
        const attended = stats.Present + stats.Late + stats.Excused;
        stats.Rate = ((attended / stats.Total) * 100).toFixed(1);
      } else {
        stats.Rate = '100.0';
      }

      return {
        history,
        stats
      };
    } catch (error) {
      console.error('Error in Attendance.getStudentHistory:', error);
      throw error;
    }
  }
}

module.exports = Attendance;
