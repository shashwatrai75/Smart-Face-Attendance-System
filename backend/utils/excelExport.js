const ExcelJS = require('exceljs');

/**
 * Export attendance data to Excel or CSV
 */
const exportAttendance = async (attendanceData, format = 'xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Define columns
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Time', key: 'time', width: 10 },
    { header: 'Student Name', key: 'studentName', width: 25 },
    { header: 'Roll No', key: 'rollNo', width: 15 },
    { header: 'Class', key: 'className', width: 20 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Teacher', key: 'teacherName', width: 25 },
  ];

  // Add data rows
  attendanceData.forEach((record) => {
    worksheet.addRow({
      date: record.date,
      time: record.time,
      studentName: record.studentName,
      rollNo: record.rollNo,
      className: record.className,
      status: record.status,
      teacherName: record.teacherName,
    });
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  if (format === 'csv') {
    const csv = await workbook.csv.writeBuffer();
    return csv;
  } else {
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
};

module.exports = { exportAttendance };

