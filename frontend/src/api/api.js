/**
 * SIMPLIFIED API - All API calls in one file
 * 
 * This file contains all functions that communicate with the backend.
 * Organized by feature for easy navigation.
 */

import axiosClient from './axiosClient';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export const deleteUser = (id) => {
  return axiosClient.delete(`/admin/user/${id}`);
};

export const getStats = () => {
  return axiosClient.get('/admin/stats');
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

// ============================================
// CLASS MANAGEMENT
// ============================================
export const createClass = (classData) => {
  return axiosClient.post('/classes', classData);
};

export const getClasses = () => {
  return axiosClient.get('/classes');
};

export const getClassesByTeacher = (teacherId) => {
  return axiosClient.get(`/classes/teacher/${teacherId}`);
};

export const updateClass = (id, classData) => {
  return axiosClient.put(`/classes/${id}`, classData);
};

export const deleteClass = (id) => {
  return axiosClient.delete(`/classes/${id}`);
};

// ============================================
// STUDENT MANAGEMENT
// ============================================
export const enrollStudent = (studentData) => {
  return axiosClient.post('/students/enroll', studentData);
};

export const getStudents = (classId) => {
  const params = classId ? { classId } : {};
  return axiosClient.get('/students', { params });
};

export const getStudentEmbeddings = (classId) => {
  return axiosClient.get(`/students/embeddings/${classId}`);
};

export const deleteStudentData = (id) => {
  return axiosClient.delete(`/students/${id}/delete-data`);
};

// ============================================
// ATTENDANCE
// ============================================
export const startSession = (classId) => {
  return axiosClient.post('/attendance/start-session', { classId });
};

export const markAttendance = async (sessionId, classId, recognizedStudents) => {
  const studentsArray = Array.isArray(recognizedStudents) 
    ? recognizedStudents 
    : [recognizedStudents];
  
  return axiosClient.post('/attendance/mark', {
    sessionId,
    classId,
    recognizedStudents: studentsArray,
  });
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

export const exportReport = async (classId, dateFrom, dateTo, format = 'xlsx') => {
  const params = { classId, format };
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
  link.setAttribute('download', `attendance-${classId}-${dateFrom || 'all'}-${dateTo || 'all'}.${extension}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
};

