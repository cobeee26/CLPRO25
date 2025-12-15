import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import axios from 'axios';
import { getAllUsers, getAllClasses } from '../services/authService';
import Swal from 'sweetalert2';

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

// SweetAlert2 Configuration with Auto-Dismiss Timer
const swalConfig = {
  customClass: {
    title: 'text-lg font-bold text-gray-900',
    htmlContainer: 'text-sm text-gray-600',
    confirmButton: 'px-4 py-2 rounded-lg font-medium cursor-pointer',
    cancelButton: 'px-4 py-2 rounded-lg font-medium cursor-pointer',
    popup: 'rounded-xl border border-gray-200'
  },
  buttonsStyling: false,
  background: '#ffffff'
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  
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
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Recent activities state
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: number;
    type: 'user' | 'class' | 'report' | 'backup';
    title: string;
    description: string;
    timestamp: string;
    timeAgo: string;
  }>>([]);
  
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
  
  // Classes data for dropdown
  const [classes, setClasses] = useState<Array<{id: number, name: string, code: string, teacher_id: number | null}>>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classesError, setClassesError] = useState<string>('');

  // SweetAlert Helper Functions with Auto-Dismiss
  const showSuccessAlert = (
    title: string, 
    text: string = '', 
    type: 'schedule' | 'announcement' | 'logout' | 'refresh' = 'schedule',
    autoDismiss: boolean = true,
    dismissTime: number = 3000
  ) => {
    const iconColor = type === 'logout' ? 'warning' : 'success';
    const confirmButtonColor = type === 'logout' ? '#F59E0B' : '#10B981';
    
    const alertConfig: any = {
      title,
      text,
      icon: iconColor,
      confirmButtonText: 'OK',
      confirmButtonColor,
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: `text-lg font-bold ${
          type === 'logout' ? 'text-yellow-900' : 
          type === 'refresh' ? 'text-blue-900' : 
          'text-green-900'
        }`,
        confirmButton: `px-4 py-2 rounded-lg font-medium ${
          type === 'logout' ? 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer' :
          type === 'refresh' ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' :
          'bg-green-500 hover:bg-green-600 text-white'
        }`
      }
    };

    if (autoDismiss) {
      alertConfig.timer = dismissTime;
      alertConfig.timerProgressBar = true;
      alertConfig.showConfirmButton = false;
    }

    return Swal.fire(alertConfig);
  };

  const showErrorAlert = (
    title: string, 
    text: string = '',
    autoDismiss: boolean = true,
    dismissTime: number = 4000
  ) => {
    const alertConfig: any = {
      title,
      text,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#EF4444',
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-red-900',
        confirmButton: 'px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white cursor-pointer'
      }
    };

    if (autoDismiss) {
      alertConfig.timer = dismissTime;
      alertConfig.timerProgressBar = true;
      alertConfig.showConfirmButton = false;
    }

    return Swal.fire(alertConfig);
  };

  const showConfirmDialog = (
    title: string, 
    text: string, 
    confirmText: string = 'Yes, proceed',
    autoDismiss: boolean = false
  ) => {
    const alertConfig: any = {
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      reverseButtons: true,
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-gray-900',
        confirmButton: 'px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white cursor-pointer',
        cancelButton: 'px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer'
      }
    };

    return Swal.fire(alertConfig);
  };

  const showLoadingAlert = (
    title: string = 'Processing...',
    autoDismiss: boolean = false
  ) => {
    const alertConfig: any = {
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
      ...swalConfig
    };

    if (autoDismiss) {
      alertConfig.timer = 3000;
      alertConfig.timerProgressBar = true;
    }

    return Swal.fire(alertConfig);
  };

  const closeAlert = () => {
    Swal.close();
  };

  const showInfoAlert = (
    title: string,
    text: string = '',
    autoDismiss: boolean = true,
    dismissTime: number = 3000
  ) => {
    const alertConfig: any = {
      title,
      text,
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3B82F6',
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-blue-900',
        confirmButton: 'px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
      }
    };

    if (autoDismiss) {
      alertConfig.timer = dismissTime;
      alertConfig.timerProgressBar = true;
      alertConfig.showConfirmButton = false;
    }

    return Swal.fire(alertConfig);
  };

  const updateLoadingProgress = (step: number, totalSteps: number = 3) => {
    const progress = Math.floor((step / totalSteps) * 100);
    setLoadingProgress(progress);
  };

  // Function to format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = now.getTime() - past.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      console.log('🔄 Loading dashboard data...');
      setIsInitialLoading(true);
      setHasInitialLoadError(false);
      setLoadingProgress(10);

      updateLoadingProgress(1, 3);
      
      // Fetch users and classes data
      const [usersData, classesData] = await Promise.all([
        getAllUsers(),
        getAllClasses()
      ]);
      
      updateLoadingProgress(2, 3);
      
      setDashboardStats({
        totalUsers: usersData.length,
        activeClasses: classesData.length,
        systemHealth: 98,
        storageUsed: 2.4
      });
      
      // After fetching stats, also fetch recent activities
      await fetchRecentActivities(usersData, classesData);
      
      updateLoadingProgress(3, 3);
      
      setTimeout(() => {
        setIsInitialLoading(false);
        setLoadingProgress(100);
      }, 500);
      
      console.log('✅ Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to fetch dashboard stats:', error);
      setHasInitialLoadError(true);
      setIsInitialLoading(false);
      showErrorAlert("Load Error", "Failed to load dashboard data. Please refresh the page.", true, 4000);
    }
  };

  // UPDATED: Fetch recent activities with dynamic data
  const fetchRecentActivities = async (usersData: any[] = [], classesData: any[] = []) => {
    try {
      // Build recent activities array with dynamic data
      const activities: Array<{
        id: number;
        type: 'user' | 'class' | 'report' | 'backup';
        title: string;
        description: string;
        timestamp: string;
        timeAgo: string;
      }> = [];
      
      // Get current time for calculations
      const now = new Date();
      
      // 1. User registration - Use real user data
      if (usersData.length > 0) {
        // Get the newest user (assuming last in array is newest)
        const newestUser = usersData[usersData.length - 1];
        const newestUserTime = new Date(now.getTime() - 2 * 60000); // 2 minutes ago
        
        activities.push({
          id: 1,
          type: 'user',
          title: 'New user registered',
          description: `Username "${newestUser.username || newestUser.email}" joined the system`, // Dynamic username
          timestamp: newestUserTime.toISOString(),
          timeAgo: formatTimeAgo(newestUserTime.toISOString())
        });
      }
      
      // 2. Class creation - Use real class data
      if (classesData.length > 0) {
        // Get the newest class
        const newestClass = classesData[classesData.length - 1];
        const newestClassTime = new Date(now.getTime() - 15 * 60000); // 15 minutes ago
        
        // Try to find teacher name
        let teacherName = 'teacher@classtrack.edu';
        if (newestClass.teacher_id && usersData.length > 0) {
          const teacher = usersData.find(user => user.id === newestClass.teacher_id);
          if (teacher) {
            teacherName = teacher.username || teacher.email || 'teacher@classtrack.edu';
          }
        }
        
        activities.push({
          id: 2,
          type: 'class',
          title: 'Class created',
          description: `"${newestClass.name}" created by "${teacherName}"`, // Dynamic class name and teacher
          timestamp: newestClassTime.toISOString(),
          timeAgo: formatTimeAgo(newestClassTime.toISOString())
        });
      }
      
      // 3. Report generated - Keep as static example
      const reportTime = new Date(now.getTime() - 60 * 60000); // 1 hour ago
      activities.push({
        id: 3,
        type: 'report',
        title: 'Report generated',
        description: `Monthly system report created`,
        timestamp: reportTime.toISOString(),
        timeAgo: formatTimeAgo(reportTime.toISOString())
      });
      
      // 4. System backup - Keep as static example
      const backupTime = new Date(now.getTime() - 120 * 60000); // 2 hours ago
      activities.push({
        id: 4,
        type: 'backup',
        title: 'System backup completed',
        description: `Daily backup process finished`,
        timestamp: backupTime.toISOString(),
        timeAgo: formatTimeAgo(backupTime.toISOString())
      });
      
      setRecentActivities(activities);
      
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      // Fallback to hardcoded activities if error
      const now = new Date();
      const activities = [
        {
          id: 1,
          type: 'user' as const,
          title: 'New user registered',
          description: `Username "teacher@classtrack.edu" joined the system`,
          timestamp: new Date(now.getTime() - 2 * 60000).toISOString(),
          timeAgo: '2 mins ago'
        },
        {
          id: 2,
          type: 'class' as const,
          title: 'Class created',
          description: `"Aray mo" created by "teacher@classtrack.edu"`,
          timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
          timeAgo: '15 mins ago'
        },
        {
          id: 3,
          type: 'report' as const,
          title: 'Report generated',
          description: `Monthly system report created`,
          timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
          timeAgo: '1 hour ago'
        },
        {
          id: 4,
          type: 'backup' as const,
          title: 'System backup completed',
          description: `Daily backup process finished`,
          timestamp: new Date(now.getTime() - 120 * 60000).toISOString(),
          timeAgo: '2 hours ago'
        }
      ];
      setRecentActivities(activities);
    }
  };

  // Logout function
  const handleLogout = async () => {
    const result = await showConfirmDialog(
      'Confirm Logout',
      'Are you sure you want to logout? You will need to log in again to access your dashboard.',
      'Yes, logout'
    );
    
    if (result.isConfirmed) {
      try {
        localStorage.clear();
        showSuccessAlert('Logged Out', 'You have been successfully logged out.', 'logout', true, 1500);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        showErrorAlert('Logout Error', 'There was an issue logging out. Please try again.', true, 3000);
      }
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

    try {
      if (!scheduleForm.class_id || !scheduleForm.start_time || !scheduleForm.end_time || !scheduleForm.room_number) {
        setSubmitError('Please fill in all required fields');
        showErrorAlert('Validation Error', 'Please fill in all required fields', true, 3000);
        return;
      }

      showLoadingAlert('Creating schedule...', false);
      
      await apiClient.post('/schedules/', {
        class_id: parseInt(scheduleForm.class_id),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        room_number: scheduleForm.room_number,
        status: scheduleForm.status
      });

      closeAlert();
      showSuccessAlert('Schedule Created!', 'Schedule has been created successfully.', 'schedule', true, 3000);
      
      // Reset form
      setScheduleForm({
        class_id: '',
        start_time: '',
        end_time: '',
        room_number: '',
        status: 'Occupied'
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        setShowUtilityModal(false);
      }, 1000);
      
    } catch (error: any) {
      closeAlert();
      const errorMessage = error.response?.data?.detail || 'Failed to create schedule';
      setSubmitError(errorMessage);
      showErrorAlert('Creation Error', errorMessage, true, 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (!announcementForm.title || !announcementForm.content) {
        setSubmitError('Please fill in all required fields');
        showErrorAlert('Validation Error', 'Please fill in all required fields', true, 3000);
        return;
      }

      showLoadingAlert('Creating announcement...', false);
      
      await apiClient.post('/announcements/', {
        title: announcementForm.title,
        content: announcementForm.content,
        is_urgent: announcementForm.is_urgent
      });

      closeAlert();
      showSuccessAlert('Announcement Created!', 'Announcement has been created successfully.', 'announcement', true, 3000);
      
      // Reset form
      setAnnouncementForm({
        title: '',
        content: '',
        is_urgent: false
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        setShowUtilityModal(false);
      }, 1000);
      
    } catch (error: any) {
      closeAlert();
      const errorMessage = error.response?.data?.detail || 'Failed to create announcement';
      setSubmitError(errorMessage);
      showErrorAlert('Creation Error', errorMessage, true, 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowUtilityModal(false);
    setSubmitError('');
    setActiveTab('schedule');
    // Reset forms
    setScheduleForm({
      class_id: '',
      start_time: '',
      end_time: '',
      room_number: '',
      status: 'Occupied'
    });
    setAnnouncementForm({
      title: '',
      content: '',
      is_urgent: false
    });
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
      setClasses([]);
      showErrorAlert('Load Error', 'Failed to load classes. Please try again.', true, 3000);
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch classes when modal opens
  const openModal = () => {
    setShowUtilityModal(true);
    setSubmitError('');
    if (classes.length === 0 || classesError) {
      fetchClasses();
    }
  };

  // Get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return (
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'class':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'report':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'backup':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Get background color based on activity type
  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-500';
      case 'class': return 'bg-green-500';
      case 'report': return 'bg-purple-500';
      case 'backup': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Get background light color based on activity type
  const getActivityBgLightColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100';
      case 'class': return 'bg-green-100';
      case 'report': return 'bg-purple-100';
      case 'backup': return 'bg-orange-100';
      default: return 'bg-gray-100';
    }
  };

  // Fetch dashboard stats on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    fetchDashboardStats();
    // Fetch classes on mount for better UX
    if (classes.length === 0) {
      fetchClasses();
    }
  }, []);

  // Loading Screen
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-2xl blur-xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="relative w-16 h-16 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>

        {/* Loading Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Admin Dashboard
          </h2>
          <p className="text-gray-600 max-w-md">
            Preparing system statistics and recent activities...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Loading data...</span>
            <span>{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="grid grid-cols-3 gap-3 max-w-md mb-8">
          {[
            { text: "Users", color: "bg-blue-100 text-blue-600" },
            { text: "Classes", color: "bg-green-100 text-green-600" },
            { text: "Activities", color: "bg-orange-100 text-orange-600" },
          ].map((step, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= ((index + 1) * 33)
                  ? `${step.color} shadow-sm`
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.text}
            </div>
          ))}
        </div>

        {/* Loading Animation */}
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Loading Message */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This might take a moment. Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (hasInitialLoadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to Load Dashboard
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an issue while loading your dashboard data. This could be due to network issues or server problems.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={fetchDashboardStats}
              className="w-full px-6 py-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry Loading Dashboard
            </button>
            
            <button
              onClick={() => window.location.href = "/login"}
              className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 cursor-pointer"
            >
              Return to Login
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Troubleshooting tips:</p>
            <ul className="text-sm text-gray-500 text-left space-y-1">
              <li>• Check your internet connection</li>
              <li>• Refresh the page (F5 or Ctrl+R)</li>
              <li>• Clear browser cache and try again</li>
              <li>• Contact system administrator if problem persists</li>
            </ul>
          </div>
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
              className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 cursor-pointer"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            
            {/* Menu Button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
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
        <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-3 mx-4 mb-4 mt-3 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">
                  System Active
                </span>
              </div>
              <div className="text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-600 font-medium">
                Admin User
              </span>
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
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-default">
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
                    +12%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">Total Users</p>
                  <p className="text-4xl font-black mb-1 text-gray-900">
                    {dashboardStats.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">Active members</p>
                </div>
              </div>

              {/* Active Classes Card */}
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-default">
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
                    +5%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">Active Classes</p>
                  <p className="text-4xl font-black mb-1 text-gray-900">
                    {dashboardStats.activeClasses}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">Currently running</p>
                </div>
              </div>

              {/* System Health Card */}
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-default">
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
              <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-default">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center mb-6">
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
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-gray-900">Recent Activity</span>
                  </h3>
                  <div className="space-y-4">
                    {recentActivities.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500">No recent activities found</p>
                      </div>
                    ) : (
                      // Actual activities
                      recentActivities.map((activity) => (
                        <div 
                          key={activity.id} 
                          className="group flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-300 hover:shadow-lg border border-gray-200 cursor-pointer" 
                        >
                          <div className="relative">
                            <div className={`absolute inset-0 ${getActivityBgLightColor(activity.type)} rounded-2xl`}></div>
                            <div className={`relative w-12 h-12 ${getActivityBgColor(activity.type)} rounded-2xl flex items-center justify-center shadow-lg`}>
                              {getActivityIcon(activity.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 mb-1">{activity.title}</p>
                            <p className="text-xs text-gray-600 font-medium truncate">{activity.description}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full">
                              {activity.timeAgo}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Content */}
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
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 cursor-default">
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
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 cursor-default">
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
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 cursor-default">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  System Utility Data
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } cursor-pointer`}
              >
                Create Schedule
              </button>
              <button
                onClick={() => setActiveTab('announcement')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'announcement'
                    ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } cursor-pointer`}
              >
                Create Announcement
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Error Messages */}
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl cursor-default">
                  <p className="text-red-700 text-sm">{submitError}</p>
                </div>
              )}

              {classesError && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl cursor-default">
                  <p className="text-orange-700 text-sm">{classesError}</p>
                  <button 
                    onClick={fetchClasses}
                    className="mt-2 px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm rounded-lg transition-colors duration-200 cursor-pointer"
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
                      <label htmlFor="classSelect" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                        Select Class *
                      </label>
                      <select
                        id="classSelect"
                        value={scheduleForm.class_id}
                        onChange={(e) => setScheduleForm({...scheduleForm, class_id: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-pointer"
                        required
                        disabled={isSubmitting}
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
                      <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                        Room Number *
                      </label>
                      <input
                        id="roomNumber"
                        type="text"
                        value={scheduleForm.room_number}
                        onChange={(e) => setScheduleForm({...scheduleForm, room_number: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-text"
                        placeholder="e.g., Room 101"
                        required
                        disabled={isSubmitting}
                        aria-label="Enter room number"
                      />
                    </div>

                    <div>
                      <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                        Start Time *
                      </label>
                      <input
                        id="startTime"
                        type="datetime-local"
                        value={scheduleForm.start_time}
                        onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-pointer"
                        required
                        disabled={isSubmitting}
                        aria-label="Select start time"
                      />
                    </div>

                    <div>
                      <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                        End Time *
                      </label>
                      <input
                        id="endTime"
                        type="datetime-local"
                        value={scheduleForm.end_time}
                        onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-pointer"
                        required
                        disabled={isSubmitting}
                        aria-label="Select end time"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="statusSelect" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                        Status *
                      </label>
                      <select
                        id="statusSelect"
                        value={scheduleForm.status}
                        onChange={(e) => setScheduleForm({...scheduleForm, status: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-pointer"
                        disabled={isSubmitting}
                        aria-label="Select schedule status"
                      >
                        <option value="Occupied">Occupied</option>
                        <option value="Clean">Clean</option>
                        <option value="Needs Cleaning">Needs Cleaning</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 cursor-pointer"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      {isSubmitting ? 'Creating...' : 'Create Schedule'}
                    </button>
                  </div>
                </form>
              )}

              {/* Announcement Tab */}
              {activeTab === 'announcement' && (
                <form onSubmit={handleAnnouncementSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="announcementTitle" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                      Title *
                    </label>
                    <input
                      id="announcementTitle"
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-text"
                      placeholder="Enter announcement title"
                      required
                      disabled={isSubmitting}
                      aria-label="Enter announcement title"
                    />
                  </div>

                  <div>
                    <label htmlFor="announcementContent" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                      Content *
                    </label>
                    <textarea
                      id="announcementContent"
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                      rows={6}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-text"
                      placeholder="Enter announcement content"
                      required
                      disabled={isSubmitting}
                      aria-label="Enter announcement content"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="is_urgent"
                      checked={announcementForm.is_urgent}
                      onChange={(e) => setAnnouncementForm({...announcementForm, is_urgent: e.target.checked})}
                      className="w-5 h-5 text-amber-600 bg-white border-gray-300 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="is_urgent" className="text-sm font-medium text-gray-700 cursor-default">
                      Mark as urgent announcement
                    </label>
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 cursor-pointer"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
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