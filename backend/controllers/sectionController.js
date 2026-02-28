const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const Class = require('../models/Class');
const { timeToMinutes, todayDate, compareDates } = require('../utils/timeHelpers');

const createSection = async (req, res, next) => {
  try {
    const {
      sectionName,
      sectionType,
      classId,
      startDate,
      endDate,
      classStartTime,
      classEndTime,
      shiftStartTime,
      shiftEndTime,
      description,
    } = req.body;

    if (!sectionName || !sectionType) {
      return res.status(400).json({ error: 'Section name and type are required' });
    }

    if (sectionType === 'class') {
      if (!classId) {
        return res.status(400).json({ error: 'Class ID is required for class sections' });
      }
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }
      if (startDate && endDate && compareDates(startDate, endDate) >= 0) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
      if (!classStartTime || !classEndTime) {
        return res.status(400).json({ error: 'Class start time and end time are required' });
      }
      const startM = timeToMinutes(classStartTime);
      const endM = timeToMinutes(classEndTime);
      if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
        return res.status(400).json({ error: 'Class start time must be before class end time' });
      }
    }

    if (sectionType === 'department') {
      if (shiftStartTime && shiftEndTime) {
        const startM = timeToMinutes(shiftStartTime);
        const endM = timeToMinutes(shiftEndTime);
        if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
          return res.status(400).json({ error: 'Shift start time must be before shift end time' });
        }
      }
    }

    const section = await Section.create({
      sectionName,
      sectionType,
      classId: sectionType === 'class' ? classId : null,
      startDate: startDate || undefined,
      endDate: sectionType === 'class' ? (endDate || undefined) : undefined,
      classStartTime: sectionType === 'class' ? classStartTime : undefined,
      classEndTime: sectionType === 'class' ? classEndTime : undefined,
      shiftStartTime: sectionType === 'department' ? shiftStartTime : undefined,
      shiftEndTime: sectionType === 'department' ? shiftEndTime : undefined,
      description: description || undefined,
    });

    await section.populate('classId', 'className subject lecturerId');

    res.status(201).json({
      success: true,
      section,
    });
  } catch (error) {
    next(error);
  }
};

const getSections = async (req, res, next) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === 'lecturer') {
      const assignedClasses = await Class.find({ lecturerId: user._id }).select('_id');
      const classIds = assignedClasses.map((c) => c._id);
      query.$or = [
        { sectionType: 'department' },
        { classId: { $in: classIds } },
      ];
    }

    const sections = await Section.find(query)
      .populate('classId', 'className subject lecturerId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      sections,
    });
  } catch (error) {
    next(error);
  }
};

const getSectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id).populate('classId', 'className subject lecturerId');

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    let result = section.toObject ? section.toObject() : section;
    if (section.sectionType === 'department') {
      result.members = await SectionMember.find({ sectionId: id }).populate('userId', 'name email');
    }

    res.json({
      success: true,
      section: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      sectionName,
      sectionType,
      classId,
      startDate,
      endDate,
      classStartTime,
      classEndTime,
      shiftStartTime,
      shiftEndTime,
      description,
    } = req.body;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const type = sectionType !== undefined ? sectionType : section.sectionType;

    if (type === 'class') {
      if (startDate !== undefined && endDate !== undefined && compareDates(startDate, endDate) >= 0) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
      if (classStartTime !== undefined && classEndTime !== undefined) {
        const startM = timeToMinutes(classStartTime);
        const endM = timeToMinutes(classEndTime);
        if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
          return res.status(400).json({ error: 'Class start time must be before class end time' });
        }
      }
    }

    if (type === 'department' && shiftStartTime !== undefined && shiftEndTime !== undefined) {
      const startM = timeToMinutes(shiftStartTime);
      const endM = timeToMinutes(shiftEndTime);
      if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
        return res.status(400).json({ error: 'Shift start time must be before shift end time' });
      }
    }

    const updates = {};
    if (sectionName !== undefined) updates.sectionName = sectionName;
    if (sectionType !== undefined) updates.sectionType = sectionType;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (classStartTime !== undefined) updates.classStartTime = classStartTime;
    if (classEndTime !== undefined) updates.classEndTime = classEndTime;
    if (shiftStartTime !== undefined) updates.shiftStartTime = shiftStartTime;
    if (shiftEndTime !== undefined) updates.shiftEndTime = shiftEndTime;
    if (description !== undefined) updates.description = description;

    if (type === 'class' && classId !== undefined) {
      updates.classId = classId;
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }
    } else if (type === 'department') {
      updates.classId = null;
      updates.endDate = null;
      updates.classStartTime = null;
      updates.classEndTime = null;
    }

    const updatedSection = await Section.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('classId', 'className subject lecturerId');

    res.json({
      success: true,
      section: updatedSection,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    await SectionMember.deleteMany({ sectionId: id });
    await Section.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const addSectionMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (section.sectionType !== 'department') {
      return res.status(400).json({ error: 'Can only add members to department sections' });
    }

    const existing = await SectionMember.findOne({ sectionId: id, userId });
    if (existing) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    const member = await SectionMember.create({ sectionId: id, userId });
    await member.populate('userId', 'name email');

    res.status(201).json({
      success: true,
      member,
    });
  } catch (error) {
    next(error);
  }
};

const removeSectionMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    await SectionMember.findOneAndDelete({ sectionId: id, userId });

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  addSectionMember,
  removeSectionMember,
};
