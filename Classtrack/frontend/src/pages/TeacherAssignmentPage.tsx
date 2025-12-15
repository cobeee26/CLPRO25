import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import Swal from 'sweetalert2';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with interceptor
const createApiClient = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
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

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      if (error.response?.status === 401) {
        console.error('Authentication failed, redirecting to login...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

const apiClient = createApiClient();

interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  content: string;
  file_path?: string;
  file_name?: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  is_graded: boolean;
  time_spent_minutes: number;
  link_url?: string;
  violations?: Violation[];
}

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  creator_id: number;
  created_at: string;
  class_name?: string;
  class_code?: string;
  due_date?: string;
  teacher_name?: string;
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null;
  teacher_name?: string;
}

interface Violation {
  id?: number;
  student_id: number;
  assignment_id: number;
  violation_type: 'tab_switch' | 'app_switch' | 'rapid_completion' | 'paste_detected' | 'suspicious_activity';
  description: string;
  detected_at: string;
  time_away_seconds: number;
  severity: 'low' | 'medium' | 'high';
  content_added_during_absence?: number;
  student_name?: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  student_id: string;
}

interface GradeStatistics {
  average: number;
  highest: number;
  lowest: number;
  distribution: {
    'A (90-100)': number;
    'B (80-89)': number;
    'C (70-79)': number;
    'D (60-69)': number;
    'F (0-59)': number;
  };
}

interface TeacherClass {
  id: number;
  name: string;
  code: string;
  teacher_id: number;
  created_at: string;
  updated_at: string;
}

interface TeacherClassesResponse {
  classes: TeacherClass[];
}

const TeacherAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useUser();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingGrades, setEditingGrades] = useState<{[key: number]: {grade: number, feedback: string}}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'graded' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'submitted' | 'grade' | 'time'>('submitted');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedStudentViolations, setSelectedStudentViolations] = useState<Violation[]>([]);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [gradeStatistics, setGradeStatistics] = useState<GradeStatistics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);

  // Modal refs
  const modalRef = useRef<HTMLDivElement>(null);
  const gradeInputRefs = useRef<{[key: number]: HTMLInputElement | null}>({});

  const handleLogout = () => {
    // Show confirmation SweetAlert
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your account.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      backdrop: true
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          localStorage.clear();
          window.location.href = '/login';
        } catch (error) {
          window.location.href = '/login';
        }
      }
    });
  };

  // Load teacher classes at the start
  const loadTeacherClasses = useCallback(async () => {
    try {
      // Show loading SweetAlert
      Swal.fire({
        title: 'Loading Classes...',
        text: 'Please wait while we load your classes.',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await apiClient.get<TeacherClassesResponse>('/teachers/me/classes');
      console.log('📋 Teacher Classes from API:', response.data);
      setTeacherClasses(response.data.classes || []);
      
      Swal.close();
      return response.data.classes || [];
    } catch (error: any) {
      console.error('Error loading teacher classes:', error);
      setTeacherClasses([]);
      
      Swal.fire({
        title: 'Loading Failed',
        text: 'Failed to load classes. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
      
      return [];
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/login');
      return;
    }
    loadAssignmentData();
  }, [user, assignmentId]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowSubmissionModal(false);
        setShowViolationModal(false);
      }
    };

    if (showSubmissionModal || showViolationModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSubmissionModal, showViolationModal]);

  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Show loading SweetAlert
      Swal.fire({
        title: 'Loading Assignment...',
        text: 'Please wait while we load assignment data.',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Load teacher classes first
      const classes = await loadTeacherClasses();

      // Load assignment details
      const assignmentResponse = await apiClient.get(`/assignments/${assignmentId}`);
      const assignmentData = assignmentResponse.data;
      
      console.log('📋 Assignment Data:', assignmentData);
      
      // Load class info and update assignment immediately
      await loadClassInfoFromTeacherClasses(assignmentData.class_id, assignmentData, classes);
      
      // Set assignment after loading class info
      setAssignment(assignmentData);

      // Load all students in class
      await loadClassStudents(assignmentData.class_id, classes);

      // Load submissions
      await loadSubmissions();

      // Load violations
      await loadViolations();

      Swal.close();

    } catch (error: any) {
      console.error('Error loading assignment:', error);
      setError('Failed to load assignment data. Please try again.');
      
      Swal.fire({
        title: 'Loading Failed',
        text: 'Failed to load assignment data. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassInfoFromTeacherClasses = async (
    classId: number, 
    currentAssignment: Assignment,
    teacherClassesList: TeacherClass[]
  ) => {
    try {
      // Get class info directly from teacher's classes
      const teacherClass = teacherClassesList.find(c => c.id === classId);
      
      let enhancedClassInfo: Class;
      
      if (teacherClass) {
        console.log('📋 Found class in teacher classes:', teacherClass);
        
        enhancedClassInfo = {
          id: teacherClass.id,
          name: teacherClass.name || `Class ${teacherClass.id}`,
          code: teacherClass.code || `CLASS-${teacherClass.id}`,
          teacher_id: teacherClass.teacher_id,
          teacher_name: user?.username || 'Teacher'
        };
      } else {
        // If not found in teacher classes, use fallback
        console.log('📋 Class not found in teacher classes, using fallback...');
        
        enhancedClassInfo = {
          id: classId,
          name: `Class ${classId}`,
          code: `CLASS-${classId}`,
          teacher_id: user?.id || null,
          teacher_name: user?.username || 'Teacher'
        };
      }
      
      setClassInfo(enhancedClassInfo);
      
      // Update assignment with class info immediately
      const updatedAssignment = {
        ...currentAssignment,
        class_code: enhancedClassInfo.code,
        class_name: enhancedClassInfo.name,
        teacher_name: enhancedClassInfo.teacher_name
      };
      
      console.log('📋 Updated Assignment:', updatedAssignment);
      setAssignment(updatedAssignment);
      
      return enhancedClassInfo;
      
    } catch (error: any) {
      console.error('Error loading class info:', error);
      
      // Fallback class info
      const fallbackClass: Class = {
        id: classId,
        name: `Class ${classId}`,
        code: `CLASS-${classId}`,
        teacher_id: user?.id || null,
        teacher_name: user?.username || 'Teacher'
      };
      
      setClassInfo(fallbackClass);
      
      // Update assignment with fallback class code
      const updatedAssignment = {
        ...currentAssignment,
        class_code: fallbackClass.code,
        class_name: fallbackClass.name,
        teacher_name: fallbackClass.teacher_name
      };
      
      console.log('📋 Updated Assignment with Fallback:', updatedAssignment);
      setAssignment(updatedAssignment);
      
      return fallbackClass;
    }
  };

  const loadClassStudents = async (classId: number, teacherClassesList: TeacherClass[]) => {
    try {
      // First try to get students from teacher classes
      const teacherClass = teacherClassesList.find(c => c.id === classId);
      
      if (teacherClass) {
        // Try to get students from the /teachers/me/classes/{id}/students endpoint
        try {
          const response = await apiClient.get(`/teachers/me/classes/${classId}/students`);
          console.log('📋 Students from teacher class:', response.data);
          setAllStudents(response.data);
          return;
        } catch (teacherError) {
          console.log('📋 Teacher class students endpoint not available, trying regular endpoint...');
        }
      }
      
      // Fallback to regular endpoint
      console.log('📋 Trying regular students endpoint...');
      const response = await apiClient.get(`/classes/${classId}/students`);
      setAllStudents(response.data);
      
    } catch (error: any) {
      console.error('Error loading class students:', error);
      setAllStudents([]);
    }
  };

  const loadSubmissions = async () => {
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/submissions`);
      const submissionsData = response.data;
      setSubmissions(submissionsData);

      // Calculate grade statistics
      calculateGradeStatistics(submissionsData);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
      calculateGradeStatistics([]);
    }
  };

  const loadViolations = async () => {
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/violations`);
      setViolations(response.data);
    } catch (error: any) {
      console.error('Error loading violations:', error);
      setViolations([]);
    }
  };

  const calculateGradeStatistics = (submissionsData: Submission[]) => {
    const gradedSubmissions = submissionsData.filter(s => s.grade !== null && s.grade !== undefined);
    
    if (gradedSubmissions.length === 0) {
      setGradeStatistics(null);
      return;
    }

    const grades = gradedSubmissions.map(s => s.grade!);
    const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
    const highest = Math.max(...grades);
    const lowest = Math.min(...grades);

    const distribution = {
      'A (90-100)': grades.filter(g => g >= 90).length,
      'B (80-89)': grades.filter(g => g >= 80 && g < 90).length,
      'C (70-79)': grades.filter(g => g >= 70 && g < 80).length,
      'D (60-69)': grades.filter(g => g >= 60 && g < 70).length,
      'F (0-59)': grades.filter(g => g < 60).length,
    };

    setGradeStatistics({
      average,
      highest,
      lowest,
      distribution
    });
  };

  const handleGradeChange = (submissionId: number, field: 'grade' | 'feedback', value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: field === 'grade' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const handleSaveGrade = async (submissionId: number) => {
    try {
      setIsSaving(true);
      const editedData = editingGrades[submissionId];
      
      if (!editedData) return;

      const gradeValue = parseFloat(editedData.grade.toString());
      if (gradeValue < 0 || gradeValue > 100) {
        setError('Please enter a valid grade between 0 and 100');
        
        // Show SweetAlert error
        Swal.fire({
          title: 'Invalid Grade',
          text: 'Please enter a valid grade between 0 and 100.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
        
        return;
      }

      // Show loading SweetAlert
      Swal.fire({
        title: 'Saving Grade...',
        text: 'Please wait while we save the grade.',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // API call to save grade and feedback
      await apiClient.patch(`/submissions/${submissionId}/grade`, {
        grade: gradeValue,
        feedback: editedData.feedback
      });

      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { 
              ...sub, 
              grade: gradeValue, 
              feedback: editedData.feedback,
              is_graded: true 
            }
          : sub
      ));

      // Recalculate statistics
      calculateGradeStatistics(submissions.map(sub => 
        sub.id === submissionId 
          ? { ...sub, grade: gradeValue, feedback: editedData.feedback, is_graded: true }
          : sub
      ));

      // Remove from editing state
      setEditingGrades(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });

      setSuccess('Grade saved successfully!');
      
      // Show success SweetAlert
      Swal.fire({
        title: '✅ Grade Saved!',
        text: 'Grade has been saved successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981'
      });
      
      setTimeout(() => setSuccess(null), 3000);

    } catch (error: any) {
      console.error('Error saving grade:', error);
      setError('Failed to save grade. Please try again.');
      
      // Show error SweetAlert
      Swal.fire({
        title: '❌ Save Failed',
        text: 'Failed to save grade. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setIsSaving(false);
      Swal.close();
    }
  };

  const handleStartEditing = (submission: Submission) => {
    setEditingGrades(prev => ({
      ...prev,
      [submission.id]: {
        grade: submission.grade || 0,
        feedback: submission.feedback || ''
      }
    }));
    
    // Focus on grade input after a brief delay
    setTimeout(() => {
      gradeInputRefs.current[submission.id]?.focus();
    }, 100);
  };

  const handleCancelEditing = (submissionId: number) => {
    setEditingGrades(prev => {
      const newState = { ...prev };
      delete newState[submissionId];
      return newState;
    });
  };

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowSubmissionModal(true);
  };

  const handleViewViolations = (studentId: number, studentName: string) => {
    const studentViolations = violations.filter(v => v.student_id === studentId);
    setSelectedStudentViolations(studentViolations);
    setSelectedStudentName(studentName);
    setShowViolationModal(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200';
    if (grade >= 80) return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200';
    if (grade >= 70) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200';
    return 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200';
  };

  const getViolationColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200';
      case 'medium': return 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200';
    }
  };

  const calculateStatistics = () => {
    const totalStudents = allStudents.length || 0;
    const gradedSubmissions = submissions.filter(s => s.is_graded);
    const averageGrade = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / gradedSubmissions.length 
      : 0;
    
    const submissionRate = totalStudents > 0 ? (submissions.length / totalStudents) * 100 : 0;
    const studentsWithViolations = new Set(violations.map(v => v.student_id)).size;
    const violationRate = totalStudents > 0 ? (studentsWithViolations / totalStudents) * 100 : 0;

    return {
      totalStudents,
      totalSubmissions: submissions.length,
      gradedSubmissions: gradedSubmissions.length,
      pendingSubmissions: submissions.length - gradedSubmissions.length,
      averageGrade: Math.round(averageGrade * 10) / 10,
      submissionRate: Math.round(submissionRate),
      violationRate: Math.round(violationRate),
      studentsWithViolations
    };
  };

  const stats = calculateStatistics();

  // Filter and sort submissions
  const filteredAndSortedSubmissions = submissions
    .filter(submission => {
      // Filter by search term
      if (searchTerm && !submission.student_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !submission.student_email.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by status
      if (filterStatus === 'graded' && !submission.is_graded) return false;
      if (filterStatus === 'pending' && submission.is_graded) return false;
      
      return true;
    })
    .sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'name':
          compareA = a.student_name.toLowerCase();
          compareB = b.student_name.toLowerCase();
          break;
        case 'grade':
          compareA = a.grade || 0;
          compareB = b.grade || 0;
          break;
        case 'time':
          compareA = a.time_spent_minutes;
          compareB = b.time_spent_minutes;
          break;
        case 'submitted':
        default:
          compareA = new Date(a.submitted_at).getTime();
          compareB = new Date(b.submitted_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' 
        ? (compareA < compareB ? -1 : compareA > compareB ? 1 : 0)
        : (compareA > compareB ? -1 : compareA < compareB ? 1 : 0);
    });

  const downloadFile = async (submission: Submission) => {
    if (!submission?.file_path || !submission.id) return;
    
    try {
      // Show loading SweetAlert
      Swal.fire({
        title: 'Preparing Download...',
        text: 'Please wait while we prepare your file.',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        timer: 2000,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await apiClient.get(`/submissions/${submission.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', submission.file_name || 'submission_file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Show success SweetAlert
      Swal.fire({
        title: '✅ Download Started',
        text: 'Your file download has started.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      
      try {
        const fileUrl = `${API_BASE_URL}${submission.file_path}`;
        window.open(fileUrl, '_blank');
      } catch (fallbackError) {
        setError('Failed to download file. Please try again.');
        
        // Show error SweetAlert
        Swal.fire({
          title: '❌ Download Failed',
          text: 'Failed to download file. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
      }
    }
  };

  const exportGrades = () => {
    try {
      // Show confirmation SweetAlert
      Swal.fire({
        title: 'Export Grades?',
        text: 'This will export all grades to a CSV file.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, export!',
        cancelButtonText: 'Cancel',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          // Show loading SweetAlert
          Swal.fire({
            title: 'Exporting...',
            text: 'Please wait while we prepare your export.',
            icon: 'info',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const csvData = [
            ['Student Name', 'Email', 'Grade', 'Feedback', 'Time Spent (min)', 'Submitted At', 'Violations'],
            ...submissions.map(sub => [
              sub.student_name,
              sub.student_email,
              sub.grade || 'Not Graded',
              sub.feedback || '',
              sub.time_spent_minutes,
              formatDate(sub.submitted_at),
              sub.violations?.length || 0
            ])
          ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

          const blob = new Blob([csvData], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `grades_${assignment?.name}_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          // Show success SweetAlert
          Swal.fire({
            title: '✅ Export Successful!',
            text: 'Grades have been exported successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true
          });
        }
      });
    } catch (error) {
      console.error('Error exporting grades:', error);
      
      // Show error SweetAlert
      Swal.fire({
        title: '❌ Export Failed',
        text: 'Failed to export grades. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-20 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Loading Submissions...</h2>
            <p className="text-gray-600 max-w-md mx-auto">Please wait while we load assignment details and student submissions.</p>
            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
            </div>
            <p className="text-sm text-gray-500">Fetching data from server...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-100">
          <div className="text-center">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-red-100 rounded-full blur-md"></div>
              <div className="relative w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Assignment Loading Failed</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/teacher/assignments')}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                title="Go back to assignments"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Assignments
              </button>
              <button
                onClick={loadAssignmentData}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
                title="Try loading assignment again"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
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
              <h1 className="text-lg font-bold text-gray-900">Submissions</h1>
              <p className="text-xs text-gray-600">Grade student work</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm cursor-pointer"
              title="Logout"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
              title="Toggle menu"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <DynamicHeader 
            title={`Submissions - ${assignment?.name}`}
            subtitle={``}
            showBackButton={true}
            backTo="/teacher/assignments"
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800 cursor-pointer"
                    title="Dismiss error"
                    aria-label="Dismiss error"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-green-800">Success</h3>
                    <p className="text-sm text-green-700 mt-1">{success}</p>
                  </div>
                  <button
                    onClick={() => setSuccess(null)}
                    className="text-green-600 hover:text-green-800 cursor-pointer"
                    title="Dismiss success message"
                    aria-label="Dismiss success message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Assignment Info Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg mb-6 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">{assignment?.name}</h2>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-300">
                        Teacher View
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{assignment?.description || 'No description provided'}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Code: {assignment?.class_name || classInfo?.name || 'N/A'} 
                        {assignment?.class_code ? ` (${assignment.class_code})` : classInfo?.code ? ` (${classInfo.code})` : ''}
                      </div>
                      <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Teacher: {assignment?.teacher_name || classInfo?.teacher_name || user?.username || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 a9 9 0 0118 0z" />
                        </svg>
                        Created: {assignment?.created_at ? formatDate(assignment.created_at) : 'N/A'}
                      </div>
                      {assignment?.due_date && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 text-yellow-700 shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Due: {formatDate(assignment.due_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
                      title="Toggle analytics view"
                      aria-label="Toggle analytics view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                    </button>
                    <button
                      onClick={exportGrades}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
                      title="Export grades to CSV"
                      aria-label="Export grades to CSV"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Grades
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Statistics Grid */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4 shadow-sm">
                    <div className="text-3xl font-bold text-blue-700">{stats.totalStudents}</div>
                    <div className="text-sm text-blue-600 font-medium">Total Students</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-4 shadow-sm">
                    <div className="text-3xl font-bold text-green-700">{stats.totalSubmissions}</div>
                    <div className="text-sm text-green-600 font-medium">Submissions</div>
                    <div className="text-xs text-green-500 mt-1">{stats.submissionRate}% rate</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4 shadow-sm">
                    <div className="text-3xl font-bold text-emerald-700">{stats.gradedSubmissions}</div>
                    <div className="text-sm text-emerald-600 font-medium">Graded</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-4 shadow-sm">
                    <div className="text-3xl font-bold text-yellow-700">{stats.pendingSubmissions}</div>
                    <div className="text-sm text-yellow-600 font-medium">Pending</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4 shadow-sm">
                    <div className="text-3xl font-bold text-purple-700">{stats.averageGrade}%</div>
                    <div className="text-sm text-purple-600 font-medium">Average</div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="text-3xl font-bold text-gray-700">{stats.studentsWithViolations}</div>
                    <div className="text-sm text-gray-600 font-medium">Violations</div>
                    <div className="text-xs text-gray-500 mt-1">{violations.length} records</div>
                  </div>
                </div>

                {/* Analytics Section */}
                {showAnalytics && gradeStatistics && (
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Grade Analytics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Highest Grade</span>
                          <span className="text-2xl font-bold text-green-600">{gradeStatistics.highest}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Lowest Grade</span>
                          <span className="text-2xl font-bold text-red-600">{gradeStatistics.lowest}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Average Grade</span>
                          <span className="text-2xl font-bold text-purple-600">{gradeStatistics.average.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-600 mb-2">Grade Distribution</div>
                        <div className="space-y-2">
                          {Object.entries(gradeStatistics.distribution).map(([range, count]) => (
                            <div key={range} className="flex items-center">
                              <span className="text-xs text-gray-600 w-20">{range}</span>
                              <div className="flex-1 ml-2">
                                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${range.includes('A') ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                                      range.includes('B') ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 
                                      range.includes('C') ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                                      range.includes('D') ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 
                                      'bg-gradient-to-r from-red-400 to-red-500'}`}
                                    style={{ width: `${(count / stats.gradedSubmissions) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-medium text-gray-700 ml-2 w-8 text-right">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls Bar */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search students..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-text"
                          aria-label="Search students"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Status:</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as any)}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-pointer"
                          title="Filter by status"
                          aria-label="Filter by status"
                        >
                          <option value="all">All</option>
                          <option value="graded">Graded</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Sort by:</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-pointer"
                          title="Sort by"
                          aria-label="Sort by"
                        >
                          <option value="name">Name</option>
                          <option value="submitted">Submitted Date</option>
                          <option value="grade">Grade</option>
                          <option value="time">Time Spent</option>
                        </select>
                        <button
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-300 transition-colors cursor-pointer"
                          title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                          aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          <svg className={`w-4 h-4 text-gray-700 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">View:</label>
                        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-300">
                          <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'} cursor-pointer`}
                            title="List view"
                            aria-label="List view"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'} cursor-pointer`}
                            title="Grid view"
                            aria-label="Grid view"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submissions Display */}
                {filteredAndSortedSubmissions.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">No Submissions Found</h4>
                    <p className="text-gray-500 max-w-md mx-auto">
                      {searchTerm ? 'No students match your search.' : 
                       filterStatus !== 'all' ? 'No submissions match the selected filter.' : 
                       'Students haven\'t submitted this assignment yet.'}
                    </p>
                  </div>
                ) : viewMode === 'list' ? (
                  /* List View */
                  <div className="overflow-hidden border border-gray-200 rounded-2xl shadow-sm">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Submitted
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Time Spent
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Grade
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Violations
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredAndSortedSubmissions.map((submission) => {
                          const isEditing = editingGrades[submission.id];
                          const submissionViolations = violations.filter(v => v.student_id === submission.student_id);
                          
                          return (
                            <tr key={submission.id} className="hover:bg-gray-50 transition-colors duration-200">
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-sm mr-4">
                                    <span className="text-sm font-bold text-white">
                                      {submission.student_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">{submission.student_name}</div>
                                    <div className="text-xs text-gray-500">{submission.student_email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">
                                  {formatDate(submission.submitted_at)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {submission.time_spent_minutes} min
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    ref={el => {
                                      if (el) {
                                        gradeInputRefs.current[submission.id] = el;
                                      }
                                    }}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={editingGrades[submission.id].grade}
                                    onChange={(e) => handleGradeChange(submission.id, 'grade', e.target.value)}
                                    className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-text"
                                    placeholder="Grade"
                                    aria-label="Grade"
                                  />
                                ) : submission.is_graded ? (
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getGradeColor(submission.grade!)}`}>
                                    {submission.grade}%
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-300">
                                    Not Graded
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                  submission.is_graded 
                                    ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200' 
                                    : 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200'
                                }`}>
                                  {submission.is_graded ? 'Graded' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {submissionViolations.length > 0 ? (
                                  <button
                                    onClick={() => handleViewViolations(submission.student_id, submission.student_name)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getViolationColor(submissionViolations[0].severity)} cursor-pointer`}
                                    title="View violations"
                                    aria-label="View violations"
                                  >
                                    {submissionViolations.length} ⚠️
                                  </button>
                                ) : (
                                  <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-50 text-green-800 text-xs rounded-full border border-green-200">
                                    Clean
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end space-x-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveGrade(submission.id)}
                                        disabled={isSaving}
                                        className="px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-xs font-bold transition-all duration-200 border border-green-600 shadow-sm disabled:opacity-50 cursor-pointer"
                                        aria-label="Save grade"
                                      >
                                        {isSaving ? 'Saving...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={() => handleCancelEditing(submission.id)}
                                        className="px-3 py-1 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-lg text-xs font-bold transition-all duration-200 border border-gray-300 shadow-sm cursor-pointer"
                                        aria-label="Cancel editing"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleStartEditing(submission)}
                                      className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-xs font-bold transition-all duration-200 border border-blue-600 shadow-sm cursor-pointer"
                                      aria-label={submission.is_graded ? 'Edit grade' : 'Grade'}
                                    >
                                      {submission.is_graded ? 'Edit Grade' : 'Grade'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleViewSubmission(submission)}
                                    className="px-3 py-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-xs font-bold transition-all duration-200 border border-gray-600 shadow-sm cursor-pointer"
                                    aria-label="View submission"
                                  >
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Grid View */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedSubmissions.map((submission) => {
                      const isEditing = editingGrades[submission.id];
                      const submissionViolations = violations.filter(v => v.student_id === submission.student_id);
                      
                      return (
                        <div key={submission.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                                  <span className="text-base font-bold text-white">
                                    {submission.student_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">{submission.student_name}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-[150px]">{submission.student_email}</div>
                                </div>
                              </div>
                              {submissionViolations.length > 0 && (
                                <button
                                  onClick={() => handleViewViolations(submission.student_id, submission.student_name)}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold ${getViolationColor(submissionViolations[0].severity)} cursor-pointer`}
                                  title="View violations"
                                  aria-label="View violations"
                                >
                                  {submissionViolations.length} ⚠️
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-3 mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Submitted:</span>
                                <span className="font-medium text-gray-900">{formatDate(submission.submitted_at)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Time Spent:</span>
                                <span className="font-medium text-gray-900">{submission.time_spent_minutes} min</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  submission.is_graded 
                                    ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200' 
                                    : 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200'
                                }`}>
                                  {submission.is_graded ? 'Graded' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input
                                    ref={el => {
                                      if (el) {
                                        gradeInputRefs.current[submission.id] = el;
                                      }
                                    }}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={editingGrades[submission.id].grade}
                                    onChange={(e) => handleGradeChange(submission.id, 'grade', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-text"
                                    placeholder="Enter grade (0-100)"
                                    aria-label="Grade"
                                  />
                                  <textarea
                                    value={editingGrades[submission.id].feedback}
                                    onChange={(e) => handleGradeChange(submission.id, 'feedback', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm resize-none cursor-text"
                                    placeholder="Add feedback..."
                                    aria-label="Feedback"
                                  />
                                </div>
                              ) : submission.is_graded ? (
                                <div className="space-y-2">
                                  <div className={`px-4 py-2 rounded-xl border font-bold text-center ${getGradeColor(submission.grade!)}`}>
                                    Grade: {submission.grade}%
                                  </div>
                                  {submission.feedback && (
                                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                      <strong>Feedback:</strong> {submission.feedback}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-3 bg-gray-50 rounded-xl border border-gray-200">
                                  <span className="text-gray-500 text-sm">Not graded yet</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveGrade(submission.id)}
                                    disabled={isSaving}
                                    className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-sm font-bold transition-all duration-200 border border-green-600 shadow-sm disabled:opacity-50 cursor-pointer"
                                    aria-label="Save grade"
                                  >
                                    {isSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => handleCancelEditing(submission.id)}
                                    className="px-3 py-2 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl text-sm font-bold transition-all duration-200 border border-gray-300 shadow-sm cursor-pointer"
                                    aria-label="Cancel editing"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleStartEditing(submission)}
                                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-bold transition-all duration-200 border border-blue-600 shadow-sm cursor-pointer"
                                  aria-label={submission.is_graded ? 'Edit grade' : 'Grade'}
                                >
                                  {submission.is_graded ? 'Edit Grade' : 'Grade'}
                                </button>
                              )}
                              <button
                                onClick={() => handleViewSubmission(submission)}
                                className="px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl text-sm font-bold transition-all duration-200 border border-gray-600 shadow-sm cursor-pointer"
                                aria-label="View submission"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Students Without Submissions - ONLY SHOW IF THERE ARE STUDENTS */}
            {allStudents.length > 0 && allStudents.length > submissions.length && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg mb-6 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                  <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Students Without Submissions ({allStudents.length - submissions.length})
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {allStudents
                      .filter(student => !submissions.some(sub => sub.student_id === student.id))
                      .map(student => (
                        <div key={student.id} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                          <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-xs text-gray-500">{student.student_id}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Violations Summary - ONLY SHOW IF THERE ARE VIOLATIONS */}
            {violations.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                  <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Violation Summary ({violations.length} total violations)
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
                      <div className="text-2xl font-bold text-red-700">
                        {violations.filter(v => v.severity === 'high').length}
                      </div>
                      <div className="text-sm text-red-600 font-medium">High Severity</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                      <div className="text-2xl font-bold text-yellow-700">
                        {violations.filter(v => v.severity === 'medium').length}
                      </div>
                      <div className="text-sm text-yellow-600 font-medium">Medium Severity</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-2xl font-bold text-blue-700">
                        {violations.filter(v => v.severity === 'low').length}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">Low Severity</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Note:</strong> High severity violations indicate text was added while the student was away from the page.
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Submission Detail Modal */}
      {showSubmissionModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Submission Details</h3>
                  <p className="text-sm text-gray-600">{selectedSubmission.student_name}</p>
                </div>
                <button
                  onClick={() => setShowSubmissionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  title="Close modal"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-500">Submitted</div>
                    <div className="font-medium">{formatDate(selectedSubmission.submitted_at)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-500">Time Spent</div>
                    <div className="font-medium">{selectedSubmission.time_spent_minutes} minutes</div>
                  </div>
                </div>
                
                {selectedSubmission.content && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Content</h4>
                    <div className="bg-gray-50 p-4 rounded-xl whitespace-pre-wrap border border-gray-200">
                      {selectedSubmission.content}
                    </div>
                  </div>
                )}
                
                {selectedSubmission.link_url && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Link</h4>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <a 
                        href={selectedSubmission.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all cursor-pointer"
                      >
                        {selectedSubmission.link_url}
                      </a>
                    </div>
                  </div>
                )}
                
                {selectedSubmission.file_path && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Attached File</h4>
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">{selectedSubmission.file_name || 'Uploaded file'}</span>
                      </div>
                      <button
                        onClick={() => downloadFile(selectedSubmission)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors cursor-pointer"
                        aria-label="Download file"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedSubmission.feedback && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Your Feedback</h4>
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 whitespace-pre-wrap">
                      {selectedSubmission.feedback}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSubmissionModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Violations Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-red-900">Violation History</h3>
                  <p className="text-sm text-red-700">{selectedStudentName}</p>
                </div>
                <button
                  onClick={() => setShowViolationModal(false)}
                  className="p-2 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                  title="Close modal"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {selectedStudentViolations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Violations</h4>
                  <p className="text-gray-500">This student has a clean record.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedStudentViolations.map((violation, index) => (
                    <div key={violation.id || index} className={`p-4 rounded-xl border ${
                      violation.severity === 'high' 
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
                        : violation.severity === 'medium'
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          violation.severity === 'high'
                            ? 'bg-red-100 text-red-800'
                            : violation.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {violation.violation_type.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(violation.detected_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{violation.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {violation.time_away_seconds > 0 && (
                          <span>⏱️ Time away: {violation.time_away_seconds}s</span>
                        )}
                        {violation.content_added_during_absence && (
                          <span>📝 Text added: {violation.content_added_during_absence} chars</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between">
                <div className="text-sm text-gray-500">
                  {selectedStudentViolations.length} violation{selectedStudentViolations.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => setShowViolationModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentPage;