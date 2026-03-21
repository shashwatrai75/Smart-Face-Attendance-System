const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Section = require('../models/Section');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const sections = await Section.find({});
    console.log('\n--- SECTIONS ---');
    sections.forEach(s => {
      console.log(`ID: ${s._id}, Name: ${s.sectionName}, Type: ${s.sectionType}`);
    });

    const dharan = sections.find(s => s.sectionName.toLowerCase().includes('dharan'));
    if (dharan) {
      console.log(`\nFound Dharan Section: ${dharan._id}`);
      
      const studentCount = await Student.countDocuments({ sectionId: dharan._id });
      console.log(`Students in Dharan: ${studentCount}`);

      const today = new Date().toISOString().split('T')[0];
      console.log(`Today Date: ${today}`);

      const attendanceCount = await Attendance.countDocuments({ sectionId: dharan._id, date: today });
      console.log(`Attendance Records Today: ${attendanceCount}`);

      const sessionCount = await AttendanceSession.countDocuments({ sectionId: dharan._id, date: today });
      console.log(`Attendance Sessions Today: ${sessionCount}`);

      const sessions = await AttendanceSession.find({ sectionId: dharan._id, date: today });
      sessions.forEach(s => {
        console.log(`Session ID: ${s.sessionId}, Status: ${s.status}, Date: ${s.date}`);
      });
    } else {
      console.log('\nDharan section not found.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debug();
