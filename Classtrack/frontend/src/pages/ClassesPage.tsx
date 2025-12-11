import React, { useState, useEffect } from 'react';
import { getAllClasses, getTeachers, createClass, updateClass, deleteClass, getTeacherClasses } from '../services/authService';
import type { ClassCreate, ClassUpdate } from '../services/authService';
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
  teacher_name?: string;
  status?: 'Active' | 'Inactive';
  student_count?: number;
}

interface AppUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
}

const ClassesPage: React.FC = () => {
  const { user: currentUser } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // Success banner state
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  // Helper function to get display name from user object
  const getDisplayName = (user: AppUser | any): string => {
    if (!user) return 'Unknown User';
    if (user?.full_name) return user.full_name;
    if (user?.name) return user.name;
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    if (user?.username) return user.username;
    return 'Unknown User';
  };

  // Function to get teacher name
  const getTeacherName = (teacherId?: number): string => {
    if (currentUser?.role === 'teacher') {
      return getDisplayName(currentUser) || 'Teacher';
    }
    
    if (!teacherId) return 'Unassigned';
    
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? getDisplayName(teacher) : `Teacher ${teacherId}`;
  };

  // Show success banner function
  const showSuccessNotification = (message: string) => {
    setBannerMessage(message);
    setShowSuccessBanner(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccessBanner(false);
      setBannerMessage('');
    }, 3000);
  };

  // Inline CSS styles for animations
  const animationStyles = `
    @keyframes fade-in-down {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes progress-bar {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .animate-fade-in-down {
      animation: fade-in-down 0.3s ease-out;
    }

    .animate-progress-bar {
      animation: progress-bar 3s linear forwards;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `;

  // Load teachers
  useEffect(() => {
    if (!currentUser) return;
    
    const loadTeachers = async () => {
      try {
        if (currentUser.role === 'admin') {
          const apiTeachers = await getTeachers();
          console.log('📋 Loaded teachers:', apiTeachers);
          setTeachers(apiTeachers as AppUser[]);
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      }
    };

    loadTeachers();
  }, [currentUser]);

  // Load classes
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let apiClasses: any[] = [];
        
        if (currentUser.role === 'admin') {
          apiClasses = await getAllClasses();
          console.log('📋 Admin fetched classes:', apiClasses);
        } else if (currentUser.role === 'teacher') {
          const teacherData = await getTeacherClasses();
          apiClasses = teacherData.classes || [];
          console.log('📋 Teacher fetched classes:', apiClasses);
        } else {
          apiClasses = [];
        }
        
        // Transform classes with teacher names and student counts
        const transformedClasses: Class[] = apiClasses.map(apiClass => {
          const teacherName = getTeacherName(apiClass.teacher_id);
          
          return {
            id: apiClass.id,
            name: apiClass.name,
            code: apiClass.code,
            teacher_id: apiClass.teacher_id,
            assignedTeacher: teacherName,
            teacher_name: teacherName,
            status: 'Active' as const,
            student_count: 0  // Default to 0 since we're removing student count functionality
          };
        });
        
        setClasses(transformedClasses);
        console.log('📋 Transformed classes:', transformedClasses);
        
      } catch (err) {
        console.error('Failed to fetch classes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch classes');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [currentUser, teachers]);

  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (classItem.assignedTeacher && classItem.assignedTeacher.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (classItem.teacher_name && classItem.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const refreshClassList = async () => {
    if (!currentUser) {
      console.warn('⚠️  No user context available for refresh');
      return;
    }
    
    try {
      setLoading(true);
      
      let apiClasses: any[] = [];
      
      if (currentUser.role === 'admin') {
        apiClasses = await getAllClasses();
      } else if (currentUser.role === 'teacher') {
        const teacherData = await getTeacherClasses();
        apiClasses = teacherData.classes || [];
      } else {
        apiClasses = [];
      }
      
      const transformedClasses: Class[] = apiClasses.map(apiClass => {
        const teacherName = getTeacherName(apiClass.teacher_id);
        
        return {
          id: apiClass.id,
          name: apiClass.name,
          code: apiClass.code,
          teacher_id: apiClass.teacher_id,
          assignedTeacher: teacherName,
          teacher_name: teacherName,
          status: 'Active' as const,
          student_count: 0
        };
      });
      
      setClasses(transformedClasses);
      
    } catch (err) {
      console.error('Failed to refresh class list:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh class list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const classData: ClassCreate = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        teacher_id: formData.teacher_id
      };

      if (!classData.name || !classData.code) {
        setFormError('Please fill in all required fields.');
        return;
      }

      await createClass(classData);
      
      // Show success message in modal
      setSuccessMessage('✅ Class created successfully!');
      
      // Show success banner notification
      showSuccessNotification(`Class "${classData.name}" has been created successfully!`);
      
      // Reset form - WALANG LAMAN NA
      setFormData({ name: '', code: '', teacher_id: undefined });
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
      }, 1500);
      
      // Refresh class list
      await refreshClassList();
      
    } catch (err) {
      console.error('Failed to create class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create class. Please try again.';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setEditFormLoading(true);
    setEditFormError(null);
    setEditSuccessMessage(null);

    try {
      const updateData: ClassUpdate = {
        name: editFormData.name.trim(),
        code: editFormData.code.trim(),
        teacher_id: editFormData.teacher_id
      };

      if (!updateData.name || !updateData.code) {
        setEditFormError('Please fill in all required fields.');
        return;
      }

      await updateClass(editingClass.id, updateData);
      
      // Show success message in modal
      setEditSuccessMessage('✅ Class updated successfully!');
      
      // Show success banner notification
      showSuccessNotification(`Class "${updateData.name}" has been updated successfully!`);
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingClass(null);
        setEditSuccessMessage(null);
      }, 1500);
      
      // Refresh class list
      await refreshClassList();
      
    } catch (err) {
      console.error('Failed to update class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update class. Please try again.';
      setEditFormError(errorMessage);
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deletingClass) return;

    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteSuccessMessage(null);

    try {
      await deleteClass(deletingClass.id);
      
      // Show success message in modal
      setDeleteSuccessMessage('✅ Class deleted successfully!');
      
      // Show success banner notification
      showSuccessNotification(`Class "${deletingClass.name}" has been deleted successfully!`);
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setDeletingClass(null);
        setDeleteSuccessMessage(null);
      }, 1500);
      
      // Refresh class list
      await refreshClassList();
      
    } catch (err) {
      console.error('Failed to delete class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete class. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (classItem: Class) => {
    setEditingClass(classItem);
    setEditFormData({
      name: classItem.name,
      code: classItem.code,
      teacher_id: classItem.teacher_id
    });
    setEditFormError(null);
    setEditSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (classItem: Class) => {
    setDeletingClass(classItem);
    setDeleteError(null);
    setDeleteSuccessMessage(null);
    setIsDeleteModalOpen(true);
  };

  const openCreateModal = () => {
    setIsModalOpen(true);
    setFormError(null);
    setSuccessMessage(null);
    // Reset form data
    setFormData({
      name: '',
      code: '',
      teacher_id: undefined
    });
  };

  // Calculate assigned classes count
  const getAssignedClassesCount = () => {
    if (currentUser?.role === 'admin') {
      return classes.filter(c => c.teacher_id && getTeacherName(c.teacher_id) !== 'Unassigned').length;
    }
    // For teacher, all their classes are assigned to them
    return classes.length;
  };

  return (
    <div className="h-screen w-full bg-white overflow-hidden relative flex">
      {/* Add animation styles */}
      <style>{animationStyles}</style>

      {/* Success Banner Notification */}
      {showSuccessBanner && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl border border-emerald-400/30 max-w-md">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Success!</p>
                <p className="text-xs opacity-90">{bannerMessage}</p>
              </div>
              <button
                onClick={() => setShowSuccessBanner(false)}
                className="text-white/80 hover:text-white transition-colors"
                title="Close notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/40 animate-progress-bar"></div>
            </div>
          </div>
        </div>
      )}

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
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Toggle menu"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0 h-screen pt-16 lg:pt-0">
        <div className="hidden lg:block relative z-30 flex-shrink-0">
          <DynamicHeader 
            title={currentUser?.role === 'admin' ? "Manage Classes" : "My Classes"}
            subtitle={currentUser?.role === 'admin' ? "View and manage all system classes" : `View your assigned classes - ${getDisplayName(currentUser || {})}`}
          />
        </div>

        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 relative z-20">
          <div className="dashboard-content w-full max-w-7xl mx-auto">
            <div className="w-full bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 lg:mb-8 shadow-lg">
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
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Search Classes
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl blur-sm group-hover:blur transition-all duration-300"></div>
                    <input
                      type="text"
                      placeholder={currentUser?.role === 'admin' ? "Search by class name, code, or teacher..." : "Search your assigned classes..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="relative w-full px-4 py-3 lg:py-4 pl-12 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-base lg:text-base font-medium cursor-text"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
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
                
                {currentUser?.role === 'admin' && (
                  <div className="pt-2">
                    <button
                      onClick={openCreateModal}
                      className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 lg:py-4 px-4 lg:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg text-base lg:text-base border-2 border-emerald-400/50 cursor-pointer"
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
              
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {currentUser?.role === 'admin' && (
                  <>
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 lg:p-4 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-100 transition-all duration-300 group cursor-default">
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
                    
                    <div className="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl p-3 lg:p-4 border-2 border-green-200 hover:border-green-300 hover:bg-green-100 transition-all duration-300 group cursor-default">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-green-500 to-lime-500 rounded-lg shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                            {getAssignedClassesCount()}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Active Classes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 lg:p-4 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-100 transition-all duration-300 group cursor-default">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-200">
                            {getAssignedClassesCount()}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Assigned Teachers</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {currentUser?.role === 'teacher' && (
                  <>
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 lg:p-4 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-100 transition-all duration-300 group cursor-default">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                            {classes.length}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">My Classes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl p-3 lg:p-4 border-2 border-green-200 hover:border-green-300 hover:bg-green-100 transition-all duration-300 group cursor-default">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-green-500 to-lime-500 rounded-lg shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                            {getAssignedClassesCount()}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Active Classes</p>
                        </div>
                      </div>
                    </div>  
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 lg:px-6 py-3 lg:py-4 rounded-xl mb-6 lg:mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 a1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm lg:text-base">Failed to load classes</p>
                    <p className="text-xs lg:text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

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
                      <div className="flex items-center space-x-2 text-xs lg:text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                          {filteredClasses.length} classes
                        </span>
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
                        {!searchTerm && currentUser?.role === 'admin' && (
                          <button
                            onClick={openCreateModal}
                            className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2 lg:py-3 px-4 lg:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 text-sm lg:text-base border-2 border-emerald-400/50 cursor-pointer"
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
                      <div className="block lg:hidden">
                        <div className="space-y-3 p-4">
                          {filteredClasses.map((classItem) => (
                            <div key={classItem.id} className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:bg-gray-50 transition-all duration-300">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{classItem.name}</h4>
                                  </div>
                                </div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-700 border border-emerald-200">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>
                                  Active
                                </span>
                              </div>
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Class Code:</span>
                                  <span className="text-gray-900 font-bold">{classItem.code}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 font-medium">Teacher:</span>
                                  <span className="text-gray-900 font-medium truncate ml-2">
                                    {classItem.teacher_name || classItem.assignedTeacher || 'Unassigned'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-2">
                                  {currentUser?.role === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => openEditModal(classItem)}
                                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 hover:text-blue-800 rounded-lg transition-all duration-300 text-xs border border-blue-200 font-medium cursor-pointer"
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
                                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-br from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-700 hover:text-red-800 rounded-lg transition-all duration-300 text-xs border border-red-200 font-medium cursor-pointer"
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
                                <span>Teacher</span>
                              </div>
                            </th>
                            <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                                </svg>
                                <span>Status</span>
                              </div>
                            </th>
                            {currentUser?.role === 'admin' && (
                              <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                <div className="flex items-center justify-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                  <span>Actions</span>
                                </div>
                              </th>
                            )}
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
                                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 truncate group-hover:text-emerald-700 transition-colors duration-200">
                                    {classItem.teacher_name || classItem.assignedTeacher || 'Unassigned'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-700 border border-emerald-200 shadow-sm hover:shadow-emerald-500/20 transition-all duration-200">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shadow-sm"></div>
                                  <svg className="w-3 h-3 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                                  </svg>
                                  {classItem.status}
                                </span>
                              </td>
                              {currentUser?.role === 'admin' && (
                                <td className="px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => openEditModal(classItem)}
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 hover:text-blue-800 rounded-lg transition-all duration-300 text-xs border border-blue-200 font-medium cursor-pointer"
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
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-br from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-700 hover:text-red-800 rounded-lg transition-all duration-300 text-xs border border-red-200 font-medium cursor-pointer"
                                      title={`Delete ${classItem.name}`}
                                      aria-label={`Delete class ${classItem.name}`}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </td>
                              )}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md border border-gray-300 max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Create New Class</h3>
            
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 a1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{formError}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 animate-pulse">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-text"
                  placeholder="Enter class name"
                  required
                  disabled={formLoading && !!successMessage}
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-text"
                  placeholder="Enter class code (e.g., MATH101)"
                  required
                  disabled={formLoading && !!successMessage}
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
                  aria-label="Select a teacher"
                  disabled={formLoading && !!successMessage}
                >
                  <option value="">Select a teacher (optional)</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {getDisplayName(teacher)} ({teacher.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors cursor-pointer"
                  title="Cancel class creation"
                  aria-label="Cancel creating new class"
                  disabled={formLoading && !!successMessage}
                >
                  {successMessage ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  title={formLoading ? "Creating class..." : "Create new class"}
                  aria-label={formLoading ? "Creating class, please wait" : "Create new class"}
                >
                  {formLoading ? (
                    successMessage ? (
                      <>
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Success!
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline mr-2"></div>
                        Creating...
                      </>
                    )
                  ) : (
                    'Create Class'
                  )}
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
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 a1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{editFormError}</span>
                </div>
              </div>
            )}

            {editSuccessMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 animate-pulse">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-text"
                  placeholder="Enter class name"
                  required
                  disabled={editFormLoading && !!editSuccessMessage}
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-text"
                  placeholder="Enter class code (e.g., MATH101)"
                  required
                  disabled={editFormLoading && !!editSuccessMessage}
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
                  aria-label="Select a teacher for editing"
                  disabled={editFormLoading && !!editSuccessMessage}
                >
                  <option value="">Select a teacher (optional)</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {getDisplayName(teacher)} ({teacher.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors cursor-pointer"
                  title="Cancel editing"
                  aria-label="Cancel editing class"
                  disabled={editFormLoading && !!editSuccessMessage}
                >
                  {editSuccessMessage ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  title={editFormLoading ? "Updating class..." : "Update class"}
                  aria-label={editFormLoading ? "Updating class, please wait" : "Update class"}
                >
                  {editFormLoading ? (
                    editSuccessMessage ? (
                      <>
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Updated!
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline mr-2"></div>
                        Updating...
                      </>
                    )
                  ) : (
                    'Update Class'
                  )}
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
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 a1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{deleteError}</span>
                </div>
              </div>
            )}

            {deleteSuccessMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 animate-pulse">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
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
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors cursor-pointer"
                title="Cancel deletion"
                aria-label="Cancel class deletion"
                disabled={deleteLoading && !!deleteSuccessMessage}
              >
                {deleteSuccessMessage ? 'Close' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteClass}
                disabled={deleteLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                title={deleteLoading ? "Deleting class..." : "Delete class"}
                aria-label={deleteLoading ? "Deleting class, please wait" : "Delete class"}
              >
                {deleteLoading ? (
                  deleteSuccessMessage ? (
                    <>
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Deleted!
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline mr-2"></div>
                      Deleting...
                    </>
                  )
                ) : (
                  'Delete Class'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;