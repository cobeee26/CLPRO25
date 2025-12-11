import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import { getTeacherAssignments, getTeacherClasses, authService, getStudentClassesAll } from '../services/authService';
import plmunLogo from '../assets/images/PLMUNLOGO.png';

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

// Success banner interface
interface SuccessBanner {
  id: string;
  message: string;
  type: 'create' | 'update' | 'delete' | 'refresh';
  timestamp: number;
}

const AssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // SUCCESS BANNER STATES
  const [successBanners, setSuccessBanners] = useState<SuccessBanner[]>([]);
  
  // Form refs for controlled inputs
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const classRef = useRef<HTMLSelectElement>(null);

  // Auto-dismiss success banners
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSuccessBanners(prev => 
        prev.filter(banner => now - banner.timestamp < 5000) // Auto-dismiss after 5 seconds
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Function to show success banner
  const showSuccessBanner = (message: string, type: 'create' | 'update' | 'delete' | 'refresh') => {
    const newBanner: SuccessBanner = {
      id: Date.now().toString() + Math.random().toString(36),
      message,
      type,
      timestamp: Date.now()
    };
    
    setSuccessBanners(prev => [...prev, newBanner].slice(-3)); // Keep only last 3 banners
  };

  // Function to manually dismiss a success banner
  const dismissSuccessBanner = (id: string) => {
    setSuccessBanners(prev => prev.filter(banner => banner.id !== id));
  };

  // Logout function
  const handleLogout = () => {
    try {
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };

  // Load assignment data when user is available
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

  // Handle keyboard events for modal
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

  // Real-time sync with localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'assignments_updated') {
        console.log('🔄 Storage change detected, reloading assignments...');
        loadAssignmentData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Set up periodic refresh for students to see teacher updates
    let refreshInterval: NodeJS.Timeout;
    if (user?.role === 'student') {
      refreshInterval = setInterval(() => {
        console.log('🔄 Student: Periodic assignment refresh');
        loadAssignmentData();
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [user]);

  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        console.log('User not available yet, waiting...');
        return;
      }
      
      console.log('🔄 Loading assignment data for user:', user.username, 'role:', user.role);
      
      // Load classes first, then assignments to ensure we have class data for enrichment
      const loadedClasses = await loadClasses();
      await loadAssignments(loadedClasses);
      
      console.log('✅ Assignment data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading assignment data:', error);
      setError('Failed to load assignment data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // IMPROVED CLASS LOADING FUNCTION - FIXED FOR BOTH TEACHER AND STUDENT
  const loadClasses = async (): Promise<Class[]> => {
    try {
      console.log('📚 Loading classes from API...');
      
      let classesData: Class[] = [];
      
      if (user?.role === 'teacher') {
        // TEACHER: Use working teacher API endpoint
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
        // STUDENT: Use getStudentClassesAll to get class names and codes
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
          
          // Try to get classes from assignments data
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
      
      // If no classes from API, use synchronized classes from localStorage
      if (classesData.length === 0) {
        const savedClasses = localStorage.getItem('synchronized_classes');
        if (savedClasses) {
          console.log('🔄 Using synchronized classes from localStorage');
          classesData = JSON.parse(savedClasses);
        }
      }
      
      console.log('✅ Final classes loaded:', classesData);
      setClasses(classesData);
      
      // Sync to localStorage for consistency
      localStorage.setItem('synchronized_classes', JSON.stringify(classesData));
      
      return classesData;
    } catch (error) {
      console.error('❌ Error loading classes:', error);
      
      // Fallback to localStorage data
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

  // IMPROVED ASSIGNMENT LOADING WITH PROPER CLASS CODE
  const loadAssignments = async (loadedClasses: Class[] = []): Promise<Assignment[]> => {
    try {
      console.log('📝 Loading assignments for:', user?.role);
      
      let assignmentsData: Assignment[] = [];
      
      try {
        // USE WORKING ENDPOINTS FOR BOTH ROLES
        let endpoint = '';
        
        if (user?.role === 'teacher') {
          endpoint = '/assignments/'; // Teacher sees ALL assignments
        } else if (user?.role === 'student') {
          endpoint = '/assignments/student/'; // Student sees ALL assignments from ALL teachers
        }
        
        console.log('🌐 Calling endpoint:', endpoint);
        const response = await apiClient.get(endpoint);
        console.log('✅ Assignments from database:', response.data);
        
        if (Array.isArray(response.data)) {
          assignmentsData = response.data.map((assignment: any) => {
            // Get class info from the loaded classes or from assignment data
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
              // FIXED: Use actual class code from API or fallback
              class_code: assignment.class_code || classInfo?.code || `CLASS-${assignment.class_id}`,
              teacher_name: assignment.teacher_name || assignment.creator?.username || classInfo?.teacher_name || 'Teacher'
            };
          });
        }
        
      } catch (apiError: any) {
        console.warn('⚠️ API call failed:', apiError.response?.status, apiError.message);
        
        // Use synchronized assignments from localStorage
        const savedAssignments = localStorage.getItem('synchronized_assignments');
        if (savedAssignments) {
          console.log('🔄 Using synchronized assignments from localStorage');
          assignmentsData = JSON.parse(savedAssignments);
        } else {
          // Default fallback data with multiple teachers
          assignmentsData = getFallbackAssignments(loadedClasses);
        }
        
        console.log('🔄 Using fallback data for demonstration');
      }
      
      // ENRICH ASSIGNMENTS WITH CLASS NAMES AND CODES FROM LOADED CLASSES
      const classesToUse = loadedClasses.length > 0 ? loadedClasses : classes;
      if (classesToUse.length > 0) {
        assignmentsData = assignmentsData.map(assignment => {
          const classInfo = classesToUse.find(c => c.id === assignment.class_id);
          console.log(`🎯 Enriching assignment ${assignment.id} with class:`, classInfo);
          
          return {
            ...assignment,
            class_name: classInfo?.name || assignment.class_name || `Class ${assignment.class_id}`,
            // FIXED: Ensure class_code is properly assigned
            class_code: assignment.class_code || classInfo?.code || `CLASS-${assignment.class_id}`,
            teacher_name: classInfo?.teacher_name || assignment.teacher_name || 'Teacher'
          };
        });
      }
      
      // SYNC TO LOCAL STORAGE FOR CONSISTENCY
      localStorage.setItem('synchronized_assignments', JSON.stringify(assignmentsData));
      
      console.log('📝 Final assignments for', user?.role + ':', assignmentsData.length, 'assignments');
      console.log('👨‍🏫 Teachers in assignments:', [...new Set(assignmentsData.map(a => a.teacher_name))]);
      console.log('🏫 Class names in assignments:', [...new Set(assignmentsData.map(a => a.class_name))]);
      console.log('🔤 Class codes in assignments:', [...new Set(assignmentsData.map(a => a.class_code))]);
      setAssignments(assignmentsData);
      
      return assignmentsData;
    } catch (error) {
      console.error('❌ Error loading assignments:', error);
      
      // Use fallback data as last resort
      const fallbackData = getFallbackAssignments(classes);
      setAssignments(fallbackData);
      return fallbackData;
    }
  };

  // FALLBACK ASSIGNMENTS WITH PROPER CLASS CODES
  const getFallbackAssignments = (currentClasses: Class[] = []): Assignment[] => {
    // Use current classes for fallback data
    if (currentClasses.length > 0) {
      return currentClasses.map((classItem: Class, index: number) => ({
        id: index + 1,
        name: `Assignment for ${classItem.name}`,
        description: `This is a sample assignment for ${classItem.name}`,
        class_id: classItem.id,
        creator_id: classItem.teacher_id || 1,
        created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        class_name: classItem.name,
        class_code: classItem.code, // Use actual class code
        teacher_name: classItem.teacher_name || 'Teacher'
      }));
    }
    
    // Get classes from state or localStorage for fallback data
    const storedClasses = classes.length > 0 ? classes : 
      JSON.parse(localStorage.getItem('synchronized_classes') || '[]');
    
    // If we have classes, use them for fallback data
    if (storedClasses.length > 0) {
      return storedClasses.map((classItem: Class, index: number) => ({
        id: index + 1,
        name: `Assignment for ${classItem.name}`,
        description: `This is a sample assignment for ${classItem.name}`,
        class_id: classItem.id,
        creator_id: classItem.teacher_id || 1,
        created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        class_name: classItem.name,
        class_code: classItem.code, // Use actual class code
        teacher_name: classItem.teacher_name || 'Teacher'
      }));
    }
    
    // Default fallback if no classes available
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

  // SYNC FUNCTION TO UPDATE ALL CLIENTS
  const syncAssignmentsAcrossClients = (updatedAssignments: Assignment[]) => {
    // Update local state
    setAssignments(updatedAssignments);
    
    // Save to localStorage for persistence
    localStorage.setItem('synchronized_assignments', JSON.stringify(updatedAssignments));
    
    // Trigger storage event for other tabs/windows
    localStorage.setItem('assignments_updated', Date.now().toString());
    
    // Remove the trigger after a short delay
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

  // HELPER FUNCTIONS TO USE CLASSES STATE
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
    // CHECK IF USER OWNS THE ASSIGNMENT BEFORE EDITING
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      alert('You can only edit assignments that you created.');
      return;
    }
    
    setEditingAssignment(assignment);
    setShowCreateModal(true);
    
    // Set form values when editing
    setTimeout(() => {
      if (nameRef.current) nameRef.current.value = assignment.name;
      if (descriptionRef.current) descriptionRef.current.value = assignment.description || '';
      if (classRef.current) classRef.current.value = assignment.class_id.toString();
    }, 0);
  };

  const handleDeleteAssignment = (assignment: Assignment) => {
    // CHECK IF USER OWNS THE ASSIGNMENT BEFORE DELETING
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      alert('You can only delete assignments that you created.');
      return;
    }
    
    setAssignmentToDelete(assignment);
    setShowDeleteModal(true);
  };

  // Teacher assignment management function
  const handleManageAssignment = (assignment: Assignment) => {
    // CHECK IF USER OWNS THE ASSIGNMENT
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      alert('You can only manage assignments that you created.');
      return;
    }
    navigate(`/teacher/assignments/${assignment.id}`);
  };

  // View submissions function
  const handleViewSubmissions = (assignment: Assignment) => {
    // CHECK IF USER OWNS THE ASSIGNMENT
    if (user?.role === 'teacher' && assignment.creator_id !== user.id) {
      alert('You can only view submissions for assignments that you created.');
      return;
    }
    navigate(`/teacher/assignments/${assignment.id}/submissions`);
  };

  // Function for students to view assignment details
  const handleViewAssignment = (assignment: Assignment) => {
    navigate(`/student/assignments/${assignment.id}`);
  };

  // Function for students to submit work
  const handleSubmitWork = (assignment: Assignment) => {
    navigate(`/student/assignments/${assignment.id}/submit`);
  };

  // DELETE WITH PROPER SYNC
  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log('🗑️  Deleting assignment:', assignmentToDelete.id);
      
      // Try API delete first
      try {
        await apiClient.delete(`/assignments/${assignmentToDelete.id}`);
        console.log('✅ Assignment deleted successfully via API');
      } catch (apiError) {
        console.warn('⚠️ API delete failed, updating local state only');
      }
      
      // USE SYNC FUNCTION INSTEAD OF DIRECT STATE UPDATE
      const updatedAssignments = assignments.filter(a => a.id !== assignmentToDelete.id);
      syncAssignmentsAcrossClients(updatedAssignments);
      
      // Show success banner
      showSuccessBanner(`Assignment "${assignmentToDelete.name}" deleted successfully!`, 'delete');
      
      console.log('✅ Assignment removed and synchronized');
      
      setShowDeleteModal(false);
      setAssignmentToDelete(null);
      
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
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
    return Object.keys(errors).length === 0;
  };

  // SUBMIT WITH CLASS NAME ENRICHMENT
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

      // Get class info for enrichment
      const selectedClass = classes.find(c => c.id === formData.class_id);
      
      if (editingAssignment) {
        // Update existing assignment
        console.log('📝 Updating assignment via API:', editingAssignment.id);
        
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
        
        // USE SYNC FUNCTION FOR CONSISTENT UPDATES
        const updatedAssignments = assignments.map(a => 
          a.id === editingAssignment.id ? updatedAssignment : a
        );
        syncAssignmentsAcrossClients(updatedAssignments);
        
        // Show success banner
        showSuccessBanner('Assignment updated successfully!', 'update');
        
      } else {
        // Create new assignment
        console.log('📝 Creating new assignment...');
        
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
            id: Date.now(), // Generate unique ID
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
        
        // USE SYNC FUNCTION FOR CONSISTENT UPDATES
        const updatedAssignments = [...assignments, newAssignment];
        syncAssignmentsAcrossClients(updatedAssignments);
        
        // Show success banner
        showSuccessBanner('Assignment created successfully!', 'create');
      }

      handleCloseModal();
      
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const apiErrors: {[key: string]: string} = {};
        error.response.data.detail.forEach((err: any) => {
          if (err.loc && err.loc.length > 1) {
            apiErrors[err.loc[1]] = err.msg;
          }
        });
        setFormErrors(apiErrors);
      } else if (error.response?.status === 400) {
        setFormErrors({ general: error.response.data.detail || 'Invalid data provided. Please check your inputs.' });
      } else if (error.response?.status === 500) {
        setFormErrors({ general: 'Server error occurred. Please try again later.' });
      } else {
        setFormErrors({ general: 'Failed to save assignment. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter assignments for teacher (only show their own) and student (show all)
  const displayAssignments = user?.role === 'teacher' 
    ? assignments.filter(assignment => assignment.creator_id === user.id)
    : assignments;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center cursor-default">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex overflow-hidden cursor-default">
      {/* SUCCESS BANNERS - Right Side */}
      <div className="fixed right-4 top-20 z-50 flex flex-col gap-3 w-80 max-w-[calc(100%-2rem)]">
        {successBanners.map((banner) => (
          <div
            key={banner.id}
            className={`relative p-4 rounded-xl border backdrop-blur-sm animate-fade-in-up ${
              banner.type === 'create'
                ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-lg'
                : banner.type === 'update'
                ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-lg'
                : banner.type === 'delete'
                ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 shadow-lg'
                : 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 shadow-lg'
            }`}
          >
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-xl">
              <div className={`h-full ${
                banner.type === 'create' ? 'bg-green-400' :
                banner.type === 'update' ? 'bg-blue-400' :
                banner.type === 'delete' ? 'bg-yellow-400' : 'bg-purple-400'
              }`} 
              style={{ 
                width: `${100 - ((Date.now() - banner.timestamp) / 5000 * 100)}%`,
                transition: 'width 1s linear'
              }}></div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                banner.type === 'create' ? 'bg-green-100' :
                banner.type === 'update' ? 'bg-blue-100' :
                banner.type === 'delete' ? 'bg-yellow-100' : 'bg-purple-100'
              }`}>
                <svg className={`w-5 h-5 ${
                  banner.type === 'create' ? 'text-green-600' :
                  banner.type === 'update' ? 'text-blue-600' :
                  banner.type === 'delete' ? 'text-yellow-600' : 'text-purple-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {banner.type === 'delete' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  )}
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold mb-1 ${
                  banner.type === 'create' ? 'text-green-800' :
                  banner.type === 'update' ? 'text-blue-800' :
                  banner.type === 'delete' ? 'text-yellow-800' : 'text-purple-800'
                }`}>
                  {banner.type === 'create' ? 'Assignment Created' :
                   banner.type === 'update' ? 'Assignment Updated' :
                   banner.type === 'delete' ? 'Assignment Deleted' : 'Success'}
                </h4>
                <p className="text-sm text-gray-700">{banner.message}</p>
                <span className="text-xs text-gray-500 mt-1 block">
                  Just now
                </span>
              </div>
              
              <button
                onClick={() => dismissSuccessBanner(banner.id)}
                className="flex-shrink-0 p-1 hover:bg-white/50 rounded-full transition-colors cursor-pointer"
                title="Dismiss"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile Header */}
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
            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 cursor-pointer"
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

        {/* Dynamic Header - FOR DESKTOP */}
        <div className="hidden lg:block">
          <DynamicHeader 
            title={user?.role === 'student' ? "My Assignments" : "Manage Class Assignments"}
            subtitle={user?.role === 'student' ? "View your assigned tasks and deadlines" : "Create, edit, and manage your assignments"}
            showBackButton={user?.role !== 'student'}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 cursor-default">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 cursor-default">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-red-700">Error Loading Data</h3>
                    <p className="text-sm text-gray-600 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={loadAssignmentData}
                    className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Page Header */}
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

            {/* Assignments Table with Scroll Indicator */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm overflow-hidden cursor-default relative">
              {/* Scroll Indicator */}
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
                
                {/* Horizontal Scroll Indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-gray-100 to-transparent opacity-50 pointer-events-none"></div>
              </div>
              
              {/* Scroll Hint */}
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

      {/* Create/Edit Assignment Modal */}
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
              {/* General Error Message */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && assignmentToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-default"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelDeleteAssignment();
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-xl border border-gray-300 rounded-2xl shadow-xl max-w-md w-full mx-4 transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="bg-gray-50 rounded-xl p-4 mb-4 cursor-default">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{assignmentToDelete.name}</div>
                      <div className="text-xs text-gray-500">
                        {assignmentToDelete.class_name || getClassName(assignmentToDelete.class_id)}
                        <span className="ml-2 font-mono bg-gray-100 px-1 rounded">
                          ({assignmentToDelete.class_code || getClassCode(assignmentToDelete.class_id)})
                        </span>
                      </div>
                    </div>
                  </div>
                  {assignmentToDelete.description && (
                    <p className="text-xs text-gray-600 mt-2">{assignmentToDelete.description}</p>
                  )}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 cursor-default">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-1">Warning</h4>
                    <p className="text-sm text-gray-600">
                      Are you sure you want to delete this assignment? This will also delete <strong>all related submissions</strong> and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={cancelDeleteAssignment}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAssignment}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 rounded-xl font-medium transition-all duration-200 border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>    
      )}
    </div>
  );
};

export default AssignmentPage;