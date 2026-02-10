import { useState, useEffect } from 'react';
import { getUsers, updateUserStatus, deleteUser, updateUserNotes, updateUserTags, verifyUser, getUserActivity } from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
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

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortOrder, dateRange, quickFilters]);

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
    let filtered = [...users];

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
    const teachers = users.filter((u) => u.role === 'teacher' || u.role === 'lecturer').length;
    const viewers = users.filter((u) => u.role === 'viewer').length;
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

    return { total, active, disabled, admins, teachers, viewers, verified, recentLogin, newThisMonth };
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

  // Chart data
  const getRoleDistributionData = () => {
    return [
      { name: 'Admin', value: stats.admins, color: '#8b5cf6' },
      { name: 'Teacher', value: stats.teachers, color: '#3b82f6' },
      { name: 'Viewer', value: stats.viewers, color: '#6b7280' },
    ];
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
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
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">User Details</h2>
                  <p className="text-blue-100 text-sm mt-1">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                  }}
                  className="text-white hover:text-gray-200 focus:outline-none transition-colors"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
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

                {/* Account Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Information</h3>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                      {selectedUser.role?.charAt(0).toUpperCase() + selectedUser.role?.slice(1) || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedUser.status === 'active'
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
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedUser.verified ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedUser.verified ? '✓ Verified' : 'Not Verified'}
                    </span>
                  </div>
                  {selectedUser.tags && selectedUser.tags.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Tags</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedUser.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedUser.notes && (
                    <div>
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="text-gray-900 font-medium text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                        {selectedUser.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Address Information */}
                {(selectedUser.address || selectedUser.city || selectedUser.state || selectedUser.zipCode || selectedUser.country) && (
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUser.address && (
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="text-gray-900 font-medium">{selectedUser.address}</p>
                        </div>
                      )}
                      {selectedUser.city && (
                        <div>
                          <p className="text-sm text-gray-600">City</p>
                          <p className="text-gray-900 font-medium">{selectedUser.city}</p>
                        </div>
                      )}
                      {selectedUser.state && (
                        <div>
                          <p className="text-sm text-gray-600">State/Province</p>
                          <p className="text-gray-900 font-medium">{selectedUser.state}</p>
                        </div>
                      )}
                      {selectedUser.zipCode && (
                        <div>
                          <p className="text-sm text-gray-600">Zip/Postal Code</p>
                          <p className="text-gray-900 font-medium">{selectedUser.zipCode}</p>
                        </div>
                      )}
                      {selectedUser.country && (
                        <div>
                          <p className="text-sm text-gray-600">Country</p>
                          <p className="text-gray-900 font-medium">{selectedUser.country}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
       <div className="flex">
         <Sidebar />
         <main className="flex-1 p-8">
           <div className="flex justify-between items-center mb-6">
             <div>
               <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
               <p className="text-gray-600 mt-1">Manage and monitor all system users</p>
             </div>
               <div className="flex gap-3">
                 <button
                   onClick={exportToCSV}
                   className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                   Export CSV
                 </button>
                 <button
                   onClick={handlePrint}
                   className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                   </svg>
                   Print
                 </button>
                 <label className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 cursor-pointer">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                   </svg>
                   Import CSV
                   <input type="file" accept=".csv" onChange={handleImportUsers} className="hidden" />
                 </label>
                 <button
                   onClick={() => navigate('/admin/register')}
                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                   </svg>
                   Create User
                 </button>
               </div>
           </div>

           {/* Statistics Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
             <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-blue-100 text-sm font-medium">Total Users</p>
                   <p className="text-3xl font-bold mt-1">{stats.total}</p>
                 </div>
                 <div className="bg-white bg-opacity-20 rounded-full p-3">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                   </svg>
                 </div>
               </div>
             </div>
             <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-green-100 text-sm font-medium">Active</p>
                   <p className="text-3xl font-bold mt-1">{stats.active}</p>
                 </div>
                 <div className="bg-white bg-opacity-20 rounded-full p-3">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                 </div>
               </div>
             </div>
             <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-4 text-white">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-red-100 text-sm font-medium">Disabled</p>
                   <p className="text-3xl font-bold mt-1">{stats.disabled}</p>
                 </div>
                 <div className="bg-white bg-opacity-20 rounded-full p-3">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                   </svg>
                 </div>
               </div>
             </div>
             <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 text-white">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-purple-100 text-sm font-medium">Admins</p>
                   <p className="text-3xl font-bold mt-1">{stats.admins}</p>
                 </div>
                 <div className="bg-white bg-opacity-20 rounded-full p-3">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                   </svg>
                 </div>
               </div>
             </div>
             <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-4 text-white">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-indigo-100 text-sm font-medium">Teachers</p>
                   <p className="text-3xl font-bold mt-1">{stats.teachers}</p>
                 </div>
                 <div className="bg-white bg-opacity-20 rounded-full p-3">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                   </svg>
                 </div>
               </div>
             </div>
             <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg shadow-lg p-4 text-white">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-gray-100 text-sm font-medium">Viewers</p>
                   <p className="text-3xl font-bold mt-1">{stats.viewers}</p>
                 </div>
                 <div className="bg-white bg-opacity-20 rounded-full p-3">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                   </svg>
                 </div>
               </div>
             </div>
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

           {/* Search and Filters */}
           <div className="bg-white rounded-lg shadow p-6 mb-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Search Users</label>
                 <div className="relative">
                   <input
                     type="text"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     placeholder="Search by name, email, phone, or city..."
                     className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                   <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                 <select
                   value={roleFilter}
                   onChange={(e) => setRoleFilter(e.target.value)}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="all">All Roles</option>
                   <option value="admin">Admin</option>
                   <option value="teacher">Teacher</option>
                   <option value="viewer">Viewer</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                 <select
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="all">All Status</option>
                   <option value="active">Active</option>
                   <option value="disabled">Disabled</option>
                 </select>
               </div>
             </div>
             <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
               <div className="flex items-center gap-4 flex-wrap">
                 <label className="text-sm font-medium text-gray-700">Sort by:</label>
                 <select
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value)}
                   className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="name">Name</option>
                   <option value="email">Email</option>
                   <option value="role">Role</option>
                   <option value="status">Status</option>
                   <option value="createdAt">Created Date</option>
                 </select>
                 <button
                   onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                   className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                 >
                   {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                 </button>
                 <label className="text-sm font-medium text-gray-700">Items per page:</label>
                 <select
                   value={itemsPerPage}
                   onChange={(e) => {
                     setItemsPerPage(Number(e.target.value));
                     setCurrentPage(1);
                   }}
                   className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="5">5</option>
                   <option value="10">10</option>
                   <option value="25">25</option>
                   <option value="50">50</option>
                   <option value="100">100</option>
                 </select>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-600">View:</span>
                 <button
                   onClick={() => setViewMode('table')}
                   className={`p-2 rounded-lg transition-colors ${
                     viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                   }`}
                   title="Table View"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                   </svg>
                 </button>
                 <button
                   onClick={() => setViewMode('cards')}
                   className={`p-2 rounded-lg transition-colors ${
                     viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                   }`}
                   title="Card View"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                   </svg>
                 </button>
               </div>
             </div>
             <div className="mt-4 flex items-center justify-between">
               <div className="text-sm text-gray-600">
                 Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
                 <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                 <span className="font-semibold text-gray-900">{filteredUsers.length}</span> users
                 {filteredUsers.length !== users.length && (
                   <span className="text-blue-600 ml-2">(filtered from {users.length} total)</span>
                 )}
               </div>
               {selectedUsers.length > 0 && (
                 <div className="flex items-center gap-2">
                   <span className="text-sm text-gray-600">
                     <span className="font-semibold text-blue-600">{selectedUsers.length}</span> selected
                   </span>
                   <button
                     onClick={() => setSelectedUsers([])}
                     className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                   >
                     Clear Selection
                   </button>
                 </div>
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
             <div className="bg-white rounded-lg shadow overflow-hidden">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                       <input
                         type="checkbox"
                         checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                         onChange={handleSelectAll}
                         className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                       />
                     </th>
                     <th
                       className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                       onClick={() => handleSort('name')}
                     >
                       <div className="flex items-center gap-2">
                         Name
                         {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                       </div>
                     </th>
                     <th
                       className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                       onClick={() => handleSort('email')}
                     >
                       <div className="flex items-center gap-2">
                         Email
                         {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                       </div>
                     </th>
                     <th
                       className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                       onClick={() => handleSort('role')}
                     >
                       <div className="flex items-center gap-2">
                         Role
                         {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                       </div>
                     </th>
                     <th
                       className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                       onClick={() => handleSort('status')}
                     >
                       <div className="flex items-center gap-2">
                         Status
                         {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                       </div>
                     </th>
                     <th
                       className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                       onClick={() => handleSort('lastLogin')}
                     >
                       <div className="flex items-center gap-2">
                         Last Login
                         {sortBy === 'lastLogin' && (sortOrder === 'asc' ? '↑' : '↓')}
                       </div>
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags & Notes</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {filteredUsers.length === 0 ? (
                     <tr>
                       <td colSpan="8" className="px-6 py-12 text-center">
                         <div className="flex flex-col items-center">
                           <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                           </svg>
                           <p className="text-lg font-medium text-gray-900">No users found</p>
                           <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
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
                           className={`cursor-pointer transition-colors ${
                             isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                           }`}
                         >
                           <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                             <input
                               type="checkbox"
                               checked={isSelected}
                               onChange={() => handleSelectUser(userId)}
                               className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                             />
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                             <div className="flex items-center gap-2">
                               <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                 {user.name?.charAt(0).toUpperCase() || 'U'}
                               </div>
                               {user.name}
                             </div>
                           </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastLogin(user.lastLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {user.verified && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickActionsMenu(quickActionsMenu === userId ? null : userId);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {quickActionsMenu === userId && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenNotes(user);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                📝 Edit Notes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenTags(user);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                🏷️ Manage Tags
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewActivity(user);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                📊 View Activity
                              </button>
                              {!user.verified && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyUser(user._id || user.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  ✓ Verify User
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompareUsers(user);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                {comparingUsers.includes(userId) ? '✗ Remove from Compare' : '🔍 Compare'}
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(user._id || user.id, user.status);
                                  setQuickActionsMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                {user.status === 'active' ? '🚫 Disable' : '✅ Enable'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDialog({
                                    message: `Are you sure you want to delete ${user.name}?`,
                                    onConfirm: () => handleDelete(user._id || user.id),
                                  });
                                  setQuickActionsMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                   </tr>
                         );
                       })
                     )}
                 </tbody>
               </table>
             </div>

            {/* Pagination */}
            {totalPages > 1 && (
               <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
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
                         className={`px-3 py-1 rounded-lg text-sm ${
                           currentPage === pageNum
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
                       className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer border-2 ${
                         isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
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
                             className={`px-3 py-1 rounded-full text-xs font-semibold ${
                               user.status === 'active'
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
                             {user.role}
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
                         <div className="flex gap-2 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                           <button
                             onClick={() => handleToggleStatus(userId, user.status)}
                             className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium ${
                               user.status === 'active'
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
                         className={`px-3 py-1 rounded-lg text-sm ${
                           currentPage === pageNum
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
        </main>
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
                          <span className="text-gray-600">Role:</span> {user.role}
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

      {/* Click outside to close quick actions menu */}
      {quickActionsMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setQuickActionsMenu(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;

