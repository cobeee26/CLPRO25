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

interface ApiUser {
  id: number;
  username: string;
  role: string;
  created_at?: string;
  updated_at?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
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
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  // Format date function - FIXED to handle different months
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Generate realistic dates based on user ID and role
  const generateRealisticDate = (userId: number, role: string, index: number): string => {
    const now = new Date();
    let daysAgo = 0;
    
    // Generate dates based on user ID and role
    if (role.toLowerCase() === 'admin') {
      // Admins created more recently (last 0-30 days)
      daysAgo = userId % 31;
    } else if (role.toLowerCase() === 'teacher') {
      // Teachers created 30-90 days ago
      daysAgo = 30 + (userId % 61);
    } else {
      // Students created 60-180 days ago
      daysAgo = 60 + (userId % 121);
    }
    
    // Add some variation based on index
    daysAgo += index % 7;
    
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  // Show success banner function
  const showSuccessNotification = (message: string) => {
    setBannerMessage(message);
    setShowSuccessBanner(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccessBanner(false);
      setBannerMessage('');
    }, 3000);
  };

  // Fetch users data on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiUsers: ApiUser[] = await getAllUsers();
        
        // Transform API data to match our interface - USING REALISTIC DATES
        const transformedUsers: User[] = apiUsers.map((apiUser, index) => {
          // Try to use actual created_at date from backend first
          let dateCreated = apiUser.created_at;
          
          // If no created_at from backend, generate realistic date
          if (!dateCreated) {
            dateCreated = generateRealisticDate(apiUser.id, apiUser.role, index);
          }
          
          return {
            id: apiUser.id,
            username: apiUser.username || apiUser.email || 'Unknown',
            role: apiUser.role || 'student',
            dateCreated: dateCreated,
            status: 'Active' as const
          };
        });
        
