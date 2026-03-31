const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const { timeToMinutes, todayDate, compareDates } = require('../utils/timeHelpers');

const validateSectionSchedule = (sectionType, startDate, endDate, startTime, endTime) => {
  if (sectionType === 'class') {
    if (startDate && endDate && compareDates(startDate, endDate) >= 0) {
      return 'Start date must be before end date';
    }
    if (startTime && endTime) {
      const startM = timeToMinutes(startTime);
      const endM = timeToMinutes(endTime);
      if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
        return 'End time must be after start time';
      }
    }
  }
  if (sectionType === 'department' && startTime && endTime) {
    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(endTime);
    if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
      return 'End time must be after start time';
    }
  }
  return null;
};

const createSection = async (req, res, next) => {
  try {
    const {
      sectionName,
      sectionType,
      startDate,
      endDate,
      startTime,
      endTime,
      description,
      hasSubclasses,
      subclasses,
    } = req.body;

    if (!sectionName || !sectionType) {
      return res.status(400).json({ error: 'Section name and type are required' });
    }

    const needSubclasses = hasSubclasses === true;
    const subclassList = Array.isArray(subclasses) ? subclasses : [];

    if (needSubclasses) {
      if (subclassList.length === 0) {
        return res.status(400).json({ error: 'At least one subclass is required when "Need Subclasses" is checked' });
      }
      const names = subclassList
        .map((s) => (typeof s.name === 'string' ? s.name.trim() : ''))
        .filter(Boolean);
      if (names.length !== subclassList.length) {
        return res.status(400).json({ error: 'Each subclass must have a name' });
      }
      const seen = new Set();
      for (const n of names) {
        const lower = n.toLowerCase();
        if (seen.has(lower)) {
          return res.status(400).json({ error: `Duplicate subclass name: "${n}"` });
        }
        seen.add(lower);
      }
      for (const sub of subclassList) {
        const st = sub.startTime || sub.start_time;
        const et = sub.endTime || sub.end_time;
        if (st && et) {
          const startM = timeToMinutes(st);
          const endM = timeToMinutes(et);
          if (Number.isNaN(startM) || Number.isNaN(endM) || startM >= endM) {
            return res.status(400).json({ error: `Subclass "${sub.name || ''}": end time must be after start time` });
          }
        }
      }
    }

    const scheduleErr = validateSectionSchedule(sectionType, startDate, endDate, startTime, endTime);
    if (scheduleErr) {
      return res.status(400).json({ error: scheduleErr });
    }

    const section = await Section.create({
      sectionName: sectionName.trim(),
      sectionType,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description ? String(description).trim() || undefined : undefined,
      parentSectionId: undefined,
      hasSubclasses: needSubclasses,
    });

    const createdSubsections = [];
    if (needSubclasses && subclassList.length > 0) {
      for (const sub of subclassList) {
        const name = typeof sub.name === 'string' ? sub.name.trim() : '';
        if (!name) continue;
        const subStartTime = sub.startTime || sub.start_time || undefined;
        const subEndTime = sub.endTime || sub.end_time || undefined;
        const child = await Section.create({
          sectionName: name,
          sectionType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          startTime: subStartTime,
          endTime: subEndTime,
          description: description ? String(description).trim() || undefined : undefined,
          parentSectionId: section._id,
          hasSubclasses: false,
        });
        createdSubsections.push(child);
      }
    }

    res.status(201).json({
      success: true,
      section: { ...section.toObject(), subsections: createdSubsections },
    });
  } catch (error) {
    next(error);
  }
};

const createSubsection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sectionName } = req.body;

    const parent = await Section.findById(id);
    if (!parent) {
      return res.status(404).json({ error: 'Parent section not found' });
    }
    if (!parent.hasSubclasses) {
      return res.status(400).json({ error: 'Parent section does not allow subclasses. Enable subclasses first.' });
    }
    if (parent.parentSectionId) {
      return res.status(400).json({ error: 'Can only add subclasses to a top-level section' });
    }

    const name = typeof sectionName === 'string' ? sectionName.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'Subclass name is required' });
    }

    const existing = await Section.findOne({
      parentSectionId: parent._id,
      sectionName: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ error: `A subclass named "${name}" already exists under this parent` });
    }

    const child = await Section.create({
      sectionName: name,
      sectionType: parent.sectionType,
      startDate: parent.startDate,
      endDate: parent.endDate,
      startTime: parent.startTime,
      endTime: parent.endTime,
      description: parent.description,
      parentSectionId: parent._id,
      hasSubclasses: false,
    });

    res.status(201).json({
      success: true,
      section: child,
    });
  } catch (error) {
    next(error);
  }
};

const getSections = async (req, res, next) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === 'member') {
      query.sectionType = 'class';
    } else if (user.role === 'hr') {
      query.sectionType = 'department';
      if (user.sectionId) {
        query._id = user.sectionId;
      }
      // If no sectionId assigned, show all departments so Supervisor can use Employee Face Scan, Enroll, etc.
    }
    // admin and superadmin: no filter, see both class and department

    const sections = await Section.find(query).sort({ createdAt: -1 });

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

    // Members may only access class sections
    if (req.user.role === 'member' && section.sectionType === 'department') {
      return res.status(403).json({ error: 'Access denied. Members can only access class sections.' });
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
    if (section.hasSubclasses) {
      result.subsections = await Section.find({ parentSectionId: id }).sort({ sectionName: 1 });
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
    const { sectionName, sectionType, startDate, endDate, startTime, endTime, description, hasSubclasses } = req.body;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (hasSubclasses === false) {
      const childCount = await Section.countDocuments({ parentSectionId: id });
      if (childCount > 0) {
        return res.status(400).json({
          error: 'Cannot disable subclasses while subclasses exist. Delete or move them first.',
        });
      }
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
    if (hasSubclasses !== undefined && !section.parentSectionId) updates.hasSubclasses = hasSubclasses === true;

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

const deleteSectionRecursive = async (sectionId) => {
  const sid = sectionId.toString();
  const children = await Section.find({ parentSectionId: sectionId }).select('_id');
  for (const ch of children) {
    await deleteSectionRecursive(ch._id);
  }
  await SectionMember.deleteMany({ sectionId: sid });
  await Section.findByIdAndDelete(sid);
};

const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    await deleteSectionRecursive(section._id);

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

    if (section.hasSubclasses) {
      return res.status(400).json({
        error: 'Cannot add members to a container section. Assign members to its subclasses instead.',
      });
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
  createSubsection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  addSectionMember,
  removeSectionMember,
};
