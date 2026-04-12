/**
 * Merge duplicate User documents that share the same normalized email.
 * Keeps the account with the strongest activity signal (lastLogin, then updatedAt),
 * merges fields, reassigns SectionMember / CheckInRecord / DepartmentFaceEnrollment,
 * then deletes the extra User rows.
 *
 * Usage: node backend/scripts/dedupeUsersByEmail.js
 * (from repo root, or adjust path; requires MONGODB_URI in .env)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const SectionMember = require('../models/SectionMember');
const CheckInRecord = require('../models/CheckInRecord');
const DepartmentFaceEnrollment = require('../models/DepartmentFaceEnrollment');
const { normalizeEmail, sortUsersForCanonicalMerge } = require('../utils/userDedupe');

async function reassignUserReferences(fromId, toId) {
  const from = fromId.toString();
  const to = toId.toString();

  const members = await SectionMember.find({ userId: from });
  for (const m of members) {
    const clash = await SectionMember.findOne({ sectionId: m.sectionId, userId: to });
    if (clash) await SectionMember.deleteOne({ _id: m._id });
    else await SectionMember.updateOne({ _id: m._id }, { $set: { userId: to } });
  }

  const records = await CheckInRecord.find({ userId: from });
  for (const r of records) {
    const clash = await CheckInRecord.findOne({
      sectionId: r.sectionId,
      userId: to,
      date: r.date,
    });
    if (clash) await CheckInRecord.deleteOne({ _id: r._id });
    else await CheckInRecord.updateOne({ _id: r._id }, { $set: { userId: to } });
  }

  const enrolls = await DepartmentFaceEnrollment.find({ userId: from });
  for (const e of enrolls) {
    const clash = await DepartmentFaceEnrollment.findOne({ sectionId: e.sectionId, userId: to });
    if (clash) await DepartmentFaceEnrollment.deleteOne({ _id: e._id });
    else await DepartmentFaceEnrollment.updateOne({ _id: e._id }, { $set: { userId: to } });
  }
}

function ts(d) {
  if (!d) return 0;
  const n = new Date(d).getTime();
  return Number.isNaN(n) ? 0 : n;
}

async function mergeDuplicateGroup(users) {
  const sorted = sortUsersForCanonicalMerge(users);
  const keeper = sorted[0];
  const others = sorted.slice(1);

  const updates = {};

  let maxLoginT = 0;
  let lastLoginVal = keeper.lastLogin;
  for (const u of sorted) {
    const t = ts(u.lastLogin);
    if (t > maxLoginT) {
      maxLoginT = t;
      lastLoginVal = u.lastLogin;
    }
  }
  if (lastLoginVal) updates.lastLogin = lastLoginVal;

  updates.loginCount = sorted.reduce((s, u) => s + (u.loginCount || 0), 0);
  updates.verified = sorted.some((u) => u.verified);

  const tagSet = new Set(keeper.tags || []);
  for (const u of sorted) {
    for (const t of u.tags || []) tagSet.add(t);
  }
  updates.tags = [...tagSet];

  const seenFace = new Set();
  const faceImages = [];
  for (const u of sorted) {
    for (const f of u.faceImages || []) {
      if (!seenFace.has(f)) {
        seenFace.add(f);
        faceImages.push(f);
      }
    }
  }
  if (faceImages.length) updates.faceImages = faceImages;

  for (const u of sorted) {
    if (u.image && !keeper.image) updates.image = u.image;
    if (u.defaultFaceImage && !keeper.defaultFaceImage) updates.defaultFaceImage = u.defaultFaceImage;
    if (u.sectionId && !keeper.sectionId) updates.sectionId = u.sectionId;
    if (u.linkedStudentId && !keeper.linkedStudentId) updates.linkedStudentId = u.linkedStudentId;
  }

  if (!keeper.notes) {
    const withNotes = sorted.find((x) => x.notes);
    if (withNotes) updates.notes = withNotes.notes;
  }

  await User.findByIdAndUpdate(keeper._id, { $set: updates });

  for (const o of others) {
    await reassignUserReferences(o._id, keeper._id);
    await User.findByIdAndDelete(o._id);
    console.log(`  removed duplicate _id=${o._id}`);
  }
}

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected. Scanning for duplicate emails…\n');

  const all = await User.find({});
  const byEmail = new Map();

  for (const u of all) {
    const k = normalizeEmail(u.email) || `_missing_${u._id}`;
    if (!byEmail.has(k)) byEmail.set(k, []);
    byEmail.get(k).push(u);
  }

  let groups = 0;
  for (const [emailKey, group] of byEmail) {
    if (group.length < 2) continue;
    groups += 1;
    const display = emailKey.startsWith('_missing_') ? emailKey : emailKey;
    console.log(`Merging ${group.length} users for "${display}" (keeper by activity)`);
    await mergeDuplicateGroup(group);
  }

  if (groups === 0) {
    console.log('No duplicate emails found.');
  } else {
    console.log(`\nDone. Merged ${groups} duplicate email group(s).`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
