const mongoose = require('mongoose');
const CheckInRecord = require('../models/CheckInRecord');
const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { timeToMinutes, nowMinutes, todayDate } = require('../utils/timeHelpers');
const {
  isSmsFullyConfigured,
  sendSmsTwilio,
  buildEmployeeNoCheckInMessage,
} = require('../utils/sms');

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

    if (user.role === 'member') {
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

/**
 * SMS employees (User.phone) who are department members but have no check-in for the given date.
 * HR: restricted to their assigned department. Admin/superadmin: optional sectionId filter.
 */
const notifyEmployeeNoCheckInSMS = async (req, res, next) => {
  try {
    if (!isSmsFullyConfigured()) {
      return res.status(400).json({
        error:
          'Messaging not configured. Set Twilio (SMS or WhatsApp via TWILIO_MESSAGING_CHANNEL).',
      });
    }

    let { sectionId, date } = req.query;
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : todayDate();

    if (req.user.role === 'hr' && req.user.sectionId) {
      sectionId = req.user.sectionId.toString();
    }

    const deptQuery = { sectionType: 'department' };
    if (sectionId && mongoose.Types.ObjectId.isValid(String(sectionId))) {
      deptQuery._id = sectionId;
    }

    const depts = await Section.find(deptQuery).select('_id sectionName');
    if (!depts.length) {
      return res.json({
        success: true,
        date: targetDate,
        message: 'No matching department sections',
        absentCount: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const smsMaxRaw = parseInt(process.env.SMS_MAX_PER_RUN || process.env.SMS_MAX_PER_SESSION || '100', 10);
    const cap = Number.isFinite(smsMaxRaw) && smsMaxRaw > 0 ? smsMaxRaw : 100;

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let attempts = 0;
    const handledAbsent = new Set();

    for (const dept of depts) {
      const members = await SectionMember.find({ sectionId: dept._id }).distinct('userId');
      const checkedInIds = await CheckInRecord.find({ sectionId: dept._id, date: targetDate }).distinct('userId');
      const checkedSet = new Set(checkedInIds.map((id) => id.toString()));

      for (const uid of members) {
        const uidStr = uid.toString();
        if (checkedSet.has(uidStr)) continue;
        if (handledAbsent.has(uidStr)) continue;

        const emp = await User.findById(uid).select('name phone');
        if (!emp?.phone) {
          skipped++;
          handledAbsent.add(uidStr);
          continue;
        }

        if (attempts >= cap) break;

        const body = buildEmployeeNoCheckInMessage(emp, dept.sectionName, targetDate);
        attempts++;
        try {
          const result = await sendSmsTwilio({ to: emp.phone, body });
          if (result?.skipped) skipped++;
          else sent++;
        } catch (err) {
          failed++;
          logger.warn(`Employee no-check-in SMS failed for ${emp.phone}: ${err.message}`);
        }
        handledAbsent.add(uidStr);
      }
      if (attempts >= cap) break;
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'SMS_EMPLOYEE_NO_CHECKIN',
      metadata: { date: targetDate, sectionId: sectionId || null, sent, failed, skipped },
    });

    res.json({
      success: true,
      date: targetDate,
      absentEmployeesReached: handledAbsent.size,
      smsAttempts: attempts,
      sent,
      failed,
      skipped,
      cappedAt: cap,
      hitCap: attempts >= cap,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordCheckIn,
  getCheckInHistory,
  notifyEmployeeNoCheckInSMS,
};
