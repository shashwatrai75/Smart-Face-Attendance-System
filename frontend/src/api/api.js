/**
 * SIMPLIFIED API - All API calls in one file
 * 
 * This file contains all functions that communicate with the backend.
 * Organized by feature for easy navigation.
 */

import axiosClient from './axiosClient';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// ============================================
// AUTHENTICATION
// ============================================
export const login = (email, password) => {
  return axiosClient.post('/auth/login', { email, password });
};

export const seedAdmin = (name, email, password) => {
  return axiosClient.post('/auth/seed-admin', { name, email, password });
};

// ============================================
// USER MANAGEMENT
// ============================================
export const getProfile = () => {
  return axiosClient.get('/users/me');
};

export const changePassword = (oldPassword, newPassword) => {
  return axiosClient.post('/users/change-password', { oldPassword, newPassword });
};

export const createUser = (userData) => {
  return axiosClient.post('/admin/create-user', userData);
};

export const getUsers = () => {
  return axiosClient.get('/admin/users');
};

export const updateUserStatus = (id, status) => {
  return axiosClient.put(`/admin/user/${id}/status`, { status });
};

export const updateUser = (id, userData) => {
  return axiosClient.put(`/admin/user/${id}`, userData);
};

export const deleteUser = (id) => {
  return axiosClient.delete(`/admin/user/${id}`);
};

export const getStats = () => {
  return axiosClient.get('/admin/stats');
};

/** Query: { sectionId?, date? } — date YYYY-MM-DD, default server “today” (TZ). Admin/superadmin only. */
export const notifyAbsentTodaySMS = (params) => {
  return axiosClient.post('/admin/sms/absent-today', null, { params });
};

/** Admin/superadmin: send one test SMS via Twilio. */
export const sendTestSms = (payload) => {
  return axiosClient.post('/admin/sms/test', payload);
};

export const updateUserNotes = (id, notes) => {
  return axiosClient.put(`/admin/user/${id}/notes`, { notes });
};

export const updateUserTags = (id, tags) => {
  return axiosClient.put(`/admin/user/${id}/tags`, { tags });
};

export const verifyUser = (id) => {
  return axiosClient.put(`/admin/user/${id}/verify`);
};

export const getUserActivity = (id) => {
  return axiosClient.get(`/admin/user/${id}/activity`);
};

export const uploadUserImage = (id, formData) => {
  return axiosClient.post(`/admin/user/${id}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// ============================================
// SECTION MANAGEMENT
// ============================================
export const createSection = (sectionData) => {
  return axiosClient.post('/sections', sectionData);
};

export const getSections = () => {
  return axiosClient.get('/sections');
};

export const getSectionById = (id) => {
  return axiosClient.get(`/sections/${id}`);
};

export const updateSection = (id, sectionData) => {
  return axiosClient.put(`/sections/${id}`, sectionData);
};

export const deleteSection = (id) => {
  return axiosClient.delete(`/sections/${id}`);
};

export const addSectionMember = (sectionId, userId) => {
  return axiosClient.post(`/sections/${sectionId}/members`, { userId });
};

export const removeSectionMember = (sectionId, userId) => {
  return axiosClient.delete(`/sections/${sectionId}/members/${userId}`);
};

export const getClassSessionsBySection = (sectionId) => {
  return axiosClient.get(`/sections/${sectionId}/class-sessions`);
};

export const createClassSession = (sectionId, data) => {
  return axiosClient.post(`/sections/${sectionId}/class-sessions`, data);
};

export const updateClassSession = (id, data) => {
  return axiosClient.put(`/class-sessions/${id}`, data);
};

export const deleteClassSession = (id) => {
  return axiosClient.delete(`/class-sessions/${id}`);
};

// ============================================
// CHECK-IN (Department sections)
// ============================================
export const recordCheckIn = (sectionId, userId) => {
  return axiosClient.post('/checkin/record', { sectionId, userId });
};

export const getCheckInHistory = (params) => {
  return axiosClient.get('/checkin/history', { params });
};

/** HR (own dept) or admin: SMS employees with no check-in today. Query: { sectionId?, date? } */
export const notifyEmployeeNoCheckInSMS = (params) => {
  return axiosClient.post('/checkin/notify-no-checkin-sms', null, { params });
};

// ============================================
// STUDENT MANAGEMENT
// ============================================
export const enrollStudent = (studentData) => {
  return axiosClient.post('/students/enroll', studentData);
};

export const enrollEmployee = (employeeData) => {
  return axiosClient.post('/admin/enroll-employee', employeeData);
};

export const getStudents = (sectionId) => {
  const params = sectionId ? { sectionId } : {};
  return axiosClient.get('/students', { params });
};

export const deleteStudentData = (id) => {
  return axiosClient.delete(`/students/${id}/delete-data`);
};

// ============================================
// ATTENDANCE
// ============================================
export const startSession = (payload) => {
  return axiosClient.post('/attendance/start-session', payload);
};

export const markAttendance = async (payload) => {
  const { sessionId, sectionId, classSessionId, recognizedStudents } = payload;
  const studentsArray = Array.isArray(recognizedStudents)
    ? recognizedStudents
    : [recognizedStudents];

  return axiosClient.post('/attendance/mark', {
    sessionId,
    sectionId,
    classSessionId,
    recognizedStudents: studentsArray,
  });
};

export const heartbeatSession = (sessionId) => {
  return axiosClient.post('/attendance/heartbeat', { sessionId });
};

export const manualOverride = (attendanceId, status, remark) => {
  return axiosClient.put('/attendance/manual-override', {
    attendanceId,
    status,
    remark,
  });
};

export const endSession = (sessionId) => {
  return axiosClient.post('/attendance/end-session', { sessionId });
};

export const getAttendanceHistory = (params) => {
  return axiosClient.get('/attendance/history', { params });
};

export const getSessionHistory = (params) => {
  return axiosClient.get('/attendance/sessions', { params });
};

export const getSessionDetails = (sessionId) => {
  return axiosClient.get(`/attendance/session/${sessionId}`);
};

export const getCalendarAttendance = (params) => {
  return axiosClient.get('/attendance/calendar', { params });
};

// ============================================
// FACE ENROLLMENT & VERIFICATION
// ============================================
export const enrollFace = (payload) => {
  // payload: { targetType: 'student' | 'user', targetId, imageBase64 }
  return axiosClient.post('/face/enroll', payload);
};

export const verifyFace = (payload) => {
  // payload: { imageBase64, sectionId }
  return axiosClient.post('/face/verify', payload);
};

// ============================================
// REPORTS
// ============================================
export const getSummary = (params) => {
  return axiosClient.get('/reports/summary', { params });
};

export const getClassWiseData = (params) => {
  return axiosClient.get('/reports/class', { params });
};

export const getTrendData = (params) => {
  return axiosClient.get('/reports/trend', { params });
};

// ============================================
// SUPERADMIN (Superadmin only)
// ============================================
export const getSystemSettings = () => {
  return axiosClient.get('/superadmin/settings');
};

export const updateSystemSettings = (settings) => {
  return axiosClient.put('/superadmin/settings', { settings });
};

export const getAuditLogs = (params) => {
  return axiosClient.get('/superadmin/audit-logs', { params });
};

export const getAdminUsers = () => {
  return axiosClient.get('/superadmin/admins');
};

export const purgeAttendance = (params) => {
  return axiosClient.post('/superadmin/purge-attendance', params);
};

export const purgeData = (type) => {
  return axiosClient.post('/superadmin/purge-data', { type });
};

export const deleteSectionSuperadmin = (id) => {
  return axiosClient.delete(`/superadmin/sections/${id}`);
};

// ============================================
// REPORTS
// ============================================
export const exportReport = async (sectionId, dateFrom, dateTo, format = 'xlsx') => {
  const params = { sectionId, format };
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const token = localStorage.getItem('token');

  const response = await axios.get(`${API_URL}/reports/export`, {
    params,
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const extension = format === 'csv' ? 'csv' : 'xlsx';
  link.setAttribute('download', `attendance-${sectionId}-${dateFrom || 'all'}-${dateTo || 'all'}.${extension}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
};
