const { pool, testConnection, getUseSQLite } = require('./config/db');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function seed() {
  console.log('Starting database seeding...');
  
  // 1. Determine active database engine (MySQL or SQLite fallback)
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('Fatal Database error: Unable to initialize MySQL or SQLite fallback. Seeding aborted.');
    process.exit(1);
  }

  const useSQLite = getUseSQLite();

  if (!useSQLite) {
    // -------------------------------------------------------------
    // MySQL Schema Setup
    // -------------------------------------------------------------
    console.log('[MySQL Seeder] Preparing MySQL server database schema...');
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      const dbName = process.env.DB_NAME || 'student_management';
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.query(`USE \`${dbName}\``);

      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          await connection.query(statement);
        }
        console.log('[MySQL Seeder] Database tables verified.');
      }
    } catch (err) {
      console.error('[MySQL Seeder Error] Setup failed:', err);
      process.exit(1);
    } finally {
      if (connection) await connection.end();
    }
  } else {
    // -------------------------------------------------------------
    // SQLite Schema Setup
    // -------------------------------------------------------------
    console.log('[SQLite Seeder] Preparing local SQLite database tables...');
    try {
      // Create tables sequentially in SQLite
      await pool.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          code TEXT UNIQUE NOT NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          full_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name TEXT NOT NULL,
          enrollment_number TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT DEFAULT NULL,
          gender TEXT NOT NULL DEFAULT 'Male',
          dob TEXT DEFAULT NULL,
          department_id INTEGER DEFAULT NULL,
          semester INTEGER NOT NULL DEFAULT 1,
          address TEXT DEFAULT NULL,
          profile_pic TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Present',
          remarks TEXT DEFAULT NULL,
          UNIQUE (student_id, date),
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS marks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          subject_name TEXT NOT NULL,
          marks_obtained REAL NOT NULL,
          max_marks REAL NOT NULL DEFAULT 100.00,
          semester INTEGER NOT NULL,
          exam_date TEXT DEFAULT NULL,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
      `);

      console.log('[SQLite Seeder] SQLite tables created/verified successfully.');
    } catch (err) {
      console.error('[SQLite Seeder Error] Setup failed:', err);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------
  // Data Seeding (Agnostic - translated by config/db.js)
  // -------------------------------------------------------------
  try {
    // 1. Seed Departments
    const [departments] = await pool.query('SELECT COUNT(*) as count FROM departments');
    const deptCount = departments[0].count;

    if (deptCount === 0) {
      console.log('Seeding departments...');
      const departmentData = [
        ['Computer Science & Engineering', 'CSE'],
        ['Electronics & Communication Engineering', 'ECE'],
        ['Information Technology', 'IT'],
        ['Mechanical Engineering', 'ME'],
        ['Civil Engineering', 'CE']
      ];
      await pool.query('INSERT INTO departments (name, code) VALUES ?', [departmentData]);
      console.log('Departments seeded.');
    } else {
      console.log('Departments already exist.');
    }

    // Get department list for references
    const [dbDepartments] = await pool.query('SELECT id, code FROM departments');
    const deptMap = {};
    dbDepartments.forEach(d => {
      deptMap[d.code] = d.id;
    });

    // 2. Seed Admin
    const [admins] = await pool.query('SELECT COUNT(*) as count FROM admins');
    const adminCount = admins[0].count;

    if (adminCount === 0) {
      console.log('Seeding admin account...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO admins (username, password, email, full_name) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin@college.edu', 'System Administrator']
      );
      console.log('Admin account created: username "admin", password "admin123"');
    } else {
      console.log('Admin account already exists.');
    }

    // 3. Seed Students
    const [students] = await pool.query('SELECT COUNT(*) as count FROM students');
    const studentCount = students[0].count;

    if (studentCount === 0) {
      console.log('Seeding students...');
      const studentData = [
        ['Alice Smith', 'ENR2026001', 'alice.smith@college.edu', '9876543210', 'Female', '2004-05-14', deptMap['CSE'], 4, '123 Tech Lane, Silicon Valley'],
        ['Bob Johnson', 'ENR2026002', 'bob.johnson@college.edu', '9876543211', 'Male', '2003-08-22', deptMap['ECE'], 6, '456 Signal Road, Radio City'],
        ['Charlie Brown', 'ENR2026003', 'charlie.brown@college.edu', '9876543212', 'Male', '2005-01-10', deptMap['IT'], 2, '789 Web Street, Cyber City'],
        ['Diana Prince', 'ENR2026004', 'diana.prince@college.edu', '9876543213', 'Female', '2004-11-30', deptMap['ME'], 4, '101 Gear Ave, Engine Town'],
        ['Evan Wright', 'ENR2026005', 'evan.wright@college.edu', '9876543214', 'Male', '2003-12-05', deptMap['CE'], 6, '202 Bridge Boulevard, structureville'],
        ['Fiona Gallagher', 'ENR2026006', 'fiona.gallagher@college.edu', '9876543215', 'Female', '2004-03-18', deptMap['CSE'], 4, '303 Python Street, Coder Park'],
        ['George Miller', 'ENR2026007', 'george.miller@college.edu', '9876543216', 'Male', '2005-07-25', deptMap['CSE'], 2, '404 Terminal Way, Console Land']
      ];

      for (const s of studentData) {
        await pool.query(
          `INSERT INTO students (full_name, enrollment_number, email, phone, gender, dob, department_id, semester, address)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          s
        );
      }
      console.log('Students seeded.');
    } else {
      console.log('Students already exist.');
    }

    // Get student IDs for logging attendance/marks
    const [dbStudents] = await pool.query('SELECT id, department_id, semester FROM students');

    // 4. Seed Attendance Logs
    const [attendance] = await pool.query('SELECT COUNT(*) as count FROM attendance');
    const attendanceCount = attendance[0].count;

    if (attendanceCount === 0) {
      console.log('Seeding attendance logs...');
      const statuses = ['Present', 'Present', 'Present', 'Absent', 'Late', 'Present', 'Present'];
      const dates = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];

      for (const student of dbStudents) {
        for (let i = 0; i < dates.length; i++) {
          const status = statuses[(student.id + i) % statuses.length];
          const remarks = status === 'Absent' ? 'Sick leave' : status === 'Late' ? 'Traffic delay' : '';
          
          await pool.query(
            'INSERT INTO attendance (student_id, date, status, remarks) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status)',
            [student.id, dates[i], status, remarks]
          );
        }
      }
      console.log('Attendance seeded.');
    } else {
      console.log('Attendance logs already exist.');
    }

    // 5. Seed Marks/Grades
    const [marks] = await pool.query('SELECT COUNT(*) as count FROM marks');
    const marksCount = marks[0].count;

    if (marksCount === 0) {
      console.log('Seeding marks...');
      const subjects = {
        CSE: ['Data Structures', 'Database Systems', 'Algorithms'],
        ECE: ['Digital Electronics', 'Signals and Systems', 'Microprocessors'],
        IT: ['Web Engineering', 'Operating Systems', 'Networking'],
        ME: ['Thermodynamics', 'Fluid Mechanics', 'Machine Design'],
        CE: ['Surveying', 'Structural Analysis', 'Concrete Technology']
      };

      // Find department codes
      const deptCodeMap = {};
      dbDepartments.forEach(d => {
        deptCodeMap[d.id] = d.code;
      });

      for (const student of dbStudents) {
        const code = deptCodeMap[student.department_id] || 'CSE';
        const subList = subjects[code] || subjects['CSE'];

        for (const sub of subList) {
          const marksObtained = (60 + Math.random() * 38).toFixed(2);
          await pool.query(
            'INSERT INTO marks (student_id, subject_name, marks_obtained, max_marks, semester, exam_date) VALUES (?, ?, ?, ?, ?, ?)',
            [student.id, sub, marksObtained, 100.00, student.semester, '2026-06-10']
          );
        }
      }
      console.log('Marks seeded.');
    } else {
      console.log('Marks already exist.');
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error during data seeding:', error);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
