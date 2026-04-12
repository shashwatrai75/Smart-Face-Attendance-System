/**
 * Helpers for duplicate User documents that share the same email (e.g. legacy data
 * or scripts that bypassed the unique index).
 */

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

function ts(d) {
  if (!d) return 0;
  const n = new Date(d).getTime();
  return Number.isNaN(n) ? 0 : n;
}

function toPlain(doc) {
  if (doc && typeof doc.toObject === 'function') {
    return doc.toObject({ virtuals: false });
  }
  return { ...doc };
}

/**
 * Sort duplicate accounts so the first entry is the canonical keeper (best activity).
 */
function sortUsersForCanonicalMerge(users) {
  return [...users].sort((a, b) => {
    const loginDiff = ts(b.lastLogin) - ts(a.lastLogin);
    if (loginDiff !== 0) return loginDiff;
    return ts(b.updatedAt || b.createdAt) - ts(a.updatedAt || a.createdAt);
  });
}

/**
 * One merged plain object per normalized email for API list responses.
 */
function dedupeUsersByEmailForResponse(users) {
  const groups = new Map();
  const keyOrder = [];

  for (const u of users) {
    const key = normalizeEmail(u.email) || `_id_${u._id}`;
    if (!groups.has(key)) {
      keyOrder.push(key);
      groups.set(key, []);
    }
    groups.get(key).push(u);
  }

  const result = [];
  for (const key of keyOrder) {
    const group = groups.get(key);
    if (group.length === 1) {
      result.push(toPlain(group[0]));
      continue;
    }

    const sorted = sortUsersForCanonicalMerge(group);
    const plain = toPlain(sorted[0]);

    let maxLoginT = 0;
    let lastLoginVal = plain.lastLogin;
    for (const u of sorted) {
      const t = ts(u.lastLogin);
      if (t > maxLoginT) {
        maxLoginT = t;
        lastLoginVal = u.lastLogin;
      }
    }
    plain.lastLogin = lastLoginVal || plain.lastLogin;

    plain.loginCount = sorted.reduce((s, u) => s + (u.loginCount || 0), 0);
    plain.verified = sorted.some((u) => u.verified);

    const tagSet = new Set(plain.tags || []);
    for (const u of sorted) {
      for (const t of u.tags || []) tagSet.add(t);
    }
    plain.tags = [...tagSet];

    const seenFace = new Set(plain.faceImages || []);
    const mergedFaces = [...(plain.faceImages || [])];
    for (const u of sorted) {
      for (const f of u.faceImages || []) {
        if (!seenFace.has(f)) {
          seenFace.add(f);
          mergedFaces.push(f);
        }
      }
    }
    plain.faceImages = mergedFaces;

    for (const u of sorted) {
      if (u.image && !plain.image) plain.image = u.image;
      if (u.defaultFaceImage && !plain.defaultFaceImage) plain.defaultFaceImage = u.defaultFaceImage;
      if (u.sectionId && !plain.sectionId) plain.sectionId = u.sectionId;
      if (u.linkedStudentId && !plain.linkedStudentId) plain.linkedStudentId = u.linkedStudentId;
    }

    if (!plain.notes) {
      const withNotes = sorted.find((x) => x.notes);
      if (withNotes) plain.notes = withNotes.notes;
    }

    result.push(plain);
  }

  return result;
}

module.exports = {
  normalizeEmail,
  sortUsersForCanonicalMerge,
  dedupeUsersByEmailForResponse,
};
