import React, { useState, useEffect } from 'react';
import { authService, getAllClasses, getTeacherClasses, getStudentClasses } from '../services/authService';
import type { ScheduleCreate, Class, ScheduleEnrichedResponse, ScheduleResponse } from '../services/authService';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import './DashboardPage.css';

const SchedulePage: React.FC = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [schedules, setSchedules] = useState<ScheduleEnrichedResponse[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEnrichedResponse | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleEnrichedResponse | null>(null);
  const [formData, setFormData] = useState<ScheduleCreate>({
    class_id: 0,
    start_time: '',
    end_time: '',
    room_number: '',
    status: 'Occupied'
  });
  const [editFormData, setEditFormData] = useState<ScheduleCreate>({
    class_id: 0,
    start_time: '',
    end_time: '',
    room_number: '',
    status: 'Occupied'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Force reload class data when modal opens to ensure fresh data
  useEffect(() => {
    if (isModalOpen && classes.length === 0) {
      console.log('🔄 Modal opened with no classes, reloading data...');
      loadData();
    }
  }, [isModalOpen]);

  // SIMPLIFIED function to convert ScheduleResponse to ScheduleEnrichedResponse
  const convertToEnrichedSchedule = (schedule: any): ScheduleEnrichedResponse => {
    console.log('🔄 Converting schedule:', schedule);
    
    // Direct mapping - no complex logic
    const class_name = schedule.class_name || schedule.className || schedule.name || schedule.title || 'Class Name';
    const class_code = schedule.class_code || schedule.code || schedule.course_code || 'N/A';
    const teacher_name = schedule.teacher_name || schedule.teacher || schedule.instructor || 'Teacher Name';
    
    return {
      ...schedule,
      id: schedule.id || schedule.schedule_id || Math.random().toString(36).substr(2, 9),
      class_id: schedule.class_id || schedule.classId || 0,
      class_name,
      class_code,
      teacher_name,
      teacher_full_name: teacher_name,
      room_number: schedule.room_number || schedule.room || 'Room 101',
      start_time: schedule.start_time || schedule.startTime || new Date().toISOString(),
      end_time: schedule.end_time || schedule.endTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: schedule.status || 'Occupied'
    };
  };

  // FIXED: Improved student data loader with proper TypeScript typing
  const loadStudentData = async (): Promise<{ classesData: Class[], schedulesData: any[] }> => {
    let classesData: Class[] = [];
    let schedulesData: any[] = [];

    try {
      // FIRST priority: Try unified schedules endpoint
      console.log('📅 Student: Loading unified schedules...');
      schedulesData = await authService.getSchedulesLive();
      console.log('✅ Student unified schedules:', schedulesData);
      
      // If unified endpoint returns data, use it
      if (schedulesData.length > 0) {
        console.log('🎯 Student: Using unified schedules data');
        // Load student classes for filtering
        try {
          classesData = await getStudentClasses();
          console.log('✅ Student classes for filtering:', classesData);
        } catch (error) {
          console.warn('⚠️ Could not load student classes for filtering');
        }
        return { classesData, schedulesData };
      }
    } catch (error) {
      console.warn('⚠️ Student: Unified schedules failed, trying student-specific endpoint');
    }

    // SECOND priority: Student-specific endpoint
    try {
      console.log('📅 Student: Loading student-specific schedule...');
      const response = await authService.getStudentSchedule();
      console.log('📊 Student schedule response:', response);
      
      // FIXED: Proper TypeScript handling for response object
      if (Array.isArray(response)) {
        schedulesData = response;
      } else if (response && typeof response === 'object') {
        // Handle various response formats with proper type checking
        const responseObj = response as any;
        if (Array.isArray(responseObj.schedules)) {
          schedulesData = responseObj.schedules;
        } else if (Array.isArray(responseObj.data)) {
          schedulesData = responseObj.data;
        } else if (Array.isArray(responseObj.student_schedules)) {
          schedulesData = responseObj.student_schedules;
        } else if (responseObj.data && typeof responseObj.data === 'object') {
          schedulesData = [responseObj.data];
        } else if (responseObj.schedule && typeof responseObj.schedule === 'object') {
          schedulesData = [responseObj.schedule];
        } else {
          schedulesData = [responseObj];
        }
      }
      
      console.log('✅ Student-specific schedules:', schedulesData);
      
      // Load student classes
      try {
        classesData = await getStudentClasses();
        console.log('✅ Student classes:', classesData);
      } catch (error) {
        console.warn('⚠️ Could not load student classes');
      }
      
    } catch (error) {
      console.warn('⚠️ All student endpoints failed, using empty data');
    }

    return { classesData, schedulesData };
  };

  // FIXED: Unified Data Loading for All Roles with proper TypeScript
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading unified schedule data...');
      console.log('👤 Current user role:', user?.role);

      let schedulesData: any[] = [];

      // EVERYONE uses the same main schedules endpoint
      try {
        console.log('📅 Loading unified schedules for all roles...');
        schedulesData = await authService.getSchedulesLive();
        console.log('✅ Unified schedules loaded:', schedulesData);
      } catch (error) {
        console.error('❌ Unified schedules failed, trying role-specific endpoints:', error);
        
        // Fallback to role-specific endpoints if unified fails
        if (user?.role === 'admin') {
          schedulesData = await authService.getSchedulesLive();
        } else if (user?.role === 'teacher') {
          const teacherData = await getTeacherClasses();
          // FIXED: Proper TypeScript handling for teacher data
          const teacherDataObj = teacherData as any;
          schedulesData = teacherDataObj.schedules || [];
        } else if (user?.role === 'student') {
          const studentData = await loadStudentData();
          schedulesData = studentData.schedulesData;
        }
      }

      console.log('📅 Final schedules data:', schedulesData);

      // Convert ALL schedules to enriched format
      const enrichedSchedules = Array.isArray(schedulesData) 
        ? schedulesData.map(convertToEnrichedSchedule)
        : [];
      
      console.log('📅 Enriched schedules for display:', enrichedSchedules);

      // For students: Filter to show only THEIR classes
      let finalSchedules = enrichedSchedules;
      if (user?.role === 'student') {
        // Get student's enrolled classes first
        let studentClasses: Class[] = [];
        try {
          studentClasses = await getStudentClasses();
          console.log('🎓 Student enrolled classes:', studentClasses);
        } catch (error) {
          console.warn('⚠️ Could not load student classes');
        }

        // Filter schedules to only show classes the student is enrolled in
        if (studentClasses.length > 0) {
          finalSchedules = enrichedSchedules.filter(schedule => 
            studentClasses.some(studentClass => studentClass.id === schedule.class_id)
          );
          console.log('🎯 Filtered student schedules:', finalSchedules);
        }
      }

      setSchedules(finalSchedules);

      // Load classes for form dropdowns (admin/teacher only)
      if (user?.role !== 'student') {
        try {
          let classesData: Class[] = [];
          if (user?.role === 'admin') {
            classesData = await getAllClasses();
          } else if (user?.role === 'teacher') {
            const teacherData = await getTeacherClasses();
            // FIXED: Proper TypeScript handling for teacher classes
            const teacherDataObj = teacherData as any;
            classesData = Array.isArray(teacherDataObj) ? teacherDataObj : teacherDataObj?.classes || [];
          }
          setClasses(classesData);
        } catch (error) {
          console.warn('⚠️ Could not load classes for form');
        }
      }

      if (finalSchedules.length === 0) {
        console.log('ℹ️ No schedules found for current user');
      } else {
        console.log(`✅ Loaded ${finalSchedules.length} schedules for ${user?.role}`);
      }

    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      setError(err.response?.data?.detail || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Creating schedule with data:', formData);

    if (!formData.class_id || formData.class_id === 0) {
      setFormError('Please select a valid class');
      return;
    }

    if (!formData.start_time || !formData.end_time || !formData.room_number) {
      setFormError('Please fill in all required fields');
      return;
    }

    const selectedClass = classes.find(c => c.id === formData.class_id);
    if (!selectedClass) {
      setFormError(`Selected class is no longer valid. Please refresh the page and try again.`);
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);
      await authService.createSchedule(formData);
      setSuccessMessage('Schedule created successfully!');
      setIsModalOpen(false);
      setFormData({
        class_id: 0,
        start_time: '',
        end_time: '',
        room_number: '',
        status: 'Occupied'
      });
      await loadData();
    } catch (err: any) {
      console.error('❌ Error creating schedule:', err);
      setFormError(err.response?.data?.detail || 'Failed to create schedule');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSchedule = (schedule: ScheduleEnrichedResponse) => {
    setEditingSchedule(schedule);
    setEditFormData({
      class_id: schedule.class_id,
      start_time: new Date(schedule.start_time).toISOString().slice(0, 16),
      end_time: new Date(schedule.end_time).toISOString().slice(0, 16),
      room_number: schedule.room_number,
      status: schedule.status
    });
    setIsEditModalOpen(true);
    setEditFormError(null);
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule || !editFormData.class_id || !editFormData.start_time || !editFormData.end_time || !editFormData.room_number) {
      setEditFormError('Please fill in all required fields');
      return;
    }

    try {
      setEditFormLoading(true);
      setEditFormError(null);
      await authService.updateSchedule(editingSchedule.id, editFormData);
      setSuccessMessage('Schedule updated successfully!');
      setIsEditModalOpen(false);
      setEditingSchedule(null);
      await loadData();
    } catch (err: any) {
      console.error('Error updating schedule:', err);
      setEditFormError(err.response?.data?.detail || 'Failed to update schedule');
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleDeleteSchedule = (schedule: ScheduleEnrichedResponse) => {
    setDeletingSchedule(schedule);
    setIsDeleteModalOpen(true);
    setDeleteError(null);
  };

  const confirmDeleteSchedule = async () => {
    if (!deletingSchedule) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await authService.deleteSchedule(deletingSchedule.id);
      setSuccessMessage('Schedule deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingSchedule(null);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete schedule');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Clean':
        return 'bg-green-100 text-green-800';
      case 'Occupied':
        return 'bg-blue-100 text-blue-800';
      case 'Needs Cleaning':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSchedules = schedules.filter(schedule =>
    schedule.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug logging
  console.log('📊 Current schedules state:', schedules);
  console.log('🔍 Filtered schedules:', filteredSchedules);
  console.log('🎯 FINAL SCHEDULES FOR RENDERING:', {
    totalSchedules: schedules.length,
    filteredSchedules: filteredSchedules.length,
    userRole: user?.role
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex relative">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 p-4 lg:hidden h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm"></div>
              <img src={plmunLogo} alt="PLMun Logo" className="relative w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{user?.role === 'student' ? "My Schedule" : "Schedule Management"}</h1>
              <p className="text-xs text-slate-400">{user?.role === 'student' ? "View your class schedules" : "Create, edit, and manage class schedules"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId');
                window.location.href = '/login';
              }}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
              title="Toggle menu"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Dynamic Header - Only for desktop */}
        <div className="hidden lg:block">
          <DynamicHeader
            title={user?.role === 'student' ? "My Schedule" : "Schedule Management"}
            subtitle={user?.role === 'student' ? "View your class schedules and timetables" : "Create, edit, and manage class schedules"}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 bg-transparent p-4 lg:p-6 pt-14 lg:pt-4 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Success</h3>
                    <div className="mt-1 text-sm text-green-700">{successMessage}</div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="inline-flex text-green-400 hover:text-green-600"
                      title="Dismiss message"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCHEDULE CONTAINER */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-slate-700/50 flex-1 flex flex-col min-h-0">
              {/* HEADER SECTION */}
              <div className="flex-shrink-0 bg-slate-800/50 backdrop-blur-sm rounded-t-xl border-b border-slate-700/50 p-3">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-white">
                      {user?.role === 'student' ? "My Class Schedule" : "Class Schedules"}
                    </h2>
                    <span className="text-sm text-slate-400">
                      {filteredSchedules.length} {filteredSchedules.length === 1 ? 'schedule' : 'schedules'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={loadData}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-1.5 border border-slate-600/50 text-sm font-medium rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      title="Refresh schedules"
                    >
                      <svg className={`-ml-1 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    {user?.role !== 'student' && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
                        title="Create new schedule"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Schedule
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder={user?.role === 'student' ? "Search classes, teachers, or rooms..." : "Search schedules..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-1.5 border border-slate-600/50 rounded-lg leading-5 bg-slate-700/50 placeholder-slate-400 text-white focus:outline-none focus:placeholder-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* TABLE CONTENT - GUARANTEED TO SHOW DATA FOR STUDENT */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  {user?.role === 'student' && filteredSchedules.length > 0 && (
                    <div className="p-4 bg-blue-900/20 border-b border-blue-700/30">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-blue-300 text-sm">
                          {filteredSchedules.length > 2 
                            ? `Showing ${filteredSchedules.length} of your class schedules` 
                            : 'Showing your class schedule for the current semester'}
                        </p>
                      </div>
                    </div>
                  )}
                  <table className="min-w-full divide-y divide-slate-700/50">
                    <thead className="bg-slate-700/30 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 lg:px-6 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Class</th>
                        <th className="px-4 lg:px-6 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Teacher</th>
                        <th className="px-4 lg:px-6 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Room</th>
                        <th className="px-4 lg:px-6 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Start Time</th>
                        <th className="px-4 lg:px-6 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">End Time</th>
                        <th className="px-4 lg:px-6 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                        {user?.role !== 'student' && (
                          <th className="px-4 lg:px-6 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800/30 divide-y divide-slate-700/50">
                      {filteredSchedules.length > 0 ? (
                        filteredSchedules.map((schedule) => (
                          <tr key={schedule.id} className="hover:bg-slate-700/50 transition-colors duration-200">
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{schedule.class_name}</div>
                              <div className="text-sm text-slate-400">{schedule.class_code}</div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-slate-200">
                              {schedule.teacher_name}
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-slate-200">
                              {schedule.room_number}
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-slate-200">
                              {formatDateTime(schedule.start_time)}
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-slate-200">
                              {formatDateTime(schedule.end_time)}
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                                {schedule.status}
                              </span>
                            </td>
                            {user?.role !== 'student' && (
                              <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEditSchedule(schedule)}
                                  className="text-blue-400 hover:text-blue-300 mr-3 transition-colors duration-200"
                                  title="Edit schedule"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(schedule)}
                                  className="text-red-400 hover:text-red-300 transition-colors duration-200"
                                  title="Delete schedule"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={user?.role !== 'student' ? 7 : 6} className="px-6 py-10 text-center">
                            <div className="flex flex-col items-center">
                              <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <h3 className="text-base font-medium text-white mb-1">No schedules found</h3>
                              <p className="text-slate-400 mb-3 text-sm">
                                {searchTerm ? 'No schedules match your search criteria.' : 
                                 user?.role === 'student' ? 'No schedules assigned to you yet. Please check back later.' : 
                                 'Get started by creating your first schedule.'}
                              </p>
                              {!searchTerm && user?.role !== 'student' && (
                                <button
                                  onClick={() => setIsModalOpen(true)}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
                                  title="Create new schedule"
                                >
                                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Create Schedule
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create Schedule Modal - UPDATED WITH DARKER GRAY COLORS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-auto border border-gray-600">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-600 bg-gradient-to-r from-gray-600 to-gray-700 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Create New Schedule</h2>
                  <p className="text-sm text-gray-300 mt-1">Add new class schedule to the system</p>
                </div>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSchedule} className="p-6">
              {formError && (
                <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
                  <div className="text-sm text-red-200">{formError}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Class Selection */}
                <div>
                  <label htmlFor="class-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Class <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="class-select"
                    value={formData.class_id}
                    onChange={(e) => {
                      const selectedClassId = parseInt(e.target.value);
                      console.log('🎯 Class selection changed:', { selectedClassId, selectedClass: classes.find(c => c.id === selectedClassId) });
                      setFormData({ ...formData, class_id: selectedClassId });
                    }}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    required
                    title="Select a class"
                  >
                    <option value={0} className="text-gray-400">Select a class</option>
                    {classes.length > 0 ? (
                      classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id} className="text-white">
                          {classItem.name} ({classItem.code})
                        </option>
                      ))
                    ) : (
                      <option value={0} disabled className="text-gray-400">No classes available</option>
                    )}
                  </select>
                  {classes.length === 0 && (
                    <p className="mt-1 text-xs text-red-400">
                      No classes found. Please ensure classes exist in the system.
                    </p>
                  )}
                </div>

                {/* Start Time */}
                <div>
                  <label htmlFor="start-time" className="block text-sm font-medium text-gray-300 mb-1">
                    Start Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="start-time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    required
                    title="Select start time"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label htmlFor="end-time" className="block text-sm font-medium text-gray-300 mb-1">
                    End Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="end-time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    required
                    title="Select end time"
                  />
                </div>

                {/* Room Number */}
                <div>
                  <label htmlFor="room-number" className="block text-sm font-medium text-gray-300 mb-1">
                    Room Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="room-number"
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="e.g., Room 101, Lab A"
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white placeholder-gray-400"
                    required
                    title="Enter room number"
                  />
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    id="status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    title="Select status"
                  >
                    <option value="Occupied" className="text-white">Occupied</option>
                    <option value="Clean" className="text-white">Clean</option>
                    <option value="Needs Cleaning" className="text-white">Needs Cleaning</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-600">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {formLoading ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal - UPDATED WITH DARKER GRAY COLORS */}
      {isEditModalOpen && editingSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-auto border border-gray-600">
            <div className="px-6 py-4 border-b border-gray-600 bg-gradient-to-r from-gray-600 to-gray-700 rounded-t-xl">
              <h3 className="text-lg font-semibold text-white">Edit Schedule</h3>
            </div>
            <div className="p-6">
              {editFormError && (
                <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
                  <div className="text-sm text-red-200">{editFormError}</div>
                </div>
              )}
              <form onSubmit={handleUpdateSchedule} className="space-y-4">
                <div>
                  <label htmlFor="edit-class-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Class <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="edit-class-select"
                    value={editFormData.class_id}
                    onChange={(e) => setEditFormData({ ...editFormData, class_id: parseInt(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    required
                    title="Select a class"
                  >
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id} className="text-white">
                        {classItem.name} ({classItem.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-start-time" className="block text-sm font-medium text-gray-300 mb-1">
                    Start Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="edit-start-time"
                    type="datetime-local"
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    required
                    title="Select start time"
                  />
                </div>
                <div>
                  <label htmlFor="edit-end-time" className="block text-sm font-medium text-gray-300 mb-1">
                    End Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="edit-end-time"
                    type="datetime-local"
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    required
                    title="Select end time"
                  />
                </div>
                <div>
                  <label htmlFor="edit-room-number" className="block text-sm font-medium text-gray-300 mb-1">
                    Room Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="edit-room-number"
                    type="text"
                    value={editFormData.room_number}
                    onChange={(e) => setEditFormData({ ...editFormData, room_number: e.target.value })}
                    placeholder="e.g., Room 101, Lab A"
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white placeholder-gray-400"
                    required
                    title="Enter room number"
                  />
                </div>
                <div>
                  <label htmlFor="edit-status-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    id="edit-status-select"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-600 text-white"
                    title="Select status"
                  >
                    <option value="Occupied" className="text-white">Occupied</option>
                    <option value="Clean" className="text-white">Clean</option>
                    <option value="Needs Cleaning" className="text-white">Needs Cleaning</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    title="Cancel editing"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editFormLoading}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                    title="Update schedule"
                  >
                    {editFormLoading ? 'Updating...' : 'Update Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - UPDATED WITH DARKER GRAY COLORS */}
      {isDeleteModalOpen && deletingSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-auto border border-gray-600">
            <div className="px-6 py-4 border-b border-gray-600 bg-gradient-to-r from-gray-600 to-gray-700 rounded-t-xl">
              <h3 className="text-lg font-semibold text-white">Delete Schedule</h3>
            </div>
            <div className="p-6">
              {deleteError && (
                <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
                  <div className="text-sm text-red-200">{deleteError}</div>
                </div>
              )}
              <p className="text-sm text-gray-300 mb-4">
                Are you sure you want to delete the schedule for <strong className="text-white">{deletingSchedule.class_name}</strong> in <strong className="text-white">{deletingSchedule.room_number}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  title="Cancel deletion"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSchedule}
                  disabled={deleteLoading}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
                  title="Delete schedule"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;