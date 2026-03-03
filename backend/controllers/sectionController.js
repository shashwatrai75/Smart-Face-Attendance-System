const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const { timeToMinutes, todayDate, compareDates } = require('../utils/timeHelpers');

const createSection = async (req, res, next) => {
  try {
    const { sectionName, sectionType, startDate, endDate, startTime, endTime, description } = req.body;

    if (!sectionName || !sectionType) {
      return res.status(400).json({ error: 'Section name and type are required' });
    }

    if (sectionType === 'class') {
      if (startDate && endDate && compareDates(startDate, endDate) >= 0) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
      if (startTime && endTime) {
        const startM = timeToMinutes(startTime);
        const endM = timeToMinutes(endTime);
        if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
          return res.status(400).json({ error: 'End time must be after start time' });
        }
      }
    }

    if (sectionType === 'department') {
      if (startTime && endTime) {
        const startM = timeToMinutes(startTime);
        const endM = timeToMinutes(endTime);
        if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
          return res.status(400).json({ error: 'End time must be after start time' });
        }
      }
    }

    const section = await Section.create({
      sectionName,
      sectionType,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description || undefined,
    });

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
      query.sectionType = 'class';
    } else if (user.role === 'hr') {
      query.sectionType = 'department';
      if (user.sectionId) {
        query._id = user.sectionId;
      }
    }
    // admin and superadmin: no filter, see both class and department

    let sections;
    if (user.role === 'hr' && !user.sectionId) {
      sections = [];
    } else {
      sections = await Section.find(query).sort({ createdAt: -1 });
    }

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
    const section = await Section.findById(id);

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Lecturers may only access class sections
    if (req.user.role === 'lecturer' && section.sectionType === 'department') {
      return res.status(403).json({ error: 'Access denied. Lecturers can only access class sections.' });
    }

    // HR may only access their assigned department section
    if (req.user.role === 'hr' && req.user.sectionId && section.sectionType === 'department') {
      const allowedId = req.user.sectionId.toString();
      const sectionIdStr = section._id.toString();
      if (sectionIdStr !== allowedId) {
        return res.status(403).json({ error: 'Access denied. You can only access your assigned department.' });
      }
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
    const { sectionName, sectionType, startDate, endDate, startTime, endTime, description } = req.body;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const type = sectionType !== undefined ? sectionType : section.sectionType;

    if (type === 'class' && startDate !== undefined && endDate !== undefined && compareDates(startDate, endDate) >= 0) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    if ((type === 'class' || type === 'department') && startTime !== undefined && endTime !== undefined) {
      const startM = timeToMinutes(startTime);
      const endM = timeToMinutes(endTime);
      if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }
    }

    const updates = {};
    if (sectionName !== undefined) updates.sectionName = sectionName;
    if (sectionType !== undefined) updates.sectionType = sectionType;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (description !== undefined) updates.description = description;

    const updatedSection = await Section.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

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
