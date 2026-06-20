const mysql = require('mysql2/promise');
const alasql = require('alasql');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let mysqlPool = null;
let useSQLite = true; // Flag for alasql in-memory preview fallback

// Determine database engine on startup
if (
  process.env.DB_ENGINE === 'mysql' || 
  (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
) {
  useSQLite = false;
}

if (!useSQLite) {
  console.log('[Database Pool] Initializing MySQL pool...');
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
  });
} else {
  console.log('[Database Fallback] SQLite/MySQL unavailable. Activating pure-JS Alasql engine...');
  initializeAlasql();
}

/**
 * Handle bulk upsert on attendance logs for Alasql
 */
function runAttendanceUpsert(records) {
  for (const record of records) {
    const [student_id, date, status, remarks] = record;
    const exists = alasql('SELECT id FROM attendance WHERE student_id = ? AND date = ?', [student_id, date]);
    
    if (exists && exists.length > 0) {
      alasql('UPDATE attendance SET status = ?, remarks = ? WHERE student_id = ? AND date = ?', [status, remarks, student_id, date]);
    } else {
      alasql('INSERT INTO attendance (student_id, date, status, remarks) VALUES (?, ?, ?, ?)', [student_id, date, status, remarks]);
    }
  }
}

/**
 * Create tables and seed data synchronously in-memory at startup for Vercel preview
 */
