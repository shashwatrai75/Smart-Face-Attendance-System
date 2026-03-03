import db from './dexie';
import { markAttendance } from '../api/api';

let isOnline = navigator.onLine;
let isSyncing = false;

window.addEventListener('online', () => {
  isOnline = true;
  syncPendingData();
});

window.addEventListener('offline', () => {
  isOnline = false;
});

export const syncPendingData = async () => {
  if (isSyncing || !isOnline) return;

  isSyncing = true;

  try {
    const pendingAttendance = await db.pendingAttendance
      .where('synced')
      .equals(0)
      .toArray();

    const groupedRecords = {};
    pendingAttendance.forEach((record) => {
      const key = `${record.sessionId}-${record.sectionId || record.classId}`;
      if (!groupedRecords[key]) {
        groupedRecords[key] = {
          sessionId: record.sessionId,
          sectionId: record.sectionId || record.classId,
          records: [],
        };
      }
      groupedRecords[key].records.push({
        studentId: record.studentId,
        status: record.status,
        time: record.time,
        capturedOffline: true,
      });
    });

    for (const key in groupedRecords) {
      const group = groupedRecords[key];
      try {
        await markAttendance({
          sessionId: group.sessionId,
          sectionId: group.sectionId,
          recognizedStudents: group.records,
        });

        for (const record of pendingAttendance) {
          const recordKey = `${record.sessionId}-${record.sectionId || record.classId}`;
          if (recordKey === key) {
            await db.pendingAttendance.update(record.id, { synced: 1 });
          }
        }
      } catch (error) {
        console.error('Error syncing attendance records:', error);
      }
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await db.pendingAttendance
      .where('synced')
      .equals(1)
      .and((record) => record.timestamp < sevenDaysAgo)
      .delete();
  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    isSyncing = false;
  }
};

export const saveAttendanceOffline = async (
  sessionId,
  sectionId,
  studentId,
  status,
  time
) => {
  await db.pendingAttendance.add({
    sessionId,
    sectionId,
    studentId,
    status,
    time,
    capturedOffline: true,
    synced: 0,
    timestamp: Date.now(),
  });
};

export const getIsOnline = () => isOnline;
export const getIsSyncing = () => isSyncing;

setInterval(() => {
  if (isOnline && !isSyncing) {
    syncPendingData();
  }
}, 30000);
