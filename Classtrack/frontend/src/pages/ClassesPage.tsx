import React, { useState, useEffect } from 'react';
import { getAllClasses, getTeachers, createClass, updateClass, deleteClass, getTeacherClasses, getClassRoster } from '../services/authService';
import type { ClassCreate, ClassUpdate, User } from '../services/authService';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import './DashboardPage.css';

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id?: number;
  assignedTeacher?: string;
  status?: 'Active' | 'Inactive';
}

const ClassesPage: React.FC = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Teacher-specific metrics
  const [teacherMetrics, setTeacherMetrics] = useState({
    total_classes: 0,
    total_students: 0
  });
  
  // Modal state management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    teacher_id: undefined as number | undefined
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    teacher_id: undefined as number | undefined
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
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);
  
  // Roster modal state (for teachers)
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<Class | null>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Fetch classes data on component mount - role-aware
  useEffect(() => {
    if (!user) return; // Wait for user context to load
    
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching classes for user role:', user.role);
        
        let apiClasses: any[] = [];
        let metrics = { total_classes: 0, total_students: 0 };
        
        if (user.role === 'admin') {
          console.log('🔑 Admin user - fetching all classes');
          apiClasses = await getAllClasses();
          metrics.total_classes = apiClasses.length;
        } else if (user.role === 'teacher') {
          console.log('👨‍🏫 Teacher user - fetching assigned classes with metrics');
          const teacherData = await getTeacherClasses();
          apiClasses = teacherData.classes;
          metrics = teacherData.metrics;
          setTeacherMetrics(metrics);
        } else {
          console.warn('⚠️  Unknown or unauthorized user role, returning empty classes');
          apiClasses = [];
        }
        
        // Transform API data to match our interface
        const transformedClasses: Class[] = apiClasses.map(apiClass => ({
          id: apiClass.id,
          name: apiClass.name,
          code: apiClass.code,
          teacher_id: apiClass.teacher_id,
          assignedTeacher: apiClass.teacher_id ? `Teacher ${apiClass.teacher_id}` : 'Unassigned',
          status: 'Active' as const
        }));
        
        setClasses(transformedClasses);
        console.log('✅ Classes loaded successfully:', transformedClasses.length);
        if (user.role === 'teacher') {
          console.log('📊 Teacher metrics:', metrics);
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch classes');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user]); // Depend on user context

  // Fetch teachers data on component mount - only for admin users
  useEffect(() => {
    if (!user || user.role !== 'admin') return; // Only fetch teachers for admin users
    
    const fetchTeachers = async () => {
      try {
        console.log('🔑 Admin user - fetching teachers for dropdown');
        const apiTeachers = await getTeachers();
        setTeachers(apiTeachers);
        console.log('✅ Teachers loaded successfully:', apiTeachers.length);
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
        // Don't set error state for teachers as it's not critical for the main functionality
      }
    };

    fetchTeachers();
  }, [user]); // Depend on user context

  // Filter classes based on search term
  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (classItem.assignedTeacher && classItem.assignedTeacher.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Dedicated function to refresh the class list with role-specific data
  const refreshClassList = async () => {
    if (!user) {
      console.warn('⚠️  No user context available for refresh');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 Refreshing class list for user role:', user.role);
      
      let apiClasses: any[] = [];
      let metrics = { total_classes: 0, total_students: 0 };
      
      if (user.role === 'admin') {
        console.log('🔑 Admin user - fetching all classes');
        apiClasses = await getAllClasses();
        metrics.total_classes = apiClasses.length;
      } else if (user.role === 'teacher') {
        console.log('👨‍🏫 Teacher user - fetching assigned classes with metrics');
        const teacherData = await getTeacherClasses();
        apiClasses = teacherData.classes;
        metrics = teacherData.metrics;
        setTeacherMetrics(metrics);
      } else {
        console.warn('⚠️  Unknown or unauthorized user role, returning empty classes');
        apiClasses = [];
      }
      
      const transformedClasses: Class[] = apiClasses.map(apiClass => ({
        id: apiClass.id,
        name: apiClass.name,
        code: apiClass.code,
        teacher_id: apiClass.teacher_id,
        assignedTeacher: apiClass.teacher_id ? `Teacher ${apiClass.teacher_id}` : 'Unassigned',
        status: 'Active' as const
      }));
      setClasses(transformedClasses);
      console.log('✅ Classes refreshed successfully:', transformedClasses.length);
      if (user.role === 'teacher') {
        console.log('📊 Teacher metrics refreshed:', metrics);
      }
    } catch (err) {
      console.error('Failed to refresh class list:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh class list');
    } finally {
      setLoading(false);
    }
  };

  // Load student roster for a specific class (Teacher only)
  const loadClassRoster = async (classId: number) => {
    try {
      setRosterLoading(true);
      setRosterError(null);
      console.log(`📋 Loading roster for class ${classId}...`);
      
      const rosterData = await getClassRoster(classId);
      setRoster(rosterData);
      console.log('✅ Roster loaded successfully:', rosterData.length, 'students');
    } catch (err: any) {
      console.error('Failed to load class roster:', err);
      setRosterError(err.response?.data?.detail || 'Failed to load student roster');
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  };

  // Handle opening roster modal
  const handleViewRoster = (classItem: Class) => {
    setSelectedClassForRoster(classItem);
    setIsRosterModalOpen(true);
    loadClassRoster(classItem.id);
  };

  // Handle closing roster modal
  const handleCloseRosterModal = () => {
    setIsRosterModalOpen(false);
    setSelectedClassForRoster(null);
    setRoster([]);
    setRosterError(null);
  };

  // Handle form submission for creating new class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      // Retrieve necessary data from form state
      const classData: ClassCreate = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        teacher_id: formData.teacher_id
      };

      // Validate required fields
      if (!classData.name || !classData.code) {
        setFormError('Please fill in all required fields.');
        return;
      }

      // Call the createClass service function with collected data
      await createClass(classData);
      
      // SUCCESS: Close modal, display success message, and refresh class list
      setSuccessMessage('✅ Class created successfully!');
      
      // Close modal and reset form
      setIsModalOpen(false);
      setFormData({ name: '', code: '', teacher_id: undefined });
      
      // Immediately refresh the class list in the main table
      await refreshClassList();
      
      // Show global success message (toast notification)
      setGlobalSuccessMessage('Class created successfully!');
      
      // Clear success messages after a few seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setGlobalSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      // ERROR: Display any error messages returned by the API inside the modal
      console.error('Failed to create class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create class. Please try again.';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle form submission for editing class
  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setEditFormLoading(true);
    setEditFormError(null);
    setEditSuccessMessage(null);

    try {
      // Retrieve necessary data from form state
      const updateData: ClassUpdate = {
        name: editFormData.name.trim(),
        code: editFormData.code.trim(),
        teacher_id: editFormData.teacher_id
      };

      // Validate required fields
      if (!updateData.name || !updateData.code) {
        setEditFormError('Please fill in all required fields.');
        return;
      }

      // Call the updateClass service function
      await updateClass(editingClass.id, updateData);
      
      // SUCCESS: Close modal, display success message, and refresh class list
      setEditSuccessMessage('✅ Class updated successfully!');
      
      // Close modal and reset state
      setIsEditModalOpen(false);
      setEditingClass(null);
      
      // Immediately refresh the class list in the main table
      await refreshClassList();
      
      // Show global success message (toast notification)
      setGlobalSuccessMessage('Class updated successfully!');
      
      // Clear success messages after a few seconds
      setTimeout(() => {
        setEditSuccessMessage(null);
        setGlobalSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      // ERROR: Display any error messages returned by the API inside the modal
      console.error('Failed to update class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update class. Please try again.';
      setEditFormError(errorMessage);
    } finally {
      setEditFormLoading(false);
    }
  };

  // Handle class deletion
  const handleDeleteClass = async () => {
    if (!deletingClass) return;

    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteSuccessMessage(null);

    try {
      // Call the deleteClass service function
      await deleteClass(deletingClass.id);
      
      // SUCCESS: Close modal, display success message, and refresh class list
      setDeleteSuccessMessage('✅ Class deleted successfully!');
      
      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setDeletingClass(null);
      
      // Immediately refresh the class list in the main table
      await refreshClassList();
      
      // Show global success message (toast notification)
      setGlobalSuccessMessage('Class deleted successfully!');
      
      // Clear success messages after a few seconds
      setTimeout(() => {
        setDeleteSuccessMessage(null);
        setGlobalSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      // ERROR: Display any error messages returned by the API inside the modal
      console.error('Failed to delete class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete class. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (classItem: Class) => {
    setEditingClass(classItem);
    setEditFormData({
      name: classItem.name,
      code: classItem.code,
      teacher_id: classItem.teacher_id
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (classItem: Class) => {
    setDeletingClass(classItem);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="h-screen w-full bg-white overflow-hidden relative flex">
      {/* Global Success Message (Toast Notification) */}
      {globalSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in">
          <svg className="w-5 h-5 text-green-100" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{globalSuccessMessage}</span>
        </div>
      )}

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg"></div>
              <img 
                src={plmunLogo} 
                alt="PLMun Logo" 
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Manage Classes</h1>
              <p className="text-xs text-gray-600">View and manage all system classes</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Toggle menu"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0 h-screen pt-16 lg:pt-0">
        {/* Dynamic Header */}
        <div className="hidden lg:block relative z-30 flex-shrink-0">
          <DynamicHeader 
            title={user?.role === 'admin' ? "Manage Classes" : "My Classes"}
            subtitle={user?.role === 'admin' ? "View and manage all system classes" : "View your assigned classes and student rosters"}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 relative z-20">
          <div className="dashboard-content w-full max-w-7xl mx-auto">
            {/* Enhanced Search & Filter Card - IMPROVED MOBILE VISIBILITY */}
            <div className="w-full bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 lg:mb-8 shadow-lg">
              {/* Header Section - Improved Mobile Visibility */}
              <div className="flex flex-col space-y-4 mb-6 lg:mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                      <svg className="h-5 w-5 lg:h-6 lg:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
                        Search & Filter
                      </h2>
                      <p className="text-xs text-gray-600 mt-1 lg:hidden">
                        Find classes quickly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Real-time</span>
                  </div>
                </div>
                
                {/* Search Input - Improved Mobile Visibility */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Search Classes
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl blur-sm group-hover:blur transition-all duration-300"></div>
                    <input
                      type="text"
                      placeholder={user?.role === 'admin' ? "Search by class name, code, or teacher..." : "Search your assigned classes..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="relative w-full px-4 py-3 lg:py-4 pl-12 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-base lg:text-base font-medium"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        title="Clear search"
                        aria-label="Clear search input"
                      >
                        <svg className="h-5 w-5 text-gray-500 hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Only show Create New Class button for Admin users */}
                {user?.role === 'admin' && (
                  <div className="pt-2">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 lg:py-4 px-4 lg:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg text-base lg:text-base border-2 border-emerald-400/50"
                      title="Create new class"
                      aria-label="Create new class"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center space-x-3">
                        <svg className="h-5 w-5 lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="font-semibold">Create New Class</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Quick Stats - Role-specific Metrics - IMPROVED MOBILE VISIBILITY */}
              <div className="mt-6 grid grid-cols-2 gap-3 lg:gap-4">
                {/* Admin Metrics */}
                {user?.role === 'admin' && (
                  <>
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 lg:p-4 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-100 transition-all duration-300 group">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">{classes.length}</p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Total Classes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 lg:p-4 border-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 transition-all duration-300 group">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200">{classes.filter(c => c.status === 'Active').length}</p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Active Classes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 lg:p-4 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-100 transition-all duration-300 group">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-200">{classes.filter(c => c.assignedTeacher !== 'Unassigned').length}</p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Assigned Teachers</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 lg:p-4 border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-100 transition-all duration-300 group">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-200">{classes.filter(c => c.assignedTeacher === 'Unassigned').length}</p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Unassigned</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Teacher Metrics */}
                {user?.role === 'teacher' && (
                  <>
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 lg:p-4 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-100 transition-all duration-300 group">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">{teacherMetrics.total_classes}</p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">My Classes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 lg:p-4 border-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 transition-all duration-300 group">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200">{teacherMetrics.total_students}</p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Total Students</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Enhanced Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 lg:px-6 py-3 lg:py-4 rounded-xl mb-6 lg:mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm lg:text-base">Failed to load classes</p>
                    <p className="text-xs lg:text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Classes Table - MOBILE OPTIMIZED */}
            <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
              {loading ? (
                <div className="p-6 lg:p-12 text-center">
                  <div className="inline-flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-10 h-10 lg:w-16 lg:h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-10 h-10 lg:w-16 lg:h-16 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm lg:text-lg font-semibold text-gray-700">Loading Classes</p>
                      <p className="text-xs lg:text-sm text-gray-500">Please wait while we fetch your data...</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-4 lg:px-8 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900">Classes Overview</h3>
                      <div className="flex items-center space-x-2 text-xs lg:text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                        <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="font-medium">{filteredClasses.length} classes</span>
                      </div>
                    </div>
                  </div>
                  
                  {filteredClasses.length === 0 ? (
                    <div className="p-6 lg:p-12 text-center">
                      <div className="inline-flex flex-col items-center space-y-4 lg:space-y-6">
                        <div className="relative">
                          <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center border-2 border-gray-200">
                            <svg className="w-8 h-8 lg:w-12 lg:h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        </div>
                        <div className="space-y-2 lg:space-y-3">
                          <h3 className="text-base lg:text-xl font-semibold text-gray-900">
                            {searchTerm ? 'No classes found' : 'No classes available'}
                          </h3>
                          <p className="text-gray-600 max-w-md text-xs lg:text-base">
                            {searchTerm 
                              ? `No classes match your search for "${searchTerm}". Try adjusting your search terms.`
                              : 'Get started by creating your first class. Click the "Create New Class" button above.'
                            }
                          </p>
                        </div>
                        {!searchTerm && user?.role === 'admin' && (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2 lg:py-3 px-4 lg:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 text-sm lg:text-base border-2 border-emerald-400/50"
                            title="Create your first class"
                            aria-label="Create your first class"
                          >
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Create Your First Class</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {/* Mobile Card View */}
                      <div className="block lg:hidden">
                        <div className="space-y-3 p-4">
                          {filteredClasses.map((classItem) => (
                            <div key={classItem.id} className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:bg-gray-50 transition-all duration-300">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{classItem.name}</h4>
                                    <p className="text-xs text-gray-600 truncate">ID: {classItem.id}</p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-700 border border-emerald-200">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>
                                  Active
                                </span>
                              </div>
                              
                              {/* Details */}
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Class Code:</span>
                                  <span className="text-gray-900 font-bold">{classItem.code}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Teacher:</span>
                                  <span className="text-gray-900 font-medium truncate ml-2">{classItem.assignedTeacher}</span>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-2">
                                  {/* Roster button - only for teachers */}
                                  {user?.role === 'teacher' && (
                                    <button
                                      onClick={() => handleViewRoster(classItem)}
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 text-green-700 hover:text-green-800 rounded-lg transition-all duration-300 text-xs border border-green-200 font-medium"
                                      title={`View roster for ${classItem.name}`}
                                      aria-label={`View student roster for ${classItem.name}`}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                      </svg>
                                      <span>Roster</span>
                                    </button>
                                  )}
                                  
                                  {/* Edit and Delete buttons - only for admin */}
                                  {user?.role === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => openEditModal(classItem)}
                                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 hover:text-blue-800 rounded-lg transition-all duration-300 text-xs border border-blue-200 font-medium"
                                        title={`Edit ${classItem.name}`}
                                        aria-label={`Edit class ${classItem.name}`}
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={() => openDeleteModal(classItem)}
                                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-700 hover:text-red-800 rounded-lg transition-all duration-300 text-xs border border-red-200 font-medium"
                                        title={`Delete ${classItem.name}`}
                                        aria-label={`Delete class ${classItem.name}`}
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Desktop Table View */}
                      <table className="hidden lg:table min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                          <tr>
                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span>Class Name</span>
                              </div>
                            </th>
                            <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                <span>Class Code</span>
                              </div>
                            </th>
                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Assigned Teacher</span>
                              </div>
                            </th>
                            <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Status</span>
                              </div>
                            </th>
                            <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Actions</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredClasses.map((classItem) => (
                            <tr key={classItem.id} className="hover:bg-gray-50 transition-all duration-300 group border-b border-gray-100">
                              <td className="px-6 lg:px-8 py-5 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors duration-200">{classItem.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">Class ID: {classItem.id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-100 text-blue-700 border border-blue-200 shadow-sm hover:shadow-blue-500/20 transition-all duration-200">
                                  <svg className="w-3 h-3 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                  </svg>
                                  {classItem.code}
                                </span>
                              </td>
                              <td className="px-6 lg:px-8 py-5 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                                    <svg className="w-4 h-4 lg:w-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 truncate group-hover:text-emerald-700 transition-colors duration-200">{classItem.assignedTeacher}</span>
                                </div>
                              </td>
                              <td className="px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-700 border border-emerald-200 shadow-sm hover:shadow-emerald-500/20 transition-all duration-200">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shadow-sm"></div>
                                  <svg className="w-3 h-3 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {classItem.status}
                                </span>
                              </td>
                              <td className="px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {/* Roster button - only for teachers */}
                                  {user?.role === 'teacher' && (
                                    <button
                                      onClick={() => handleViewRoster(classItem)}
                                      className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 text-green-700 hover:text-green-800 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 border border-green-200"
                                      title={`View roster for ${classItem.name}`}
                                      aria-label={`View student roster for ${classItem.name}`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                      </svg>
                                      <span className="font-medium">Roster</span>
                                    </button>
                                  )}
                                  
                                  {/* Edit and Delete buttons - only for admin */}
                                  {user?.role === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => openEditModal(classItem)}
                                        className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 hover:text-blue-800 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-200"
                                        title={`Edit ${classItem.name}`}
                                        aria-label={`Edit class ${classItem.name}`}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="font-medium">Edit</span>
                                      </button>
                                      <button
                                        onClick={() => openDeleteModal(classItem)}
                                        className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-700 hover:text-red-800 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/20 border border-red-200"
                                        title={`Delete ${classItem.name}`}
                                        aria-label={`Delete class ${classItem.name}`}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span className="font-medium">Delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODALS - REMAIN THE SAME */}
      {/* Create Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md border border-gray-300 max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Create New Class</h3>
            
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{formError}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{successMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name
                </label>
                <input
                  id="className"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter class name"
                  required
                />
              </div>

              <div>
                <label htmlFor="classCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Class Code
                </label>
                <input
                  id="classCode"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter class code (e.g., MATH101)"
                  required
                />
              </div>

              <div>
                <label htmlFor="teacherSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Teacher
                </label>
                <select
                  id="teacherSelect"
                  value={formData.teacher_id || ''}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  aria-label="Select a teacher"
                >
                  <option value="">Select a teacher (optional)</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                  title="Cancel class creation"
                  aria-label="Cancel creating new class"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={formLoading ? "Creating class..." : "Create new class"}
                  aria-label={formLoading ? "Creating class, please wait" : "Create new class"}
                >
                  {formLoading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {isEditModalOpen && editingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md border border-gray-300 max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Class</h3>
            
            {editFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{editFormError}</span>
                </div>
              </div>
            )}

            {editSuccessMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{editSuccessMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleEditClass} className="space-y-4">
              <div>
                <label htmlFor="editClassName" className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name
                </label>
                <input
                  id="editClassName"
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter class name"
                  required
                />
              </div>

              <div>
                <label htmlFor="editClassCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Class Code
                </label>
                <input
                  id="editClassCode"
                  type="text"
                  value={editFormData.code}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter class code (e.g., MATH101)"
                  required
                />
              </div>

              <div>
                <label htmlFor="editTeacherSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Teacher
                </label>
                <select
                  id="editTeacherSelect"
                  value={editFormData.teacher_id || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, teacher_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  aria-label="Select a teacher for editing"
                >
                  <option value="">Select a teacher (optional)</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                  title="Cancel editing"
                  aria-label="Cancel editing class"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={editFormLoading ? "Updating class..." : "Update class"}
                  aria-label={editFormLoading ? "Updating class, please wait" : "Update class"}
                >
                  {editFormLoading ? 'Updating...' : 'Update Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Class Modal */}
      {isDeleteModalOpen && deletingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md border border-gray-300 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Delete Class</h3>
            
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{deleteError}</span>
                </div>
              </div>
            )}

            {deleteSuccessMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{deleteSuccessMessage}</span>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete the class <span className="font-semibold text-gray-900">{deletingClass.name}</span>?
              </p>
              <p className="text-sm text-gray-600">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                title="Cancel deletion"
                aria-label="Cancel class deletion"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClass}
                disabled={deleteLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={deleteLoading ? "Deleting class..." : "Delete class"}
                aria-label={deleteLoading ? "Deleting class, please wait" : "Delete class"}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Roster Modal - Teacher Only */}
      {isRosterModalOpen && selectedClassForRoster && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[80vh] border border-gray-300 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Student Roster - {selectedClassForRoster.name}
              </h3>
              <button
                onClick={handleCloseRosterModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Close roster"
                aria-label="Close student roster modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {rosterError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{rosterError}</span>
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-[60vh]">
              {rosterLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-700">Loading roster...</span>
                </div>
              ) : roster.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Students Enrolled</h4>
                  <p className="text-gray-600">This class doesn't have any enrolled students yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roster.map((student, index) => (
                    <div key={student.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {student.first_name?.[0] || student.username?.[0] || 'S'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-semibold">
                            {student.first_name && student.last_name 
                              ? `${student.first_name} ${student.last_name}`
                              : student.username || 'Unknown Student'
                            }
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {student.email || student.username || 'No email available'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Enrolled
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseRosterModal}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                title="Close roster"
                aria-label="Close student roster"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;