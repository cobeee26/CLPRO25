import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import Swal from 'sweetalert2';

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

interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  grade: number | null;
  time_spent_minutes: number;
  submitted_at: string;
  is_graded: boolean;
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

interface EngagementInsight {
  assignment_id: number;
  assignment_name: string;
  class_name: string;
  total_submissions: number;
  average_time_spent: number;
  engagement_score: number;
  last_updated: string;
}

const SubmissionsViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [user, setUser] = useState<any>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [engagementInsight, setEngagementInsight] = useState<EngagementInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [editingGrade, setEditingGrade] = useState<{[key: number]: number}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SweetAlert Configuration
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

  // SweetAlert Helper Functions
  const showSuccessAlert = (title: string, text: string = '', timer: number = 2000) => {
    Swal.fire({
      title,
      text,
      icon: 'success',
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-green-900'
      }
    });
  };

  const showErrorAlert = (title: string, text: string = '', timer: number = 3000) => {
    Swal.fire({
      title,
      text,
      icon: 'error',
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-red-900'
      }
    });
  };

  const showConfirmDialog = (title: string, text: string, confirmText: string = 'Yes, proceed') => {
    return Swal.fire({
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
        confirmButton: 'px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white cursor-pointer',
        cancelButton: 'px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer'
      }
    });
  };

  const showLoadingAlert = (title: string = 'Processing...') => {
    return Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
      ...swalConfig
    });
  };

  const closeAlert = () => {
    Swal.close();
  };

  // Logout function with SweetAlert
  const handleLogout = async () => {
    const result = await showConfirmDialog(
      'Confirm Logout',
      'Are you sure you want to logout? You will need to log in again to access your dashboard.',
      'Yes, logout'
    );
    
    if (result.isConfirmed) {
      try {
        // Clear authentication data
        localStorage.clear();
        
        showSuccessAlert('Logged Out', 'You have been successfully logged out.', 1500);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        showErrorAlert('Logout Error', 'There was an issue logging out. Please try again.', 3000);
      }
    }
  };

  const updateLoadingProgress = (step: number, totalSteps: number = 4) => {
    const progress = Math.floor((step / totalSteps) * 100);
    setLoadingProgress(progress);
  };

  useEffect(() => {
    // Check authentication and role
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (!token) {
      navigate('/login');
      return;
    }

    // Allow teachers and students to access this page
    if (userRole !== 'teacher' && userRole !== 'student') {
      navigate('/login');
      return;
    }

    // Fetch user data
    loadCurrentUser();
  }, [navigate, assignmentId]);

  // Load data when user is available
  useEffect(() => {
    if (user) {
      if (user.role === 'teacher' && assignmentId) {
        // Teachers view assignment submissions
        loadAssignmentData();
      } else if (user.role === 'student') {
        // Students view their grades
        loadStudentGrades();
      }
    }
  }, [user, assignmentId]);

  const loadCurrentUser = async () => {
    try {
      console.log('Loading current user...');
      const response = await apiClient.get('/users/me');
      console.log('Current user response:', response.data);
      setUser(response.data);
    } catch (error) {
      console.error('Error loading current user:', error);
      // Fallback to default user data
      setUser({
        id: '1',
        username: 'teacher@classtrack.edu',
        role: 'teacher'
      });
    }
  };

  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      setLoadingProgress(10);
      
      // Step 1: Load assignment details
      updateLoadingProgress(1, 4);
      await loadAssignment();
      
      // Step 2: Load submissions
      updateLoadingProgress(2, 4);
      await loadSubmissions();
      
      // Step 3: Load class info
      updateLoadingProgress(3, 4);
      
      // Step 4: Load engagement insights
      updateLoadingProgress(4, 4);
      await loadEngagementInsight();
      
      // Complete loading
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('Error loading assignment data:', error);
      showErrorAlert('Load Error', 'Failed to load assignment data. Please try again.');
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  const loadAssignment = async () => {
    try {
      console.log('📝 Loading assignment data for ID:', assignmentId);
      
      // Call real API endpoint
      const response = await apiClient.get(`/assignments/${assignmentId}`);
      const assignmentData = response.data;
      
      console.log('✅ Assignment loaded from API:', assignmentData.name);
      setAssignment(assignmentData);
      await loadClassInfo(assignmentData.class_id);
      
    } catch (error: any) {
      console.error('❌ Error loading assignment:', error);
      if (error.response?.status === 404) {
        showErrorAlert('Assignment Not Found', 'The assignment you are looking for does not exist.');
      } else if (error.response?.status === 403) {
        showErrorAlert('Access Denied', 'You are not authorized to view this assignment.');
      } else {
        showErrorAlert('Load Error', 'Failed to load assignment details. Please try again.');
      }
      navigate('/teacher/assignments');
    }
  };

  const loadClassInfo = async (classId: number) => {
    try {
      console.log('📚 Loading class info for class ID:', classId);
      
      // Call real API endpoint
      const response = await apiClient.get(`/classes/${classId}`);
      const classData = response.data;
      
      console.log('✅ Class loaded from API:', classData.name);
      setClassInfo(classData);
      
    } catch (error: any) {
      console.error('❌ Error loading class info:', error);
      if (error.response?.status === 404) {
        console.error('Class not found for ID:', classId);
        setClassInfo(null);
      } else if (error.response?.status === 403) {
        console.error('Not authorized to view this class');
        setClassInfo(null);
      }
    }
  };

  const loadStudentGrades = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingProgress(10);
      
      console.log('📊 Loading student grades...');
      updateLoadingProgress(1, 2);
      
      // Call student grades endpoint
      const response = await apiClient.get('/students/me/grades');
      const gradesData = response.data;
      
      console.log('✅ Student grades loaded:', gradesData);
      updateLoadingProgress(2, 2);
      
      // Transform grades data to submissions format for compatibility
      const submissionsData = gradesData.map((grade: any) => ({
        id: grade.id,
        assignment_id: grade.assignment_id,
        student_id: user?.id,
        student_name: user?.username || 'Student',
        grade: grade.grade,
        time_spent_minutes: grade.time_spent_minutes,
        submitted_at: grade.submitted_at,
        is_graded: grade.is_graded
      }));
      
      setSubmissions(submissionsData);
      setLoadingProgress(100);
      
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Error loading student grades:', error);
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
      if (error.response?.status === 403) {
        setError('Not authorized to view grades');
        showErrorAlert('Access Denied', 'You are not authorized to view grades.');
      } else {
        setError('Failed to load grades. Please try again.');
        showErrorAlert('Load Error', 'Failed to load your grades. Please try again.');
      }
    }
  };

  const loadSubmissions = async () => {
    try {
      console.log('📚 Loading mock submissions for assignment:', assignmentId);
      
      // Use mock data for submissions since /assignments/{id}/submissions endpoint doesn't exist
      const mockSubmissions = [
        {
          id: 1,
          student_id: 1,
          assignment_id: parseInt(assignmentId || '0'),
          content: "I completed all the algebra problems. Here are my solutions: 1) x = 5, 2) y = 12, 3) z = 8",
          submitted_at: "2025-10-07T10:30:00Z",
          grade: 85,
          feedback: "Good work! Check problem 2 calculation.",
          student_name: "John Doe",
          student_email: "john.doe@classtrack.edu",
          time_spent_minutes: 45,
          is_graded: true
        },
        {
          id: 2,
          student_id: 2,
          assignment_id: parseInt(assignmentId || '0'),
          content: "I finished the assignment. My answers: 1) x = 5, 2) y = 10, 3) z = 7",
          submitted_at: "2025-10-07T11:15:00Z",
          grade: 92,
          feedback: "Excellent work! All calculations are correct.",
          student_name: "Jane Smith",
          student_email: "jane.smith@classtrack.edu",
          time_spent_minutes: 35,
          is_graded: true
        },
        {
          id: 3,
          student_id: 3,
          assignment_id: parseInt(assignmentId || '0'),
          content: "Here are my solutions to the algebra problems...",
          submitted_at: "2025-10-07T12:00:00Z",
          grade: null,
          feedback: null,
          student_name: "Mike Johnson",
          student_email: "mike.johnson@classtrack.edu",
          time_spent_minutes: 60,
          is_graded: false
        }
      ];
      
      console.log('✅ Mock submissions loaded:', mockSubmissions);
      setSubmissions(mockSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    }
  };

  const loadEngagementInsight = async () => {
    try {
      console.log('📊 Loading mock engagement insight for assignment:', assignmentId);
      
      // Use mock data for engagement insights since /insights/engagement/{id} endpoint doesn't exist
      const mockEngagementInsight = {
        assignment_id: parseInt(assignmentId || '0'),
        class_name: "Mathematics 101",
        assignment_name: "Algebra Fundamentals",
        total_submissions: 3,
        average_time_spent: 45, // minutes
        engagement_score: 78,
        last_updated: new Date().toISOString()
      };
      
      console.log('✅ Mock engagement insight loaded:', mockEngagementInsight);
      setEngagementInsight(mockEngagementInsight);
    } catch (error) {
      console.error('Error loading engagement insight:', error);
      setEngagementInsight(null);
    }
  };

  const handleGradeChange = (submissionId: number, grade: number) => {
    setEditingGrade(prev => ({
      ...prev,
      [submissionId]: grade
    }));
  };

  const handleSaveGrade = async (submissionId: number) => {
    try {
      setIsSaving(true);
      const grade = editingGrade[submissionId];
      
      if (grade === undefined || grade < 0 || grade > 100) {
        showErrorAlert('Invalid Grade', 'Please enter a valid grade between 0 and 100');
        return;
      }

      const loadingAlert = showLoadingAlert('Saving grade...');
      
      await apiClient.patch(`/submissions/${submissionId}/grade`, { grade });
      
      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, grade, is_graded: true }
          : sub
      ));
      
      // Remove from editing state
      setEditingGrade(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      
      closeAlert();
      showSuccessAlert('Grade Saved!', `Grade of ${grade}% saved successfully.`);
      
    } catch (error) {
      console.error('Error saving grade:', error);
      closeAlert();
      showErrorAlert('Save Failed', 'Failed to save grade. Please try again.');
    } finally {
      setIsSaving(false);
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

  const getEngagementScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-600';
    if (score >= 7.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (grade >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (grade >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const calculateAIScore = (timeSpent: number): number => {
    // Simple AI engagement score based on time spent
    // This is a simplified algorithm - in a real system, this would be more sophisticated
    if (timeSpent >= 60) return 9.5;
    if (timeSpent >= 45) return 8.5;
    if (timeSpent >= 30) return 7.5;
    if (timeSpent >= 15) return 6.5;
    return 5.0;
  };

  // Loading Screen - Updated with progress bar
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-2xl blur-xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>

        {/* Loading Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {user?.role === 'student' ? 'Loading Your Grades' : 'Loading Submissions'}
          </h2>
          <p className="text-gray-600 max-w-md">
            {user?.role === 'student' 
              ? 'Preparing your grades and performance analysis...'
              : 'Preparing assignment submissions and engagement metrics...'
            }
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
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md mb-8">
          {user?.role === 'student' ? (
            <>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 25
                  ? "bg-blue-100 text-blue-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Grades
              </div>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 50
                  ? "bg-green-100 text-green-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Performance
              </div>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 75
                  ? "bg-purple-100 text-purple-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Analysis
              </div>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 100
                  ? "bg-orange-100 text-orange-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Complete
              </div>
            </>
          ) : (
            <>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 25
                  ? "bg-blue-100 text-blue-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Assignment
              </div>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 50
                  ? "bg-green-100 text-green-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Submissions
              </div>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 75
                  ? "bg-purple-100 text-purple-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Insights
              </div>
              <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= 100
                  ? "bg-orange-100 text-orange-600 shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}>
                Complete
              </div>
            </>
          )}
        </div>

        {/* Loading Animation */}
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex">
      {/* Fixed Sidebar - Always fixed position */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition duration-300 ease-in-out`}>
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area - Adjusted for fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        
        {/* Fixed Header Container - Hindi nag-scroll */}
        <div className="fixed top-0 left-0 right-0 z-30 lg:left-64 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">
          {/* Mobile Header */}
          <header className="lg:hidden p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-xl blur-sm"></div>
                <img
                  src={plmunLogo}
                  alt="PLMun Logo"
                  className="relative w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {user?.role === 'student' ? "My Grades" : "Digital Grading"}
                </h1>
                <p className="text-xs text-gray-600">
                  {user?.role === 'student' 
                    ? "View your assignment grades and performance" 
                    : `${assignment?.name || 'Assignment'} - ${classInfo?.name || 'Class'}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 cursor-pointer"
                title="Logout"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>

              {/* Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Toggle menu"
              >
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </header>

          {/* Desktop Header - Fixed position */}
          <div className="hidden lg:block">
            <DynamicHeader 
              title={user?.role === 'student' ? "My Grades" : "Digital Grading"}
              subtitle={user?.role === 'student' 
                ? "View your assignment grades and performance" 
                : `${assignment?.name || 'Assignment'} - ${classInfo?.name || 'Class'}`
              }
              showBackButton={true}
              backTo={user?.role === 'student' ? "/student/dashboard" : "/teacher/assignments"}
              backLabel={user?.role === 'student' ? "Back to Dashboard" : "Back to Assignments"}
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
        </div>

        {/* Scrollable Main Content - Adjusted padding for fixed headers */}
        <main className="flex-1 overflow-auto pt-16 lg:pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Error Message */}
            {error && (
              <div className="mb-8 bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">Error Loading Data</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Info Card */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm mb-8">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{assignment?.name}</h2>
                    <p className="text-gray-600 mb-4">{assignment?.description || 'No description provided'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-gray-500 text-sm mb-1">Class</div>
                        <div className="text-gray-900 font-semibold">{classInfo?.name}</div>
                        <div className="text-gray-500 text-xs">{classInfo?.code}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-gray-500 text-sm mb-1">Total Submissions</div>
                        <div className="text-gray-900 font-semibold text-lg">{submissions.length}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-gray-500 text-sm mb-1">Avg. Engagement</div>
                        <div className={`font-semibold text-lg ${getEngagementScoreColor(engagementInsight?.engagement_score || 0)}`}>
                          {engagementInsight?.engagement_score?.toFixed(1) || '0.0'}/10
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  {user?.role === 'student' ? 'Your Grades' : 'Student Submissions'}
                </h3>
                <p className="text-sm text-gray-600">
                  {user?.role === 'student' 
                    ? 'View your assignment grades and performance metrics' 
                    : 'Grade student submissions and view engagement metrics'
                  }
                </p>
              </div>
              
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {user?.role === 'student' ? 'No Grades Available' : 'No Submissions Yet'}
                  </h4>
                  <p className="text-gray-500">
                    {user?.role === 'student' 
                      ? 'You haven\'t been graded on any assignments yet.' 
                      : 'Students haven\'t submitted this assignment yet.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {user?.role === 'teacher' && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Student
                          </th>
                        )}
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Time Spent
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          AI Engagement Score
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Submitted At
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Current Grade
                        </th>
                        {user?.role === 'teacher' && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {submissions.map((submission) => {
                        const aiScore = calculateAIScore(submission.time_spent_minutes);
                        return (
                          <tr key={submission.id} className="hover:bg-gray-50 transition-colors duration-200">
                            {user?.role === 'teacher' && (
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm mr-4">
                                    <span className="text-sm font-bold text-white">
                                      {submission.student_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">{submission.student_name}</div>
                                    <div className="text-xs text-gray-500">ID: {submission.student_id}</div>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 font-medium">
                                {submission.time_spent_minutes} minutes
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm font-semibold ${getEngagementScoreColor(aiScore)}`}>
                                {aiScore.toFixed(1)}/10
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">
                                {formatDate(submission.submitted_at)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {submission.is_graded ? (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getGradeColor(submission.grade!)}`}>
                                  {submission.grade}%
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-300">
                                  Not Graded
                                </span>
                              )}
                            </td>
                            {user?.role === 'teacher' && (
                              <td className="px-6 py-4">
                                {submission.is_graded ? (
                                  <button
                                    onClick={() => setEditingGrade(prev => ({ ...prev, [submission.id]: submission.grade! }))}
                                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-all duration-200 border border-blue-200 hover:border-blue-300 cursor-pointer"
                                    disabled={isSaving}
                                  >
                                    Edit Grade
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingGrade(prev => ({ ...prev, [submission.id]: 0 }))}
                                    className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-all duration-200 border border-green-200 hover:border-green-300 cursor-pointer"
                                    disabled={isSaving}
                                  >
                                    Grade
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Grade Input Section (Teacher Only) */}
            {user?.role === 'teacher' && Object.keys(editingGrade).length > 0 && (
              <div className="mt-8 bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm">
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Grade Submissions</h4>
                  <div className="space-y-4">
                    {Object.entries(editingGrade).map(([submissionId, grade]) => {
                      const submission = submissions.find(s => s.id === parseInt(submissionId));
                      return (
                        <div key={submissionId} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{submission?.student_name}</div>
                            <div className="text-xs text-gray-500">
                              Time: {submission?.time_spent_minutes} minutes | 
                              AI Score: {calculateAIScore(submission?.time_spent_minutes || 0).toFixed(1)}/10
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={grade}
                                onChange={(e) => handleGradeChange(parseInt(submissionId), parseFloat(e.target.value) || 0)}
                                className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                                placeholder="Grade"
                                disabled={isSaving}
                              />
                              <span className="text-gray-500 text-sm">%</span>
                            </div>
                            <button
                              onClick={() => handleSaveGrade(parseInt(submissionId))}
                              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-all duration-200 border border-green-200 hover:border-green-300 disabled:opacity-50 cursor-pointer"
                              disabled={isSaving}
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingGrade(prev => {
                                const newState = { ...prev };
                                delete newState[parseInt(submissionId)];
                                return newState;
                              })}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-200 hover:border-gray-300 cursor-pointer"
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubmissionsViewPage;