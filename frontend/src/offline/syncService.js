import db from './dexie';
import { markAttendance } from '../api/api';

let isOnline = navigator.onLine;
let isSyncing = false;

// Listen to online/offline events
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
    // Sync pending attendance
    const pendingAttendance = await db.pendingAttendance.where('synced').equals(0).toArray();

    // Group by sessionId and classId for batch processing
    const groupedRecords = {};
    pendingAttendance.forEach((record) => {
      const key = `${record.sessionId}-${record.classId}`;
      if (!groupedRecords[key]) {
        groupedRecords[key] = {
          sessionId: record.sessionId,
          classId: record.classId,
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

    // Sync each group
    for (const key in groupedRecords) {
      const group = groupedRecords[key];
      try {
        await markAttendance(
          group.sessionId,
          group.classId,
          group.records
        );

        // Mark all records in this group as synced
        for (const record of pendingAttendance) {
          if (record.sessionId === group.sessionId && record.classId === group.classId) {
            await db.pendingAttendance.update(record.id, { synced: 1 });
          }
        }
      } catch (error) {
        console.error('Error syncing attendance records:', error);
        // Keep records for retry
      }
    }

    // Clean up synced records older than 7 days
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

export const saveAttendanceOffline = async (sessionId, classId, studentId, status, time) => {
  await db.pendingAttendance.add({
    sessionId,
    classId,
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

// Auto-sync every 30 seconds when online
setInterval(() => {
  if (isOnline && !isSyncing) {
    syncPendingData();
  }
}, 30000);

