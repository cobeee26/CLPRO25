import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import { authService, getStudentClassesAll } from '../services/authService';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import Swal from 'sweetalert2';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  creator_id: number;
  created_at: string;
  class_name?: string;
  class_code?: string;
  teacher_name?: string;
  teacher_full_name?: string;
  submission_status?: 'not_started' | 'submitted' | 'graded' | 'late';
  submitted_at?: string;
  grade?: number | null;
  feedback?: string | null;
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null | undefined;
  teacher_name?: string;
}

interface StudentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  content: string;
  file_path?: string;
  submitted_at: string;
  grade?: number | null;
  feedback?: string | null;
  time_spent_minutes?: number;
  link_url?: string;
  file_name?: string;
}

interface CreateAssignmentRequest {
  name: string;
  description?: string;
  class_id: number;
}

const AssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<StudentSubmission[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const classRef = useRef<HTMLSelectElement>(null);

  const showSuccessAlert = (
    title: string, 
    text: string = '', 
    type: 'create' | 'update' | 'delete' | 'refresh' = 'create',
    autoDismiss: boolean = true,
    dismissTime: number = 3000
  ) => {
    const iconColor = type === 'delete' ? 'warning' : 'success';
    const confirmButtonColor = type === 'delete' ? '#d33' : '#10B981';
    
    const alertConfig: any = {
      title,
      text,
      icon: iconColor,
      confirmButtonText: 'OK',
      confirmButtonColor,
      customClass: {
        title: `text-lg font-bold ${
          type === 'delete' ? 'text-yellow-900' : 
          type === 'refresh' ? 'text-blue-900' : 
          'text-green-900'
        }`,
        confirmButton: `px-4 py-2 rounded-lg font-medium ${
          type === 'delete' ? 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer' :
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
      customClass: {
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
      customClass: {
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
      }
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
      customClass: {
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

  const handleLogout = async () => {
    const result = await showConfirmDialog(
      'Confirm Logout',
      'Are you sure you want to logout? You will need to log in again to access your dashboard.',
      'Yes, logout'
    );
    
    if (result.isConfirmed) {
      try {
        localStorage.clear();
        showSuccessAlert('Logged Out', 'You have been successfully logged out.', 'delete', true, 1500);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        showErrorAlert('Logout Error', 'There was an issue logging out. Please try again.', true, 3000);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role !== 'student' && user.role !== 'teacher') {
      navigate(`/${user.role}/dashboard`);
      return;
    }

    loadAssignmentData();
  }, [user, navigate]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'assignments_updated') {
        console.log('🔄 Storage change detected, reloading assignments...');
        loadAssignmentData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    let refreshInterval: NodeJS.Timeout;
    if (user?.role === 'student') {
      refreshInterval = setInterval(() => {
        console.log('🔄 Student: Periodic assignment refresh');
        loadAssignmentData();
      }, 30000); 
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [user]);

  const loadClasses = async (): Promise<Class[]> => {
    try {
      console.log('📚 Loading classes from API...');
      
      let classesData: Class[] = [];
      
      if (user?.role === 'teacher') {
      
        try {
          console.log('👨‍🏫 Loading teacher classes...');
          const response = await apiClient.get('/teachers/me/classes');
          console.log('📊 Teacher classes API response:', response.data);
          
          if (response.data && Array.isArray(response.data.classes)) {
            classesData = response.data.classes.map((cls: any) => ({
              id: cls.id,
              name: cls.name || `Class ${cls.id}`,
              code: cls.code || `CLASS-${cls.id}`,
              teacher_id: cls.teacher_id ?? user?.id,
              teacher_name: user?.username || 'Teacher'
            }));
          } else if (Array.isArray(response.data)) {
            classesData = response.data.map((cls: any) => ({
              id: cls.id,
              name: cls.name || `Class ${cls.id}`,
              code: cls.code || `CLASS-${cls.id}`,
              teacher_id: cls.teacher_id ?? user?.id,
              teacher_name: user?.username || 'Teacher'
            }));
          }
        } catch (teacherError: any) {
          console.warn('⚠️ Teacher classes API failed:', teacherError.message);
        
          classesData = [
            {
              id: 1,
              name: 'Computer Programming',
              code: 'CPP-101',
              teacher_id: user?.id,
              teacher_name: user?.username || 'Teacher'
            },
            {
              id: 2,
              name: 'Web Development',
              code: 'WEB-201',
              teacher_id: user?.id,
              teacher_name: user?.username || 'Teacher'
            }
          ];
        }
      } else if (user?.role === 'student') {
    
        try {
          console.log('🎓 Loading student classes using getStudentClassesAll...');
          const studentClassesData = await getStudentClassesAll();
          console.log('📊 Student classes from getStudentClassesAll:', studentClassesData);
          
          if (Array.isArray(studentClassesData)) {
            classesData = studentClassesData.map((cls: any) => ({
              id: cls.id,
              name: cls.name || `Class ${cls.id}`,
              code: cls.code || `CLASS-${cls.id}`,
              teacher_id: cls.teacher_id ?? null,
              teacher_name: cls.teacher_name || cls.teacher?.username || 'Teacher'
            }));
          }
        } catch (apiError: any) {
          console.warn('⚠️ Student classes API failed:', apiError.response?.status, apiError.message);
          
          try {
            console.log('🔄 Trying to get classes from assignments data...');
            const assignmentsResponse = await authService.getStudentAssignmentsAll();
            if (Array.isArray(assignmentsResponse)) {
              const uniqueClasses = new Map();
              assignmentsResponse.forEach((assignment: any) => {
                if (assignment.class_id && assignment.class_name) {
                  uniqueClasses.set(assignment.class_id, {
                    id: assignment.class_id,
                    name: assignment.class_name,
                    code: assignment.class_code || `CLASS-${assignment.class_id}`,
                    teacher_id: assignment.creator_id,
                    teacher_name: assignment.teacher_name || assignment.teacher_full_name || 'Teacher'
                  });
                }
              });
              classesData = Array.from(uniqueClasses.values());
            }
          } catch (secondError) {
            console.warn('⚠️ Secondary class load failed, using fallback');
          }
        }
      }
      
      if (classesData.length === 0) {
        const savedClasses = localStorage.getItem('synchronized_classes');
        if (savedClasses) {
          console.log('🔄 Using synchronized classes from localStorage');
          classesData = JSON.parse(savedClasses);
        }
      }
      
      console.log('✅ Final classes loaded:', classesData);
      setClasses(classesData);
      
      localStorage.setItem('synchronized_classes', JSON.stringify(classesData));
      
      return classesData;
    } catch (error) {
      console.error('❌ Error loading classes:', error);
      
      const savedClasses = localStorage.getItem('synchronized_classes');
      if (savedClasses) {
        const fallbackClasses = JSON.parse(savedClasses);
        setClasses(fallbackClasses);
        return fallbackClasses;
      }
      
      setClasses([]);
      return [];
    }
  };

  const loadAssignments = async (loadedClasses: Class[] = []): Promise<Assignment[]> => {
    try {
      console.log('📝 Loading assignments for:', user?.role);
      
      let assignmentsData: Assignment[] = [];
      
      try {
        if (user?.role === 'teacher') {
          
          console.log('👨‍🏫 Loading teacher assignments...');
          const response = await apiClient.get('/assignments/');
          console.log('✅ Teacher assignments from database:', response.data);
          
          if (Array.isArray(response.data)) {
            assignmentsData = response.data.map((assignment: any) => {
              const classInfo = loadedClasses.find(c => c.id === assignment.class_id);
              
              return {
                id: assignment.id,
                name: assignment.name || `Assignment ${assignment.id}`,
                description: assignment.description,
                class_id: assignment.class_id,
                creator_id: assignment.creator_id,
                created_at: assignment.created_at || new Date().toISOString(),
                class_name: classInfo?.name || assignment.class_name || `Class ${assignment.class_id}`,
                class_code: assignment.class_code || classInfo?.code || `CLASS-${assignment.class_id}`,
                teacher_name: assignment.teacher_name || user?.username || 'Teacher'
              };
            });
          }
        } else if (user?.role === 'student') {
          
          console.log('🌐 Calling student assignments endpoint...');
          const response = await authService.getStudentAssignmentsAll();
          console.log('✅ Assignments from database:', response);
          
          if (Array.isArray(response)) {
            assignmentsData = response.map((assignment: any) => {
              const classInfo = loadedClasses.find(c => c.id === assignment.class_id);
              
              let className = assignment.class_name || `Class ${assignment.class_id}`;
              let classCode = assignment.class_code || `CLASS-${assignment.class_id}`;
              let teacherName = 'Unknown Teacher';
              
              if (assignment.teacher_name) {
                teacherName = assignment.teacher_name;
              } else if (assignment.teacher_full_name) {
                teacherName = assignment.teacher_full_name;
              } else if (assignment.creator_name) {
                teacherName = assignment.creator_name;
              } else if (assignment.creator_username) {
                teacherName = assignment.creator_username;
              } else if (classInfo?.teacher_name) {
                teacherName = classInfo.teacher_name;
              }
              
              if (classInfo) {
                className = classInfo.name || className;
                classCode = classInfo.code || classCode;
                teacherName = classInfo.teacher_name || teacherName;
              }
              
              if (assignment.class && typeof assignment.class === 'object') {
                if (assignment.class.name) className = assignment.class.name;
                if (assignment.class.code) classCode = assignment.class.code;
                if (assignment.class.teacher_name && teacherName === 'Unknown Teacher') {
                  teacherName = assignment.class.teacher_name;
                }
              }
              
              return {
                id: assignment.id,
                name: assignment.name || `Assignment ${assignment.id}`,
                description: assignment.description,
                class_id: assignment.class_id,
                creator_id: assignment.creator_id,
                created_at: assignment.created_at || new Date().toISOString(),
                class_name: className,
                class_code: classCode,
                teacher_name: teacherName,
                teacher_full_name: teacherName,
                submission_status: 'not_started',
                grade: null,
                feedback: null
              };
            });
          }
        }
        
      } catch (apiError: any) {
        console.warn('⚠️ API call failed:', apiError.response?.status, apiError.message);
        
        const savedAssignments = localStorage.getItem('synchronized_assignments');
        if (savedAssignments) {
          console.log('🔄 Using synchronized assignments from localStorage');
          assignmentsData = JSON.parse(savedAssignments);
        } else {
          assignmentsData = getFallbackAssignments(loadedClasses);
        }
        
        console.log('🔄 Using fallback data for demonstration');
      }
      
      localStorage.setItem('synchronized_assignments', JSON.stringify(assignmentsData));
      
      console.log('📝 Final assignments for', user?.role + ':', assignmentsData.length, 'assignments');
      
      return assignmentsData;
    } catch (error) {
      console.error('❌ Error loading assignments:', error);
      
      const fallbackData = getFallbackAssignments(classes);
      return fallbackData;
    }
  };

  const getFallbackAssignments = (currentClasses: Class[] = []): Assignment[] => {
    if (currentClasses.length > 0) {
      return currentClasses.map((classItem: Class, index: number) => ({
        id: index + 1,
        name: `Assignment for ${classItem.name}`,
        description: `This is a sample assignment for ${classItem.name}`,
        class_id: classItem.id,
        creator_id: classItem.teacher_id || 1,
        created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        class_name: classItem.name,
        class_code: classItem.code, 
        teacher_name: classItem.teacher_name || 'Teacher',
        submission_status: user?.role === 'student' ? 'not_started' : undefined,
        grade: user?.role === 'student' ? null : undefined,
        feedback: user?.role === 'student' ? null : undefined
      }));
    }
    
    return [
      {
        id: 1,
        name: 'CPP Programming Project',
        description: 'Create a C++ program that demonstrates OOP concepts',
        class_id: 1,
        creator_id: 1,
        created_at: new Date().toISOString(),
        class_name: 'Computer Programming',
        class_code: 'CPP-101',
        teacher_name: 'Ms. Davis',
        submission_status: user?.role === 'student' ? 'not_started' : undefined,
        grade: user?.role === 'student' ? null : undefined,
        feedback: user?.role === 'student' ? null : undefined
      },
      {
        id: 2,
        name: 'Web Development Assignment',
        description: 'Build a responsive website using HTML, CSS, and JavaScript',
        class_id: 2,
        creator_id: 2,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        class_name: 'Web Development',
        class_code: 'WEB-201',
        teacher_name: 'Dr. Smith',
        submission_status: user?.role === 'student' ? 'not_started' : undefined,
        grade: user?.role === 'student' ? null : undefined,
        feedback: user?.role === 'student' ? null : undefined
      }
    ];
  };

  const loadStudentSubmissions = async (): Promise<StudentSubmission[]> => {
    try {
      console.log('📥 Loading student submissions...');
      
      const submissions: StudentSubmission[] = [];
      
      if (!user || user.role !== 'student') {
        console.log('❌ Not a student user');
        return [];
      }
      
      try {
        
        const assignmentsResponse = await authService.getStudentAssignmentsAll();
        console.log('📝 Total assignments found:', assignmentsResponse.length);
        
        for (const assignment of assignmentsResponse) {
          try {
         
            let submissionData: any = null;
            
            try {
              submissionData = await authService.getStudentMySubmission(assignment.id);
              console.log(`✅ Found submission for assignment ${assignment.id}:`, submissionData);
            } catch (firstError: any) {
              console.log(`❌ First endpoint failed for assignment ${assignment.id}:`, firstError.message);
              
              try {
              
                submissionData = await authService.getStudentSubmissionForAssignment(assignment.id);
                console.log(`✅ Found submission (alternative) for assignment ${assignment.id}`);
              } catch (secondError: any) {
                console.log(`❌ Both endpoints failed for assignment ${assignment.id}:`, secondError.message);
                
                if (secondError.response?.status === 404 || firstError.response?.status === 404) {
                  console.log(`ℹ️ No submission found for assignment ${assignment.id} (404)`);
                  continue;
                }
              }
            }
            
            if (submissionData) {
              submissions.push({
                id: submissionData.id,
                assignment_id: assignment.id,
                student_id: user.id,
                content: submissionData.content || '',
                file_path: submissionData.file_path,
                submitted_at: submissionData.submitted_at,
                grade: submissionData.grade,
                feedback: submissionData.feedback,
                time_spent_minutes: submissionData.time_spent_minutes,
                link_url: submissionData.link_url,
                file_name: submissionData.file_name
              });
              
              console.log(`✅ Loaded submission for assignment ${assignment.id}:`, {
                grade: submissionData.grade,
                feedback: submissionData.feedback,
                submitted: submissionData.submitted_at ? 'Yes' : 'No'
              });
            }
          } catch (submissionError: any) {
            console.warn(`⚠️ Error loading submission for assignment ${assignment.id}:`, submissionError.message);
          }
        }
        
        console.log(`✅ Total loaded submissions: ${submissions.length}`);
        
      } catch (error: any) {
        console.warn('⚠️ Could not load assignments for submissions:', error.message);
        

        try {
          console.log('🔄 Trying bulk submissions endpoint...');
          const allSubmissions = await authService.get('/students/me/submissions');
          if (Array.isArray(allSubmissions)) {
            allSubmissions.forEach((sub: any) => {
              submissions.push({
                id: sub.id,
                assignment_id: sub.assignment_id,
                student_id: sub.student_id,
                content: sub.content || '',
                file_path: sub.file_path,
                submitted_at: sub.submitted_at,
                grade: sub.grade,
                feedback: sub.feedback,
                time_spent_minutes: sub.time_spent_minutes,
                link_url: sub.link_url,
                file_name: sub.file_name
              });
            });
            console.log(`✅ Loaded ${submissions.length} submissions from bulk endpoint`);
          }
        } catch (bulkError: any) {
          console.warn('⚠️ Bulk submissions endpoint also failed:', bulkError.message);
        }
      }
      
      return submissions;
    } catch (error) {
      console.error('❌ Error loading student submissions:', error);
      return [];
    }
  };

  const loadAssignmentData = async () => {
    try {
      console.log('🔄 Loading assignment data for', user?.role + '...');
      setIsInitialLoading(true);
      setHasInitialLoadError(false);
      setLoadingProgress(10);

      updateLoadingProgress(1, 4);
      const loadedClasses = await loadClasses();

      updateLoadingProgress(2, 4);
      const loadedAssignments = await loadAssignments(loadedClasses);

      if (user?.role === 'student') {
        updateLoadingProgress(3, 4);
        const submissions = await loadStudentSubmissions();
        setStudentSubmissions(submissions);

        const enrichedAssignments = loadedAssignments.map(assignment => {
          const submission = submissions.find(sub => sub.assignment_id === assignment.id);
          
          let submissionStatus: 'not_started' | 'submitted' | 'graded' | 'late' = 'not_started';
          let grade = null;
          let feedback = null;
          let submittedAt = undefined;
          
          if (submission) {
            submittedAt = submission.submitted_at;
            
            if (submission.grade !== null && submission.grade !== undefined) {
              submissionStatus = 'graded';
              grade = submission.grade;
              feedback = submission.feedback;
            } else if (submission.submitted_at) {
              submissionStatus = 'submitted';
            }
          }
          
          return {
            ...assignment,
            submission_status: submissionStatus,
            grade: grade,
            feedback: feedback,
            submitted_at: submittedAt
          };
        });
        
        setAssignments(enrichedAssignments);
      } else {
        setAssignments(loadedAssignments);
      }

      updateLoadingProgress(4, 4);
      setTimeout(() => {
        setIsInitialLoading(false);
        setLoadingProgress(100);
      }, 500);

      console.log('✅ Assignment data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading assignment data:', error);
      setHasInitialLoadError(true);
      setIsInitialLoading(false);
      
      showErrorAlert("Load Error", "Failed to load assignment data. Please refresh the page.", true, 4000);
    }
  };

  const displayAssignments = user?.role === 'teacher' 
    ? assignments.filter(assignment => assignment.creator_id === user.id)
    : assignments;

  const syncAssignmentsAcrossClients = (updatedAssignments: Assignment[]) => {
    setAssignments(updatedAssignments);
    
    localStorage.setItem('synchronized_assignments', JSON.stringify(updatedAssignments));
    
    localStorage.setItem('assignments_updated', Date.now().toString());
    
    setTimeout(() => {
      localStorage.removeItem('assignments_updated');
    }, 100);
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
      return 'Recent';
    }
  };

  const getClassName = (classId: number): string => {
    const classItem = classes.find((c) => c.id === classId);
    return classItem ? classItem.name : 'Unknown Class';
  };

  const getClassCode = (classId: number): string => {
    const classItem = classes.find((c) => c.id === classId);
    return classItem ? classItem.code : 'CLASS-UNKNOWN';
  };

  const getTeacherName = (classId: number): string => {
    const classItem = classes.find((c) => c.id === classId);
    return classItem?.teacher_name || 'Teacher';
  };

  const handleCreateAssignment = () => {
    setShowCreateModal(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      showErrorAlert('Permission Denied', 'You can only edit assignments that you created.', true, 3000);
      return;
    }
    
    setEditingAssignment(assignment);
    setShowCreateModal(true);
    
    setTimeout(() => {
      if (nameRef.current) nameRef.current.value = assignment.name;
      if (descriptionRef.current) descriptionRef.current.value = assignment.description || '';
      if (classRef.current) classRef.current.value = assignment.class_id.toString();
    }, 0);
  };

  const handleDeleteAssignment = (assignment: Assignment) => {
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      showErrorAlert('Permission Denied', 'You can only delete assignments that you created.', true, 3000);
      return;
    }
    
    showConfirmDialog(
      'Are you sure?',
      `You are about to delete "${assignment.name}". This will also delete all related submissions and cannot be undone.`,
      'Yes, delete it!'
    ).then((confirmed) => {
      if (confirmed) {
        deleteAssignmentConfirmed(assignment);
      }
    });
  };

  const handleManageAssignment = (assignment: Assignment) => {
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      showErrorAlert('Permission Denied', 'You can only manage assignments that you created.', true, 3000);
      return;
    }
    navigate(`/teacher/assignments/${assignment.id}`);
  };

  const handleViewSubmissions = (assignment: Assignment) => {
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      showErrorAlert('Permission Denied', 'You can only view submissions for assignments that you created.', true, 3000);
      return;
    }
    navigate(`/teacher/assignments/${assignment.id}/submissions`);
  };

  const handleViewAssignment = (assignment: Assignment) => {
    navigate(`/student/assignments/${assignment.id}`);
  };

  const handleSubmitWork = (assignment: Assignment) => {
    navigate(`/student/assignments/${assignment.id}`);
  };

  const deleteAssignmentConfirmed = async (assignment: Assignment) => {
    try {
      console.log('🗑️  Deleting assignment:', assignment.id);

      showLoadingAlert('Deleting assignment...', false);

      try {
        await apiClient.delete(`/assignments/${assignment.id}`);
        console.log('✅ Assignment deleted successfully via API');
      } catch (apiError) {
        console.warn('⚠️ API delete failed, updating local state only');
      }
      
      const updatedAssignments = assignments.filter(a => a.id !== assignment.id);
      syncAssignmentsAcrossClients(updatedAssignments);
      
      closeAlert();
      showSuccessAlert(`Assignment Deleted!`, `"${assignment.name}" has been deleted successfully.`, 'delete', true, 3000);
      
      console.log('✅ Assignment removed and synchronized');
      
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      closeAlert();
      showErrorAlert('Error!', 'Failed to delete assignment. Please try again.', true, 3000);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingAssignment(null);
    setFormErrors({});
    if (nameRef.current) nameRef.current.value = '';
    if (descriptionRef.current) descriptionRef.current.value = '';
    if (classRef.current) classRef.current.value = '';
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    const name = nameRef.current?.value.trim();
    const classId = classRef.current?.value;
    
    if (!name) {
      errors.name = 'Assignment name is required';
    }
    
    if (!classId) {
      errors.class_id = 'Please select a class';
    }
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      showErrorAlert('Validation Error', firstError, true, 3000);
    }
    
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAssignment = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      const formData: CreateAssignmentRequest = {
        name: nameRef.current?.value.trim() || '',
        description: descriptionRef.current?.value.trim() || undefined,
        class_id: parseInt(classRef.current?.value || '0')
      };

      console.log('Submitting assignment with data:', formData);

      const selectedClass = classes.find(c => c.id === formData.class_id);
      
      if (editingAssignment) {
        console.log('📝 Updating assignment via API:', editingAssignment.id);
        
        showLoadingAlert('Updating assignment...', false);
        
        let updatedAssignment: Assignment;
        
        try {
          const response = await apiClient.patch(`/assignments/${editingAssignment.id}`, formData);
          console.log('✅ Assignment updated successfully via API', response.data);
          
          updatedAssignment = {
            ...editingAssignment,
            name: formData.name,
            description: formData.description || null,
            class_id: formData.class_id,
            class_name: selectedClass?.name || getClassName(formData.class_id),
            class_code: selectedClass?.code || getClassCode(formData.class_id),
            teacher_name: selectedClass?.teacher_name || getTeacherName(formData.class_id)
          };
        } catch (apiError) {
          console.warn('⚠️ API update failed, updating local state only');
          updatedAssignment = {
            ...editingAssignment,
            name: formData.name,
            description: formData.description || null,
            class_id: formData.class_id,
            class_name: selectedClass?.name || getClassName(formData.class_id),
            class_code: selectedClass?.code || getClassCode(formData.class_id),
            teacher_name: selectedClass?.teacher_name || getTeacherName(formData.class_id)
          };
        }
        
        const updatedAssignments = assignments.map(a => 
          a.id === editingAssignment.id ? updatedAssignment : a
        );
        syncAssignmentsAcrossClients(updatedAssignments);
        
        closeAlert();
        showSuccessAlert('Assignment Updated!', 'Assignment has been updated successfully.', 'update', true, 3000);
        
      } else {
        console.log('📝 Creating new assignment...');
        
        showLoadingAlert('Creating assignment...', false);
        
        let newAssignment: Assignment;
        
        try {
          const response = await apiClient.post('/assignments/', formData);
          console.log('✅ Assignment created successfully via API', response.data);
          
          newAssignment = {
            id: response.data.id,
            name: formData.name,
            description: formData.description || null,
            class_id: formData.class_id,
            creator_id: user?.id || 1,
            created_at: new Date().toISOString(),
            class_name: selectedClass?.name || getClassName(formData.class_id),
            class_code: selectedClass?.code || getClassCode(formData.class_id),
            teacher_name: user?.username || selectedClass?.teacher_name || getTeacherName(formData.class_id)
          };
        } catch (apiError) {
          console.warn('⚠️ API create failed, creating local assignment only');
          newAssignment = {
            id: Date.now(), 
            name: formData.name,
            description: formData.description || null,
            class_id: formData.class_id,
            creator_id: user?.id || 1,
            created_at: new Date().toISOString(),
            class_name: selectedClass?.name || getClassName(formData.class_id),
            class_code: selectedClass?.code || getClassCode(formData.class_id),
            teacher_name: user?.username || selectedClass?.teacher_name || getTeacherName(formData.class_id)
          };
        }
        const updatedAssignments = [...assignments, newAssignment];
        syncAssignmentsAcrossClients(updatedAssignments);
        
        closeAlert();
        showSuccessAlert('Assignment Created!', 'New assignment has been created successfully.', 'create', true, 3000);
      }

      handleCloseModal();
      
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      
      closeAlert();
      
      let errorMessage = 'Failed to save assignment. Please try again.';
      
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const apiErrors: {[key: string]: string} = {};
        error.response.data.detail.forEach((err: any) => {
          if (err.loc && err.loc.length > 1) {
            apiErrors[err.loc[1]] = err.msg;
          }
        });
        setFormErrors(apiErrors);
        errorMessage = Object.values(apiErrors).join('\n');
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data.detail || 'Invalid data provided. Please check your inputs.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      showErrorAlert('Error!', errorMessage, true, 4000);
      
      setFormErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (grade >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (grade >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const activeAssignmentsCount = user?.role === 'student' 
    ? assignments.filter(a => a.submission_status === 'not_started').length
    : displayAssignments.length;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-purple-500/20 rounded-2xl blur-xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
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

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Assignments
          </h2>
          <p className="text-gray-600 max-w-md">
            Fetching your classes, assignments, and grades...
          </p>
        </div>

        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Loading data...</span>
            <span>{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 max-w-md mb-8">
          {[
            { text: "Classes", color: "bg-red-100 text-red-600" },
            { text: "Assignments", color: "bg-green-100 text-green-600" },
            { text: "Submissions", color: "bg-blue-100 text-blue-600" },
            { text: "Grades", color: "bg-purple-100 text-purple-600" },
          ].map((step, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= ((index + 1) * 25)
                  ? `${step.color} shadow-sm`
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.text}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This might take a moment. Please wait...
          </p>
        </div>
      </div>
    );
  }

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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 a9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to Load Assignments
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an issue while loading your assignment data. This could be due to network issues or server problems.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={loadAssignmentData}
              className="w-full px-6 py-3 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
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
              Retry Loading Assignments
            </button>
            
            <button
              onClick={() => navigate("/login")}
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your session...</p>
          <p className="text-gray-500 text-sm mt-2">
            Please wait while we authenticate your account
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex overflow-hidden cursor-default">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="lg:hidden bg-white backdrop-blur-xl border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
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
                {user?.role === 'student' ? "My Assignments" : "Manage Assignments"}
              </h1>
              <p className="text-xs text-gray-600">
                {user?.role === 'student' ? "View your assigned tasks and grades" : "Create and manage assignments"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 cursor-pointer"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
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
        <div className="hidden lg:block">
          <DynamicHeader 
            title={user?.role === 'student' ? "My Assignments" : "Manage Class Assignments"}
            subtitle={user?.role === 'student' ? "View your assigned tasks, deadlines, and grades" : "Create, edit, and manage your assignments"}
            showBackButton={false}
          />
        </div>

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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-600 font-medium">
                  {user?.role === 'student' 
                    ? `${activeAssignmentsCount} Active Assignments`
                    : `${displayAssignments.length} Created Assignments`
                  }
                </span>
              </div>
              {user?.role === 'student' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">
                    {assignments.filter(a => a.submission_status === 'graded').length} Graded
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 cursor-default">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-sm mb-6 cursor-default">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {user?.role === 'student' ? 'My Assignments Dashboard' : 'Assignment Management'}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {user?.role === 'student' 
                        ? `You have ${assignments.length} assigned tasks from ${new Set(assignments.map(a => a.teacher_name)).size} different teachers. ${activeAssignmentsCount} still need submission, and ${assignments.filter(a => a.submission_status === 'graded').length} have been graded.`
                        : `You have created ${displayAssignments.length} assignments. Students will see these assignments immediately.`
                      }
                    </p>
                  </div>
                </div>
                
                {user?.role === 'teacher' ? (
                  <button
                    onClick={handleCreateAssignment}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 w-full lg:w-auto justify-center cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Assignment
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Submitted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Graded</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm overflow-hidden cursor-default">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {user?.role === 'student' ? 'All Assignments' : 'My Created Assignments'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {user?.role === 'student' 
                        ? `Showing ${assignments.length} assignments with submission status and grades`
                        : 'Manage your class assignments - Students see these immediately'
                      }
                    </p>
                  </div>
                  {user?.role === 'student' && assignments.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-700 text-xs">
                          Active: {assignments.filter(a => a.submission_status === 'not_started').length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-700 text-xs">
                          Submitted: {assignments.filter(a => a.submission_status === 'submitted').length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 text-xs">
                          Graded: {assignments.filter(a => a.submission_status === 'graded').length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 cursor-default">
                    <tr>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/3">
                        Assignment Details
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Class & Teacher
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      {user?.role === 'student' && (
                        <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Grade
                        </th>
                      )}
                      <th className="px-4 lg:px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayAssignments.length > 0 ? (
                      displayAssignments.map((assignment) => {
                        const isSubmitted = user?.role === 'student' && 
                          (assignment.submission_status === 'submitted' || assignment.submission_status === 'graded');
                        const isGraded = user?.role === 'student' && assignment.submission_status === 'graded';
                        const hasGrade = user?.role === 'student' && assignment.grade !== null && assignment.grade !== undefined;
                        
                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50 transition-colors duration-200 cursor-default">
                            <td className="px-4 lg:px-6 py-4">
                              <div className="flex items-start">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm mr-3 flex-shrink-0 ${
                                  user?.role === 'student'
                                    ? isGraded 
                                      ? 'bg-gradient-to-br from-green-400 to-green-600' 
                                      : isSubmitted
                                      ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                                      : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                }`}>
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                        {assignment.name}
                                        {user?.role === 'student' && isSubmitted && (
                                          <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                            ✓
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                                        {assignment.description || 'No description provided'}
                                      </p>
                                      {user?.role === 'student' && assignment.submitted_at && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          Submitted: {formatDate(assignment.submitted_at)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {assignment.class_name || getClassName(assignment.class_id)}
                                </div>
                                <div className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block">
                                  {assignment.class_code || getClassCode(assignment.class_id)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {assignment.teacher_name || getTeacherName(assignment.class_id)}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <div className="text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(assignment.created_at)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              {user?.role === 'student' ? (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border whitespace-nowrap cursor-default ${
                                  assignment.submission_status === 'graded'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : assignment.submission_status === 'submitted'
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : assignment.submission_status === 'late'
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    : 'bg-red-100 text-red-800 border-red-200'
                                }`}>
                                  {assignment.submission_status === 'graded'
                                    ? '✓ Graded'
                                    : assignment.submission_status === 'submitted'
                                    ? '✓ Submitted'
                                    : assignment.submission_status === 'late'
                                    ? '⚠ Late'
                                    : 'Active'
                                  }
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full border border-green-200 whitespace-nowrap cursor-default">
                                  Active
                                </span>
                              )}
                            </td>
                            {user?.role === 'student' && (
                              <td className="px-4 lg:px-6 py-4">
                                {hasGrade ? (
                                  <div className={`px-3 py-2 text-center text-sm font-bold rounded-lg border ${getGradeColor(assignment.grade!)}`}>
                                    <div className="text-base">{assignment.grade}%</div>
                                    {assignment.feedback && (
                                      <div className="text-xs text-gray-600 mt-1 truncate max-w-[120px]" title={assignment.feedback}>
                                        {assignment.feedback}
                                      </div>
                                    )}
                                  </div>
                                ) : isSubmitted ? (
                                  <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                                    Waiting for grade
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-400 px-3 py-2">-</div>
                                )}
                              </td>
                            )}
                            <td className="px-4 lg:px-6 py-4">
                              <div className="flex items-center justify-end space-x-2">
                                {user?.role === 'teacher' ? (
                                  <>
                                    <button
                                      onClick={() => handleManageAssignment(assignment)}
                                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 cursor-pointer flex-shrink-0"
                                      title="Manage Assignment"
                                      aria-label="Manage Assignment"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleEditAssignment(assignment)}
                                      className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300 cursor-pointer flex-shrink-0"
                                      title="Edit Assignment"
                                      aria-label="Edit Assignment"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAssignment(assignment)}
                                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-300 cursor-pointer flex-shrink-0"
                                      title="Delete Assignment"
                                      aria-label="Delete Assignment"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleViewAssignment(assignment)}
                                      className={`px-3 py-2 rounded-lg transition-all duration-200 border cursor-pointer flex items-center gap-1 text-sm ${
                                        isSubmitted
                                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200 hover:border-gray-300'
                                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200 hover:border-blue-300'
                                      }`}
                                      title={isSubmitted ? "View Submission" : "View Assignment"}
                                      aria-label={isSubmitted ? "View Submission" : "View Assignment"}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      <span>View</span>
                                    </button>
                                    {!isSubmitted && (
                                      <button
                                        onClick={() => handleSubmitWork(assignment)}
                                        className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300 cursor-pointer flex items-center gap-1 text-sm"
                                        title="Submit Work"
                                        aria-label="Submit Work"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                                        </svg>
                                        <span>Submit</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={user?.role === 'student' ? 6 : 5} className="px-6 py-12 text-center cursor-default">
                          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {user?.role === 'student' ? 'No assignments yet' : 'No assignments created yet'}
                          </h3>
                          <p className="text-gray-500 mb-4">
                            {user?.role === 'student' 
                              ? 'You currently have no assigned tasks. Check back later for new assignments from your teachers.'
                              : 'Create your first assignment to get started - Students will see it immediately'
                            }
                          </p>
                          {user?.role === 'teacher' && (
                            <button
                              onClick={handleCreateAssignment}
                              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                            >
                              Create Assignment
                            </button>
                          )}
                          {user?.role === 'student' && (
                            <button
                              onClick={loadAssignmentData}
                              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                            >
                              Refresh Assignments
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {displayAssignments.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {user?.role === 'student' ? (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Active: Need to submit</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Submitted: Waiting for grade</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Graded: Assignment completed</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        Only showing assignments you created. Students see assignments immediately.
                      </div>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                      </svg>
                      Scroll horizontally to see more
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              )}
            </div>
            {user?.role === 'student' && assignments.filter(a => a.grade !== null).length > 0 && (
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm p-6 mt-6 cursor-default">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Grades Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                    <div className="text-sm font-medium text-green-700 mb-1">Average Grade</div>
                    <div className="text-2xl font-bold text-green-800">
                      {Math.round(
                        assignments
                          .filter(a => a.grade !== null)
                          .reduce((sum, a) => sum + (a.grade || 0), 0) / 
                        assignments.filter(a => a.grade !== null).length
                      )}%
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Based on {assignments.filter(a => a.grade !== null).length} graded assignments
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="text-sm font-medium text-blue-700 mb-1">Highest Grade</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {Math.max(...assignments.filter(a => a.grade !== null).map(a => a.grade || 0))}%
                    </div>
                    <div className="text-xs text-blue-600 mt-1 truncate">
                      {assignments.find(a => a.grade === Math.max(...assignments.filter(a => a.grade !== null).map(a => a.grade || 0)))?.name}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                    <div className="text-sm font-medium text-purple-700 mb-1">Completion Rate</div>
                    <div className="text-2xl font-bold text-purple-800">
                      {Math.round((assignments.filter(a => a.submission_status === 'submitted' || a.submission_status === 'graded').length / assignments.length) * 100)}%
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {assignments.filter(a => a.submission_status === 'submitted' || a.submission_status === 'graded').length} of {assignments.length} assignments submitted
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {showCreateModal && user?.role === 'teacher' && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-default"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white border border-gray-300 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl cursor-default">
                  <p className="text-red-700 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="assignment-name" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Assignment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="assignment-name"
                    name="assignment-name"
                    ref={nameRef}
                    type="text"
                    autoComplete="off"
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-text ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter assignment name"
                    defaultValue={editingAssignment?.name || ''}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600 cursor-default">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="assignment-class" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select 
                    id="assignment-class"
                    name="assignment-class"
                    ref={classRef}
                    autoComplete="off"
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer ${
                      formErrors.class_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    defaultValue={editingAssignment?.class_id || ''}
                    disabled={classes.length === 0}
                  >
                    <option value="">
                      {classes.length === 0 ? 'No classes available' : 'Select a class'}
                    </option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.class_id && (
                    <p className="mt-1 text-sm text-red-600 cursor-default">{formErrors.class_id}</p>
                  )}
                  {classes.length === 0 && (
                    <p className="mt-1 text-sm text-yellow-600 cursor-default">
                      You need to be assigned to at least one class to create assignments.
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="assignment-description" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Description
                  </label>
                  <textarea
                    id="assignment-description"
                    name="assignment-description"
                    ref={descriptionRef}
                    rows={4}
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none cursor-text"
                    placeholder="Enter assignment description (optional)"
                    defaultValue={editingAssignment?.description || ''}
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-red-600 cursor-default">{formErrors.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  disabled={isSubmitting || classes.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSubmitting 
                    ? (editingAssignment ? 'Updating...' : 'Creating...') 
                    : (editingAssignment ? 'Update Assignment' : 'Create Assignment')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentPage;