import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useUser } from '../contexts/UserContext';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';

// API configuration
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with auth interceptor
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

interface ScheduleItem {
  id: number;
  class_id: number;
  start_time: string;
  end_time: string;
  room_number: string;
  status: 'Occupied' | 'Clean' | 'Needs Cleaning';
  class_name: string;
  class_code: string;
  teacher_name: string;
  teacher_full_name: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  date_posted: string;
  is_urgent: boolean;
}

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  creator_id: number;
  created_at: string;
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null;
}

interface SubmissionData {
  assignment_id: number;
  student_id: number;
  time_spent_minutes: number;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes] = useState<Class[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    assignments: true,
    schedule: true,
    announcements: true,
    classes: true
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // Room Report Modal state
  const [showRoomReportModal, setShowRoomReportModal] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFormErrors, setReportFormErrors] = useState<{[key: string]: string}>({});
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  
  // Room report form state
  const [reportFormData, setReportFormData] = useState({
    classId: '',
    isCleanBefore: '',
    isCleanAfter: '',
    reportText: ''
  });
  
  // Form refs for controlled inputs
  const timeSpentRef = useRef<HTMLInputElement>(null);
  const classIdRef = useRef<HTMLSelectElement>(null);
  const reportTextRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);


  // Helper function to construct full image URL
  const getProfileImageUrl = (url: string | null): string => {
    if (!url || url.trim() === '') {
      return '';
    }

    // If it's already an absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Construct full URL with backend base URL
    const baseUrl = 'http://localhost:8000';
    let constructedUrl = '';

    // Handle different URL formats
    if (url.startsWith('/')) {
      // URL starts with / (e.g., /uploads/filename.jpg)
      constructedUrl = `${baseUrl}${url}`;
    } else if (url.startsWith('uploads/') || url.startsWith('photos/') || url.startsWith('static/')) {
      // URL starts with directory (e.g., uploads/filename.jpg)
      constructedUrl = `${baseUrl}/${url}`;
    } else {
      // Just filename (e.g., filename.jpg) - assume it's in uploads
      constructedUrl = `${baseUrl}/uploads/${url}`;
    }

    return constructedUrl;
  };

  // Helper function to get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'teacher': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  useEffect(() => {
    // Check authentication and role
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (!token || userRole !== 'student') {
      navigate('/login');
      return;
    }

    // Load student data including assignments from API
    if (user) {
      loadStudentData();
    }
  }, [navigate, user]);

  const loadStudentData = async () => {
    try {
      // Load all data in parallel for better performance
      await Promise.all([
        loadStudentAssignments(),
        loadSchedules(),
        loadAnnouncements()
      ]);
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const loadStudentAssignments = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, assignments: true }));
      
      // Only call student-specific endpoint if user is a student
      if (user?.role === 'student') {
        console.log('📚 Loading assignments for student...');
        const response = await apiClient.get('/assignments/me');
        setAssignments(response.data);
      } else {
        console.log('⚠️  User is not a student, skipping assignments/me call');
        // For non-students, use mock data or empty array
        setAssignments([]);
      }
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        console.log('🚫 Access forbidden for assignments - user may not be a student');
        setAssignments([]);
      } else {
        // Fallback to mock data if API fails for other reasons
        console.log('📝 Using fallback assignment data');
        setAssignments([
          { id: 1, name: 'Math Homework Chapter 5', description: 'Complete exercises 1-20', class_id: 1, creator_id: 1, created_at: '2025-10-06T10:00:00Z' },
          { id: 2, name: 'Science Lab Report', description: 'Write a detailed report on the experiment conducted in lab', class_id: 2, creator_id: 2, created_at: '2025-10-05T14:30:00Z' },
          { id: 3, name: 'English Essay', description: 'Write a 500-word essay on the assigned topic', class_id: 3, creator_id: 3, created_at: '2025-10-04T09:15:00Z' }
        ]);
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, assignments: false }));
    }
  };

  const loadSchedules = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, schedule: true }));
      const response = await axios.get(`${API_BASE_URL}/schedules/live`);
      setSchedule(response.data);
    } catch (error) {
      console.error('Error loading schedules:', error);
      // Fallback to mock data if API fails
      setSchedule([
        { 
          id: 1, 
          class_id: 1, 
          start_time: '2025-10-07T09:00:00', 
          end_time: '2025-10-07T10:30:00', 
          room_number: 'Room 201', 
          status: 'Occupied',
          class_name: 'Mathematics 101',
          class_code: 'MATH101',
          teacher_name: 'Dr. Smith',
          teacher_full_name: 'Dr. John Smith'
        },
        { 
          id: 2, 
          class_id: 2, 
          start_time: '2025-10-07T11:30:00', 
          end_time: '2025-10-07T13:00:00', 
          room_number: 'Lab 3', 
          status: 'Clean',
          class_name: 'Science Lab',
          class_code: 'SCI201',
          teacher_name: 'Ms. Johnson',
          teacher_full_name: 'Ms. Sarah Johnson'
        },
        { 
          id: 3, 
          class_id: 3, 
          start_time: '2025-10-07T14:00:00', 
          end_time: '2025-10-07T15:30:00', 
          room_number: 'Room 105', 
          status: 'Needs Cleaning',
          class_name: 'English Literature',
          class_code: 'ENG301',
          teacher_name: 'Prof. Davis',
          teacher_full_name: 'Professor Michael Davis'
        }
      ]);
    } finally {
      setLoadingStates(prev => ({ ...prev, schedule: false }));
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, announcements: true }));
      const response = await axios.get(`${API_BASE_URL}/announcements/live`);
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error loading announcements:', error);
      // Fallback to mock data if API fails
      setAnnouncements([
        { id: 1, title: 'Midterm Exam Schedule Released', content: 'The midterm exam schedule for all courses has been published. Please check your course pages for specific dates and times.', date_posted: '2025-10-06T10:00:00Z', is_urgent: true },
        { id: 2, title: 'Library Extended Hours', content: 'The library will be open until 11 PM during exam week to support student study needs.', date_posted: '2025-10-05T15:30:00Z', is_urgent: false },
        { id: 3, title: 'New Study Group Formed', content: 'A new study group for Mathematics 101 has been formed. Contact Sarah Johnson if interested in joining.', date_posted: '2025-10-04T14:20:00Z', is_urgent: false }
      ]);
    } finally {
      setLoadingStates(prev => ({ ...prev, announcements: false }));
    }
  };




  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getClassName = (classId: number) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : 'Unknown Class';
  };

  const getClassCode = (classId: number) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.code : 'UNKNOWN';
  };

  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case 'Clean': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Occupied': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Needs Cleaning': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatTeacherName = (fullName: string) => {
    if (!fullName || fullName === 'Unknown Teacher') return 'Unknown Teacher';
    
    // Split the full name into parts
    const parts = fullName.trim().split(' ');
    
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      
      // Handle titles like Dr., Prof., etc.
      if (firstName.toLowerCase().includes('dr.') || firstName.toLowerCase().includes('doctor')) {
        return `Dr. ${lastName}`;
      } else if (firstName.toLowerCase().includes('prof.') || firstName.toLowerCase().includes('professor')) {
        return `Prof. ${lastName}`;
      } else {
        // For regular names, use title based on first letter of first name
        const firstLetter = firstName.charAt(0).toLowerCase();
        const title = ['a', 'e', 'i', 'o', 'u'].includes(firstLetter) ? 'Ms.' : 'Mr.';
        return `${title} ${lastName}`;
      }
    }
    
    return fullName;
  };



  const handleSubmitAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmitModal(true);
    setFormErrors({});
  };

  const handleCloseSubmitModal = () => {
    setShowSubmitModal(false);
    setSelectedAssignment(null);
    setFormErrors({});
    // Reset form fields
    if (timeSpentRef.current) timeSpentRef.current.value = '';
  };

  const validateSubmissionForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    const timeSpent = timeSpentRef.current?.value.trim();
    
    if (!timeSpent) {
      errors.time_spent_minutes = 'Time spent is required';
    } else {
      const timeValue = parseInt(timeSpent);
      if (isNaN(timeValue) || timeValue <= 0) {
        errors.time_spent_minutes = 'Time spent must be a positive number';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSubmission = async () => {
    if (!validateSubmissionForm() || !selectedAssignment || !user) {
      console.log('Submission validation failed:', {
        formValid: validateSubmissionForm(),
        selectedAssignment: !!selectedAssignment,
        user: !!user
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const submissionData: SubmissionData = {
        assignment_id: selectedAssignment.id,
        student_id: parseInt(user.id.toString()),
        time_spent_minutes: parseInt(timeSpentRef.current?.value || '0')
      };

      console.log('Submitting assignment with data:', submissionData);
      console.log('Auth token present:', !!localStorage.getItem('authToken'));

      await apiClient.post('/submissions/', submissionData);

      // Refresh assignments list
      await loadStudentAssignments();
      
      // Close modal and show success message
      handleCloseSubmitModal();
      
      // You could add a toast notification here
      console.log('Assignment submitted successfully!');
      
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Handle validation errors from API
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const apiErrors: {[key: string]: string} = {};
        error.response.data.detail.forEach((err: any) => {
          if (err.loc && err.loc.length > 1) {
            apiErrors[err.loc[1]] = err.msg;
          }
        });
        setFormErrors(apiErrors);
      } else if (error.response?.status === 409) {
        // Handle duplicate submission (409 Conflict)
        setFormErrors({ 
          general: 'You have already submitted this assignment. View Grades to check status.' 
        });
      } else {
        // Generic error message with more details
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit assignment. Please try again.';
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Room Report Functions
  const handleCloseRoomReportModal = () => {
    setShowRoomReportModal(false);
    setReportFormErrors({});
    setSelectedPhoto(null);
    setReportFormData({
      classId: '',
      isCleanBefore: '',
      isCleanAfter: '',
      reportText: ''
    });
    // Reset form fields
    if (classIdRef.current) classIdRef.current.value = '';
    if (reportTextRef.current) reportTextRef.current.value = '';
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setReportFormErrors({
          photo: 'Please select a valid image file (JPG, PNG, GIF, or WebP)'
        });
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setReportFormErrors({
          photo: 'File size must be less than 10MB'
        });
        return;
      }
      
      setSelectedPhoto(file);
      setReportFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }
  };

  const validateRoomReportForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    const { classId, isCleanBefore, isCleanAfter, reportText } = reportFormData;
    
    if (!classId) {
      errors.class_id = 'Please select a class/room';
    }
    
    if (!isCleanBefore) {
      errors.is_clean_before = 'Please indicate if the room was clean before use';
    }
    
    if (!isCleanAfter) {
      errors.is_clean_after = 'Please indicate if the room was clean after use';
    }
    
    if (!reportText.trim()) {
      errors.report_text = 'Please provide a description of the report';
    } else if (reportText.trim().length < 10) {
      errors.report_text = 'Please provide a more detailed description (at least 10 characters)';
    }
    
    setReportFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRoomReport = async () => {
    if (!validateRoomReportForm() || !user) {
      return;
    }

    try {
      setIsSubmittingReport(true);
      setReportFormErrors({});
      
      const formData = new FormData();
      formData.append('class_id', reportFormData.classId);
      formData.append('is_clean_before', reportFormData.isCleanBefore);
      formData.append('is_clean_after', reportFormData.isCleanAfter);
      formData.append('report_text', reportFormData.reportText);
      
      if (selectedPhoto) {
        formData.append('photo', selectedPhoto);
      }

      const response = await apiClient.post('/reports/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Room report submitted successfully:', response.data);
      
      // Close modal and show success message
      handleCloseRoomReportModal();
      
      // You could add a toast notification here
      console.log('Room report submitted successfully!');
      
    } catch (error: any) {
      console.error('Error submitting room report:', error);
      
      // Handle validation errors from API
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const apiErrors: {[key: string]: string} = {};
        error.response.data.detail.forEach((err: any) => {
          if (err.loc && err.loc.length > 1) {
            apiErrors[err.loc[1]] = err.msg;
          }
        });
        setReportFormErrors(apiErrors);
      } else {
        // Generic error message
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit room report. Please try again.';
        setReportFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };


  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dynamic Header */}
        <div className="hidden lg:block">
          <DynamicHeader 
            title="Student Portal"
            subtitle="ClassTrack Learning Management System"
          />
        </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome back! 🎓
              </h2>
              <p className="text-slate-200 leading-relaxed">
                Stay organized with your schedule, announcements, and assignments. Track your progress and never miss important deadlines.
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Profile Picture */}
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                {user?.profile_picture_url && user.profile_picture_url.trim() !== '' ? (
                  <img 
                    src={getProfileImageUrl(user.profile_picture_url)}
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      console.log('🖼️  Profile image loaded successfully in dashboard');
                    }}
                    onError={(e) => {
                      console.error('🖼️  Profile image failed to load in dashboard:', e.currentTarget.src);
                      // Hide the image and show fallback
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                
                {/* Fallback to role icon */}
                <div className={`w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl ${
                  (!user?.profile_picture_url || user.profile_picture_url.trim() === '') ? '' : 'hidden'
                }`}>
                  {getRoleIcon(user?.role || 'student')}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user?.username || 'User'
                  }
                </h3>
                <p className="text-slate-300 mb-2">{user?.username || 'user@classtrack.edu'}</p>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full border border-purple-500/30">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student'}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl border border-slate-600/50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              View Profile
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Schedule Section */}
          <div className="lg:col-span-1">
            <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg h-fit">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Today's Schedule</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400 font-medium">Live</span>
                </div>
              </div>

              <div className="space-y-3">
                {loadingStates.schedule ? (
                  <div className="space-y-3">
                    <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40">
                      <div className="flex items-start space-x-3">
                        <SkeletonLoader className="w-10 h-10 rounded-xl" />
                        <div className="flex-1">
                          <SkeletonLoader className="h-4 w-3/4 mb-2" />
                          <SkeletonLoader className="h-3 w-1/2 mb-2" />
                          <SkeletonLoader className="h-3 w-2/3" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40">
                      <div className="flex items-start space-x-3">
                        <SkeletonLoader className="w-10 h-10 rounded-xl" />
                        <div className="flex-1">
                          <SkeletonLoader className="h-4 w-3/4 mb-2" />
                          <SkeletonLoader className="h-3 w-1/2 mb-2" />
                          <SkeletonLoader className="h-3 w-2/3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  schedule.map((item) => (
                  <div key={item.id} className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-slate-500/60 rounded-xl flex items-center justify-center text-lg shadow-sm">
                        📚
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm mb-1 truncate">
                          {item.class_name || getClassName(item.class_id)}
                        </h4>
                        <p className="text-xs text-slate-300 mb-1">
                          {formatTeacherName(item.teacher_full_name)} | {item.room_number}
                        </p>
                        <p className="text-xs text-slate-400 mb-2">
                          {item.class_code || getClassCode(item.class_id)}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getRoomStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>

          {/* Announcements Section */}
          <div className="lg:col-span-1">
            <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg h-fit">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Announcements</h3>
                </div>
                {announcements.filter(a => a.is_urgent).length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-orange-400 font-medium">
                      {announcements.filter(a => a.is_urgent).length} Urgent
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {loadingStates.announcements ? (
                  <div className="space-y-3">
                    <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40">
                      <div className="flex items-start space-x-3">
                        <SkeletonLoader className="w-3 h-3 rounded-full mt-2" />
                        <div className="flex-1">
                          <SkeletonLoader className="h-4 w-3/4 mb-2" />
                          <SkeletonLoader className="h-3 w-full mb-2" />
                          <SkeletonLoader className="h-3 w-2/3 mb-2" />
                          <SkeletonLoader className="h-3 w-1/3" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40">
                      <div className="flex items-start space-x-3">
                        <SkeletonLoader className="w-3 h-3 rounded-full mt-2" />
                        <div className="flex-1">
                          <SkeletonLoader className="h-4 w-3/4 mb-2" />
                          <SkeletonLoader className="h-3 w-full mb-2" />
                          <SkeletonLoader className="h-3 w-2/3 mb-2" />
                          <SkeletonLoader className="h-3 w-1/3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  announcements.map((announcement) => (
                  <div key={announcement.id} className={`bg-slate-600/60 rounded-xl p-4 border transition-all duration-200 hover:bg-slate-600/80 shadow-sm ${announcement.is_urgent ? 'border-orange-400/50 ring-1 ring-orange-400/20' : 'border-slate-500/40'}`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-2 ${announcement.is_urgent ? 'bg-orange-400' : 'bg-slate-400'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-white text-sm leading-tight">{announcement.title}</h4>
                          {announcement.is_urgent && (
                            <span className="px-2 py-1 text-xs rounded-full border ml-2 flex-shrink-0 bg-orange-500/20 border-orange-500/30 text-orange-400">
                              🚨 URGENT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-200 mb-3 leading-relaxed">{announcement.content}</p>
                        <p className="text-xs text-slate-400">{formatDate(announcement.date_posted)}</p>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>

          {/* Assignments Section */}
          <div className="lg:col-span-2 xl:col-span-1">
            <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Assignments</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-400 font-medium">Grading Support</span>
                </div>
              </div>

              <div className="space-y-3">
                {loadingStates.assignments ? (
                  <div className="space-y-3">
                    <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <SkeletonLoader className="h-4 w-3/4 mb-2" />
                          <SkeletonLoader className="h-3 w-1/2 mb-2" />
                          <SkeletonLoader className="h-3 w-full mb-2" />
                          <SkeletonLoader className="h-3 w-2/3" />
                        </div>
                        <SkeletonLoader className="w-16 h-6 rounded-full ml-2" />
                      </div>
                      <SkeletonLoader className="h-10 w-full rounded-xl" />
                    </div>
                    <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <SkeletonLoader className="h-4 w-3/4 mb-2" />
                          <SkeletonLoader className="h-3 w-1/2 mb-2" />
                          <SkeletonLoader className="h-3 w-full mb-2" />
                          <SkeletonLoader className="h-3 w-2/3" />
                        </div>
                        <SkeletonLoader className="w-16 h-6 rounded-full ml-2" />
                      </div>
                      <SkeletonLoader className="h-10 w-full rounded-xl" />
                    </div>
                  </div>
                ) : (
                  assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm mb-1 truncate">{assignment.name}</h4>
                        <p className="text-xs text-slate-300 mb-2">{getClassName(assignment.class_id)} ({getClassCode(assignment.class_id)})</p>
                        <p className="text-sm text-slate-200 leading-relaxed">{assignment.description || 'No description provided'}</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full border ml-2 flex-shrink-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Available
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-300">
                          Created: {formatDate(assignment.created_at)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300">
                          Assignment
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleSubmitAssignment(assignment)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md"
                    >
                      Submit Assignment
                    </button>
                  </div>
                ))
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 shadow-sm">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-white">
                      {assignments.length}
                    </p>
                    <p className="text-xs text-slate-300">Available</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">
                      {assignments.length}
                    </p>
                    <p className="text-xs text-slate-300">Total</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">
                      0
                    </p>
                    <p className="text-xs text-slate-300">Submitted</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span>Quick Actions</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center space-x-4 p-4 bg-slate-600/60 hover:bg-slate-600/80 rounded-xl border border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Submit Assignment</p>
                <p className="text-xs text-slate-300">Upload your work</p>
              </div>
            </button>
            <button 
              onClick={() => setShowRoomReportModal(true)}
              className="flex items-center space-x-4 p-4 bg-slate-600/60 hover:bg-slate-600/80 rounded-xl border border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Submit Room Report</p>
                <p className="text-xs text-slate-300">Report classroom issues</p>
              </div>
            </button>
            <button className="flex items-center space-x-4 p-4 bg-slate-600/60 hover:bg-slate-600/80 rounded-xl border border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">View Grades</p>
                <p className="text-xs text-slate-300">Check your progress</p>
              </div>
            </button>
            <button className="flex items-center space-x-4 p-4 bg-slate-600/60 hover:bg-slate-600/80 rounded-xl border border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">View Schedule</p>
                <p className="text-xs text-slate-300">See upcoming events</p>
              </div>
            </button>
          </div>
        </div>
        </div>
      </main>

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  Submit Assignment
                </h3>
                <button
                  onClick={handleCloseSubmitModal}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Assignment Info */}
              <div className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                <h4 className="font-semibold text-white text-sm mb-2">{selectedAssignment.name}</h4>
                <p className="text-xs text-slate-300 mb-1">{getClassName(selectedAssignment.class_id)} ({getClassCode(selectedAssignment.class_id)})</p>
                <p className="text-sm text-slate-200">{selectedAssignment.description || 'No description provided'}</p>
              </div>

              {/* General Error Message */}
              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Hidden Assignment ID */}
                <input type="hidden" value={selectedAssignment.id} />
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Time Spent (minutes) <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={timeSpentRef}
                    type="number"
                    min="1"
                    className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.time_spent_minutes ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Enter time spent in minutes"
                  />
                  {formErrors.time_spent_minutes && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.time_spent_minutes}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    This data helps track your learning progress and engagement.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-slate-700">
                <button
                  onClick={handleCloseSubmitModal}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitSubmission}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Report Modal */}
      {showRoomReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Submit Room Report
                </h3>
                <button
                  onClick={handleCloseRoomReportModal}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* General Error Message */}
              {reportFormErrors.general && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{reportFormErrors.general}</p>
                </div>
              )}

              <form className="space-y-6">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Class/Room <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={reportFormData.classId}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, classId: e.target.value }))}
                    className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      reportFormErrors.class_id ? 'border-red-500' : 'border-slate-600'
                    }`}
                  >
                    <option value="">Select a class/room</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.code})
                      </option>
                    ))}
                  </select>
                  {reportFormErrors.class_id && (
                    <p className="mt-1 text-sm text-red-400">{reportFormErrors.class_id}</p>
                  )}
                </div>

                {/* Cleanliness Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Room Cleanliness Before Use <span className="text-red-400">*</span>
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="is_clean_before"
                          value="true"
                          checked={reportFormData.isCleanBefore === 'true'}
                          onChange={(e) => setReportFormData(prev => ({ ...prev, isCleanBefore: e.target.value }))}
                          className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 focus:ring-orange-500"
                        />
                        <span className="text-white">Clean</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="is_clean_before"
                          value="false"
                          checked={reportFormData.isCleanBefore === 'false'}
                          onChange={(e) => setReportFormData(prev => ({ ...prev, isCleanBefore: e.target.value }))}
                          className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 focus:ring-orange-500"
                        />
                        <span className="text-white">Not Clean</span>
                      </label>
                    </div>
                    {reportFormErrors.is_clean_before && (
                      <p className="mt-1 text-sm text-red-400">{reportFormErrors.is_clean_before}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Room Cleanliness After Use <span className="text-red-400">*</span>
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="is_clean_after"
                          value="true"
                          checked={reportFormData.isCleanAfter === 'true'}
                          onChange={(e) => setReportFormData(prev => ({ ...prev, isCleanAfter: e.target.value }))}
                          className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 focus:ring-orange-500"
                        />
                        <span className="text-white">Clean</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="is_clean_after"
                          value="false"
                          checked={reportFormData.isCleanAfter === 'false'}
                          onChange={(e) => setReportFormData(prev => ({ ...prev, isCleanAfter: e.target.value }))}
                          className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 focus:ring-orange-500"
                        />
                        <span className="text-white">Not Clean</span>
                      </label>
                    </div>
                    {reportFormErrors.is_clean_after && (
                      <p className="mt-1 text-sm text-red-400">{reportFormErrors.is_clean_after}</p>
                    )}
                  </div>
                </div>

                {/* Report Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Report Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={reportFormData.reportText}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, reportText: e.target.value }))}
                    rows={4}
                    className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      reportFormErrors.report_text ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Describe the classroom condition, any issues found, or observations..."
                  />
                  {reportFormErrors.report_text && (
                    <p className="mt-1 text-sm text-red-400">{reportFormErrors.report_text}</p>
                  )}
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Photo Evidence (Optional)
                  </label>
                  <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-orange-500 transition-colors duration-200">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center space-y-2">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-slate-300 text-sm">
                          {selectedPhoto ? selectedPhoto.name : 'Click to upload photo evidence'}
                        </p>
                        <p className="text-slate-400 text-xs">JPG, PNG, GIF, WebP (Max 10MB)</p>
                      </div>
                    </label>
                  </div>
                  {selectedPhoto && (
                    <div className="mt-3 p-3 bg-slate-700/50 rounded-xl border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-white text-sm">{selectedPhoto.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhoto(null);
                            if (photoInputRef.current) photoInputRef.current.value = '';
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  {reportFormErrors.photo && (
                    <p className="mt-1 text-sm text-red-400">{reportFormErrors.photo}</p>
                  )}
                </div>
              </form>
              
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-slate-700">
                <button
                  onClick={handleCloseRoomReportModal}
                  disabled={isSubmittingReport}
                  className="px-6 py-3 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRoomReport}
                  disabled={isSubmittingReport}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmittingReport && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default StudentDashboard;


