const Class = require('../models/Class');
const Student = require('../models/Student');
const logger = require('../utils/logger');

const createClass = async (req, res, next) => {
  try {
    const {
      className,
      subject,
      lecturerId,
      schedule,
      section,
      room,
      semester,
      academicYear,
      description
    } = req.body;

    const newClass = await Class.create({
      className,
      subject,
      lecturerId,
      schedule,
      section,
      room,
      semester,
      academicYear,
      description,
    });

    await newClass.populate('lecturerId', 'name email');

    res.status(201).json({
      success: true,
      class: newClass,
    });
  } catch (error) {
    next(error);
  }
};

const getClasses = async (req, res, next) => {
  try {
    let query = {};

    // If user is lecturer, only show their classes
    if (req.user.role === 'lecturer') {
      query.lecturerId = req.user._id;
    }

    const classes = await Class.find(query)
      .populate('lecturerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      classes,
    });
  } catch (error) {
    next(error);
  }
};

const getClassesByLecturer = async (req, res, next) => {
  try {
    const { lecturerId } = req.params;

    const classes = await Class.find({ lecturerId })
      .populate('lecturerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      classes,
    });
  } catch (error) {
    next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      className,
      subject,
      lecturerId,
      schedule,
      section,
      room,
      semester,
      academicYear,
      description
    } = req.body;

    const updatedClass = await Class.findByIdAndUpdate(
      id,
      {
        className,
        subject,
        lecturerId,
        schedule,
        section,
        room,
        semester,
        academicYear,
        description
      },
      { new: true, runValidators: true }
    ).populate('lecturerId', 'name email');

    if (!updatedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({
      success: true,
      class: updatedClass,
    });
  } catch (error) {
    next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if class has students
    const studentCount = await Student.countDocuments({ classId: id });
    if (studentCount > 0) {
      return res.status(400).json({
        error: `Cannot delete class. ${studentCount} student(s) are enrolled.`,
      });
    }

    const deletedClass = await Class.findByIdAndDelete(id);

    if (!deletedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClass,
  getClasses,
  getClassesByLecturer,
  updateClass,
  deleteClass,
};

