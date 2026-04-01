import { useState, useEffect } from 'react';
import { getUsers, updateUserStatus, updateUser, deleteUser, updateUserNotes, updateUserTags, verifyUser, getUserActivity, uploadUserImage } from '../api/api';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import Pagination from '../components/table/Pagination';
import PageHeader from '../components/userManagement/PageHeader';
import UMStatCard from '../components/userManagement/UMStatCard';
import { RoleBadge, StatusBadge } from '../components/userManagement/Badge';
import { ActionIconButton, EditIcon, EyeIcon, SearchIcon, TableSkeleton, TrashIcon } from '../components/userManagement/TableBits';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [editUserMode, setEditUserMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showCharts, setShowCharts] = useState(true);
  const [quickActionsMenu, setQuickActionsMenu] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesUser, setNotesUser] = useState(null);
  const [userNotes, setUserNotes] = useState('');
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [tagsUser, setTagsUser] = useState(null);
  const [userTags, setUserTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityUser, setActivityUser] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [comparingUsers, setComparingUsers] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [quickFilters, setQuickFilters] = useState({
    active: false,
    verified: false,
    recentLogin: false,
    newThisMonth: false,
  });
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const isSuperadmin =
    currentUser?.role === 'superadmin' ||
    (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('user') || '{}')?.role === 'superadmin');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortOrder, dateRange, quickFilters, currentUser?.role]);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users || []);
    } catch (err) {
      setToast({ message: 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    // Role-based visibility: Admin must not see admin/superadmin accounts
    const roleFiltered =
      currentUser?.role === 'admin'
        ? users.filter((u) => u.role !== 'admin' && u.role !== 'superadmin')
        : users;

    let filtered = [...roleFiltered];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(search) ||
          user.email?.toLowerCase().includes(search) ||
          user.phone?.toLowerCase().includes(search) ||
          user.city?.toLowerCase().includes(search)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    // Quick filters
    if (quickFilters.active) {
      filtered = filtered.filter((user) => user.status === 'active');
    }
    if (quickFilters.verified) {
      filtered = filtered.filter((user) => user.verified === true);
    }
    if (quickFilters.recentLogin) {
      filtered = filtered.filter((user) => {
        if (!user.lastLogin) return false;
        const daysSinceLogin = (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLogin <= 30;
      });
    }
    if (quickFilters.newThisMonth) {
      filtered = filtered.filter((user) => {
        if (!user.createdAt) return false;
        const userDate = new Date(user.createdAt);
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        return userDate >= monthStart;
      });
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter((user) => {
        if (!user.createdAt) return false;
        const userDate = new Date(user.createdAt);
        const startDate = new Date(dateRange.start);
        return userDate >= startDate;
      });
    }
    if (dateRange.end) {
      filtered = filtered.filter((user) => {
        if (!user.createdAt) return false;
        const userDate = new Date(user.createdAt);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return userDate <= endDate;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Institution', 'City', 'Country', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map((user) =>
        [
          `"${user.name || ''}"`,
          `"${user.email || ''}"`,
          `"${user.phone || ''}"`,
          `"${user.role || ''}"`,
          `"${user.status || ''}"`,
          `"${user.institutionName || ''}"`,
          `"${user.city || ''}"`,
          `"${user.country || ''}"`,
          `"${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ message: 'Users exported to CSV successfully', type: 'success' });
  };

  const getStatistics = () => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const disabled = users.filter((u) => u.status === 'disabled').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const superadmins = users.filter((u) => u.role === 'superadmin').length;
    const members = users.filter((u) => u.role === 'member' || u.role === 'lecturer').length;
    const verified = users.filter((u) => u.verified).length;
    const recentLogin = users.filter((u) => {
      if (!u.lastLogin) return false;
      const daysSinceLogin = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 30;
    }).length;
    const newThisMonth = users.filter((u) => {
      if (!u.createdAt) return false;
      const userDate = new Date(u.createdAt);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      return userDate >= monthStart;
    }).length;

    return { total, active, disabled, admins, superadmins, members, verified, recentLogin, newThisMonth };
  };

  const stats = getStatistics();

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, roleFilter, statusFilter]);

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(paginatedUsers.map((u) => u._id || u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      setToast({ message: 'Please select users first', type: 'error' });
      return;
    }

    try {
      // Role restrictions for bulk actions: Admins cannot manage other admins or superadmins
      if (currentUser?.role !== 'superadmin') {
        const restrictedUsers = selectedUsers.some((id) => {
          const user = users.find((u) => (u._id || u.id) === id);
          return user && (user.role === 'admin' || user.role === 'superadmin');
        });
        if (restrictedUsers) {
          setToast({ message: 'Access denied. You cannot perform bulk actions on Office Admin or Superadmin accounts.', type: 'error' });
          return;
        }
      }

      if (action === 'delete') {
        setConfirmDialog({
          message: `Are you sure you want to delete ${selectedUsers.length} user(s)?`,
          onConfirm: async () => {
            await Promise.all(selectedUsers.map((id) => deleteUser(id)));
            setSelectedUsers([]);
            fetchUsers();
            setToast({ message: `${selectedUsers.length} user(s) deleted successfully`, type: 'success' });
          },
        });
      } else if (action === 'activate') {
        await Promise.all(
          selectedUsers.map((id) => {
            const user = users.find((u) => (u._id || u.id) === id);
            return user && updateUserStatus(id, 'active');
          })
        );
        setSelectedUsers([]);
        fetchUsers();
        setToast({ message: `${selectedUsers.length} user(s) activated successfully`, type: 'success' });
      } else if (action === 'deactivate') {
        await Promise.all(
          selectedUsers.map((id) => {
            const user = users.find((u) => (u._id || u.id) === id);
            return user && updateUserStatus(id, 'disabled');
          })
        );
        setSelectedUsers([]);
        fetchUsers();
        setToast({ message: `${selectedUsers.length} user(s) deactivated successfully`, type: 'success' });
      }
    } catch (err) {
      setToast({ message: err.error || 'Bulk action failed', type: 'error' });
    }
  };

  // Chart data - only show roles that current user can see
  const getRoleDistributionData = () => {
    const data = [{ name: 'Member', value: stats.members, color: '#3b82f6' }];
    if (currentUser?.role === 'superadmin') {
      data.unshift({ name: 'Office Admin', value: stats.admins, color: '#8b5cf6' });
      data.unshift({ name: 'Superadmin', value: stats.superadmins, color: '#ec4899' });
    }
    return data;
  };

  const getStatusDistributionData = () => {
    return [
      { name: 'Active', value: stats.active, color: '#10b981' },
      { name: 'Disabled', value: stats.disabled, color: '#ef4444' },
    ];
  };

  const getUsersByMonth = () => {
    const monthData = {};
    users.forEach((user) => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthData[month] = (monthData[month] || 0) + 1;
      }
    });
    return Object.entries(monthData)
      .map(([month, count]) => ({ month, count }))
      .slice(-6); // Last 6 months
  };

  const getRecentUsers = () => {
    return [...users]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  };

  const exportToExcel = () => {
    // Enhanced CSV export (can be upgraded to actual Excel)
    exportToCSV();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setSortBy('name');
    setSortOrder('asc');
    setQuickFilters({
      active: false,
      verified: false,
      recentLogin: false,
      newThisMonth: false,
    });
  };

  // User Notes
  const handleOpenNotes = (user) => {
    setNotesUser(user);
    setUserNotes(user.notes || '');
    setShowNotesModal(true);
    setQuickActionsMenu(null);
  };

  const handleSaveNotes = async () => {
    try {
      await updateUserNotes(notesUser._id || notesUser.id, userNotes);
      setToast({ message: 'Notes saved successfully', type: 'success' });
      fetchUsers();
      setShowNotesModal(false);
    } catch (err) {
      setToast({ message: err.error || 'Failed to save notes', type: 'error' });
    }
  };

  // User Tags
  const handleOpenTags = (user) => {
    setTagsUser(user);
    setUserTags(user.tags || []);
    setShowTagsModal(true);
    setQuickActionsMenu(null);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !userTags.includes(newTag.trim())) {
      setUserTags([...userTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setUserTags(userTags.filter((t) => t !== tag));
  };

  const handleSaveTags = async () => {
    try {
      await updateUserTags(tagsUser._id || tagsUser.id, userTags);
      setToast({ message: 'Tags updated successfully', type: 'success' });
      fetchUsers();
      setShowTagsModal(false);
    } catch (err) {
      setToast({ message: err.error || 'Failed to update tags', type: 'error' });
    }
  };

  // User Activity
  const handleViewActivity = async (user) => {
    setActivityUser(user);
    setShowActivityModal(true);
    setLoadingActivity(true);
    setQuickActionsMenu(null);
    try {
      const response = await getUserActivity(user._id || user.id);
      setUserActivities(response.activities || []);
    } catch (err) {
      setToast({ message: err.error || 'Failed to load activity', type: 'error' });
    } finally {
      setLoadingActivity(false);
    }
  };

  // Verify User
  const handleVerifyUser = async (userId) => {
    try {
      await verifyUser(userId);
      setToast({ message: 'User verified successfully', type: 'success' });
      fetchUsers();
      setQuickActionsMenu(null);
    } catch (err) {
      setToast({ message: err.error || 'Failed to verify user', type: 'error' });
    }
  };

  // Compare Users
  const handleCompareUsers = (user) => {
    const userId = user._id || user.id;
    if (comparingUsers.includes(userId)) {
      setComparingUsers(comparingUsers.filter((id) => id !== userId));
    } else if (comparingUsers.length < 3) {
      setComparingUsers([...comparingUsers, userId]);
    } else {
      setToast({ message: 'You can compare up to 3 users at a time', type: 'error' });
    }
  };

  // Print View
  const handlePrint = () => {
    window.print();
  };

  // Import Users
  const handleImportUsers = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

        // This is a basic CSV parser - can be enhanced
        setToast({ message: 'Import functionality - CSV parsed. Add backend endpoint to process.', type: 'info' });
        setShowImportModal(false);
      } catch (err) {
        setToast({ message: 'Failed to parse CSV file', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Never';
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      await updateUserStatus(id, newStatus);
      setToast({ message: 'User status updated', type: 'success' });
      fetchUsers();
    } catch (err) {
      setToast({ message: err.error || 'Failed to update status', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      setToast({ message: 'User deleted successfully', type: 'success' });
      fetchUsers();
      if (selectedUser && (selectedUser._id === id || selectedUser.id === id)) {
        setShowUserDetails(false);
        setSelectedUser(null);
      }
    } catch (err) {
      setToast({ message: err.error || 'Failed to delete user', type: 'error' });
    }
    setConfirmDialog(null);
  };

  const handleRowClick = (user, e) => {
    // Don't open modal if clicking on action buttons
    if (e.target.closest('button') || e.target.closest('td:last-child')) {
      return;
    }
    setSelectedUser(user);
    setShowUserDetails(true);
    setEditUserMode(false);
  };

  const handleEditUser = () => {
    setEditFormData({
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      phone: selectedUser.phone || '',
      address: selectedUser.address || '',
      city: selectedUser.city || '',
      state: selectedUser.state || '',
      zipCode: selectedUser.zipCode || '',
      country: selectedUser.country || '',
      dateOfBirth: selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toISOString().split('T')[0] : '',
      gender: selectedUser.gender || '',
      role: selectedUser.role === 'lecturer' ? 'member' : selectedUser.role || 'member',
      institutionName: selectedUser.institutionName || '',
      status: selectedUser.status || 'active',
      guardianName: selectedUser.guardianName || '',
      guardianPhone: selectedUser.guardianPhone || '',
    });
    setEditUserMode(true);
  };

  const handleSaveUser = async () => {
    try {
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || undefined,
        address: editFormData.address || undefined,
        city: editFormData.city || undefined,
        state: editFormData.state || undefined,
        zipCode: editFormData.zipCode || undefined,
        country: editFormData.country || undefined,
        dateOfBirth: editFormData.dateOfBirth || undefined,
        gender: editFormData.gender || '',
        role: editFormData.role,
        institutionName: editFormData.institutionName || undefined,
        status: editFormData.status,
        guardianName: editFormData.guardianName || undefined,
        guardianPhone: editFormData.guardianPhone || undefined,
      };
      const response = await updateUser(selectedUser._id || selectedUser.id, payload);
      const updatedUser = response.user;
      setSelectedUser(updatedUser);
      setUsers(users.map((u) => (u._id === updatedUser._id || u.id === updatedUser.id) ? { ...u, ...updatedUser } : u));
      setEditUserMode(false);
      setToast({ message: 'User updated successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || err.error || 'Failed to update user', type: 'error' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Not provided';
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setToast({ message: 'File size should be less than 5MB', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await uploadUserImage(selectedUser._id || selectedUser.id, formData);
      setToast({ message: 'Image uploaded successfully', type: 'success' });

      // Update local state with new image
      const updatedUser = { ...selectedUser, image: response.image };
      setSelectedUser(updatedUser);

      // Update users list
      setUsers(users.map(u => (u._id === updatedUser._id || u.id === updatedUser.id) ? { ...u, image: response.image } : u));
    } catch (err) {
      setToast({ message: err.error || 'Failed to upload image', type: 'error' });
    }
  };

  return (
    <DashboardLayout pageTitle="User Management">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 border-2 border-white/50 flex items-center justify-center">
                      {selectedUser.image ? (
                        <img
                          src={selectedUser.image}
                          alt={selectedUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-white font-bold">
                          {selectedUser.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-lg cursor-pointer transform translate-x-1/4 translate-y-1/4 hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">User Details</h2>
                    <p className="text-blue-100 text-sm mt-1">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                    setEditUserMode(false);
                  }}
                  className="text-white hover:text-gray-200 focus:outline-none transition-colors ml-4"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editUserMode ? (
                /* Edit Form */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={editFormData.dateOfBirth || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Gender</label>
                      <select
                        value={editFormData.gender || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Information</h3>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Role</label>
                      <select
                        value={editFormData.role || 'member'}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="member">Member</option>
                        {isSuperadmin && (
                          <>
                            <option value="admin">Office Admin</option>
                            <option value="hr">Supervisor</option>
                            <option value="superadmin">Superadmin</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Status</label>
                      <select
                        value={editFormData.status || 'active'}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Institution Name</label>
                      <input
                        type="text"
                        value={editFormData.institutionName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, institutionName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Guardian Name</label>
                      <input
                        type="text"
                        value={editFormData.guardianName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, guardianName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Parent/guardian name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Guardian Phone</label>
                      <input
                        type="tel"
                        value={editFormData.guardianPhone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, guardianPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Contact number"
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Account Created: {formatDate(selectedUser.createdAt)}</p>
                      <p>Last Login: {formatLastLogin(selectedUser.lastLogin)}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Address</label>
                        <input
                          type="text"
                          value={editFormData.address || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={editFormData.city || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">State/Province</label>
                        <input
                          type="text"
                          value={editFormData.state || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Zip/Postal Code</label>
                        <input
                          type="text"
                          value={editFormData.zipCode || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Country</label>
                        <input
                          type="text"
                          value={editFormData.country || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="text-gray-900 font-medium">{selectedUser.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-gray-900 font-medium">{selectedUser.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="text-gray-900 font-medium">{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date of Birth</p>
                      <p className="text-gray-900 font-medium">{formatDate(selectedUser.dateOfBirth)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="text-gray-900 font-medium">
                        {selectedUser.gender ? selectedUser.gender.charAt(0).toUpperCase() + selectedUser.gender.slice(1) : 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Information</h3>
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {selectedUser.role === 'admin' ? 'Office Admin' : selectedUser.role === 'hr' ? 'Supervisor' : (selectedUser.role?.charAt(0).toUpperCase() + selectedUser.role?.slice(1) || 'Not provided')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${selectedUser.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {selectedUser.status?.charAt(0).toUpperCase() + selectedUser.status?.slice(1) || 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Institution Name</p>
                      <p className="text-gray-900 font-medium">{selectedUser.institutionName || 'Not provided'}</p>
                    </div>
                    {(selectedUser.guardianName || selectedUser.guardianPhone) && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Guardian Name</p>
                          <p className="text-gray-900 font-medium">{selectedUser.guardianName || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Guardian Phone</p>
                          <p className="text-gray-900 font-medium">{selectedUser.guardianPhone || 'Not provided'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Account Created</p>
                      <p className="text-gray-900 font-medium">{formatDate(selectedUser.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Login</p>
                      <p className="text-gray-900 font-medium">{formatLastLogin(selectedUser.lastLogin)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Login Count</p>
                      <p className="text-gray-900 font-medium">{selectedUser.loginCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Verified</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${selectedUser.verified ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {selectedUser.verified ? '✓ Verified' : 'Not Verified'}
                      </span>
                    </div>
                    {selectedUser.tags && selectedUser.tags.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Tags</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedUser.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedUser.notes && (
                      <div>
                        <p className="text-sm text-gray-600">Notes</p>
                        <p className="text-gray-900 font-medium text-sm bg-yellow-50 p-2 rounded border border-yellow-200">{selectedUser.notes}</p>
                      </div>
                    )}
                  </div>
                  {(selectedUser.address || selectedUser.city || selectedUser.state || selectedUser.zipCode || selectedUser.country) && (
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.address && <div><p className="text-sm text-gray-600">Address</p><p className="text-gray-900 font-medium">{selectedUser.address}</p></div>}
                        {selectedUser.city && <div><p className="text-sm text-gray-600">City</p><p className="text-gray-900 font-medium">{selectedUser.city}</p></div>}
                        {selectedUser.state && <div><p className="text-sm text-gray-600">State/Province</p><p className="text-gray-900 font-medium">{selectedUser.state}</p></div>}
                        {selectedUser.zipCode && <div><p className="text-sm text-gray-600">Zip/Postal Code</p><p className="text-gray-900 font-medium">{selectedUser.zipCode}</p></div>}
                        {selectedUser.country && <div><p className="text-sm text-gray-600">Country</p><p className="text-gray-900 font-medium">{selectedUser.country}</p></div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {editUserMode ? (
                <>
                  <button
                    onClick={() => setEditUserMode(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowUserDetails(false);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleEditUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="Manage and monitor system users"
          actions={
            <>
              <button
                type="button"
                onClick={exportToCSV}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/register')}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              >
                + Add User
              </button>
            </>
          }
        />

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <UMStatCard
              label="Total Users"
              value={stats.total}
              tone="indigo"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              }
            />
            <UMStatCard
              label="Active"
              value={stats.active}
              tone="green"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              }
            />
            <UMStatCard
              label="Disabled"
              value={stats.disabled}
              tone="red"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18.4 18.4A9 9 0 0 0 5.6 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M5.6 18.4A9 9 0 0 0 18.4 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              }
            />
            <UMStatCard
              label="Members"
              value={stats.members}
              tone="purple"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 21v-1a5 5 0 0 1 10 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              }
            />
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Verified Users</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.verified || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% of total
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Last 30 Days</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.recentLogin || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Recently active users</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New This Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.newThisMonth || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Users registered this month</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:flex-1">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">Search</label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300/50">
                      <SearchIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by name, email, phone, or city…"
                      className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400/60"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                  >
                    <option value="all">All Roles</option>
                    {isSuperadmin && <option value="superadmin">Superadmin</option>}
                    {isSuperadmin && <option value="admin">Office Admin</option>}
                    {isSuperadmin && <option value="hr">Supervisor</option>}
                    <option value="member">Member</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">Sort</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                  >
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="role">Role</option>
                    <option value="status">Status</option>
                    <option value="createdAt">Created Date</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-white/5"
                  title="Toggle sort order"
                >
                  {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">Rows</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-300/70">
                Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</span>–{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{filteredUsers.length}</span> users
                {filteredUsers.length !== users.length && (
                  <span className="ml-2 text-indigo-600 dark:text-indigo-300">(filtered from {users.length})</span>
                )}
              </div>
              {selectedUsers.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-white/5"
                >
                  Clear selection ({selectedUsers.length})
                </button>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-300/70">Select rows for bulk actions</span>
              )}
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedUsers.length} user(s) selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    ✅ Activate Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    🚫 Deactivate Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    🗑️ Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}
          {viewMode === 'table' ? (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden dark:border-white/10 dark:bg-slate-900/40">
                <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full border-collapse">
                  <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-300/70">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-2 focus:ring-purple-400/60 dark:border-white/20 dark:bg-white/5"
                        />
                      </th>
                      <th
                        className="px-4 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center gap-2">
                          Role
                          {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors"
                        onClick={() => handleSort('lastLogin')}
                      >
                        <div className="flex items-center gap-2">
                          Last Login
                          {sortBy === 'lastLogin' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th className="px-4 py-3">Tags & Notes</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  {loading ? (
                    <TableSkeleton rows={Math.min(10, itemsPerPage)} cols={8} />
                  ) : (
                  <tbody className="text-sm text-slate-700 dark:text-slate-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-14 text-center">
                          <div className="flex flex-col items-center">
                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">No users found</p>
                            <p className="text-sm text-slate-500 dark:text-slate-300/70 mt-1">Try adjusting your search or filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const userId = user._id || user.id;
                        const isSelected = selectedUsers.includes(userId);
                        return (
                          <tr
                            key={userId}
                            onClick={(e) => handleRowClick(user, e)}
                            className={`cursor-pointer transition-all duration-300 border-t border-slate-200/70 dark:border-white/10 ${isSelected ? 'bg-indigo-50/60 hover:bg-indigo-50 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                              }`}
                          >
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectUser(userId)}
                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-2 focus:ring-purple-400/60 dark:border-white/20 dark:bg-white/5"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-semibold">
                                  {user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-900 dark:text-white">{user.name}</div>
                                  <div className="truncate text-xs text-slate-500 dark:text-slate-300/70">{user.phone || user.city || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300/80">{user.email}</td>
                            <td className="px-4 py-4"><RoleBadge role={user.role} /></td>
                            <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300/80">
                              {formatLastLogin(user.lastLogin)}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium">
                              <div className="flex items-center gap-2">
                                {user.verified && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200 flex items-center gap-1">
                                    ✓ Verified
                                  </span>
                                )}
                                {user.tags && user.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {user.tags.slice(0, 2).map((tag, idx) => (
                                      <span key={idx} className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                        {tag}
                                      </span>
                                    ))}
                                    {user.tags.length > 2 && (
                                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                                        +{user.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {user.notes && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800" title={user.notes}>
                                    📝
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <ActionIconButton
                                  title="View"
                                  tone="primary"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDetails(true);
                                    setEditUserMode(false);
                                  }}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </ActionIconButton>
                                <ActionIconButton
                                  title="Edit"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDetails(true);
                                    setEditUserMode(true);
                                    setEditFormData(user);
                                  }}
                                >
                                  <EditIcon className="h-4 w-4" />
                                </ActionIconButton>
                                <ActionIconButton title="Delete" tone="danger" onClick={() => handleDeleteUser(user)}>
                                  <TrashIcon className="h-4 w-4" />
                                </ActionIconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  )}
                </table>
                </div>
              </div>

              <div className="mt-4">
                <Pagination page={currentPage} pageSize={itemsPerPage} total={filteredUsers.length} onChange={setCurrentPage} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900">No users found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  paginatedUsers.map((user) => {
                    const userId = user._id || user.id;
                    const isSelected = selectedUsers.includes(userId);
                    return (
                      <div
                        key={userId}
                        onClick={(e) => {
                          if (!e.target.closest('button') && !e.target.closest('input')) {
                            handleRowClick(user, e);
                          }
                        }}
                        className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer border-2 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                          }`}
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectUser(userId)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {user.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${user.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {user.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{user.name}</h3>
                          <p className="text-sm text-gray-600 mb-2 truncate">{user.email}</p>
                          <div className="flex items-center justify-between mb-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.role === 'admin' ? 'Office Admin' : user.role === 'hr' ? 'Supervisor' : user.role}
                            </span>
                            {user.phone && (
                              <span className="text-xs text-gray-500">📞 {user.phone}</span>
                            )}
                          </div>
                          {user.city && (
                            <p className="text-xs text-gray-500 mb-4">📍 {user.city}{user.country ? `, ${user.country}` : ''}</p>
                          )}
                          {user.createdAt && (
                            <p className="text-xs text-gray-400 mb-4">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          )}
                          {/* Management actions restricted to superadmins for admin/superadmin accounts */}
                          {(currentUser?.role === 'superadmin' || (user.role !== 'admin' && user.role !== 'superadmin')) && (
                            <div className="flex gap-2 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleStatus(userId, user.status)}
                                className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium ${user.status === 'active'
                                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                  }`}
                              >
                                {user.status === 'active' ? '🚫 Disable' : '✅ Enable'}
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDialog({
                                    message: `Are you sure you want to delete ${user.name}?`,
                                    onConfirm: () => handleDelete(userId),
                                  })
                                }
                                className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 border border-red-600 transition-colors shadow-sm text-sm font-medium"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination for Card View */}
              {totalPages > 1 && (
                <div className="mt-6 bg-white px-4 py-3 rounded-lg shadow border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page <span className="font-semibold">{currentPage}</span> of{' '}
                      <span className="font-semibold">{totalPages}</span>
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm ${currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      {/* Notes Modal */}
      {showNotesModal && notesUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">📝 Notes for {notesUser.name}</h2>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesUser(null);
                  setUserNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Add notes about this user..."
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesUser(null);
                  setUserNotes('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags Modal */}
      {showTagsModal && tagsUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">🏷️ Tags for {tagsUser.name}</h2>
              <button
                onClick={() => {
                  setShowTagsModal(false);
                  setTagsUser(null);
                  setUserTags([]);
                  setNewTag('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Tag</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Enter tag name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Tags</label>
                {userTags.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tags added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTagsModal(false);
                  setTagsUser(null);
                  setUserTags([]);
                  setNewTag('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline Modal */}
      {showActivityModal && activityUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">📊 Activity Timeline - {activityUser.name}</h2>
              <button
                onClick={() => {
                  setShowActivityModal(false);
                  setActivityUser(null);
                  setUserActivities([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingActivity ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : userActivities.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userActivities.map((activity, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowActivityModal(false);
                  setActivityUser(null);
                  setUserActivities([]);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Comparison Modal */}
      {comparingUsers.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">🔍 User Comparison</h2>
              <button
                onClick={() => setComparingUsers([])}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {comparingUsers.map((userId) => {
                  const user = users.find((u) => (u._id || u.id) === userId);
                  if (!user) return null;
                  return (
                    <div key={userId} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3">{user.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Email:</span> {user.email}
                        </div>
                        <div>
                          <span className="text-gray-600">Role:</span> {user.role === 'admin' ? 'Office Admin' : user.role === 'hr' ? 'Supervisor' : user.role}
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span> {user.status}
                        </div>
                        <div>
                          <span className="text-gray-600">Last Login:</span> {formatLastLogin(user.lastLogin)}
                        </div>
                        <div>
                          <span className="text-gray-600">Login Count:</span> {user.loginCount || 0}
                        </div>
                        <div>
                          <span className="text-gray-600">Verified:</span> {user.verified ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <span className="text-gray-600">Created:</span> {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setComparingUsers([])}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered actions popup (Delete & Modify) */}
      {quickActionsMenu && (() => {
        const actionUser = users.find((u) => (u._id || u.id) === quickActionsMenu);
        if (!actionUser) return null;
        return (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setQuickActionsMenu(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Actions</h3>
              <p className="text-sm text-gray-500 mb-4">{actionUser.name}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setSelectedUser(actionUser);
                    setShowUserDetails(true);
                    setEditUserMode(false);
                    setQuickActionsMenu(null);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
                >
                  ✏️ Modify
                </button>
                {(currentUser?.role === 'superadmin' || (actionUser.role !== 'admin' && actionUser.role !== 'superadmin')) && (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        message: `Are you sure you want to delete ${actionUser.name}?`,
                        onConfirm: () => handleDelete(actionUser._id || actionUser.id),
                      });
                      setQuickActionsMenu(null);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
              <button
                onClick={() => setQuickActionsMenu(null)}
                className="mt-4 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
};

export default UserManagement;

