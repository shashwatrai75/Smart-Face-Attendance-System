const CheckInRecord = require('../models/CheckInRecord');
const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const AuditLog = require('../models/AuditLog');
const { timeToMinutes, nowMinutes, todayDate } = require('../utils/timeHelpers');

const recordCheckIn = async (req, res, next) => {
  try {
    const { sectionId, userId } = req.body;

    if (!sectionId || !userId) {
      return res.status(400).json({ error: 'Section ID and User ID are required' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (section.sectionType !== 'department') {
      return res.status(400).json({ error: 'Check-in is only for department sections' });
    }

    // HR may only record check-in for their assigned department
    if (req.user.role === 'hr' && req.user.sectionId && sectionId !== req.user.sectionId.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only manage your assigned department.' });
    }

    const member = await SectionMember.findOne({ sectionId, userId });
    if (!member) {
      return res.status(403).json({ error: 'User is not a member of this section' });
    }

    const today = todayDate();
    const nowMin = nowMinutes();

    if (section.startTime || section.endTime) {
      const shiftStartM = section.startTime ? timeToMinutes(section.startTime) : 0;
      const shiftEndM = section.endTime ? timeToMinutes(section.endTime) : 24 * 60 - 1;
      if (Number.isNaN(shiftStartM) || Number.isNaN(shiftEndM)) {
        return res.status(400).json({ error: 'Invalid shift time configuration' });
      }
      if (section.startDate && today < section.startDate) {
        return res.status(400).json({
          error: `Check-in is only allowed from ${section.startDate}.`,
        });
      }
    }

    let record = await CheckInRecord.findOne({ userId, sectionId, date: today });

    if (!record) {
      if (section.startTime) {
        const shiftStartM = timeToMinutes(section.startTime);
        if (nowMin < shiftStartM) {
          return res.status(400).json({
            error: `Check-in is only allowed after shift start time (${section.startTime}).`,
          });
        }
      }
      const now = new Date();
      record = await CheckInRecord.create({
        userId,
        sectionId,
        date: today,
        checkInTime: now,
      });
      await AuditLog.create({
        actorUserId: req.user._id,
        action: 'CHECK_IN',
        metadata: { sectionId, userId, date: today },
      });
      return res.json({
        success: true,
        action: 'check-in',
        record,
        message: 'Check-in recorded',
      });
    }

    if (record.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out for today' });
    }

    if (section.endTime) {
      const shiftEndM = timeToMinutes(section.endTime);
      if (nowMin > shiftEndM) {
        return res.status(400).json({
          error: `Check-out is only allowed before shift end time (${section.endTime}).`,
        });
      }
    }

    const now = new Date();
    record.checkOutTime = now;
    record.workMinutes = Math.round((record.checkOutTime - record.checkInTime) / (1000 * 60));
    await record.save();

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'CHECK_OUT',
      metadata: { sectionId, userId, date: today, workMinutes: record.workMinutes },
    });

    res.json({
      success: true,
      action: 'check-out',
      record,
      message: `Check-out recorded. Work hours: ${record.workMinutes} minutes`,
    });
  } catch (error) {
    next(error);
  }
};

const getCheckInHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const { sectionId, dateFrom, dateTo, userId } = req.query;

    let query = {};

    if (sectionId) query.sectionId = sectionId;
    if (userId) query.userId = userId;

    // HR may only see history for their assigned department
    if (user.role === 'hr' && user.sectionId) {
      query.sectionId = user.sectionId;
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    if (user.role === 'lecturer') {
      query.userId = user._id;
    }

    const records = await CheckInRecord.find(query)
      .populate('userId', 'name email')
      .populate('sectionId', 'sectionName sectionType')
      .sort({ date: -1, checkInTime: -1 })
      .limit(500);

    res.json({
      success: true,
      records,
      count: records.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordCheckIn,
  getCheckInHistory,
};
