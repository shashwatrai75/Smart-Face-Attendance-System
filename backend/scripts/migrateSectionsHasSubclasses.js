/**
 * Migration: Set hasSubclasses=true for sections that have children.
 * Run once: node scripts/migrateSectionsHasSubclasses.js
 * Safe to re-run (idempotent).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Section = require('../models/Section');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const rootSections = await Section.find({ parentSectionId: null });
  let updated = 0;
  for (const section of rootSections) {
    const childCount = await Section.countDocuments({ parentSectionId: section._id });
    if (childCount > 0 && !section.hasSubclasses) {
      await Section.findByIdAndUpdate(section._id, { hasSubclasses: true });
      updated++;
      console.log(`Updated "${section.sectionName}" (has ${childCount} children)`);
    }
  }
  console.log(`Done. Updated ${updated} section(s).`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
