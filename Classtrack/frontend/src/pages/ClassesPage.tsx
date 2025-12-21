import React, { useState, useEffect } from 'react';
import { getAllClasses, getTeachers, createClass, updateClass, deleteClass, getTeacherClasses } from '../services/authService';
import type { ClassCreate, ClassUpdate } from '../services/authService';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import './DashboardPage.css';
import Swal from 'sweetalert2';

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
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  
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
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);

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

  const updateLoadingProgress = (step: number, totalSteps: number = 2) => {
    const progress = Math.floor((step / totalSteps) * 100);
    setLoadingProgress(progress);
  };

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

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchClasses = async () => {
      try {
        setIsInitialLoading(true);
        setHasInitialLoadError(false);
        setLoadingProgress(10);

        updateLoadingProgress(1, 2);
        
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
        
        updateLoadingProgress(2, 2);
        
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
        console.log('📋 Transformed classes:', transformedClasses);
        
        setTimeout(() => {
          setIsInitialLoading(false);
          setLoadingProgress(100);
        }, 500);
        
      } catch (err) {
        console.error('Failed to fetch classes:', err);
        setHasInitialLoadError(true);
        setIsInitialLoading(false);
        showErrorAlert("Load Error", "Failed to load classes data. Please refresh the page.", true, 4000);
      }
    };

    fetchClasses();
  }, [currentUser, teachers]);

  const getDisplayName = (user: AppUser | any): string => {
    if (!user) return 'Unknown User';
    if (user?.full_name) return user.full_name;
    if (user?.name) return user.name;
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    if (user?.username) return user.username;
    return 'Unknown User';
  };

  const getTeacherName = (teacherId?: number): string => {
    if (currentUser?.role === 'teacher') {
      return getDisplayName(currentUser) || 'Teacher';
    }
    
    if (!teacherId) return 'Unassigned';
    
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? getDisplayName(teacher) : `Teacher ${teacherId}`;
  };

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
      setIsInitialLoading(true);
      
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
      showErrorAlert("Refresh Error", "Failed to refresh classes. Please try again.", true, 3000);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const classData: ClassCreate = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        teacher_id: formData.teacher_id
      };

      if (!classData.name || !classData.code) {
        setFormError('Please fill in all required fields.');
        showErrorAlert('Validation Error', 'Please fill in all required fields.', true, 3000);
        return;
      }

      showLoadingAlert('Creating class...', false);
      
      await createClass(classData);
      
      closeAlert();
      showSuccessAlert(`Class Created!`, `"${classData.name}" has been created successfully.`, 'create', true, 3000);
      
      setFormData({ name: '', code: '', teacher_id: undefined });
      
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
      
      await refreshClassList();
      
    } catch (err) {
      console.error('Failed to create class:', err);
      closeAlert();
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to create class. Please try again.';
      setFormError(errorMessage);
      showErrorAlert('Creation Error', errorMessage, true, 4000);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setEditFormLoading(true);
    setEditFormError(null);

    try {
      const updateData: ClassUpdate = {
        name: editFormData.name.trim(),
        code: editFormData.code.trim(),
        teacher_id: editFormData.teacher_id
      };

      if (!updateData.name || !updateData.code) {
        setEditFormError('Please fill in all required fields.');
        showErrorAlert('Validation Error', 'Please fill in all required fields.', true, 3000);
        return;
      }

      showLoadingAlert('Updating class...', false);
      
      await updateClass(editingClass.id, updateData);
      
      closeAlert();
      showSuccessAlert(`Class Updated!`, `"${updateData.name}" has been updated successfully.`, 'update', true, 3000);
      
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingClass(null);
      }, 1000);
      
      await refreshClassList();
      
    } catch (err) {
      console.error('Failed to update class:', err);
      closeAlert();
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update class. Please try again.';
      setEditFormError(errorMessage);
      showErrorAlert('Update Error', errorMessage, true, 4000);
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleDeleteClass = async (classItem: Class) => {
    const confirmed = await showConfirmDialog(
      'Delete Class?',
      `Are you sure you want to delete "${classItem.name}"? This action cannot be undone.`,
      'Yes, delete it'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      showLoadingAlert('Deleting class...', false);
      
      await deleteClass(classItem.id);
      
      closeAlert();
      showSuccessAlert(`Class Deleted!`, `"${classItem.name}" has been deleted successfully.`, 'delete', true, 3000);
      
      await refreshClassList();
      
    } catch (err) {
      console.error('Failed to delete class:', err);
      closeAlert();
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete class. Please try again.';
      showErrorAlert('Delete Error', errorMessage, true, 4000);
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
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setIsModalOpen(true);
    setFormError(null);
    setFormData({
      name: '',
      code: '',
      teacher_id: undefined
    });
  };

  const getAssignedClassesCount = () => {
    if (currentUser?.role === 'admin') {
      return classes.filter(c => c.teacher_id && getTeacherName(c.teacher_id) !== 'Unassigned').length;
    }
    return classes.length;
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-2xl blur-xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Classes
          </h2>
          <p className="text-gray-600 max-w-md">
            Fetching your classes and teacher information...
          </p>
        </div>

        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Loading data...</span>
            <span>{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md mb-8">
          {[
            { text: "Teachers", color: "bg-emerald-100 text-emerald-600" },
            { text: "Classes", color: "bg-teal-100 text-teal-600" },
          ].map((step, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= ((index + 1) * 50)
                  ? `${step.color} shadow-sm`
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.text}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to Load Classes
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an issue while loading your class data. This could be due to network issues or server problems.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={refreshClassList}
              className="w-full px-6 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
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
              Retry Loading Classes
            </button>
            
            <button
              onClick={() => window.location.href = "/login"}
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your session...</p>
          <p className="text-gray-500 text-sm mt-2">
            Please wait while we authenticate your account
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white overflow-hidden relative flex">
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
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-emerald-600 font-medium">
                {filteredClasses.length} Classes
              </span>
            </div>
          </div>
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
                          <p className="text-xs lg:text-sm text-gray-600 font-medium">Assigned Classes Teachers</p>
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

            <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
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
                                    onClick={() => handleDeleteClass(classItem)}
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
                                  onClick={() => handleDeleteClass(classItem)}
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
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-300 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  Create New Class
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                  aria-label="Close create class modal"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl cursor-default">
                  <p className="text-red-700 text-sm">{formError}</p>
                </div>
              )}

              <form onSubmit={handleCreateClass} className="space-y-6">
                <div>
                  <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="className"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-text"
                    placeholder="Enter class name"
                    required
                    disabled={formLoading}
                  />
                </div>

                <div>
                  <label htmlFor="classCode" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Class Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="classCode"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-text"
                    placeholder="Enter class code (e.g., MATH101)"
                    required
                    disabled={formLoading}
                  />
                </div>

                <div>
                  <label htmlFor="teacherSelect" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Assigned Classes Teacher
                  </label>
                  <select
                    id="teacherSelect"
                    value={formData.teacher_id || ''}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                    aria-label="Select a teacher"
                    disabled={formLoading}
                  >
                    <option value="">Select a teacher (optional)</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {getDisplayName(teacher)} ({teacher.username})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={formLoading}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {formLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {formLoading ? 'Creating...' : 'Create Class'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-300 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  Edit Class
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                  aria-label="Close edit class modal"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {editFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl cursor-default">
                  <p className="text-red-700 text-sm">{editFormError}</p>
                </div>
              )}

              <form onSubmit={handleEditClass} className="space-y-6">
                <div>
                  <label htmlFor="editClassName" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="editClassName"
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                    placeholder="Enter class name"
                    required
                    disabled={editFormLoading}
                  />
                </div>

                <div>
                  <label htmlFor="editClassCode" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Class Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="editClassCode"
                    type="text"
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                    placeholder="Enter class code (e.g., MATH101)"
                    required
                    disabled={editFormLoading}
                  />
                </div>

                <div>
                  <label htmlFor="editTeacherSelect" className="block text-sm font-medium text-gray-700 mb-2 cursor-default">
                    Assigned Classes Teacher
                  </label>
                  <select
                    id="editTeacherSelect"
                    value={editFormData.teacher_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, teacher_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                    aria-label="Select a teacher for editing"
                    disabled={editFormLoading}
                  >
                    <option value="">Select a teacher (optional)</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {getDisplayName(teacher)} ({teacher.username})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={editFormLoading}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editFormLoading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {editFormLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {editFormLoading ? 'Updating...' : 'Update Class'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;