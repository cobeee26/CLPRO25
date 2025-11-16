import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import axios from 'axios';
import { getAllUsers, getAllClasses } from '../services/authService';

// API configuration
const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Error boundary state
  const [hasError] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'announcement'>('schedule');
  
  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeClasses: 0,
    systemHealth: 98,
    storageUsed: 2.4
  });
  
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    class_id: '',
    start_time: '',
    end_time: '',
    room_number: '',
    status: 'Occupied'
  });
  
  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    is_urgent: false
  });
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  
  // Classes data for dropdown
  const [classes, setClasses] = useState<Array<{id: number, name: string, code: string, teacher_id: number | null}>>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classesError, setClassesError] = useState<string>('');

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      
      // Fetch users and classes data
      const [usersData, classesData] = await Promise.all([
        getAllUsers(),
        getAllClasses()
      ]);
      
      setDashboardStats({
        totalUsers: usersData.length,
        activeClasses: classesData.length,
        systemHealth: 98, // Static for now
        storageUsed: 2.4 // Static for now
      });
      
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStatsError('Failed to load dashboard statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    try {
      // Clear authentication data
      localStorage.clear();
      
      // Force redirect to login page
      window.location.href = '/login';
    } catch (error) {
      // Fallback: direct redirect
      window.location.href = '/login';
    }
  };

  // Navigation functions for Quick Actions
  const handleManageUsers = () => {
    navigate('/admin/users');
  };

  const handleManageClasses = () => {
    navigate('/admin/classes');
  };

  const handleViewReports = () => {
    navigate('/admin/reports');
  };

  // Form handlers
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      await apiClient.post('/schedules/', {
        class_id: parseInt(scheduleForm.class_id),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        room_number: scheduleForm.room_number,
        status: scheduleForm.status
      });

      setSubmitSuccess('Schedule created successfully!');
      
      // Reset form
      setScheduleForm({
        class_id: '',
        start_time: '',
        end_time: '',
        room_number: '',
        status: 'Occupied'
      });
    } catch (error: any) {
      setSubmitError(error.response?.data?.detail || 'Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      await apiClient.post('/announcements/', {
        title: announcementForm.title,
        content: announcementForm.content,
        is_urgent: announcementForm.is_urgent
      });

      setSubmitSuccess('Announcement created successfully!');
      
      // Reset form
      setAnnouncementForm({
        title: '',
        content: '',
        is_urgent: false
      });
    } catch (error: any) {
      setSubmitError(error.response?.data?.detail || 'Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowUtilityModal(false);
    setSubmitError('');
    setSubmitSuccess('');
    setActiveTab('schedule');
  };

  // Fetch classes function
  const fetchClasses = async () => {
    setLoadingClasses(true);
    setClassesError('');
    try {
      const response = await apiClient.get('/classes/');
      // Validate response data
      if (Array.isArray(response.data)) {
        setClasses(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
      setClassesError('Failed to load classes. Please try again.');
      setClasses([]); // Ensure classes is always an array
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch classes when modal opens
  const openModal = () => {
    setShowUtilityModal(true);
    setSubmitError('');
    setSubmitSuccess('');
    if (classes.length === 0 || classesError) {
      fetchClasses();
    }
  };

  // Fetch dashboard stats on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchDashboardStats();
      // Fetch classes on mount for better UX
      if (classes.length === 0) {
        fetchClasses();
      }
    }
  }, []);

  // Error fallback UI
  if (hasError) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8 bg-gray-100 border border-gray-300 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">The dashboard encountered an error. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl"></div>
              <img 
                src={plmunLogo} 
                alt="PLMun Logo" 
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-600">Welcome to your administrative control panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            
            {/* Menu Button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Toggle menu"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Dynamic Header */}
        <div className="hidden lg:block">
          <DynamicHeader 
            title="Admin Dashboard"
            subtitle="Welcome to your administrative control panel"
          />
        </div>

        {/* Status Bar */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mx-4 mb-4 mt-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">System Active</span>
              </div>
              <div className="text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-600 font-medium">Admin User</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Welcome Section */}
            <div className="text-center mb-10">
              <div className="relative inline-block">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight text-gray-900">
                  Welcome to the Admin Portal
                </h1>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full"></div>
              </div>
              <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
                Manage your system and users from this central dashboard with powerful insights and controls.
              </p>
            </div>

            {/* Stats Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {/* Total Users Card */}
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-50 rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-green-600 text-sm font-bold bg-green-100 border border-green-200 px-3 py-1 rounded-full">
                    {statsLoading ? '...' : '+12%'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">Total Users</p>
                  {statsLoading ? (
                    <div className="animate-pulse">
                      <div className="h-10 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ) : statsError ? (
                    <div className="text-red-600 text-sm">
                      Failed to load
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl font-black mb-1 text-gray-900">
                        {dashboardStats.totalUsers.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 font-medium">Active members</p>
                    </>
                  )}
                </div>
              </div>

              {/* Active Classes Card */}
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-50 rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-green-600 text-sm font-bold bg-green-100 border border-green-200 px-3 py-1 rounded-full">
                    {statsLoading ? '...' : '+5%'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">Active Classes</p>
                  {statsLoading ? (
                    <div className="animate-pulse">
                      <div className="h-10 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ) : statsError ? (
                    <div className="text-red-600 text-sm">
                      Failed to load
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl font-black mb-1 text-gray-900">
                        {dashboardStats.activeClasses}
                      </p>
                      <p className="text-sm text-gray-500 font-medium">Currently running</p>
                    </>
                  )}
                </div>
              </div>

              {/* System Health Card */}
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-50 rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-green-600 text-sm font-bold bg-green-100 border border-green-200 px-3 py-1 rounded-full">+2%</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">System Health</p>
                  <p className="text-4xl font-black mb-1 text-gray-900">
                    {dashboardStats.systemHealth}%
                  </p>
                  <p className="text-sm text-gray-500 font-medium">Optimal performance</p>
                </div>
              </div>

              {/* Storage Used Card */}
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-50 rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-gray-600 text-sm font-bold bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">+0.8GB</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">Storage Used</p>
                  <p className="text-4xl font-black mb-1 text-gray-900">
                    {dashboardStats.storageUsed}GB
                  </p>
                  <p className="text-sm text-gray-500 font-medium">Of 10GB total</p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-gray-900">Quick Actions</span>
                  </h3>
                  <div className="space-y-4">
                    <button 
                      className="group w-full flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl cursor-pointer"
                      title="Manage users"
                      onClick={handleManageUsers}
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-xs sm:text-sm font-bold text-white">Manage Users</p>
                        <p className="text-xs text-blue-100 font-medium">View and manage user accounts</p>
                      </div>
                    </button>

                    <button 
                      className="group w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl cursor-pointer"
                      title="Manage classes"
                      onClick={handleManageClasses}
                    >
                      <div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-bold text-white">Manage Classes</p>
                        <p className="text-xs text-green-100 font-medium">View and manage all classes</p>
                      </div>
                    </button>

                    <button 
                      className="group w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl cursor-pointer"
                      title="View reports"
                      onClick={handleViewReports}
                    >
                      <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-bold text-white">View Reports</p>
                        <p className="text-xs text-purple-100 font-medium">View system reports and analytics</p>
                      </div>
                    </button>

                    <button 
                      onClick={openModal}
                      className="group w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl cursor-pointer"
                      title="Create system utility data"
                    >
                      <div className="w-12 h-12 bg-amber-600/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-bold text-white">Create System Utility Data</p>
                        <p className="text-xs text-amber-100 font-medium">Add schedules & announcements</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity - 2/3 Width */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6 flex items-center">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg mr-2 sm:mr-3">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-gray-900">Recent Activity</span>
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="group flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-xl sm:rounded-2xl transition-all duration-300 hover:shadow-lg border border-gray-200 cursor-pointer">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-100 rounded-xl sm:rounded-2xl"></div>
                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-gray-900 mb-1">New user registered</p>
                        <p className="text-xs text-gray-600 font-medium truncate">John Doe joined the system</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">2 min ago</span>
                      </div>
                    </div>

                    <div className="group flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-300 hover:shadow-lg border border-gray-200 cursor-pointer">
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-100 rounded-2xl"></div>
                        <div className="relative w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 mb-1">Class created</p>
                        <p className="text-xs text-gray-600 font-medium truncate">Dr. Smith created "Advanced Mathematics"</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full">15 min ago</span>
                      </div>
                    </div>

                    <div className="group flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-300 hover:shadow-lg border border-gray-200 cursor-pointer">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-100 rounded-2xl"></div>
                        <div className="relative w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 mb-1">Report generated</p>
                        <p className="text-xs text-gray-600 font-medium truncate">Monthly system report created</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full">1 hour ago</span>
                      </div>
                    </div>

                    <div className="group flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-300 hover:shadow-lg border border-gray-200 cursor-pointer">
                      <div className="relative">
                        <div className="absolute inset-0 bg-orange-100 rounded-2xl"></div>
                        <div className="relative w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 mb-1">System backup completed</p>
                        <p className="text-xs text-gray-600 font-medium truncate">Daily backup process finished</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full">2 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Content to Ensure Scrolling */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>System Overview</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">Server Status</h4>
                  </div>
                  <p className="text-xs text-gray-600">All systems operational and running smoothly</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">Active Sessions</h4>
                  </div>
                  <p className="text-xs text-gray-600">24/7 active user sessions across the platform</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">Security</h4>
                  </div>
                  <p className="text-xs text-gray-600">All security protocols active and up to date</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Utility Modal */}
      {showUtilityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                System Utility Data
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                title="Close modal"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Create Schedule
              </button>
              <button
                onClick={() => setActiveTab('announcement')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'announcement'
                    ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Create Announcement
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Success/Error Messages */}
              {submitSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-700 font-medium">{submitSuccess}</p>
                </div>
              )}
              
              {submitError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 font-medium">{submitError}</p>
                </div>
              )}

              {classesError && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-orange-700 font-medium">{classesError}</p>
                  <button 
                    onClick={fetchClasses}
                    className="mt-2 px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm rounded-lg transition-colors duration-200"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <form onSubmit={handleScheduleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="classSelect" className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Class *
                      </label>
                      <select
                        id="classSelect"
                        value={scheduleForm.class_id}
                        onChange={(e) => setScheduleForm({...scheduleForm, class_id: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
                        required
                        disabled={loadingClasses || classesError !== ''}
                        aria-label="Select class for schedule"
                      >
                        <option value="">
                          {loadingClasses ? 'Loading classes...' : 
                           classesError ? 'Error loading classes' :
                           classes.length === 0 ? 'No classes available' :
                           'Select a class'}
                        </option>
                        {classes && Array.isArray(classes) && classes.map((classItem) => (
                          <option key={classItem.id} value={classItem.id.toString()}>
                            {classItem.name} ({classItem.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="roomNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                        Room Number *
                      </label>
                      <input
                        id="roomNumber"
                        type="text"
                        value={scheduleForm.room_number}
                        onChange={(e) => setScheduleForm({...scheduleForm, room_number: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
                        placeholder="e.g., Room 101"
                        required
                        aria-label="Enter room number"
                      />
                    </div>

                    <div>
                      <label htmlFor="startTime" className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Time *
                      </label>
                      <input
                        id="startTime"
                        type="datetime-local"
                        value={scheduleForm.start_time}
                        onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
                        required
                        aria-label="Select start time"
                      />
                    </div>

                    <div>
                      <label htmlFor="endTime" className="block text-sm font-semibold text-gray-700 mb-2">
                        End Time *
                      </label>
                      <input
                        id="endTime"
                        type="datetime-local"
                        value={scheduleForm.end_time}
                        onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
                        required
                        aria-label="Select end time"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="statusSelect" className="block text-sm font-semibold text-gray-700 mb-2">
                        Status *
                      </label>
                      <select
                        id="statusSelect"
                        value={scheduleForm.status}
                        onChange={(e) => setScheduleForm({...scheduleForm, status: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
                        aria-label="Select schedule status"
                      >
                        <option value="Occupied">Occupied</option>
                        <option value="Clean">Clean</option>
                        <option value="Needs Cleaning">Needs Cleaning</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Schedule'}
                    </button>
                  </div>
                </form>
              )}

              {/* Announcement Tab */}
              {activeTab === 'announcement' && (
                <form onSubmit={handleAnnouncementSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="announcementTitle" className="block text-sm font-semibold text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      id="announcementTitle"
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
                      placeholder="Enter announcement title"
                      required
                      aria-label="Enter announcement title"
                    />
                  </div>

                  <div>
                    <label htmlFor="announcementContent" className="block text-sm font-semibold text-gray-700 mb-2">
                      Content *
                    </label>
                    <textarea
                      id="announcementContent"
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200 resize-none"
                      placeholder="Enter announcement content"
                      required
                      aria-label="Enter announcement content"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="is_urgent"
                      checked={announcementForm.is_urgent}
                      onChange={(e) => setAnnouncementForm({...announcementForm, is_urgent: e.target.checked})}
                      className="w-5 h-5 text-amber-600 bg-gray-50 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                    <label htmlFor="is_urgent" className="text-sm font-semibold text-gray-700">
                      Mark as urgent announcement
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Announcement'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;