function initializeAlasql() {
  try {
    // 1. Create Tables
    alasql('CREATE TABLE IF NOT EXISTS departments (id INT AUTOINCREMENT PRIMARY KEY, name STRING, code STRING)');
    alasql('CREATE TABLE IF NOT EXISTS admins (id INT AUTOINCREMENT PRIMARY KEY, username STRING, password STRING, email STRING, full_name STRING, created_at DATETIME)');
    alasql('CREATE TABLE IF NOT EXISTS students (id INT AUTOINCREMENT PRIMARY KEY, full_name STRING, enrollment_number STRING, email STRING, phone STRING, gender STRING, dob STRING, department_id INT, semester INT, address STRING, profile_pic STRING, created_at DATETIME)');
    alasql('CREATE TABLE IF NOT EXISTS attendance (id INT AUTOINCREMENT PRIMARY KEY, student_id INT, date STRING, status STRING, remarks STRING)');
    alasql('CREATE TABLE IF NOT EXISTS marks (id INT AUTOINCREMENT PRIMARY KEY, student_id INT, subject_name STRING, marks_obtained REAL, max_marks REAL, semester INT, exam_date STRING)');

    // 2. Seed Departments
    alasql("INSERT INTO departments (name, code) VALUES ('Computer Science & Engineering', 'CSE')");
    alasql("INSERT INTO departments (name, code) VALUES ('Electronics & Communication Engineering', 'ECE')");
    alasql("INSERT INTO departments (name, code) VALUES ('Information Technology', 'IT')");
    alasql("INSERT INTO departments (name, code) VALUES ('Mechanical Engineering', 'ME')");
    alasql("INSERT INTO departments (name, code) VALUES ('Civil Engineering', 'CE')");

    // 3. Seed Admin (admin / admin123)
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const nowStr = new Date().toISOString().replace('T', ' ').split('.')[0];
    alasql('INSERT INTO admins (username, password, email, full_name, created_at) VALUES (?, ?, ?, ?, ?)', 
      ['admin', hashedPassword, 'admin@college.edu', 'System Administrator', nowStr]
    );

    // 4. Seed Students
    const studentData = [
      ['Alice Smith', 'ENR2026001', 'alice.smith@college.edu', '9876543210', 'Female', '2004-05-14', 1, 4, '123 Tech Lane, Silicon Valley'],
      ['Bob Johnson', 'ENR2026002', 'bob.johnson@college.edu', '9876543211', 'Male', '2003-08-22', 2, 6, '456 Signal Road, Radio City'],
      ['Charlie Brown', 'ENR2026003', 'charlie.brown@college.edu', '9876543212', 'Male', '2005-01-10', 3, 2, '789 Web Street, Cyber City'],
      ['Diana Prince', 'ENR2026004', 'diana.prince@college.edu', '9876543213', 'Female', '2004-11-30', 4, 4, '101 Gear Ave, Engine Town'],
      ['Evan Wright', 'ENR2026005', 'evan.wright@college.edu', '9876543214', 'Male', '2003-12-05', 5, 6, '202 Bridge Boulevard, structureville'],
      ['Fiona Gallagher', 'ENR2026006', 'fiona.gallagher@college.edu', '9876543215', 'Female', '2004-03-18', 1, 4, '303 Python Street, Coder Park'],
      ['George Miller', 'ENR2026007', 'george.miller@college.edu', '9876543216', 'Male', '2005-07-25', 1, 2, '404 Terminal Way, Console Land']
    ];
    for (const s of studentData) {
      alasql('INSERT INTO students (full_name, enrollment_number, email, phone, gender, dob, department_id, semester, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [...s, nowStr]);
    }

    // 5. Seed Attendance Logs
    const dates = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
    for (let studentId = 1; studentId <= 7; studentId++) {
      for (let i = 0; i < dates.length; i++) {
        const statuses = ['Present', 'Present', 'Present', 'Absent', 'Late', 'Present', 'Present'];
        const status = statuses[(studentId + i) % statuses.length];
        const remarks = status === 'Absent' ? 'Sick leave' : status === 'Late' ? 'Traffic delay' : '';
        alasql('INSERT INTO attendance (student_id, date, status, remarks) VALUES (?, ?, ?, ?)', [studentId, dates[i], status, remarks]);
      }
    }

    // 6. Seed Marks
    const subjects = {
      1: ['Data Structures', 'Database Systems', 'Algorithms'],
      2: ['Digital Electronics', 'Signals and Systems', 'Microprocessors'],
      3: ['Web Engineering', 'Operating Systems', 'Networking'],
      4: ['Thermodynamics', 'Fluid Mechanics', 'Machine Design'],
      5: ['Surveying', 'Structural Analysis', 'Concrete Technology']
    };
    for (let studentId = 1; studentId <= 7; studentId++) {
      const deptId = studentId === 2 ? 2 : studentId === 3 ? 3 : studentId === 4 ? 4 : studentId === 5 ? 5 : 1;
      const sem = studentId === 3 || studentId === 7 ? 2 : studentId === 2 || studentId === 5 ? 6 : 4;
      const subList = subjects[deptId] || subjects[1];
      for (const sub of subList) {
        const marksObtained = (65 + Math.random() * 30).toFixed(2);
        alasql('INSERT INTO marks (student_id, subject_name, marks_obtained, max_marks, semester, exam_date) VALUES (?, ?, ?, ?, ?, ?)', 
          [studentId, sub, parseFloat(marksObtained), 100.00, sem, '2026-06-10']
        );
      }
    }
    console.log('[Alasql Setup] Seeded successfully.');
  } catch (error) {
    console.error('[Alasql Setup Error] Initializing failed:', error);
  }
}

const pool = {
  /**
   * Unified Query engine translating SQL based on active database engine (MySQL vs Alasql)
   */
  async query(sql, params = []) {
    if (!useSQLite) {
      try {
        const [rows] = await mysqlPool.query(sql, params);
        return [rows];
      } catch (err) {
        throw err;
      }
    } else {
      let sqliteSql = sql;
      let sqliteParams = [...params];

      // 1. Translate LIMIT ? OFFSET ? -> LIMIT val OFFSET val (Alasql binding workaround)
      if (sqliteSql.includes('LIMIT ? OFFSET ?')) {
        const offset = sqliteParams.pop();
        const limit = sqliteParams.pop();
        sqliteSql = sqliteSql.replace('LIMIT ? OFFSET ?', `LIMIT ${limit} OFFSET ${offset}`);
      } else if (sqliteSql.includes('LIMIT ?')) {
        const limit = sqliteParams.pop();
        sqliteSql = sqliteSql.replace('LIMIT ?', `LIMIT ${limit}`);
      }

      // 2. Translate ON DUPLICATE KEY UPDATE -> Custom bulk/single upserts
      if (sqliteSql.includes('ON DUPLICATE KEY UPDATE') || sqliteSql.includes('ON DUPLICATE KEY')) {
        if (sqliteSql.includes('VALUES ?') || sqliteSql.includes('VALUES  ?')) {
          const bulkData = params[0];
          if (Array.isArray(bulkData) && Array.isArray(bulkData[0])) {
            runAttendanceUpsert(bulkData);
            return [{ affectedRows: bulkData.length, insertId: 1 }];
          }
        } else {
          const [student_id, date, status, remarks] = params;
          runAttendanceUpsert([[student_id, date, status, remarks]]);
          return [{ affectedRows: 1, insertId: 1 }];
        }
      }

      // 3. Translate CURDATE() -> Current Date String
      if (sqliteSql.includes('CURDATE()')) {
        sqliteSql = sqliteSql.replace(/CURDATE\(\)/g, "'" + new Date().toISOString().split('T')[0] + "'");
      }

      // 4. Translate normal bulk inserts (departments)
      if (sqliteSql.includes('VALUES ?') || sqliteSql.includes('VALUES  ?')) {
        const bulkData = params[0];
        if (Array.isArray(bulkData) && Array.isArray(bulkData[0])) {
          let affectedRows = 0;
          const tableMatch = sqliteSql.match(/INSERT\s+INTO\s+(\w+)\s*\((.*?)\)/i);
          if (tableMatch) {
            const table = tableMatch[1];
            const cols = tableMatch[2];
            for (const row of bulkData) {
              const placeholders = row.map(() => '?').join(', ');
              alasql(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, row);
              affectedRows++;
            }
            return [{ affectedRows, insertId: 1 }];
          }
        }
      }

      // 4.5 Patch Alasql reserved keywords used as aliases (count, total)
      sqliteSql = sqliteSql.replace(/\b(as\s+)(count|total)\b/gi, '$1`$2`');

      // 5. Execute Alasql Query
      try {
        const rows = alasql(sqliteSql, sqliteParams);
        if (Array.isArray(rows)) {
          return [rows];
        } else {
          return [{ affectedRows: rows || 1, insertId: 1 }];
        }
      } catch (err) {
        console.error('[Alasql Query Error]:', err.message, 'SQL:', sqliteSql);
        throw err;
      }
    }
  },

  async getConnection() {
    if (!useSQLite) {
      return mysqlPool.getConnection();
    } else {
      return {
        query: this.query.bind(this),
        release: () => {}
      };
    }
  }
};

/**
 * Check active database status
 */
async function testConnection() {
  if (!useSQLite) {
    try {
      const conn = await mysqlPool.getConnection();
      conn.release();
      return true;
    } catch (e) {
      console.error('[MySQL Connection Error]:', e.message);
      return false;
    }
  }
  return true;
}

module.exports = {
  pool,
  testConnection,
  getUseSQLite: () => useSQLite
};
