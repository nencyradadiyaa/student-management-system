const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');

/**
 * Display main administrative dashboard with quick counters and lists
 */
exports.getDashboard = async (req, res) => {
  try {
    const totalStudents = await Student.getCount();
    const recentStudents = await Student.getRecent(5);
    const departmentDistribution = await Student.getDistributionByDepartment();
    const genderDistribution = await Student.getDistributionByGender();
    const attendanceStats = await Attendance.getGlobalStats();
    const averageGrade = await Marks.getAverageGrade();

    res.render('dashboard', {
      totalStudents,
      recentStudents,
      departmentDistribution,
      genderDistribution,
      attendanceStats,
      averageGrade,
      title: 'Admin Dashboard'
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).render('error', { 
      message: 'Failed to aggregate dashboard analytics. Please contact support.', 
      error 
    });
  }
};

/**
 * API route to return structured chart metrics (department splits, attendance status, gender ratio)
 */
exports.getChartData = async (req, res) => {
  try {
    const deptDistribution = await Student.getDistributionByDepartment();
    const genderDistribution = await Student.getDistributionByGender();
    const attendanceStats = await Attendance.getGlobalStats();

    return res.json({
      departments: deptDistribution,
      gender: genderDistribution,
      attendance: attendanceStats
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Database query failed for analytics data.' 
    });
  }
};
