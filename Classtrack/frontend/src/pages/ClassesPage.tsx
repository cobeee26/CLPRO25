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

  // Force center alignment on mount and resize
  useEffect(() => {
    const handleResize = () => {
      // Simple scroll reset without recursive calls
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const handleLoad = () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('load', handleLoad);
    handleLoad();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

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
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-y-auto relative flex">
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-sm"></div>
              <img 
                src={plmunLogo} 
                alt="PLMun Logo" 
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Manage Classes</h1>
              <p className="text-xs text-slate-400">View and manage all system classes</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="dashboard-main flex-1 flex flex-col min-w-0 lg:ml-0" style={{ minHeight: '100vh' }}>
        {/* Dynamic Header */}
        <div className="hidden lg:block">
          <DynamicHeader 
            title={user?.role === 'admin' ? "Manage Classes" : "My Classes"}
            subtitle={user?.role === 'admin' ? "View and manage all system classes" : "View your assigned classes and student rosters"}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 min-h-0" style={{ minHeight: 'calc(100vh - 80px)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="dashboard-content w-full max-w-7xl mx-auto px-4 lg:px-8">
        {/* Enhanced Search & Filter Card */}
        <div className="w-full bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 lg:mb-8 border border-white/10 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
                <svg className="h-5 w-5 lg:h-6 lg:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Search & Filter
              </h2>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-200/70">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span>Real-time search</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
            <div className="xl:col-span-3">
              <label className="block text-sm font-semibold text-white/90 mb-3">
                Search Classes
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                <input
                  type="text"
                  placeholder={user?.role === 'admin' ? "Search by class name, code, or teacher..." : "Search your assigned classes..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="relative w-full px-4 lg:px-6 py-3 lg:py-4 pl-10 lg:pl-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 backdrop-blur-sm transition-all duration-300"
                />
                <div className="absolute inset-y-0 left-0 pl-3 lg:pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 lg:pr-4 flex items-center"
                  >
                    <svg className="h-5 w-5 text-white/50 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Only show Create New Class button for Admin users */}
            {user?.role === 'admin' && (
              <div className="flex items-end">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 lg:py-4 px-4 lg:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center space-x-2 lg:space-x-3">
                    <svg className="h-5 w-5 lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm lg:text-lg">Create New Class</span>
                  </div>
                </button>
              </div>
            )}
          </div>
          
          {/* Quick Stats - Role-specific Metrics */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Admin Metrics */}
            {user?.role === 'admin' && (
              <>
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20 hover:border-blue-400/30 hover:bg-blue-500/15 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white group-hover:text-blue-200 transition-colors duration-200">{classes.length}</p>
                      <p className="text-sm text-white/70">Total Classes</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-400/30 hover:bg-emerald-500/15 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white group-hover:text-emerald-200 transition-colors duration-200">{classes.filter(c => c.status === 'Active').length}</p>
                      <p className="text-sm text-white/70">Active Classes</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20 hover:border-purple-400/30 hover:bg-purple-500/15 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white group-hover:text-purple-200 transition-colors duration-200">{classes.filter(c => c.assignedTeacher !== 'Unassigned').length}</p>
                      <p className="text-sm text-white/70">Assigned Teachers</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20 hover:border-orange-400/30 hover:bg-orange-500/15 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white group-hover:text-orange-200 transition-colors duration-200">{classes.filter(c => c.assignedTeacher === 'Unassigned').length}</p>
                      <p className="text-sm text-white/70">Unassigned</p>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Teacher Metrics */}
            {user?.role === 'teacher' && (
              <>
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20 hover:border-blue-400/30 hover:bg-blue-500/15 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white group-hover:text-blue-200 transition-colors duration-200">{teacherMetrics.total_classes}</p>
                      <p className="text-sm text-white/70">My Classes</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-400/30 hover:bg-emerald-500/15 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white group-hover:text-emerald-200 transition-colors duration-200">{teacherMetrics.total_students}</p>
                      <p className="text-sm text-white/70">Total Students</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Enhanced Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-4 rounded-xl mb-8 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Failed to load classes</p>
                <p className="text-sm text-red-300/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Classes Table - Full Width Responsive Design */}
        <div className="w-full bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {loading ? (
            <div className="p-8 lg:p-12 text-center">
              <div className="inline-flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-12 h-12 lg:w-16 lg:h-16 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                </div>
                <div className="space-y-2">
                  <p className="text-base lg:text-lg font-semibold text-white">Loading Classes</p>
                  <p className="text-sm text-white/60">Please wait while we fetch your data...</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white/5 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-white">Classes Overview</h3>
                  <div className="flex items-center space-x-2 text-sm text-white/60">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>{filteredClasses.length} classes</span>
                  </div>
                </div>
              </div>
              
              {filteredClasses.length === 0 ? (
                <div className="p-8 lg:p-12 text-center">
                  <div className="inline-flex flex-col items-center space-y-4 lg:space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 lg:w-12 lg:h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-2 lg:space-y-3">
                      <h3 className="text-lg lg:text-xl font-semibold text-white">
                        {searchTerm ? 'No classes found' : 'No classes available'}
                      </h3>
                      <p className="text-white/60 max-w-md text-sm lg:text-base">
                        {searchTerm 
                          ? `No classes match your search for "${searchTerm}". Try adjusting your search terms.`
                          : 'Get started by creating your first class. Click the "Create New Class" button above.'
                        }
                      </p>
                    </div>
                    {!searchTerm && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Create Your First Class</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 shadow-2xl">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-gradient-to-r from-slate-800/50 to-blue-900/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 sm:px-6 lg:px-8 py-4 text-left text-xs font-bold text-white/90 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span>Class Name</span>
                          </div>
                        </th>
                        <th className="px-4 sm:px-6 lg:px-8 py-4 text-center text-xs font-bold text-white/90 uppercase tracking-wider">
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            <span>Class Code</span>
                          </div>
                        </th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 lg:px-8 py-4 text-left text-xs font-bold text-white/90 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Assigned Teacher</span>
                          </div>
                        </th>
                        <th className="px-4 sm:px-6 lg:px-8 py-4 text-center text-xs font-bold text-white/90 uppercase tracking-wider">
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Status</span>
                          </div>
                        </th>
                        <th className="px-4 sm:px-6 lg:px-8 py-4 text-center text-xs font-bold text-white/90 uppercase tracking-wider">
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Actions</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/5 divide-y divide-white/10">
                      {filteredClasses.map((classItem) => (
                        <tr key={classItem.id} className="hover:bg-white/10 transition-all duration-300 group border-b border-white/5">
                          <td className="px-4 sm:px-6 lg:px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-white truncate group-hover:text-blue-200 transition-colors duration-200">{classItem.name}</div>
                                <div className="text-xs text-white/60 hidden sm:block mt-1">Class ID: {classItem.id}</div>
                                <div className="text-xs text-white/60 sm:hidden mt-1">{classItem.assignedTeacher}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30 shadow-sm hover:shadow-blue-500/20 transition-all duration-200">
                              <svg className="w-3 h-3 mr-1.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                              {classItem.code}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-4 sm:px-6 lg:px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-white/90 truncate group-hover:text-emerald-200 transition-colors duration-200">{classItem.assignedTeacher}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm hover:shadow-emerald-500/20 transition-all duration-200">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse shadow-sm"></div>
                              <svg className="w-3 h-3 mr-1.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {classItem.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {/* Roster button - only for teachers */}
                              {user?.role === 'teacher' && (
                                <button
                                  onClick={() => handleViewRoster(classItem)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-300 hover:text-green-200 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 border border-green-500/30"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                  </svg>
                                  <span className="hidden sm:inline font-medium">Roster</span>
                                </button>
                              )}
                              
                              {/* Edit and Delete buttons - only for admin */}
                              {user?.role === 'admin' && (
                                <>
                                  <button
                                    onClick={() => openEditModal(classItem)}
                                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 text-blue-300 hover:text-blue-200 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-500/30"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span className="hidden sm:inline font-medium">Edit</span>
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(classItem)}
                                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 text-red-300 hover:text-red-200 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/20 border border-red-500/30"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span className="hidden sm:inline font-medium">Delete</span>
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

      {/* Create Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-6">Create New Class</h3>
            
            {formError && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{formError}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-900/50 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{successMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                  placeholder="Enter class name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                  placeholder="Enter class code (e.g., MATH101)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assigned Teacher
                </label>
                <select
                  value={formData.teacher_id || ''}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
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
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-6">Edit Class</h3>
            
            {editFormError && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{editFormError}</span>
                </div>
              </div>
            )}

            {editSuccessMessage && (
              <div className="bg-green-900/50 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{editSuccessMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleEditClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                  placeholder="Enter class name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={editFormData.code}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                  placeholder="Enter class code (e.g., MATH101)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assigned Teacher
                </label>
                <select
                  value={editFormData.teacher_id || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, teacher_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
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
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-6">Delete Class</h3>
            
            {deleteError && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{deleteError}</span>
                </div>
              </div>
            )}

            {deleteSuccessMessage && (
              <div className="bg-green-900/50 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{deleteSuccessMessage}</span>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete the class <span className="font-semibold text-white">{deletingClass.name}</span>?
              </p>
              <p className="text-sm text-gray-400">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClass}
                disabled={deleteLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[80vh] border border-gray-700/50 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Student Roster - {selectedClassForRoster.name}
              </h3>
              <button
                onClick={handleCloseRosterModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {rosterError && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
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
                  <span className="ml-3 text-white">Loading roster...</span>
                </div>
              ) : roster.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">No Students Enrolled</h4>
                  <p className="text-gray-400">This class doesn't have any enrolled students yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roster.map((student, index) => (
                    <div key={student.id || index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {student.first_name?.[0] || student.username?.[0] || 'S'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">
                            {student.first_name && student.last_name 
                              ? `${student.first_name} ${student.last_name}`
                              : student.username || 'Unknown Student'
                            }
                          </h4>
                          <p className="text-gray-400 text-sm">
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
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
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