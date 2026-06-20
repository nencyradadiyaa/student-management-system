const Department = require('../models/Department');
const Attendance = require('../models/Attendance');

/**
 * Display the attendance marking dashboard and sheets
 */
exports.getAttendanceSheet = async (req, res) => {
  try {
    const departments = await Department.getAll();
    
    // Parse filters
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId, 10) : '';
    const semester = req.query.semester ? parseInt(req.query.semester, 10) : '';

    let students = [];
    
    // If a class is selected, fetch students and their attendance status
    if (departmentId && semester) {
      students = await Attendance.getAttendanceSheet(date, departmentId, semester);
    }

    res.render('attendance/index', {
      departments,
      students,
      filters: {
        date,
        departmentId,
        semester
      },
      title: 'Attendance Registry',
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error loading attendance sheet:', error);
    res.status(500).render('error', { message: 'Failed to retrieve class attendance grids.', error });
  }
};

/**
 * Save marked attendance sheet in bulk
 */
exports.postSaveAttendance = async (req, res) => {
  const { date, departmentId, semester, attendance, remarks } = req.body;

  if (!date || !departmentId || !semester) {
    return res.redirect('/attendance?error=Invalid class metadata provided.');
  }

  try {
    // If there are no students or no attendance checkboxes submitted
    if (!attendance || Object.keys(attendance).length === 0) {
      return res.redirect(`/attendance?date=${date}&departmentId=${departmentId}&semester=${semester}&success=No changes made (no student data provided).`);
    }

    // Format records for MySQL bulk insertion: [student_id, date, status, remarks]
    const records = [];
    for (const studentId of Object.keys(attendance)) {
      const status = attendance[studentId]; // 'Present', 'Absent', 'Late', 'Excused'
      const remark = remarks && remarks[studentId] ? remarks[studentId].trim() : '';
      
      records.push([
        parseInt(studentId, 10),
        date,
        status,
        remark
      ]);
    }

    await Attendance.bulkSave(records);
    res.redirect(`/attendance?date=${date}&departmentId=${departmentId}&semester=${semester}&success=Attendance saved successfully for ${date}!`);
  } catch (error) {
    console.error('Error saving attendance records:', error);
    res.redirect(`/attendance?date=${date}&departmentId=${departmentId}&semester=${semester}&error=Failed to write attendance records to database.`);
  }
};
