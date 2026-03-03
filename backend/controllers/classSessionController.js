const ClassSession = require('../models/ClassSession');
const Section = require('../models/Section');
const { timeToMinutes } = require('../utils/timeHelpers');

/**
 * List Class Sessions for a section (only for class-type sections)
 */
const getClassSessionsBySection = async (req, res, next) => {
  try {
    const sectionId = req.params.sectionId || req.params.id;

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    if (section.sectionType !== 'class') {
      return res.status(400).json({
        error: 'Class sessions are only available for class-type sections',
      });
    }

    const sessions = await ClassSession.find({ sectionId })
      .populate('teacherId', 'name email')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      classSessions: sessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a Class Session for a class-type section
 */
const createClassSession = async (req, res, next) => {
  try {
    const sectionId = req.params.sectionId || req.params.id;
    const { sessionName, subject, teacherId, startTime, endTime } = req.body;

    if (!sessionName || !subject || !teacherId || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Session name, subject, teacher, start time, and end time are required',
      });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    if (section.sectionType !== 'class') {
      return res.status(400).json({
        error: 'Class sessions can only be created for class-type sections',
      });
    }

    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(endTime);
    if (Number.isNaN(startM) || Number.isNaN(endM)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:mm' });
    }
    if (startM >= endM) {
      return res.status(400).json({
        error: 'End time must be after start time',
      });
    }

    const classSession = await ClassSession.create({
      sessionName,
      subject,
      sectionId,
      teacherId,
      startTime,
      endTime,
    });

    await classSession.populate('teacherId', 'name email');

    res.status(201).json({
      success: true,
      classSession,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a Class Session
 */
const updateClassSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sessionName, subject, teacherId, startTime, endTime } = req.body;

    const classSession = await ClassSession.findById(id);
    if (!classSession) {
      return res.status(404).json({ error: 'Class session not found' });
    }

    if (startTime !== undefined || endTime !== undefined) {
      const startM = timeToMinutes(startTime || classSession.startTime);
      const endM = timeToMinutes(endTime || classSession.endTime);
      if (Number.isNaN(startM) || Number.isNaN(endM)) {
        return res.status(400).json({ error: 'Invalid time format. Use HH:mm' });
      }
      if (startM >= endM) {
        return res.status(400).json({
          error: 'End time must be after start time',
        });
      }
    }

    const updates = {};
    if (sessionName !== undefined) updates.sessionName = sessionName;
    if (subject !== undefined) updates.subject = subject;
    if (teacherId !== undefined) updates.teacherId = teacherId;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;

    const updated = await ClassSession.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('teacherId', 'name email');

    res.json({
      success: true,
      classSession: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a Class Session
 */
const deleteClassSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const classSession = await ClassSession.findByIdAndDelete(id);
    if (!classSession) {
      return res.status(404).json({ error: 'Class session not found' });
    }

    res.json({
      success: true,
      message: 'Class session deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClassSessionsBySection,
  createClassSession,
  updateClassSession,
  deleteClassSession,
};
