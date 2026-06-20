const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Export filtered student list to Excel format
 */
exports.exportToExcel = async (req, res) => {
  try {
    // Read the filters to export exactly what is filtered, or everything
    const options = {
      search: req.query.search || '',
      departmentId: req.query.departmentId || '',
      semester: req.query.semester || '',
      gender: req.query.gender || '',
      sortBy: req.query.sortBy || 'full_name',
      sortOrder: req.query.sortOrder || 'ASC',
      page: 1,
      limit: 1000000 // Huge limit to fetch all filtered records
    };

    const data = await Student.getAll(options);
    
    // Transform rows for user-friendly spreadsheet columns
    const studentsData = data.students.map((s, index) => ({
      'S.No': index + 1,
      'Full Name': s.full_name,
      'Enrollment Number': s.enrollment_number,
      'Email Address': s.email,
      'Phone Number': s.phone || 'N/A',
      'Gender': s.gender,
      'Date of Birth': s.dob || 'N/A',
      'Department': s.department_name || 'N/A',
      'Semester': s.semester,
      'Address': s.address || 'N/A',
      'Registration Date': s.created_at ? s.created_at.split(' ')[0] : 'N/A'
    }));

    // Create Worksheet and Workbook
    const worksheet = XLSX.utils.json_to_sheet(studentsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Directory');

    // Adjust column widths automatically
    const maxColWidths = [];
    studentsData.forEach(row => {
      Object.keys(row).forEach((key, colIndex) => {
        const val = row[key] ? row[key].toString() : '';
        maxColWidths[colIndex] = Math.max(maxColWidths[colIndex] || 10, val.length + 3, key.length + 3);
      });
    });
    worksheet['!cols'] = maxColWidths.map(w => ({ wch: w }));

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set Response Headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student_directory_export.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Excel Export Error:', error);
    res.status(500).render('error', { message: 'Failed to generate Excel report.', error });
  }
};

/**
 * Generate and download a high-fidelity PDF report card and profile for a student
 */
exports.exportToPDF = async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).render('error', { message: 'Student record not found.' });
    }

    const attendanceData = await Attendance.getStudentHistory(studentId);
    const marksList = await Marks.getByStudentId(studentId);

    // Calculate academic stats
    let totalMarks = 0;
    let totalMax = 0;
    marksList.forEach(m => {
      totalMarks += parseFloat(m.marks_obtained);
      totalMax += parseFloat(m.max_marks);
    });
    const percentage = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 'N/A';

    // Initialize PDF document
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="student_report_${student.enrollment_number}.pdf"`);
    doc.pipe(res);

    // 1. PDF Header / Banner
    doc.rect(50, 45, 512, 60).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(18).text('COLLEGE STUDENT REGISTRY SYSTEM', 70, 58, { align: 'left' });
    doc.fontSize(10).fillColor('#94a3b8').text('Official Student Profile and Report Sheet', 70, 82);
    doc.fontSize(8).fillColor('#94a3b8').text(`Generated on: ${new Date().toLocaleDateString()}`, 400, 82, { align: 'right' });

    // 2. Personal Profile Section
    doc.moveDown(4);
    doc.fillColor('#0f172a').fontSize(14).text('Personal Details', 50, 125, { underline: true });
    
    // Draw profile picture if available on disk
    let photoY = 150;
    let detailsStartX = 50;
    let photoPlaced = false;

    if (student.profile_pic) {
      const photoPath = path.join(__dirname, '..', 'public', 'uploads', student.profile_pic);
      if (fs.existsSync(photoPath)) {
        try {
          doc.image(photoPath, 462, 150, { width: 100, height: 100 });
          photoPlaced = true;
        } catch (e) {
          console.warn('Failed to embed profile pic in PDF:', e.message);
        }
      }
    }

    if (!photoPlaced) {
      // Draw a grey placeholder square
      doc.rect(462, 150, 100, 100).fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(8).text('No Photo', 495, 195);
    }

    // Student attributes list
    doc.fillColor('#0f172a').fontSize(10);
    const attributes = [
      ['Full Name:', student.full_name],
      ['Enrollment Number:', student.enrollment_number],
      ['Email Address:', student.email],
      ['Phone Number:', student.phone || 'N/A'],
      ['Gender:', student.gender],
      ['Date of Birth:', student.dob || 'N/A'],
      ['Department:', student.department_name || 'N/A'],
      ['Semester:', `Semester ${student.semester}`],
      ['Address:', student.address || 'N/A']
    ];

    let currentY = 150;
    attributes.forEach(attr => {
      doc.fillColor('#475569').text(attr[0], detailsStartX, currentY, { width: 120 });
      doc.fillColor('#0f172a').text(attr[1], detailsStartX + 120, currentY, { width: 280 });
      currentY += 18;
    });

    // 3. Attendance Analytics Section
    const attendY = Math.max(currentY + 25, 275);
    doc.fillColor('#0f172a').fontSize(14).text('Attendance Summary', 50, attendY, { underline: true });
    
    // Draw tiny summary tiles
    const statsY = attendY + 25;
    doc.rect(50, statsY, 110, 45).fill('#f8fafc');
    doc.fillColor('#475569').fontSize(8).text('Total Logs', 60, statsY + 10);
    doc.fillColor('#0f172a').fontSize(14).text(attendanceData.stats.Total.toString(), 60, statsY + 20);

    doc.rect(170, statsY, 110, 45).fill('#f8fafc');
    doc.fillColor('#475569').fontSize(8).text('Days Present', 180, statsY + 10);
    doc.fillColor('#16a34a').fontSize(14).text(attendanceData.stats.Present.toString(), 180, statsY + 20);

    doc.rect(290, statsY, 110, 45).fill('#f8fafc');
    doc.fillColor('#475569').fontSize(8).text('Days Absent', 300, statsY + 10);
    doc.fillColor('#dc2626').fontSize(14).text(attendanceData.stats.Absent.toString(), 300, statsY + 20);

    doc.rect(410, statsY, 152, 45).fill('#e0e7ff');
    doc.fillColor('#4f46e5').fontSize(8).text('Attendance Percentage', 420, statsY + 10);
    doc.fillColor('#4f46e5').fontSize(14).text(`${attendanceData.stats.Rate}%`, 420, statsY + 20);

    // 4. Report Card / Marks Section
    const reportY = statsY + 70;
    doc.fillColor('#0f172a').fontSize(14).text('Academic Report Card', 50, reportY, { underline: true });

    // Table Header
    const tableHeaderY = reportY + 25;
    doc.rect(50, tableHeaderY, 512, 20).fill('#e2e8f0');
    doc.fillColor('#334155').fontSize(9);
    doc.text('Subject Name', 60, tableHeaderY + 6, { width: 230 });
    doc.text('Semester', 290, tableHeaderY + 6, { width: 60, align: 'center' });
    doc.text('Marks Obtained', 360, tableHeaderY + 6, { width: 90, align: 'center' });
    doc.text('Max Marks', 460, tableHeaderY + 6, { width: 90, align: 'center' });

    let tableY = tableHeaderY + 20;
    
    if (marksList.length === 0) {
      doc.rect(50, tableY, 512, 25).fill('#f8fafc');
      doc.fillColor('#64748b').fontSize(10).text('No examination grades recorded.', 60, tableY + 8, { align: 'left' });
      tableY += 25;
    } else {
      marksList.forEach((m, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(50, tableY, 512, 22).fill(rowBg);
        
        doc.fillColor('#0f172a').fontSize(9);
        doc.text(m.subject_name, 60, tableY + 6, { width: 230 });
        doc.text(m.semester.toString(), 290, tableY + 6, { width: 60, align: 'center' });
        doc.text(parseFloat(m.marks_obtained).toFixed(1), 360, tableY + 6, { width: 90, align: 'center' });
        doc.text(parseFloat(m.max_marks).toFixed(1), 460, tableY + 6, { width: 90, align: 'center' });
        
        tableY += 22;
      });
      
      // Totals row
      doc.rect(50, tableY, 512, 25).fill('#e0e7ff');
      doc.fillColor('#4f46e5').fontSize(9);
      doc.text('TOTAL / PERCENTAGE PERFORMANCE', 60, tableY + 8, { width: 230, bold: true });
      doc.text(totalMarks.toFixed(1), 360, tableY + 8, { width: 90, align: 'center', bold: true });
      doc.text(totalMax.toFixed(1), 460, tableY + 8, { width: 90, align: 'center', bold: true });
      doc.text(`${percentage}%`, 290, tableY + 8, { width: 60, align: 'center', bold: true });
      tableY += 25;
    }

    // 5. Signatures
    doc.fillColor('#64748b').fontSize(9);
    doc.text('__________________________', 80, 710);
    doc.text('Registrar Signature', 105, 722);

    doc.text('__________________________', 360, 710);
    doc.text('Controller of Examinations', 380, 722);

    // End stream
    doc.end();
  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).render('error', { message: 'Failed to construct PDF report card.', error });
  }
};