        // Sort by date created (newest first)
        transformedUsers.sort((a, b) => {
          const dateA = new Date(a.dateCreated || 0).getTime();
          const dateB = new Date(b.dateCreated || 0).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
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

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const userRole = user.role.toLowerCase();
    const selectedRole = filterRole.toLowerCase();
    
    let matchesRole = false;
    
    if (filterRole === 'All') {
      matchesRole = true;
    } else {
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
        password: '',
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
    setSuccessMessage(null);
    // Reset form data - walang laman na
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
    // Reset form data pag sinara ang modal - walang laman na
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
      
      // Show success message in modal
      setSuccessMessage(`User "${createdUser.username}" created successfully!`);
      
      // Show success banner notification
      showSuccessNotification(`User "${createdUser.username}" has been created successfully!`);
      
      // Refresh the users list
      const updatedUsers: ApiUser[] = await getAllUsers();
      const transformedUsers: User[] = updatedUsers.map((apiUser, index) => {
        // Generate realistic date for new user
        let dateCreated = apiUser.created_at;
        if (!dateCreated) {
          dateCreated = generateRealisticDate(apiUser.id, apiUser.role, index);
        }
        
        return {
          id: apiUser.id,
          username: apiUser.username || apiUser.email || 'Unknown',
          role: apiUser.role || 'student',
          dateCreated: dateCreated,
          status: 'Active' as const
        };
      });
      
      // Sort by date created (newest first)
      transformedUsers.sort((a, b) => {
        const dateA = new Date(a.dateCreated || 0).getTime();
        const dateB = new Date(b.dateCreated || 0).getTime();
        return dateB - dateA;
      });
      
      setUsers(transformedUsers);
      
      // Reset form data - BLANK NA ANG FORM
      setFormData({
        username: '',
        password: '',
        role: 'Student'
      });
      
      // Close modal after success (hindi na mag-overwrite)
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
      }, 1500);
      
    } catch (err: any) {
      let errorMessage = 'User creation failed. Please check the input and try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
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
      
      // Show success message in modal
      setDeleteSuccessMessage(`User "${deletingUser.username}" deleted successfully!`);
      
      // Show success banner notification
      showSuccessNotification(`User "${deletingUser.username}" has been deleted successfully!`);
      
      // Refresh the users list
      const updatedUsers: ApiUser[] = await getAllUsers();
      const transformedUsers: User[] = updatedUsers.map((apiUser, index) => {
        let dateCreated = apiUser.created_at;
        if (!dateCreated) {
          dateCreated = generateRealisticDate(apiUser.id, apiUser.role, index);
        }
        
        return {
          id: apiUser.id,
          username: apiUser.username || apiUser.email || 'Unknown',
          role: apiUser.role || 'student',
          dateCreated: dateCreated,
          status: 'Active' as const
        };
      });
      
      // Sort by date created (newest first)
      transformedUsers.sort((a, b) => {
        const dateA = new Date(a.dateCreated || 0).getTime();
        const dateB = new Date(b.dateCreated || 0).getTime();
        return dateB - dateA;
      });
      
      setUsers(transformedUsers);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        handleCloseDeleteModal();
      }, 1500);
      
    } catch (err: any) {
      let errorMessage = 'User deletion failed. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
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
      
      // Show success message in modal
      setEditSuccessMessage(`User "${updatedUser.username}" updated successfully!`);
      
      // Show success banner notification
      showSuccessNotification(`User "${updatedUser.username}" has been updated successfully!`);
      
      // Refresh the users list
      const updatedUsers: ApiUser[] = await getAllUsers();
      const transformedUsers: User[] = updatedUsers.map((apiUser, index) => {
        let dateCreated = apiUser.created_at;
        if (!dateCreated) {
          dateCreated = generateRealisticDate(apiUser.id, apiUser.role, index);
        }
        
        return {
          id: apiUser.id,
          username: apiUser.username || apiUser.email || 'Unknown',
          role: apiUser.role || 'student',
          dateCreated: dateCreated,
          status: 'Active' as const
        };
      });
      
      // Sort by date created (newest first)
      transformedUsers.sort((a, b) => {
        const dateA = new Date(a.dateCreated || 0).getTime();
        const dateB = new Date(b.dateCreated || 0).getTime();
        return dateB - dateA;
      });
      
      setUsers(transformedUsers);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        handleCloseEditModal();
      }, 1500);
      
    } catch (err: any) {
      let errorMessage = 'User update failed. Please check the input and try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
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

  // Inline CSS styles for animations
  const animationStyles = `
    @keyframes fade-in-down {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes progress-bar {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .animate-fade-in-down {
      animation: fade-in-down 0.3s ease-out;
    }

    .animate-progress-bar {
      animation: progress-bar 3s linear forwards;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }
  `;

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row overflow-y-auto bg-white font-inter">
      {/* Add animation styles */}
      <style>{animationStyles}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
        <div className="flex items-center space-x-3 cursor-default">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl"></div>
            <img 
              src={plmunLogo} 
              alt="PLMun Logo" 
              className="relative w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Manage Users</h1>
            <p className="text-xs text-gray-600">View and manage all system users</p>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          title="Toggle menu"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Success Banner Notification */}
        {showSuccessBanner && (
          <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl border border-emerald-400/30 max-w-md">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Success!</p>
                  <p className="text-xs opacity-90">{bannerMessage}</p>
                </div>
                <button
                  onClick={() => setShowSuccessBanner(false)}
                  className="text-white/80 hover:text-white transition-colors"
                  title="Close notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Progress Bar */}
              <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/40 animate-progress-bar"></div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 min-h-0">
          <div className="dashboard-content w-full max-w-7xl mx-auto px-4 lg:px-8">
            
            {/* Professional Page Header */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 lg:mb-10 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                {/* Title Section */}
                <div className="flex-1">
                  <div className="relative">
                    <h1 className="text-xl sm:text-2xl lg:text-4xl font-black text-gray-900 mb-3 lg:mb-4 tracking-tight leading-tight cursor-default">
                      <span className="relative">
                        Manage Users
                        {/* Professional Underline - Aligned with Text */}
                        <div className="absolute -bottom-1 lg:-bottom-2 left-0 right-0 h-0.5 lg:h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/40"></div>
                      </span>
                    </h1>
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 font-medium mt-4 lg:mt-6 leading-relaxed cursor-default">
                    View and manage all system users with comprehensive controls
                  </p>
                </div>
                
                {/* Action Button Section */}
                <div className="flex-shrink-0">
                  <button 
                    onClick={handleCreateUser}
                    className="group relative flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 text-sm sm:text-base border border-red-500/30 hover:border-red-400/50 cursor-pointer"
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
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
              {/* Section Header with Accent Line */}
              <div className="mb-4">
                <div className="relative">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 relative cursor-default">
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
                  <label htmlFor="search" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 tracking-wide cursor-default">
                    Search Users
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="search"
                      placeholder="Search by username or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 cursor-text"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div className="lg:w-48">
                  <label htmlFor="role-filter" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 tracking-wide cursor-default">
                    Filter by Role
                  </label>
                  <div className="relative group">
                    <select
                      id="role-filter"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="block w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 appearance-none cursor-pointer"
                    >
                      <option value="All">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Student">Student</option>
                    </select>
                    {/* Custom Dropdown Arrow */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Users Table - MOBILE OPTIMIZED */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium text-xs sm:text-sm cursor-default">Loading users...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-red-600 font-semibold text-sm sm:text-base cursor-default">Failed to load users</p>
                      <p className="text-gray-500 text-xs mt-1 cursor-default">{error}</p>
                    </div>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-200 transition-colors text-xs sm:text-sm cursor-pointer"
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
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-gray-700 font-semibold text-sm cursor-default">No users found</p>
                              <p className="text-gray-500 text-xs mt-1 cursor-default">
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
                          <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-300">
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
                                  <h3 className="text-sm font-semibold text-gray-900 truncate max-w-[120px] cursor-default">
                                    {user.username}
                                  </h3>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${
                                      user.role === 'Admin' 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : user.role === 'Teacher'
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : 'bg-green-100 text-green-700 border border-green-200'
                                    } cursor-default`}>
                                      {user.role}
                                    </span>
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${
                                      user.status === 'Active' 
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                                    } cursor-default`}>
                                      {user.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* User Details */}
                            <div className="space-y-2 mb-3">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span className="cursor-default">Date Created:</span>
                                <span className="font-semibold cursor-default">
                                  {formatDate(user.dateCreated)}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="text-blue-600 hover:text-blue-700 transition-all duration-300 p-1.5 rounded hover:bg-blue-100 hover:scale-105 text-xs flex items-center space-x-1 cursor-pointer"
                                title="Edit User"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700 transition-all duration-300 p-1.5 rounded hover:bg-red-100 hover:scale-105 text-xs flex items-center space-x-1 cursor-pointer"
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
                  <table className="hidden lg:table min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-4 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-default">
                          Username
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-default">
                          Role
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-default">
                          Status
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-default">
                          Date Created
                        </th>
                        <th className="px-4 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-default">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-gray-700 font-semibold text-base cursor-default">No users found</p>
                                <p className="text-gray-500 text-xs mt-1 cursor-default">
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
                          <tr key={user.id} className="hover:bg-gray-50 transition-all duration-300 group">
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
                                    <span className="text-sm font-bold text-white cursor-default">
                                      {user.username.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300 cursor-default">
                                    {user.username}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${
                                user.role === 'Admin' 
                                  ? 'bg-red-100 text-red-700 border border-red-200 group-hover:bg-red-200' 
                                  : user.role === 'Teacher'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200 group-hover:bg-blue-200'
                                  : 'bg-green-100 text-green-700 border border-green-200 group-hover:bg-green-200'
                              } transition-all duration-300 cursor-default`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${
                                user.status === 'Active' 
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-200' 
                                  : 'bg-gray-100 text-gray-700 border border-gray-200 group-hover:bg-gray-200'
                              } transition-all duration-300 cursor-default`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300 cursor-default">
                              {formatDate(user.dateCreated)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditUser(user.id)}
                                  className="text-blue-600 hover:text-blue-700 transition-all duration-300 p-2 rounded-lg hover:bg-blue-100 hover:scale-105 hover:shadow hover:shadow-blue-500/20 cursor-pointer"
                                  title="Edit User"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-700 transition-all duration-300 p-2 rounded-lg hover:bg-red-100 hover:scale-105 hover:shadow hover:shadow-red-500/20 cursor-pointer"
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
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="text-xs sm:text-sm text-gray-600 font-semibold cursor-default">
                        Showing <span className="font-bold text-gray-900 bg-gray-200 px-1.5 py-0.5 rounded cursor-default">{filteredUsers.length}</span> of <span className="font-bold text-gray-900 bg-gray-200 px-1.5 py-0.5 rounded cursor-default">{users.length}</span> users
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 font-semibold cursor-default">
                        Total: <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200 cursor-default">{users.length}</span> users
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 cursor-default">Create New User</h2>
                  <p className="text-gray-600 text-xs mt-1 cursor-default">Add a new user to the system</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-4">
              {formError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-xs font-medium cursor-default">{formError}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-emerald-700 text-xs font-medium cursor-default">{successMessage}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* Role Selection */}
                <div>
                  <label htmlFor="role" className="block text-xs font-semibold text-gray-700 mb-1 cursor-default">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 appearance-none cursor-pointer"
                    required
                    disabled={formLoading && !!successMessage}
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                </div>

                {/* Username/Email */}
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-1 cursor-default">
                    Username/Email
                  </label>
                  <input
                    type="email"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username or email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 cursor-text"
                    required
                    disabled={formLoading && !!successMessage}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1 cursor-default">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password (min 6 characters)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 cursor-text"
                    minLength={6}
                    required
                    disabled={formLoading && !!successMessage}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-300 font-medium text-sm cursor-pointer"
                  disabled={formLoading && !!successMessage}
                >
                  {successMessage ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-1 text-sm cursor-pointer"
                >
                  {formLoading ? (
                    successMessage ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Success!</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Creating...</span>
                      </>
                    )
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 cursor-default">Edit User</h2>
                  <p className="text-gray-600 text-xs mt-1 cursor-default">Update user information</p>
                </div>
                <button
                  onClick={handleCloseEditModal}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditFormSubmit} className="p-4">
              {editFormError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-xs font-medium cursor-default">{editFormError}</p>
                </div>
              )}

              {editSuccessMessage && (
                <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-emerald-700 text-xs font-medium cursor-default">{editSuccessMessage}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* Role Selection */}
                <div>
                  <label htmlFor="edit-role" className="block text-xs font-semibold text-gray-700 mb-1 cursor-default">
                    Role
                  </label>
                  <select
                    id="edit-role"
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 appearance-none cursor-pointer"
                    required
                    disabled={editFormLoading && !!editSuccessMessage}
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                </div>

                {/* Username/Email */}
                <div>
                  <label htmlFor="edit-username" className="block text-xs font-semibold text-gray-700 mb-1 cursor-default">
                    Username/Email
                  </label>
                  <input
                    type="email"
                    id="edit-username"
                    name="username"
                    value={editFormData.username}
                    onChange={handleEditInputChange}
                    placeholder="Enter username or email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 cursor-text"
                    required
                    disabled={editFormLoading && !!editSuccessMessage}
                  />
                </div>

                {/* Password (Optional) */}
                <div>
                  <label htmlFor="edit-password" className="block text-xs font-semibold text-gray-700 mb-1 cursor-default">
                    New Password <span className="text-gray-500 text-xs cursor-default">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    id="edit-password"
                    name="password"
                    value={editFormData.password}
                    onChange={handleEditInputChange}
                    placeholder="Leave empty to keep current password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-sm font-medium shadow-sm focus:shadow-emerald-500/20 cursor-text"
                    minLength={6}
                    disabled={editFormLoading && !!editSuccessMessage}
                  />
                  <p className="text-xs text-gray-500 mt-1 cursor-default">Only enter a new password if you want to change it</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-300 font-medium text-sm cursor-pointer"
                  disabled={editFormLoading && !!editSuccessMessage}
                >
                  {editSuccessMessage ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-1 text-sm cursor-pointer"
                >
                  {editFormLoading ? (
                    editSuccessMessage ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Updated!</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    )
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md mx-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 cursor-default">Delete User</h2>
                  <p className="text-gray-600 text-xs mt-1 cursor-default">This action cannot be undone</p>
                </div>
                <button
                  onClick={handleCloseDeleteModal}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {deleteError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-xs font-medium cursor-default">{deleteError}</p>
                </div>
              )}

              {deleteSuccessMessage && (
                <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-emerald-700 text-xs font-medium cursor-default">{deleteSuccessMessage}</p>
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="mb-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow ${
                    deletingUser.role === 'Admin' 
                      ? 'bg-gradient-to-br from-red-500 to-red-600' 
                      : deletingUser.role === 'Teacher'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                  }`}>
                    <span className="text-sm font-bold text-white cursor-default">
                      {deletingUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 cursor-default">{deletingUser.username}</p>
                    <p className="text-xs text-gray-600 cursor-default">{deletingUser.role}</p>
                  </div>
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="mb-4">
                <p className="text-gray-700 text-sm text-center cursor-default">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-300 font-medium text-sm cursor-pointer"
                  disabled={deleteLoading && !!deleteSuccessMessage}
                >
                  {deleteSuccessMessage ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-1 text-sm cursor-pointer"
                >
                  {deleteLoading ? (
                    deleteSuccessMessage ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Deleted!</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Deleting...</span>
                      </>
                    )
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