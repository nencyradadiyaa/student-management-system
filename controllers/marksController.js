const Student = require('../models/Student');
const Department = require('../models/Department');
const Marks = require('../models/Marks');

/**
 * Display the main marks administration dashboard with search filters
 */
exports.getMarksDashboard = async (req, res) => {
  try {
    const departments = await Department.getAll();

    // Parse filters
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId, 10) : '';
    const semester = req.query.semester ? parseInt(req.query.semester, 10) : '';
    
    let classPerformance = [];
    let students = [];

    // If department & semester are selected, fetch performance statistics and student list
    if (departmentId && semester) {
      classPerformance = await Marks.getClassPerformance(departmentId, semester);
      // Fetch matching student list
      const data = await Student.getAll({
        departmentId,
        semester,
        limit: 200 // Retrieve full class list
      });
      students = data.students;
    }

    res.render('marks/index', {
      departments,
      classPerformance,
      students,
      filters: {
        departmentId,
        semester
      },
      title: 'Marks Management',
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error loading marks dashboard:', error);
    res.status(500).render('error', { message: 'Failed to retrieve academic grades dashboard.', error });
  }
};

/**
 * Display specific student report sheet and inputs to add/edit marks
 */
exports.getStudentMarks = async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).render('error', { message: `Student ID ${studentId} not found.` });
    }

    const marksList = await Marks.getByStudentId(studentId);

    // Edit flag checks if admin clicked edit on a subject mark
    const editMarkId = req.query.editMarkId ? parseInt(req.query.editMarkId, 10) : null;
    let editMark = null;

    if (editMarkId) {
      editMark = marksList.find(m => m.id === editMarkId) || null;
    }

    res.render('marks/student-marks', {
      student,
      marksList,
      editMark,
      title: `Marks - ${student.full_name}`,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error loading student marks page:', error);
    res.status(500).render('error', { message: 'Failed to retrieve student report sheet.', error });
  }
};

/**
 * Handle addition or modification of subject grades
 */
exports.postSaveMark = async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const { id, subject_name, marks_obtained, max_marks, semester, exam_date } = req.body;

  // Basic validations
  if (!subject_name || subject_name.trim() === '') {
    return res.redirect(`/marks/student/${studentId}?error=Subject Name is required.`);
  }
  if (!marks_obtained || isNaN(marks_obtained)) {
    return res.redirect(`/marks/student/${studentId}?error=Valid Marks Obtained is required.`);
  }
  if (!max_marks || isNaN(max_marks)) {
    return res.redirect(`/marks/student/${studentId}?error=Valid Maximum Marks is required.`);
  }
  if (parseFloat(marks_obtained) > parseFloat(max_marks)) {
    return res.redirect(`/marks/student/${studentId}?error=Obtained marks cannot exceed maximum marks.`);
  }

  try {
    const markData = {
      id: id ? parseInt(id, 10) : null,
      student_id: studentId,
      subject_name: subject_name.trim(),
      marks_obtained: parseFloat(marks_obtained),
      max_marks: parseFloat(max_marks),
      semester: parseInt(semester, 10) || 1,
      exam_date: exam_date || null
    };

    await Marks.save(markData);
    const actionMsg = id ? 'updated' : 'recorded';
    res.redirect(`/marks/student/${studentId}?success=Grade for "${markData.subject_name}" has been ${actionMsg}!`);
  } catch (error) {
    console.error('Error saving mark record:', error);
    res.redirect(`/marks/student/${studentId}?error=Failed to write grade to database.`);
  }
};

/**
 * Handle deletion of subject grades
 */
exports.deleteMark = async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const markId = parseInt(req.params.id, 10);

  try {
    await Marks.delete(markId);
    res.redirect(`/marks/student/${studentId}?success=Grade record deleted successfully.`);
  } catch (error) {
    console.error('Error deleting mark:', error);
    res.redirect(`/marks/student/${studentId}?error=Failed to delete grade record.`);
  }
};
