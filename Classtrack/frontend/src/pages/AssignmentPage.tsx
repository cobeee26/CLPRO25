import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import { getTeacherAssignments, getTeacherClasses, authService, getStudentClassesAll } from '../services/authService';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import Swal from 'sweetalert2';

// API configuration
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
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null | undefined;
  teacher_name?: string;
}

interface CreateAssignmentRequest {
  name: string;
  description?: string;
  class_id: number;
}

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

const AssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const classRef = useRef<HTMLSelectElement>(null);

  // SweetAlert Helper Functions with Auto-Dismiss
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
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
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

    if (user.role !== 'teacher' && user.role !== 'student') {
      navigate(`/${user.role}/dashboard`);
      return;
    }

    loadAssignmentData();
  }, [user, navigate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDeleteModal) {
        cancelDeleteAssignment();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDeleteModal]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'assignments_updated') {
        console.log('🔄 Storage change detected, reloading assignments...');
        showInfoAlert('New Assignments', 'New assignments are available!', true, 2000);
        loadAssignmentData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    let refreshInterval: NodeJS.Timeout;
    if (user?.role === 'student') {
      refreshInterval = setInterval(() => {
        console.log('🔄 Student: Periodic assignment refresh');
        loadAssignmentData();
      }, 10000); 
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [user]);

  const loadAssignmentData = async () => {
    try {
      console.log('🔄 Loading assignment data...');
      setIsInitialLoading(true);
      setHasInitialLoadError(false);
      setLoadingProgress(10);

      // Step 1: Load classes
      updateLoadingProgress(1, 3);
      const loadedClasses = await loadClasses();

      // Step 2: Load assignments
      updateLoadingProgress(2, 3);
      await loadAssignments(loadedClasses);

      // Complete loading
      updateLoadingProgress(3, 3);
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

  const loadClasses = async (): Promise<Class[]> => {
    try {
      console.log('📚 Loading classes from API...');
      
      let classesData: Class[] = [];
      
      if (user?.role === 'teacher') {
        try {
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
        } catch (apiError: any) {
          console.warn('⚠️ Teacher classes API failed, trying alternative endpoint');
          try {
            const teacherData = await getTeacherClasses();
            console.log('📊 Alternative teacher data:', teacherData);
            
            if (teacherData && Array.isArray(teacherData.classes)) {
              classesData = teacherData.classes.map((cls: any) => ({
                id: cls.id,
                name: cls.name || `Class ${cls.id}`,
                code: cls.code || `CLASS-${cls.id}`,
                teacher_id: cls.teacher_id ?? user?.id,
                teacher_name: user?.username || 'Teacher'
              }));
            } else if (Array.isArray(teacherData)) {
              classesData = teacherData.map((cls: any) => ({
                id: cls.id,
                name: cls.name || `Class ${cls.id}`,
                code: cls.code || `CLASS-${cls.id}`,
                teacher_id: cls.teacher_id ?? user?.id,
                teacher_name: user?.username || 'Teacher'
              }));
            }
          } catch (secondError) {
            console.warn('⚠️ All teacher class endpoints failed, using fallback');
          }
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
            const assignmentsResponse = await apiClient.get('/assignments/student/');
            if (Array.isArray(assignmentsResponse.data)) {
              const uniqueClasses = new Map();
              assignmentsResponse.data.forEach((assignment: any) => {
                if (assignment.class_id && assignment.class_name) {
                  uniqueClasses.set(assignment.class_id, {
                    id: assignment.class_id,
                    name: assignment.class_name,
                    code: assignment.class_code || `CLASS-${assignment.class_id}`,
                    teacher_id: assignment.creator_id,
                    teacher_name: assignment.teacher_name || 'Teacher'
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
        let endpoint = '';
        
        if (user?.role === 'teacher') {
          endpoint = '/assignments/'; 
        } else if (user?.role === 'student') {
          endpoint = '/assignments/student/'; 
        }
        
        console.log('🌐 Calling endpoint:', endpoint);
        const response = await apiClient.get(endpoint);
        console.log('✅ Assignments from database:', response.data);
        
        if (Array.isArray(response.data)) {
          assignmentsData = response.data.map((assignment: any) => {
            const classInfo = loadedClasses.find(c => c.id === assignment.class_id) || 
                            classes.find(c => c.id === assignment.class_id);
            
            console.log(`📋 Assignment ${assignment.id} - class_id: ${assignment.class_id}, classInfo:`, classInfo);
            
            return {
              id: assignment.id,
              name: assignment.name || `Assignment ${assignment.id}`,
              description: assignment.description,
              class_id: assignment.class_id,
              creator_id: assignment.creator_id,
              created_at: assignment.created_at || new Date().toISOString(),
              class_name: classInfo?.name || assignment.class_name || `Class ${assignment.class_id}`,
              class_code: assignment.class_code || classInfo?.code || `CLASS-${assignment.class_id}`,
              teacher_name: assignment.teacher_name || assignment.creator?.username || classInfo?.teacher_name || 'Teacher'
            };
          });
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
      
      const classesToUse = loadedClasses.length > 0 ? loadedClasses : classes;
      if (classesToUse.length > 0) {
        assignmentsData = assignmentsData.map(assignment => {
          const classInfo = classesToUse.find(c => c.id === assignment.class_id);
          console.log(`🎯 Enriching assignment ${assignment.id} with class:`, classInfo);
          
          return {
            ...assignment,
            class_name: classInfo?.name || assignment.class_name || `Class ${assignment.class_id}`,
            class_code: assignment.class_code || classInfo?.code || `CLASS-${assignment.class_id}`,
            teacher_name: classInfo?.teacher_name || assignment.teacher_name || 'Teacher'
          };
        });
      }
      
      localStorage.setItem('synchronized_assignments', JSON.stringify(assignmentsData));
      
      console.log('📝 Final assignments for', user?.role + ':', assignmentsData.length, 'assignments');
      console.log('👨‍🏫 Teachers in assignments:', [...new Set(assignmentsData.map(a => a.teacher_name))]);
      console.log('🏫 Class names in assignments:', [...new Set(assignmentsData.map(a => a.class_name))]);
      console.log('🔤 Class codes in assignments:', [...new Set(assignmentsData.map(a => a.class_code))]);
      setAssignments(assignmentsData);
      
      return assignmentsData;
    } catch (error) {
      console.error('❌ Error loading assignments:', error);
      
      const fallbackData = getFallbackAssignments(classes);
      setAssignments(fallbackData);
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
        teacher_name: classItem.teacher_name || 'Teacher'
      }));
    }
    
    const storedClasses = classes.length > 0 ? classes : 
      JSON.parse(localStorage.getItem('synchronized_classes') || '[]');
    if (storedClasses.length > 0) {
      return storedClasses.map((classItem: Class, index: number) => ({
        id: index + 1,
        name: `Assignment for ${classItem.name}`,
        description: `This is a sample assignment for ${classItem.name}`,
        class_id: classItem.id,
        creator_id: classItem.teacher_id || 1,
        created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        class_name: classItem.name,
        class_code: classItem.code, 
        teacher_name: classItem.teacher_name || 'Teacher'
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
        teacher_name: 'Ms. Davis'
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
        teacher_name: 'Dr. Smith'
      },
      {
        id: 3,
        name: 'Math Problem Set',
        description: 'Solve the following calculus problems',
        class_id: 3,
        creator_id: 3,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        class_name: 'Mathematics',
        class_code: 'MATH-10',
        teacher_name: 'Prof. Johnson'
      }
    ];
  };

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
    navigate(`/student/assignments/${assignment.id}/submit`);
  };

  const deleteAssignmentConfirmed = async (assignment: Assignment) => {
    setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteAssignment = () => {
    setShowDeleteModal(false);
    setAssignmentToDelete(null);
    setIsDeleting(false);
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

  const displayAssignments = user?.role === 'teacher' 
    ? assignments.filter(assignment => assignment.creator_id === user.id)
    : assignments;

  // Loading Screen
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        {/* Animated Logo */}
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

        {/* Loading Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Assignments
          </h2>
          <p className="text-gray-600 max-w-md">
            Fetching your classes and assignments...
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
              className="h-full bg-gradient-to-r from-red-500 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="grid grid-cols-3 gap-3 max-w-md mb-8">
          {[
            { text: "Classes", color: "bg-red-100 text-red-600" },
            { text: "Assignments", color: "bg-green-100 text-green-600" },
            { text: "Synchronizing", color: "bg-purple-100 text-purple-600" },
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
          <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                {user?.role === 'student' ? "View your assigned tasks" : "Create and manage assignments"}
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
            subtitle={user?.role === 'student' ? "View your assigned tasks and deadlines" : "Create, edit, and manage your assignments"}
            showBackButton={user?.role !== 'student'}
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
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-600 font-medium">
                {user?.role === 'student' 
                  ? `${displayAssignments.length} Active Assignments`
                  : `${displayAssignments.length} Created Assignments`
                }
              </span>
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
                      {user?.role === 'student' ? 'My Assignments' : 'Assignment Management'}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {user?.role === 'student' 
                        ? `You have ${displayAssignments.length} assigned tasks from ${new Set(displayAssignments.map(a => a.teacher_name)).size} different teachers.`
                        : `You have created ${displayAssignments.length} assignments. Students will see these assignments immediately.`
                      }
                    </p>
                  </div>
                </div>
                {user?.role === 'teacher' && (
                  <button
                    onClick={handleCreateAssignment}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 w-full lg:w-auto justify-center cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Assignment
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm overflow-hidden cursor-default relative">
              <div className="absolute top-0 right-0 h-full w-4 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10"></div>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">All Assignments</h3>
                    <p className="text-sm text-gray-600">
                      {user?.role === 'student' 
                        ? `Showing ${displayAssignments.length} assignments from ${new Set(displayAssignments.map(a => a.teacher_name)).size} teachers` 
                        : 'Manage your class assignments - Students see these immediately'
                      }
                    </p>
                  </div>
                  {user?.role === 'student' && displayAssignments.length > 0 && (
                    <div className="bg-green-100 border border-green-200 rounded-lg px-3 py-1 cursor-default">
                      <span className="text-green-700 text-sm font-medium">
                        {displayAssignments.length} Active
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto relative">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 cursor-default">
                    <tr>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[250px]">
                        Assignment Name
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[180px]">
                        Class
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">
                        Teacher
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">
                        Created
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
                        Status
                      </th>
                      <th className="px-4 lg:px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayAssignments.length > 0 ? (
                      displayAssignments.map((assignment) => (
                        <tr key={assignment.id} className="hover:bg-gray-50 transition-colors duration-200 cursor-default">
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm mr-4 flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-gray-900 truncate">{assignment.name}</div>
                                <div className="text-xs text-gray-500 truncate">
                                  {assignment.description || 'No description provided'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.class_name || getClassName(assignment.class_id)}
                              </div>
                              <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block mt-1">
                                {assignment.class_code || getClassCode(assignment.class_id)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-600">
                              {assignment.teacher_name || getTeacherName(assignment.class_id)}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-600 whitespace-nowrap">{formatDate(assignment.created_at)}</div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full border border-green-200 whitespace-nowrap cursor-default">
                              Active
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            {user?.role === 'teacher' ? (
                              <div className="flex items-center justify-end space-x-2">
                                {/* Manage Assignment Button */}
                                <button
                                  onClick={() => handleManageAssignment(assignment)}
                                  className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-all duration-200 border border-purple-200 hover:border-purple-300 cursor-pointer flex-shrink-0"
                                  title="Manage Assignment"
                                  aria-label="Manage Assignment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleViewSubmissions(assignment)}
                                  className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300 cursor-pointer flex-shrink-0"
                                  title="View Submissions"
                                  aria-label="View Submissions"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleEditAssignment(assignment)}
                                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 cursor-pointer flex-shrink-0"
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
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleViewAssignment(assignment)}
                                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 cursor-pointer flex-shrink-0"
                                  title="View Assignment"
                                  aria-label="View Assignment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleSubmitWork(assignment)}
                                  className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300 cursor-pointer flex-shrink-0"
                                  title="Submit Work"
                                  aria-label="Submit Work"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center cursor-default">
                          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No assignments yet</h3>
                          <p className="text-gray-500 mb-4">
                            {user?.role === 'student' 
                              ? 'You currently have no assigned tasks. Check back later for new assignments.'
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
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-gray-100 to-transparent opacity-50 pointer-events-none"></div>
              </div>
              {displayAssignments.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
                  <span className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    Scroll horizontally to see more
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {showCreateModal && (
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
                        {classItem.name} ({classItem.code}) - {classItem.teacher_name}
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