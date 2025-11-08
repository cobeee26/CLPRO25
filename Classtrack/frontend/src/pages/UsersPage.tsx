import React, { useState, useEffect } from 'react';
import { getAllUsers, createUserByAdmin, updateUserByAdmin, deleteUserByAdmin } from '../services/authService';
import type { UserCreate, UserUpdate } from '../services/authService';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import './DashboardPage.css';

interface User {
  id: number;
  username: string;
  role: string;
  dateCreated?: string;
  status?: 'Active' | 'Inactive';
}

const UsersPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Student' as 'Teacher' | 'Student'
  });
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    role: 'Student' as 'Teacher' | 'Student'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  // Fetch users data on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiUsers = await getAllUsers();
        
        // Transform API data to match our interface
        const transformedUsers: User[] = apiUsers.map(apiUser => ({
          id: apiUser.id,
          username: apiUser.username,
          role: apiUser.role,
          dateCreated: new Date().toISOString().split('T')[0], // Placeholder date
          status: 'Active' as const // Placeholder status
        }));
        
        setUsers(transformedUsers);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Force center alignment on mount and resize
  useEffect(() => {
    const handleResize = () => {
      // Simple scroll reset without recursive calls
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const handleLoad = () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('load', handleLoad);
    handleLoad();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  // Filter users based on search term and role - COMPLETELY FIXED VERSION
  const filteredUsers = users.filter(user => {
    // Fix search functionality - handle empty search term
    const matchesSearch = searchTerm === '' || 
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Fix role comparison - handle case sensitivity and role mapping
    const userRole = user.role.toLowerCase();
    const selectedRole = filterRole.toLowerCase();
    
    let matchesRole = false;
    
    if (filterRole === 'All') {
      matchesRole = true;
    } else {
      // Handle different role naming conventions
      if (selectedRole === 'admin') {
        matchesRole = userRole === 'admin';
      } else if (selectedRole === 'teacher') {
        matchesRole = userRole === 'teacher';
      } else if (selectedRole === 'student') {
        matchesRole = userRole === 'student';
      }
    }
    
    return matchesSearch && matchesRole;
  });

  const handleEditUser = (userId: number) => {
    const userToEdit = users.find(user => user.id === userId);
    if (userToEdit) {
      setEditingUser(userToEdit);
      setEditFormData({
        username: userToEdit.username,
        password: '', // Leave password empty for optional update
        role: userToEdit.role as 'Teacher' | 'Student'
      });
      setEditFormError(null);
      setEditSuccessMessage(null);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteUser = (userId: number) => {
    const userToDelete = users.find(user => user.id === userId);
    if (userToDelete) {
      setDeletingUser(userToDelete);
      setDeleteError(null);
      setDeleteSuccessMessage(null);
      setIsDeleteModalOpen(true);
    }
  };

  const handleCreateUser = () => {
    setIsModalOpen(true);
    setFormError(null);
    setFormData({
      username: '',
      password: '',
      role: 'Student'
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setSuccessMessage(null);
    setFormData({
      username: '',
      password: '',
      role: 'Student'
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      // Prepare user data for API call
      const userData: UserCreate = {
        username: formData.username,
        password: formData.password,
        role: formData.role.toLowerCase() as 'teacher' | 'student'
      };

      // Call the API to create user
      const createdUser = await createUserByAdmin(userData);
      
      // Show success message
      setSuccessMessage(`User "${createdUser.username}" created successfully!`);
      
      // Refresh the users list
      const updatedUsers = await getAllUsers();
      const transformedUsers: User[] = updatedUsers.map(apiUser => ({
        id: apiUser.id,
        username: apiUser.username,
        role: apiUser.role,
        dateCreated: new Date().toISOString().split('T')[0], // Placeholder date
        status: 'Active' as const // Placeholder status
      }));
      setUsers(transformedUsers);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
      
    } catch (err: any) {
      // Handle error display properly
      let errorMessage = 'User creation failed. Please check the input and try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.detail) {
        // Handle Axios error response details
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = err.response.data.detail.map((errorItem: any) => 
            `${errorItem.loc?.join('.') || 'Field'}: ${errorItem.msg || errorItem.type || 'Invalid value'}`
          ).join(', ');
        } else {
          errorMessage = 'Invalid request data. Please check all fields.';
        }
      }
      
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditFormError(null);
    setEditSuccessMessage(null);
    setEditFormData({
      username: '',
      password: '',
      role: 'Student'
    });
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
    setDeleteError(null);
    setDeleteSuccessMessage(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    
    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteSuccessMessage(null);

    try {
      // Call the API to delete user
      await deleteUserByAdmin(deletingUser.id);
      
      // Show success message
      setDeleteSuccessMessage(`User "${deletingUser.username}" deleted successfully!`);
      
      // Refresh the users list
      const updatedUsers = await getAllUsers();
      const transformedUsers: User[] = updatedUsers.map(apiUser => ({
        id: apiUser.id,
        username: apiUser.username,
        role: apiUser.role,
        dateCreated: new Date().toISOString().split('T')[0], // Placeholder date
        status: 'Active' as const // Placeholder status
      }));
      setUsers(transformedUsers);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        handleCloseDeleteModal();
      }, 1500);
      
    } catch (err: any) {
      // Handle error display properly
      let errorMessage = 'User deletion failed. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.detail) {
        // Handle Axios error response details
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = err.response.data.detail.map((errorItem: any) => 
            `${errorItem.loc?.join('.') || 'Field'}: ${errorItem.msg || errorItem.type || 'Invalid value'}`
          ).join(', ');
        } else {
          errorMessage = 'Invalid request data. Please check all fields.';
        }
      }
      
      setDeleteError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormLoading(true);
    setEditFormError(null);
    setEditSuccessMessage(null);

    try {
      // Prepare user data for API call (only include password if provided)
      const updateData: UserUpdate = {
        username: editFormData.username,
        role: editFormData.role.toLowerCase() as 'teacher' | 'student'
      };

      // Only include password if user provided a new one
      if (editFormData.password.trim()) {
        updateData.password = editFormData.password;
      }

      // Call the API to update user
      if (!editingUser) {
        throw new Error('No user selected for editing');
      }

      const updatedUser = await updateUserByAdmin(editingUser.id, updateData);
      
      // Show success message
      setEditSuccessMessage(`User "${updatedUser.username}" updated successfully!`);
      
      // Refresh the users list
      const updatedUsers = await getAllUsers();
      const transformedUsers: User[] = updatedUsers.map(apiUser => ({
        id: apiUser.id,
        username: apiUser.username,
        role: apiUser.role,
        dateCreated: new Date().toISOString().split('T')[0], // Placeholder date
        status: 'Active' as const // Placeholder status
      }));
      setUsers(transformedUsers);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        handleCloseEditModal();
      }, 1500);
      
    } catch (err: any) {
      // Handle error display properly
      let errorMessage = 'User update failed. Please check the input and try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.detail) {
        // Handle Axios error response details
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = err.response.data.detail.map((errorItem: any) => 
            `${errorItem.loc?.join('.') || 'Field'}: ${errorItem.msg || errorItem.type || 'Invalid value'}`
          ).join(', ');
        } else {
          errorMessage = 'Invalid request data. Please check all fields.';
        }
      }
      
      setEditFormError(errorMessage);
    } finally {
      setEditFormLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-inter">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 p-4 shadow-xl flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm"></div>
            <img 
              src={plmunLogo} 
              alt="PLMun Logo" 
              className="relative w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Manage Users</h1>
            <p className="text-xs text-slate-400">View and manage all system users</p>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          title="Toggle menu"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0 pt-16 lg:pt-0">
        {/* Dynamic Header */}
        <div className="hidden lg:block">
          <DynamicHeader 
            title="Manage Users"
            subtitle="View and manage all system users"
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 min-h-0">
          <div className="dashboard-content w-full max-w-7xl mx-auto px-4 lg:px-8">
            
            {/* Professional Page Header */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 lg:mb-10 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                {/* Title Section */}
                <div className="flex-1">
                  <div className="relative">
                    <h1 className="text-xl sm:text-2xl lg:text-4xl font-black text-white mb-3 lg:mb-4 tracking-tight leading-tight">
                      <span className="bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent relative">
                        Manage Users
                        {/* Professional Underline - Aligned with Text */}
                        <div className="absolute -bottom-1 lg:-bottom-2 left-0 right-0 h-0.5 lg:h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/40"></div>
                      </span>
                    </h1>
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg text-slate-300 font-medium mt-4 lg:mt-6 leading-relaxed">
                    View and manage all system users with comprehensive controls
                  </p>
                </div>
                
                {/* Action Button Section */}
                <div className="flex-shrink-0">
                  <button 
                    onClick={handleCreateUser}
                    className="group relative flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 text-sm sm:text-base border border-red-500/30 hover:border-red-400/50"
                    title="Create new user"
                  >
                    {/* Button Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-lg sm:rounded-xl blur group-hover:blur-md transition-all duration-300"></div>
                    
                    {/* Button Content */}
                    <div className="relative flex items-center space-x-1 sm:space-x-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                        <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="font-bold tracking-wide">Create User</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Professional Search and Filter Section */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl">
              {/* Section Header with Accent Line */}
              <div className="mb-4">
                <div className="relative">
                  <h2 className="text-base sm:text-lg font-bold text-white relative">
                    <span className="relative">
                      Search & Filter
                      {/* Aligned Underline */}
                      <div className="absolute -bottom-1 left-0 w-12 sm:w-16 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-sm shadow-emerald-500/30"></div>
                    </span>
                  </h2>
                </div>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                {/* Search Bar */}
                <div className="flex-1">
                  <label htmlFor="search" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1 sm:mb-2 tracking-wide">
                    Search Users
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="search"
                      placeholder="Search by username or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div className="lg:w-48">
                  <label htmlFor="role-filter" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1 sm:mb-2 tracking-wide">
                    Filter by Role
                  </label>
                  <div className="relative group">
                    <select
                      id="role-filter"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="block w-full px-3 py-2 sm:py-3 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20 appearance-none cursor-pointer"
                    >
                      <option value="All">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Student">Student</option>
                    </select>
                    {/* Custom Dropdown Arrow */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Users Table - MOBILE OPTIMIZED */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 rounded-xl shadow-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-slate-300 font-medium text-xs sm:text-sm">Loading users...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-red-400 font-semibold text-sm sm:text-base">Failed to load users</p>
                      <p className="text-slate-400 text-xs mt-1">{error}</p>
                    </div>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors text-xs sm:text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Mobile Card View */}
                  <div className="block lg:hidden">
                    <div className="space-y-3 p-3 sm:p-4">
                      {filteredUsers.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-slate-600/20 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-slate-300 font-semibold text-sm">No users found</p>
                              <p className="text-slate-400 text-xs mt-1">
                                {searchTerm || filterRole !== 'All' 
                                  ? 'Try adjusting your search or filter criteria' 
                                  : 'No users have been created yet'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div key={user.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30 hover:bg-slate-700/40 transition-all duration-300">
                            {/* User Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow ${
                                  user.role === 'Admin' 
                                    ? 'bg-gradient-to-br from-red-500 to-red-600' 
                                    : user.role === 'Teacher'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                }`}>
                                  <span className="text-sm font-bold text-white">
                                    {user.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-white truncate max-w-[120px]">
                                    {user.username}
                                  </h3>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${
                                      user.role === 'Admin' 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                        : user.role === 'Teacher'
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    }`}>
                                      {user.role}
                                    </span>
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${
                                      user.status === 'Active' 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                    }`}>
                                      {user.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* User Details */}
                            <div className="space-y-2 mb-3">
                              <div className="flex justify-between text-xs text-slate-300">
                                <span>Date Created:</span>
                                <span className="font-semibold">
                                  {user.dateCreated ? new Date(user.dateCreated).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-600/30">
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="text-blue-400 hover:text-blue-300 transition-all duration-300 p-1.5 rounded hover:bg-blue-500/20 hover:scale-105 text-xs flex items-center space-x-1"
                                title="Edit User"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-400 hover:text-red-300 transition-all duration-300 p-1.5 rounded hover:bg-red-500/20 hover:scale-105 text-xs flex items-center space-x-1"
                                title="Delete User"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <table className="hidden lg:table min-w-full divide-y divide-slate-700/40">
                    <thead className="bg-gradient-to-r from-slate-700/50 to-slate-800/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-sm font-bold text-slate-200 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-slate-200 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-slate-200 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-slate-200 uppercase tracking-wider">
                          Date Created
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-slate-200 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800/20 divide-y divide-slate-700/20">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="w-12 h-12 bg-slate-600/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-slate-300 font-semibold text-base">No users found</p>
                                <p className="text-slate-400 text-xs mt-1">
                                  {searchTerm || filterRole !== 'All' 
                                    ? 'Try adjusting your search or filter criteria' 
                                    : 'No users have been created yet'
                                  }
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-700/40 transition-all duration-300 group">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow group-hover:shadow-md transition-all duration-300 ${
                                    user.role === 'Admin' 
                                      ? 'bg-gradient-to-br from-red-500 to-red-600 group-hover:from-red-400 group-hover:to-red-500' 
                                      : user.role === 'Teacher'
                                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-400 group-hover:to-blue-500'
                                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:from-emerald-400 group-hover:to-emerald-500'
                                  }`}>
                                    <span className="text-sm font-bold text-white">
                                      {user.username.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-semibold text-white group-hover:text-slate-100 transition-colors duration-300">
                                    {user.username}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${
                                user.role === 'Admin' 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 group-hover:bg-red-500/30' 
                                  : user.role === 'Teacher'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:bg-blue-500/30'
                                  : 'bg-green-500/20 text-green-400 border border-green-500/30 group-hover:bg-green-500/30'
                              } transition-all duration-300`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${
                                user.status === 'Active' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/30' 
                                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/30 group-hover:bg-slate-500/30'
                              } transition-all duration-300`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200 font-semibold group-hover:text-white transition-colors duration-300">
                              {user.dateCreated ? new Date(user.dateCreated).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditUser(user.id)}
                                  className="text-blue-400 hover:text-blue-300 transition-all duration-300 p-2 rounded-lg hover:bg-blue-500/20 hover:scale-105 hover:shadow hover:shadow-blue-500/20"
                                  title="Edit User"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-400 hover:text-red-300 transition-all duration-300 p-2 rounded-lg hover:bg-red-500/20 hover:scale-105 hover:shadow hover:shadow-red-500/20"
                                  title="Delete User"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  
                  {/* Professional Table Footer */}
                  <div className="bg-gradient-to-r from-slate-700/30 to-slate-800/30 px-4 py-3 border-t border-slate-700/40">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="text-xs sm:text-sm text-slate-300 font-semibold">
                        Showing <span className="font-bold text-white bg-slate-600/50 px-1.5 py-0.5 rounded">{filteredUsers.length}</span> of <span className="font-bold text-white bg-slate-600/50 px-1.5 py-0.5 rounded">{users.length}</span> users
                      </div>
                      <div className="text-xs sm:text-sm text-slate-300 font-semibold">
                        Total: <span className="font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/30">{users.length}</span> users
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODALS REMAIN THE SAME */}
      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Create New User</h2>
                  <p className="text-slate-400 text-xs mt-1">Add a new user to the system</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                  title="Close modal"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-4">
              {formError && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-xs font-medium">{formError}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-400 text-xs font-medium">{successMessage}</p>
                </div>
              )}

              <div className="space-y-3">
                {/* Role Selection */}
                <div>
                  <label htmlFor="role" className="block text-xs font-semibold text-slate-200 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20 appearance-none cursor-pointer"
                    required
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                </div>

                {/* Username/Email */}
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-slate-200 mb-1">
                    Username/Email
                  </label>
                  <input
                    type="email"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username or email address"
                    className="w-full px-3 py-2 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-200 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password (min 6 characters)"
                    className="w-full px-3 py-2 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600/50 hover:border-slate-500/50 rounded-lg transition-all duration-300 font-medium text-sm"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-1 text-sm"
                >
                  {formLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Edit User</h2>
                  <p className="text-slate-400 text-xs mt-1">Update user information</p>
                </div>
                <button
                  onClick={handleCloseEditModal}
                  className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                  title="Close modal"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditFormSubmit} className="p-4">
              {editFormError && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-xs font-medium">{editFormError}</p>
                </div>
              )}

              {editSuccessMessage && (
                <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-400 text-xs font-medium">{editSuccessMessage}</p>
                </div>
              )}

              <div className="space-y-3">
                {/* Role Selection */}
                <div>
                  <label htmlFor="edit-role" className="block text-xs font-semibold text-slate-200 mb-1">
                    Role
                  </label>
                  <select
                    id="edit-role"
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20 appearance-none cursor-pointer"
                    required
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                </div>

                {/* Username/Email */}
                <div>
                  <label htmlFor="edit-username" className="block text-xs font-semibold text-slate-200 mb-1">
                    Username/Email
                  </label>
                  <input
                    type="email"
                    id="edit-username"
                    name="username"
                    value={editFormData.username}
                    onChange={handleEditInputChange}
                    placeholder="Enter username or email address"
                    className="w-full px-3 py-2 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20"
                    required
                  />
                </div>

                {/* Password (Optional) */}
                <div>
                  <label htmlFor="edit-password" className="block text-xs font-semibold text-slate-200 mb-1">
                    New Password <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    id="edit-password"
                    name="password"
                    value={editFormData.password}
                    onChange={handleEditInputChange}
                    placeholder="Leave empty to keep current password"
                    className="w-full px-3 py-2 border border-slate-600/50 rounded-lg bg-slate-700/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/70 transition-all duration-300 text-sm font-medium shadow focus:shadow-emerald-500/20"
                    minLength={6}
                  />
                  <p className="text-xs text-slate-400 mt-1">Only enter a new password if you want to change it</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600/50 hover:border-slate-500/50 rounded-lg transition-all duration-300 font-medium text-sm"
                  disabled={editFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-1 text-sm"
                >
                  {editFormLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Delete User</h2>
                  <p className="text-slate-400 text-xs mt-1">This action cannot be undone</p>
                </div>
                <button
                  onClick={handleCloseDeleteModal}
                  className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                  title="Close modal"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {deleteError && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-xs font-medium">{deleteError}</p>
                </div>
              )}

              {deleteSuccessMessage && (
                <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-400 text-xs font-medium">{deleteSuccessMessage}</p>
                </div>
              )}

              {/* User Info */}
              <div className="mb-4">
                <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow ${
                    deletingUser.role === 'Admin' 
                      ? 'bg-gradient-to-br from-red-500 to-red-600' 
                      : deletingUser.role === 'Teacher'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                  }`}>
                    <span className="text-sm font-bold text-white">
                      {deletingUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{deletingUser.username}</p>
                    <p className="text-xs text-slate-400">{deletingUser.role}</p>
                  </div>
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="mb-4">
                <p className="text-slate-300 text-sm text-center">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600/50 hover:border-slate-500/50 rounded-lg transition-all duration-300 font-medium text-sm"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-1 text-sm"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;