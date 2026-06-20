const Student = require('../models/Student');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const { sendWelcomeEmail } = require('../utils/mailer');
const fs = require('fs');
const path = require('path');

/**
 * Display list of students with filtering, sorting, searching, and pagination
 */
exports.getStudents = async (req, res) => {
  try {
    const departments = await Department.getAll();
    
    // Parse filter options from request queries
    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      search: req.query.search || '',
      sortBy: req.query.sortBy || 'full_name',
      sortOrder: req.query.sortOrder || 'ASC',
      departmentId: req.query.departmentId || '',
      semester: req.query.semester || '',
      gender: req.query.gender || ''
    };

    const data = await Student.getAll(options);

    res.render('students/index', {
      students: data.students,
      total: data.total,
      totalPages: data.totalPages,
      currentPage: data.currentPage,
      limit: data.limit,
      departments,
      filters: options,
      title: 'Student Directory',
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error loading students list:', error);
    res.status(500).render('error', { message: 'Failed to retrieve students catalog.', error });
  }
};

/**
 * Display student profile creation form
 */
exports.getCreateStudent = async (req, res) => {
  try {
    const departments = await Department.getAll();
    res.render('students/create', { 
      departments, 
      errors: null, 
      formData: {},
      title: 'Add Student' 
    });
  } catch (error) {
    console.error('Error loading create student page:', error);
    res.status(500).render('error', { message: 'Failed to retrieve departments metadata.', error });
  }
};

/**
 * Handle student creation form submission
 */
exports.postCreateStudent = async (req, res) => {
  const departments = await Department.getAll();
  const formData = req.body;
  const errors = [];

  // Validation
  if (!formData.full_name || formData.full_name.trim() === '') {
    errors.push('Full Name is required.');
  }
  if (!formData.enrollment_number || formData.enrollment_number.trim() === '') {
    errors.push('Enrollment Number is required.');
  }
  if (!formData.email || formData.email.trim() === '') {
    errors.push('Email address is required.');
  }

  try {
    // Unique checks
    if (formData.enrollment_number) {
      const duplicateEnr = await Student.checkDuplicateEnrollment(formData.enrollment_number);
      if (duplicateEnr) {
        errors.push('Enrollment Number is already registered.');
      }
    }

    if (formData.email) {
      const duplicateEmail = await Student.checkDuplicateEmail(formData.email);
      if (duplicateEmail) {
        errors.push('Email address is already registered.');
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      // Clean up uploaded image if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.render('students/create', { departments, errors, formData, title: 'Add Student' });
    }

    // Prep data for insertion
    const newStudentData = {
      full_name: formData.full_name.trim(),
      enrollment_number: formData.enrollment_number.trim(),
      email: formData.email.trim(),
      phone: formData.phone ? formData.phone.trim() : null,
      gender: formData.gender || 'Male',
      dob: formData.dob || null,
      department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
      semester: formData.semester ? parseInt(formData.semester, 10) : 1,
      address: formData.address ? formData.address.trim() : null,
      profile_pic: req.file ? req.file.filename : null
    };

    // Insert student
    await Student.create(newStudentData);

    // Send welcome email (asynchronous, do not block thread)
    sendWelcomeEmail(newStudentData.email, newStudentData.full_name, newStudentData.enrollment_number);

    res.redirect('/students?success=Student registered successfully!');
  } catch (error) {
    console.error('Error creating student:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).render('error', { message: 'Database save operation failed.', error });
  }
};

/**
 * Display student profile edit form
 */
exports.getEditStudent = async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).render('error', { message: `Student ID ${studentId} not found.` });
    }
    const departments = await Department.getAll();
    res.render('students/edit', { 
      student, 
      departments, 
      errors: null, 
      title: `Edit - ${student.full_name}` 
    });
  } catch (error) {
    console.error('Error loading student edit form:', error);
    res.status(500).render('error', { message: 'Failed to load edit form.', error });
  }
};

/**
 * Handle student update form submission
 */
