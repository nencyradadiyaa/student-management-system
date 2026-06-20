const { pool } = require('../config/db');

class Student {
  /**
   * Get total count of students
   * @returns {number}
   */
  static async getCount() {
    try {
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM students');
      return rows[0].count;
    } catch (error) {
      console.error('Error in Student.getCount:', error);
      throw error;
    }
  }

  /**
   * Get students with search, filters, sorting, and pagination
   * @param {Object} options
   * @returns {Object} { students, total, totalPages, currentPage }
   */
  static async getAll(options = {}) {
    const page = parseInt(options.page || '1', 10);
    const limit = parseInt(options.limit || '10', 10);
    const offset = (page - 1) * limit;

    const search = options.search || '';
    const sortBy = options.sortBy || 'full_name';
    const sortOrder = options.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    const departmentId = options.departmentId || '';
    const semester = options.semester || '';
    const gender = options.gender || '';

    // Secure sorting columns whitelist to prevent SQL Injection
    const allowedSortFields = {
      'full_name': 's.full_name',
      'enrollment_number': 's.enrollment_number',
      'email': 's.email',
      'semester': 's.semester',
      'department': 'd.name',
      'created_at': 's.created_at'
    };
    const sortColumn = allowedSortFields[sortBy] || 's.full_name';

    let queryParams = [];
    let countParams = [];
    
    // Construct base query filters
    let whereClauses = [];

    if (search) {
      whereClauses.push('(s.full_name LIKE ? OR s.enrollment_number LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)');
      const wildSearch = `%${search}%`;
      queryParams.push(wildSearch, wildSearch, wildSearch, wildSearch);
      countParams.push(wildSearch, wildSearch, wildSearch, wildSearch);
    }

    if (departmentId) {
      whereClauses.push('s.department_id = ?');
      queryParams.push(departmentId);
      countParams.push(departmentId);
    }

    if (semester) {
      whereClauses.push('s.semester = ?');
      queryParams.push(semester);
      countParams.push(semester);
    }

    if (gender) {
      whereClauses.push('s.gender = ?');
      queryParams.push(gender);
      countParams.push(gender);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    try {
      // 1. Get total records matching filters
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        ${whereSql}
      `;
      const [countRows] = await pool.query(countQuery, countParams);
      const total = countRows[0].count;
      const totalPages = Math.ceil(total / limit);

      // 2. Get paginated and sorted records
      const selectQuery = `
        SELECT s.*, d.name as department_name, d.code as department_code
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        ${whereSql}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      queryParams.push(limit, offset);
      const [students] = await pool.query(selectQuery, queryParams);

      return {
        students,
        total,
        totalPages,
        currentPage: page,
        limit
      };
    } catch (error) {
      console.error('Error in Student.getAll:', error);
      throw error;
    }
  }

  /**
   * Get a single student details including department by ID
   * @param {number} id 
   * @returns {Object|null}
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT s.*, d.name as department_name, d.code as department_code
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in Student.findById:', error);
      throw error;
    }
  }

  /**
   * Check duplicate enrollment number
   * @param {string} enrollmentNumber 
   * @param {number|null} excludeId 
   * @returns {boolean}
   */
  static async checkDuplicateEnrollment(enrollmentNumber, excludeId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM students WHERE enrollment_number = ?';
      const params = [enrollmentNumber];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query(query, params);
      return rows[0].count > 0;
    } catch (error) {
      console.error('Error in Student.checkDuplicateEnrollment:', error);
      throw error;
    }
  }

  /**
   * Check duplicate email address
   * @param {string} email 
   * @param {number|null} excludeId 
   * @returns {boolean}
   */
  static async checkDuplicateEmail(email, excludeId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM students WHERE email = ?';
      const params = [email];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await pool.query(query, params);
      return rows[0].count > 0;
    } catch (error) {
      console.error('Error in Student.checkDuplicateEmail:', error);
      throw error;
    }
  }

  /**
   * Insert a new student record
   * @param {Object} data 
   * @returns {number} Inserted ID
   */
  static async create(data) {
    const {
      full_name,
      enrollment_number,
      email,
      phone,
      gender,
      dob,
      department_id,
      semester,
      address,
      profile_pic
    } = data;

    try {
      const [result] = await pool.query(
        `INSERT INTO students (full_name, enrollment_number, email, phone, gender, dob, department_id, semester, address, profile_pic)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [full_name, enrollment_number, email, phone, gender, dob || null, department_id || null, semester, address, profile_pic || null]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error in Student.create:', error);
      throw error;
    }
  }

  /**
   * Update an existing student record
   * @param {number} id 
   * @param {Object} data 
   * @returns {boolean}
   */
  static async update(id, data) {
    const {
      full_name,
      enrollment_number,
      email,
      phone,
      gender,
      dob,
      department_id,
      semester,
      address,
      profile_pic
    } = data;

    try {
      let query = `
        UPDATE students 
        SET full_name = ?, enrollment_number = ?, email = ?, phone = ?, 
            gender = ?, dob = ?, department_id = ?, semester = ?, address = ?
      `;
      const params = [full_name, enrollment_number, email, phone, gender, dob || null, department_id || null, semester, address];

      if (profile_pic !== undefined) {
        query += ', profile_pic = ?';
        params.push(profile_pic);
      }

      query += ' WHERE id = ?';
      params.push(id);

      const [result] = await pool.query(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Student.update:', error);
      throw error;
    }
  }

  /**
   * Delete a student by ID
   * @param {number} id 
   * @returns {boolean}
   */
  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Student.delete:', error);
      throw error;
    }
  }

  /**
   * Get recently registered students
   * @param {number} limit 
   * @returns {Array}
   */
  static async getRecent(limit = 5) {
    try {
      const [rows] = await pool.query(
        `SELECT s.id, s.full_name, s.enrollment_number, s.created_at, d.name as department_name
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         ORDER BY s.id DESC
         LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (error) {
      console.error('Error in Student.getRecent:', error);
      throw error;
    }
  }

  /**
   * Get student metrics grouped by department
   * @returns {Array}
   */
  static async getDistributionByDepartment() {
    try {
      const [rows] = await pool.query(`
        SELECT d.name as department_name, d.code as department_code, COUNT(s.id) as student_count
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        GROUP BY d.id
        ORDER BY student_count DESC
      `);
      return rows;
    } catch (error) {
      console.error('Error in Student.getDistributionByDepartment:', error);
      throw error;
    }
  }

  /**
   * Get gender metrics
   * @returns {Array}
   */
  static async getDistributionByGender() {
    try {
      const [rows] = await pool.query(`
        SELECT gender, COUNT(*) as count
        FROM students
        GROUP BY gender
      `);
      return rows;
    } catch (error) {
      console.error('Error in Student.getDistributionByGender:', error);
      throw error;
    }
  }
}

module.exports = Student;
