import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import { getTeacherAssignments, getTeacherClasses, authService } from '../services/authService';

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
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null;
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
  
  // Form refs for controlled inputs
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const classRef = useRef<HTMLSelectElement>(null);

  // Load assignment data when user is available
  useEffect(() => {
    if (!user) {
      // User context is still loading
      return;
    }

    // Allow both teachers and students to access assignments
    if (user.role !== 'teacher' && user.role !== 'student') {
      // Redirect non-teachers/non-students to appropriate dashboard
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

  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        console.log('User not available yet, waiting...');
        return;
      }
      
      console.log('🔄 Loading assignment data for user:', user.username, 'role:', user.role);
      
      if (user.role === 'teacher') {
        // Fetch teacher's classes and assignments in parallel
        const [classesData, assignmentsData] = await Promise.all([
          loadTeacherClasses(),
          loadTeacherAssignments()
        ]);
      } else if (user.role === 'student') {
        // Fetch student's assignments
        await loadStudentAssignments();
      }
      
      console.log('✅ Assignment data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading assignment data:', error);
      setError('Failed to load assignment data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeacherClasses = async (): Promise<Class[]> => {
    try {
      console.log('📚 Loading teacher classes from API...');
      
      const teacherData = await getTeacherClasses();
      const classesData = teacherData.classes || [];
      
      console.log('✅ Teacher classes loaded:', classesData);
      setClasses(classesData);
      return classesData;
    } catch (error) {
      console.error('❌ Error loading teacher classes:', error);
      // Set empty array as fallback
      setClasses([]);
      return [];
    }
  };

  const loadTeacherAssignments = async (): Promise<Assignment[]> => {
    try {
      console.log('📝 Loading teacher assignments from API...');
      
      const assignmentsData = await getTeacherAssignments();
      
      console.log('✅ Teacher assignments loaded:', assignmentsData);
      setAssignments(assignmentsData);
      return assignmentsData;
    } catch (error) {
      console.error('❌ Error loading teacher assignments:', error);
      // Set empty array as fallback
      setAssignments([]);
      return [];
    }
  };

  const loadStudentAssignments = async (): Promise<Assignment[]> => {
    try {
      console.log('📝 Loading student assignments from API...');
      
      const assignmentsData = await authService.getStudentAssignments();
      
      console.log('✅ Student assignments loaded:', assignmentsData);
      setAssignments(assignmentsData || []);
      
      return assignmentsData || [];
    } catch (error) {
      console.error('❌ Error loading student assignments:', error);
      setAssignments([]);
      return [];
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
    return classItem ? classItem.code : 'N/A';
  };

  const handleCreateAssignment = () => {
    setShowCreateModal(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowCreateModal(true);
  };

  const handleDeleteAssignment = (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setShowDeleteModal(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log('🗑️  Deleting assignment from mock data:', assignmentToDelete.name);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove from local state (mock deletion)
      setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id));
      
      console.log('✅ Assignment deleted successfully from mock data');
      
      // Close modal
      setShowDeleteModal(false);
      setAssignmentToDelete(null);
      
      // Show success message (optional - could add a toast notification)
      console.log('Assignment deletion completed successfully');
      
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
    // Reset form fields
    if (nameRef.current) nameRef.current.value = '';
    if (descriptionRef.current) descriptionRef.current.value = '';
    if (classRef.current) classRef.current.value = '';
  };

  const handleViewSubmissions = (assignment: Assignment) => {
    navigate(`/teacher/assignments/${assignment.id}/submissions`);
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
      console.log('API Base URL:', API_BASE_URL);
      console.log('Auth token present:', !!localStorage.getItem('authToken'));

      if (editingAssignment) {
        // Update existing assignment via API
        console.log('📝 Updating assignment via API:', editingAssignment.id);
        
        await apiClient.patch(`/assignments/${editingAssignment.id}`, {
          name: formData.name,
          description: formData.description || null,
          class_id: formData.class_id
        });
        
        console.log('✅ Assignment updated successfully via API');
      } else {
        // Create new assignment via API
        console.log('📝 Creating new assignment via API...');
        
        await apiClient.post('/assignments/', {
          name: formData.name,
          description: formData.description || null,
          class_id: formData.class_id
        });
        
        console.log('✅ Assignment created successfully via API');
      }

      // Refresh assignments list
      await loadTeacherAssignments();
      
      // Close modal and show success message
      handleCloseModal();
      
      // You could add a toast notification here
      console.log(editingAssignment ? 'Assignment updated successfully!' : 'Assignment created successfully!');
      
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      // Handle validation errors from API
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const apiErrors: {[key: string]: string} = {};
        error.response.data.detail.forEach((err: any) => {
          if (err.loc && err.loc.length > 1) {
            apiErrors[err.loc[1]] = err.msg;
          }
        });
        setFormErrors(apiErrors);
      } else if (error.response?.status === 400) {
        // Handle 400 Bad Request errors
        setFormErrors({ general: error.response.data.detail || 'Invalid data provided. Please check your inputs.' });
      } else if (error.response?.status === 500) {
        // Handle 500 Internal Server Error
        setFormErrors({ general: 'Server error occurred. Please try again later.' });
      } else {
        // Generic error message
        setFormErrors({ general: 'Failed to save assignment. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading assignments...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error and no assignments loaded
  if (error && assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Assignments</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => loadAssignmentData()}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
            title={user?.role === 'student' ? "My Assignments" : "Manage Class Assignments"}
            subtitle={user?.role === 'student' ? "View your assigned tasks and deadlines" : "Create, edit, and manage your assignments"}
            showBackButton={user?.role !== 'student'}
            backTo={user?.role === 'student' ? "/student/dashboard" : "/teacher/dashboard"}
            backLabel={user?.role === 'student' ? "Back to Student Dashboard" : "Back to Teacher Dashboard"}
          />
        </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
        {/* Page Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {user?.role === 'student' ? 'My Assignments' : 'Assignment Management'}
                </h2>
                <p className="text-slate-200 leading-relaxed">
                  {user?.role === 'student' 
                    ? 'View your assigned tasks and track your progress.'
                    : 'Create, edit, and manage assignments for your classes. Track student progress and engagement.'
                  }
                </p>
              </div>
            </div>
            {user?.role === 'teacher' && (
              <button
                onClick={handleCreateAssignment}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Assignment
              </button>
            )}
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-bold text-white">All Assignments</h3>
            <p className="text-sm text-slate-300">Manage your class assignments</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Assignment Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {assignments?.map((assignment) => assignment && (
                  <tr key={assignment.id} className="hover:bg-slate-700/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-sm mr-4">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{assignment.name}</div>
                          <div className="text-xs text-slate-400 truncate max-w-xs">
                            {assignment.description || 'No description provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{getClassName(assignment.class_id)}</div>
                        <div className="text-xs text-slate-400">{getClassCode(assignment.class_id)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">{formatDate(assignment.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user?.role === 'teacher' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewSubmissions(assignment)}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all duration-200 border border-green-500/30 hover:border-green-500/50"
                            title="View Submissions"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditAssignment(assignment)}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50"
                            title="Edit Assignment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assignment)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
                            title="Delete Assignment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <span className="text-xs text-slate-400">View Only</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )) || null}
              </tbody>
            </table>
          </div>

          {(!assignments || assignments.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No assignments yet</h3>
              <p className="text-slate-400 mb-4">Create your first assignment to get started</p>
              <button
                onClick={handleCreateAssignment}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Create Assignment
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                </h3>
                <button
                  onClick={handleCloseModal}
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
              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="assignment-name" className="block text-sm font-medium text-slate-300 mb-2">
                    Assignment Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="assignment-name"
                    name="assignment-name"
                    ref={nameRef}
                    type="text"
                    autoComplete="off"
                    className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      formErrors.name ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Enter assignment name"
                    defaultValue={editingAssignment?.name || ''}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="assignment-class" className="block text-sm font-medium text-slate-300 mb-2">
                    Class <span className="text-red-400">*</span>
                  </label>
                  <select 
                    id="assignment-class"
                    name="assignment-class"
                    ref={classRef}
                    autoComplete="off"
                    className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      formErrors.class_id ? 'border-red-500' : 'border-slate-600'
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
                    <p className="mt-1 text-sm text-red-400">{formErrors.class_id}</p>
                  )}
                  {classes.length === 0 && (
                    <p className="mt-1 text-sm text-yellow-400">
                      You need to be assigned to at least one class to create assignments.
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="assignment-description" className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    id="assignment-description"
                    name="assignment-description"
                    ref={descriptionRef}
                    rows={4}
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Enter assignment description (optional)"
                    defaultValue={editingAssignment?.description || ''}
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-slate-700">
                <button
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  disabled={isSubmitting || classes.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelDeleteAssignment();
            }
          }}
        >
          <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
                  <p className="text-sm text-slate-400">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{assignmentToDelete.name}</div>
                      <div className="text-xs text-slate-400">{getClassName(assignmentToDelete.class_id)}</div>
                    </div>
                  </div>
                  {assignmentToDelete.description && (
                    <p className="text-xs text-slate-300 mt-2">{assignmentToDelete.description}</p>
                  )}
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-red-400 mb-1">Warning</h4>
                    <p className="text-sm text-slate-300">
                      Are you sure you want to delete this assignment? This will also delete <strong>all related submissions</strong> and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-end space-x-3">
              <button
                onClick={cancelDeleteAssignment}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAssignment}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl font-medium transition-all duration-200 border border-red-500/30 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
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
    </div>
  );
};

export default AssignmentPage;
