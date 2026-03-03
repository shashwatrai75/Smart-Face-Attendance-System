import Dexie from 'dexie';

const db = new Dexie('SmartFaceAttendance');

db.version(1).stores({
  pendingAttendance: '++id, sessionId, classId, studentId, status, time, capturedOffline, synced',
  pendingEnrollments: '++id, fullName, rollNo, classId, embedding, synced',
});

db.version(2).stores({
  pendingAttendance: '++id, sessionId, sectionId, studentId, status, time, capturedOffline, synced',
  pendingEnrollments: '++id, fullName, rollNo, sectionId, embedding, synced',
});

export default db;