exports.postEditStudent = async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const departments = await Department.getAll();
  const formData = req.body;
  const errors = [];

  // Validation
  if (!formData.full_name || formData.full_name.trim() === '') {
    errors.push('Full Name is required.');
  }
  if (!formData.enrollment_number || formData.enrollment_number.trim() === '') {
    errors.push('Enrollment Number is required.');
  }
  if (!formData.email || formData.email.trim() === '') {
    errors.push('Email address is required.');
  }

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).render('error', { message: `Student ID ${studentId} not found.` });
    }

    // Unique checks
    if (formData.enrollment_number) {
      const duplicateEnr = await Student.checkDuplicateEnrollment(formData.enrollment_number, studentId);
      if (duplicateEnr) {
        errors.push('Enrollment Number is already registered by another student.');
      }
    }

    if (formData.email) {
      const duplicateEmail = await Student.checkDuplicateEmail(formData.email, studentId);
      if (duplicateEmail) {
        errors.push('Email address is already registered by another student.');
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      // Re-populate original photo for visual rendering
      formData.profile_pic = student.profile_pic;
      formData.id = studentId;
      return res.render('students/edit', { student: formData, departments, errors, title: `Edit - ${formData.full_name}` });
    }

    // Prep data for update
    const updatedData = {
      full_name: formData.full_name.trim(),
      enrollment_number: formData.enrollment_number.trim(),
      email: formData.email.trim(),
      phone: formData.phone ? formData.phone.trim() : null,
      gender: formData.gender || 'Male',
      dob: formData.dob || null,
      department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
      semester: formData.semester ? parseInt(formData.semester, 10) : 1,
      address: formData.address ? formData.address.trim() : null
    };

    if (req.file) {
      updatedData.profile_pic = req.file.filename;

      // Delete old photo if it exists
      if (student.profile_pic) {
        const oldPath = path.join(__dirname, '..', 'public', 'uploads', student.profile_pic);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    await Student.update(studentId, updatedData);
    res.redirect(`/students?success=Student ${updatedData.full_name} updated successfully!`);
  } catch (error) {
    console.error('Error updating student:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).render('error', { message: 'Database update operation failed.', error });
  }
};

/**
 * Handle student record deletion
 */
exports.deleteStudent = async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.redirect('/students?error=Student record not found.');
    }

    // Delete profile photo
    if (student.profile_pic) {
      const picPath = path.join(__dirname, '..', 'public', 'uploads', student.profile_pic);
      if (fs.existsSync(picPath)) {
        fs.unlinkSync(picPath);
      }
    }

    await Student.delete(studentId);
    res.redirect('/students?success=Student record deleted successfully.');
  } catch (error) {
    console.error('Error deleting student:', error);
    res.redirect('/students?error=Failed to delete student record due to dependent data references.');
  }
};

/**
 * Display a detailed profile page for a single student (collating attendance, marks, personal info)
 */
exports.getStudentProfile = async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).render('error', { message: `Student ID ${studentId} not found.` });
    }

    // Fetch dependent statistics
    const attendanceData = await Attendance.getStudentHistory(studentId);
    const marksList = await Marks.getByStudentId(studentId);

    // Calculate overall GPA/performance metrics
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let overallPercentage = null;

    marksList.forEach(m => {
      totalMarksObtained += parseFloat(m.marks_obtained);
      totalMaxMarks += parseFloat(m.max_marks);
    });

    if (totalMaxMarks > 0) {
      overallPercentage = ((totalMarksObtained / totalMaxMarks) * 100).toFixed(1);
    }

    res.render('students/show', {
      student,
      attendance: attendanceData,
      marks: marksList,
      academics: {
        totalMarksObtained,
        totalMaxMarks,
        overallPercentage
      },
      title: `${student.full_name} Profile`
    });
  } catch (error) {
    console.error('Error loading student profile:', error);
    res.status(500).render('error', { message: 'Failed to construct profile dashboard.', error });
  }
};
