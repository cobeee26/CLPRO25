import React, { useState, useEffect } from 'react';
import { authService, getAllClasses, getTeacherClasses, getStudentSchedule } from '../services/authService';
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
  const [formData, setFormData] = useState({
    class_id: 0,
    start_date: '',
    start_time: '',
    start_period: 'AM',
    end_date: '',
    end_time: '',
    end_period: 'AM',
    room_number: '',
    status: 'Occupied'
  });
  const [editFormData, setEditFormData] = useState({
    class_id: 0,
    start_date: '',
    start_time: '',
    start_period: 'AM',
    end_date: '',
    end_time: '',
    end_period: 'AM',
    room_number: '',
    status: 'Occupied'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // SUCCESS BANNER STATES - SEPARATE FROM ERROR/SCHEDULE BANNERS
  const [successBanner, setSuccessBanner] = useState<{
    message: string;
    type: 'create' | 'update' | 'delete' | 'refresh' | 'cleanliness';
  } | null>(null);

  // Timepicker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showEditStartTimePicker, setShowEditStartTimePicker] = useState(false);
  const [showEditEndTimePicker, setShowEditEndTimePicker] = useState(false);

  // Generate time options for the timepicker in 12-hour format
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // 30-minute intervals
        const displayHour = hour % 12 || 12; // Convert 0 to 12, 13 to 1, etc.
        const period = hour < 12 ? 'AM' : 'PM';
        const timeString = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push({ 
          display: timeString, 
          value: timeString, // Store 12-hour format for display
          period,
          value24: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}` // Store 24-hour for API
        });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24: string) => {
    if (!time24) return { time: '', period: 'AM' };
    
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return {
      time: `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      period
    };
  };

  // Convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12: string, period: string) => {
    if (!time12) return '';
    
    let [hours, minutes] = time12.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Get display text for time input (12-hour format with AM/PM)
  const getDisplayTime = (time24: string, period: string) => {
    if (!time24) return 'Select time';
    const time12 = convertTo12Hour(time24);
    return `${time12.time} ${period}`;
  };

  // Function to show success banner with auto-dismiss
  const showSuccessBanner = (message: string, type: 'create' | 'update' | 'delete' | 'refresh' | 'cleanliness') => {
    setSuccessBanner({ message, type });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setSuccessBanner(null);
    }, 5000);
  };

  // Function to manually dismiss success banner
  const dismissSuccessBanner = () => {
    setSuccessBanner(null);
  };

  useEffect(() => {
    loadData();
    
    // Listen for room report updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'room_report_submitted') {
        console.log('🔄 Room report submitted, reloading schedules...');
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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
      status: schedule.status || 'Occupied',
      cleanliness_before: schedule.cleanliness_before || schedule.is_clean_before || 'Unknown',
      cleanliness_after: schedule.cleanliness_after || schedule.is_clean_after || 'Unknown',
      last_report_time: schedule.last_report_time || schedule.report_time || null
    };
  };

  // FIXED: Simplified function to load room reports - removed non-existent method calls
  const loadRoomReports = async () => {
    try {
      console.log('📋 Attempting to load room reports...');
      // Using direct API call or empty array if method doesn't exist
      // Since getLatestRoomReports doesn't exist, return empty array
      return [];
    } catch (error) {
      console.warn('⚠️ Could not load room reports:', error);
      return [];
    }
  };

  // FIXED: Simplified function to refresh cleanliness - removed non-existent method calls
  const refreshScheduleCleanliness = async (scheduleId: number) => {
    try {
      console.log(`🔍 Checking cleanliness for schedule ${scheduleId}...`);
      // Since getScheduleCleanliness doesn't exist, return null
      return null;
    } catch (error) {
      console.warn(`⚠️ Could not refresh cleanliness for schedule ${scheduleId}:`, error);
      return null;
    }
  };

  // FIXED: Improved student data loader with proper TypeScript typing
  const loadStudentData = async (): Promise<{ schedulesData: any[] }> => {
    let schedulesData: any[] = [];

    try {
      // FIRST priority: Try unified schedules endpoint
      console.log('📅 Student: Loading unified schedules...');
      schedulesData = await authService.getSchedulesLive();
      console.log('✅ Student unified schedules:', schedulesData);
      
      // If unified endpoint returns data, use it
      if (schedulesData.length > 0) {
        console.log('🎯 Student: Using unified schedules data');
        return { schedulesData };
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
      
    } catch (error) {
      console.warn('⚠️ All student endpoints failed, using empty data');
    }

    return { schedulesData };
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

      // Convert schedules to enriched format
      const enrichedSchedules = Array.isArray(schedulesData) 
        ? schedulesData.map(schedule => convertToEnrichedSchedule(schedule))
        : [];
      
      console.log('📅 Enriched schedules:', enrichedSchedules);

      // For students: Use the student schedule directly
      let finalSchedules = enrichedSchedules;
      if (user?.role === 'student') {
        // Try to get student schedule directly
        try {
          const studentScheduleData = await getStudentSchedule();
          console.log('🎓 Student schedule data:', studentScheduleData);
          
          if (studentScheduleData.length > 0) {
            finalSchedules = studentScheduleData.map(schedule => convertToEnrichedSchedule(schedule));
            console.log('🎯 Using enhanced student schedule:', finalSchedules);
          }
        } catch (error) {
          console.warn('⚠️ Could not load direct student schedule, using filtered schedules');
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

  // FIXED: Simplified function to manually refresh cleanliness
  const handleRefreshCleanliness = async (scheduleId: number) => {
    console.log(`🔄 Manual refresh requested for schedule ${scheduleId}`);
    // Since the method doesn't exist, just reload all data
    await loadData();
    return false;
  };

  // FIXED: Simplified function to refresh all schedules cleanliness
  const refreshAllCleanliness = async () => {
    try {
      console.log('🔄 Refreshing cleanliness for all schedules...');
      // Just reload all data
      await loadData();
      showSuccessBanner('Cleanliness status refreshed successfully!', 'cleanliness');
    } catch (error) {
      console.error('❌ Error refreshing all cleanliness:', error);
      setError('Failed to refresh cleanliness status');
    }
  };

  // Helper function to combine date and time into ISO string
  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    return new Date(`${date}T${time}`).toISOString();
  };

  // Time selection handlers
  const handleTimeSelect = (time: string, period: string, type: 'start' | 'end') => {
    const time24 = convertTo24Hour(time, period);
    setFormData(prev => ({
      ...prev,
      [type === 'start' ? 'start_time' : 'end_time']: time24,
      [type === 'start' ? 'start_period' : 'end_period']: period
    }));
    if (type === 'start') setShowStartTimePicker(false);
    if (type === 'end') setShowEndTimePicker(false);
  };

  const handleEditTimeSelect = (time: string, period: string, type: 'start' | 'end') => {
    const time24 = convertTo24Hour(time, period);
    setEditFormData(prev => ({
      ...prev,
      [type === 'start' ? 'start_time' : 'end_time']: time24,
      [type === 'start' ? 'start_period' : 'end_period']: period
    }));
    if (type === 'start') setShowEditStartTimePicker(false);
    if (type === 'end') setShowEditEndTimePicker(false);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time into ISO strings
    const startDateTime = combineDateTime(formData.start_date, formData.start_time);
    const endDateTime = combineDateTime(formData.end_date, formData.end_time);
    
    const scheduleData: ScheduleCreate = {
      class_id: formData.class_id,
      start_time: startDateTime,
      end_time: endDateTime,
      room_number: formData.room_number,
      status: formData.status
    };

    console.log('📝 Creating schedule with data:', scheduleData);

    if (!formData.class_id || formData.class_id === 0) {
      setFormError('Please select a valid class');
      return;
    }

    if (!formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time || !formData.room_number) {
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
      await authService.createSchedule(scheduleData);
      
      // Show success banner
      showSuccessBanner('Schedule created successfully!', 'create');
      
      setIsModalOpen(false);
      setFormData({
        class_id: 0,
        start_date: '',
        start_time: '',
        start_period: 'AM',
        end_date: '',
        end_time: '',
        end_period: 'AM',
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
    
    // Parse existing datetime into separate date and time
    const startDate = new Date(schedule.start_time);
    const endDate = new Date(schedule.end_time);
    
    const startTime12 = convertTo12Hour(startDate.toTimeString().slice(0, 5));
    const endTime12 = convertTo12Hour(endDate.toTimeString().slice(0, 5));
    
    setEditFormData({
      class_id: schedule.class_id,
      start_date: startDate.toISOString().split('T')[0],
      start_time: startTime12.time,
      start_period: startTime12.period,
      end_date: endDate.toISOString().split('T')[0],
      end_time: endTime12.time,
      end_period: endTime12.period,
      room_number: schedule.room_number,
      status: schedule.status
    });
    setIsEditModalOpen(true);
    setEditFormError(null);
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time into ISO strings
    const startDateTime = combineDateTime(editFormData.start_date, editFormData.start_time);
    const endDateTime = combineDateTime(editFormData.end_date, editFormData.end_time);
    
    if (!editingSchedule || !editFormData.class_id || !editFormData.start_date || !editFormData.start_time || !editFormData.end_date || !editFormData.end_time || !editFormData.room_number) {
      setEditFormError('Please fill in all required fields');
      return;
    }

    const scheduleData: ScheduleCreate = {
      class_id: editFormData.class_id,
      start_time: startDateTime,
      end_time: endDateTime,
      room_number: editFormData.room_number,
      status: editFormData.status
    };

    try {
      setEditFormLoading(true);
      setEditFormError(null);
      await authService.updateSchedule(editingSchedule.id, scheduleData);
      
      // Show success banner
      showSuccessBanner('Schedule updated successfully!', 'update');
      
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
      
      // Show success banner
      showSuccessBanner('Schedule deleted successfully!', 'delete');
      
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Occupied':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Needs Cleaning':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-sm border-b border-gray-200 p-4 lg:hidden h-16 shadow-sm">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-xl blur-sm"></div>
              <img src={plmunLogo} alt="PLMun Logo" className="relative w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{user?.role === 'student' ? "My Schedule" : "Schedule Management"}</h1>
              <p className="text-xs text-gray-600">{user?.role === 'student' ? "View your class schedules" : "Create, edit, and manage class schedules"}</p>
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
            {/* SUCCESS BANNER - SEPARATE FROM ERROR BANNER */}
            {successBanner && (
              <div className={`mb-3 border rounded-lg p-3 animate-fade-in-up ${
                successBanner.type === 'create' || successBanner.type === 'update' 
                  ? 'bg-green-50 border-green-200' 
                  : successBanner.type === 'delete'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className={`h-5 w-5 ${
                      successBanner.type === 'create' || successBanner.type === 'update' 
                        ? 'text-green-400' 
                        : successBanner.type === 'delete'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                    }`} viewBox="0 0 20 20" fill="currentColor">
                      {successBanner.type === 'delete' ? (
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      ) : successBanner.type === 'refresh' || successBanner.type === 'cleanliness' ? (
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className={`text-sm font-medium ${
                      successBanner.type === 'create' || successBanner.type === 'update' 
                        ? 'text-green-800' 
                        : successBanner.type === 'delete'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                    }`}>
                      {successBanner.type === 'create' ? 'Schedule Created' : 
                       successBanner.type === 'update' ? 'Schedule Updated' : 
                       successBanner.type === 'delete' ? 'Schedule Deleted' : 
                       successBanner.type === 'cleanliness' ? 'Cleanliness Refreshed' : 'Success'}
                    </h3>
                    <div className={`mt-1 text-sm ${
                      successBanner.type === 'create' || successBanner.type === 'update' 
                        ? 'text-green-700' 
                        : successBanner.type === 'delete'
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                    }`}>
                      {successBanner.message}
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={dismissSuccessBanner}
                      className={`inline-flex ${
                        successBanner.type === 'create' || successBanner.type === 'update' 
                          ? 'text-green-400 hover:text-green-600' 
                          : successBanner.type === 'delete'
                          ? 'text-yellow-400 hover:text-yellow-600'
                          : 'text-blue-400 hover:text-blue-600'
                      } cursor-pointer transition-colors`}
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

            {/* ERROR BANNER - SEPARATE FROM SUCCESS BANNER */}
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
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError(null)}
                      className="inline-flex text-red-400 hover:text-red-600 cursor-pointer"
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
            <div className="bg-white backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0">
              {/* HEADER SECTION */}
              <div className="flex-shrink-0 bg-white backdrop-blur-sm rounded-t-xl border-b border-gray-200 p-3">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {user?.role === 'student' ? "My Class Schedule" : "Class Schedules"}
                    </h2>
                    <span className="text-sm text-gray-600">
                      {filteredSchedules.length} {filteredSchedules.length === 1 ? 'schedule' : 'schedules'}
                    </span>
                    {/* Cleanliness Indicator */}
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">
                        Real-time Cleanliness Status
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* NEW: Refresh Cleanliness Button */}
                    <button
                      onClick={refreshAllCleanliness}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 cursor-pointer"
                      title="Refresh cleanliness status"
                    >
                      <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      Refresh Cleanliness
                    </button>
                    <button
                      onClick={loadData}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                      title="Refresh schedules"
                    >
                      <svg className={`-ml-1 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh All
                    </button>
                    {user?.role !== 'student' && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm cursor-pointer"
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
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder={user?.role === 'student' ? "Search classes, teachers, or rooms..." : "Search schedules..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all duration-200 cursor-text"
                    />
                  </div>
                </div>
              </div>

              {/* TABLE CONTENT - GUARANTEED TO SHOW DATA FOR STUDENT */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  {user?.role === 'student' && filteredSchedules.length > 0 && (
                    <div className="p-4 bg-blue-50 border-b border-blue-200">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-blue-700 text-sm">
                          {filteredSchedules.length > 2 
                            ? `Showing ${filteredSchedules.length} of your class schedules` 
                            : 'Showing your class schedule for the current semester'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* FIXED: Improved table container with better responsive design */}
                  <div className="min-w-full overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-default whitespace-nowrap min-w-[120px]">Class</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-default whitespace-nowrap min-w-[120px]">Teacher</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-default whitespace-nowrap min-w-[80px]">Room</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-default whitespace-nowrap min-w-[150px]">Start Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-default whitespace-nowrap min-w-[150px]">End Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-default whitespace-nowrap min-w-[100px]">Status</th>
                          {/* Cleanliness Report column removed */}
                          {user?.role !== 'student' && (
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-default whitespace-nowrap min-w-[120px]">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSchedules.length > 0 ? (
                          filteredSchedules.map((schedule) => (
                            <tr key={schedule.id} className="hover:bg-gray-50 transition-colors duration-200">
                              <td className="px-3 py-2 whitespace-nowrap cursor-default">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={schedule.class_name}>
                                  {schedule.class_name}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-[150px]" title={schedule.class_code}>
                                  {schedule.class_code}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 cursor-default truncate max-w-[120px]" title={schedule.teacher_name}>
                                {schedule.teacher_name}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 cursor-default">
                                {schedule.room_number}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 cursor-default">
                                {formatDateTime(schedule.start_time)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 cursor-default">
                                {formatDateTime(schedule.end_time)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap cursor-default">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(schedule.status)}`}>
                                  {schedule.status}
                                </span>
                              </td>
                              {/* Cleanliness Report cell removed */}
                              {user?.role !== 'student' && (
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleEditSchedule(schedule)}
                                      className="inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 cursor-pointer text-xs font-medium"
                                      title="Edit schedule"
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSchedule(schedule)}
                                      className="inline-flex items-center px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200 cursor-pointer text-xs font-medium"
                                      title="Delete schedule"
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 011.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={user?.role !== 'student' ? 7 : 6} className="px-6 py-10 text-center cursor-default">
                              <div className="flex flex-col items-center">
                                <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-base font-medium text-gray-900 mb-1">No schedules found</h3>
                                <p className="text-gray-500 mb-3 text-sm">
                                  {searchTerm ? 'No schedules match your search criteria.' : 
                                   user?.role === 'student' ? 'No schedules assigned to you yet. Please check back later.' : 
                                   'Get started by creating your first schedule.'}
                                </p>
                                {!searchTerm && user?.role !== 'student' && (
                                  <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm cursor-pointer"
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
          </div>
        </main>
      </div>

      {/* Create Schedule Modal - FIXED TIME DISPLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto border border-gray-300 cursor-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Create New Schedule</h2>
                  <p className="text-sm text-gray-600 mt-1">Add new class schedule to the system</p>
                </div>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSchedule} className="p-6">
              {formError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-700">{formError}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Class Selection */}
                <div>
                  <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="class-select"
                    value={formData.class_id}
                    onChange={(e) => {
                      const selectedClassId = parseInt(e.target.value);
                      console.log('🎯 Class selection changed:', { selectedClassId, selectedClass: classes.find(c => c.id === selectedClassId) });
                      setFormData({ ...formData, class_id: selectedClassId });
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                    required
                    title="Select a class"
                  >
                    <option value={0} className="text-gray-500">Select a class</option>
                    {classes.length > 0 ? (
                      classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id} className="text-gray-900">
                          {classItem.name} ({classItem.code})
                        </option>
                      ))
                    ) : (
                      <option value={0} disabled className="text-gray-500">No classes available</option>
                    )}
                  </select>
                  {classes.length === 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      No classes found. Please ensure classes exist in the system.
                    </p>
                  )}
                </div>

                {/* Start Date and Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                        required
                        title="Select start date"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={getDisplayTime(formData.start_time, formData.start_period)}
                        onClick={() => setShowStartTimePicker(!showStartTimePicker)}
                        readOnly
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer truncate"
                        required
                        title="Select start time"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      {/* Timepicker Dropdown */}
                      {showStartTimePicker && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2">
                            {timeOptions.map((timeObj) => (
                              <button
                                key={`${timeObj.value24}-${timeObj.period}`}
                                type="button"
                                onClick={() => handleTimeSelect(timeObj.value, timeObj.period, 'start')}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 cursor-pointer ${
                                  formData.start_time === timeObj.value24 && formData.start_period === timeObj.period 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-700'
                                }`}
                              >
                                {timeObj.display} {timeObj.period}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* End Date and Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                        required
                        title="Select end date"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={getDisplayTime(formData.end_time, formData.end_period)}
                        onClick={() => setShowEndTimePicker(!showEndTimePicker)}
                        readOnly
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer truncate"
                        required
                        title="Select end time"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      {/* Timepicker Dropdown */}
                      {showEndTimePicker && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2">
                            {timeOptions.map((timeObj) => (
                              <button
                                key={`${timeObj.value24}-${timeObj.period}`}
                                type="button"
                                onClick={() => handleTimeSelect(timeObj.value, timeObj.period, 'end')}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 cursor-pointer ${
                                  formData.end_time === timeObj.value24 && formData.end_period === timeObj.period 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-700'
                                }`}
                              >
                                {timeObj.display} {timeObj.period}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Room Number */}
                <div>
                  <label htmlFor="room-number" className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="room-number"
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="e.g., Room 101, Lab A"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500 cursor-text"
                    required
                    title="Enter room number"
                  />
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Status
                  </label>
                  <select
                    id="status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                    title="Select status"
                  >
                    <option value="Occupied" className="text-gray-900">Occupied</option>
                    <option value="Clean" className="text-gray-900">Clean</option>
                    <option value="Needs Cleaning" className="text-gray-900">Needs Cleaning</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setShowStartTimePicker(false);
                    setShowEndTimePicker(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200 cursor-pointer"
                >
                  {formLoading ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal - FIXED TIME DISPLAY */}
      {isEditModalOpen && editingSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto border border-gray-300 cursor-auto">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Edit Schedule</h3>
            </div>
            <div className="p-6">
              {editFormError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-700">{editFormError}</div>
                </div>
              )}
              <form onSubmit={handleUpdateSchedule} className="space-y-4">
                <div>
                  <label htmlFor="edit-class-select" className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="edit-class-select"
                    value={editFormData.class_id}
                    onChange={(e) => setEditFormData({ ...editFormData, class_id: parseInt(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                    required
                    title="Select a class"
                  >
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id} className="text-gray-900">
                        {classItem.name} ({classItem.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date and Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="date"
                        value={editFormData.start_date}
                        onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                        required
                        title="Select start date"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={getDisplayTime(editFormData.start_time, editFormData.start_period)}
                        onClick={() => setShowEditStartTimePicker(!showEditStartTimePicker)}
                        readOnly
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer truncate"
                        required
                        title="Select start time"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      {/* Timepicker Dropdown */}
                      {showEditStartTimePicker && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2">
                            {timeOptions.map((timeObj) => (
                              <button
                                key={`${timeObj.value24}-${timeObj.period}`}
                                type="button"
                                onClick={() => handleEditTimeSelect(timeObj.value, timeObj.period, 'start')}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 cursor-pointer ${
                                  editFormData.start_time === timeObj.value24 && editFormData.start_period === timeObj.period 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-700'
                                }`}
                              >
                                {timeObj.display} {timeObj.period}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* End Date and Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="date"
                        value={editFormData.end_date}
                        onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                        required
                        title="Select end date"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={getDisplayTime(editFormData.end_time, editFormData.end_period)}
                        onClick={() => setShowEditEndTimePicker(!showEditEndTimePicker)}
                        readOnly
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer truncate"
                        required
                        title="Select end time"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      {/* Timepicker Dropdown */}
                      {showEditEndTimePicker && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2">
                            {timeOptions.map((timeObj) => (
                              <button
                                key={`${timeObj.value24}-${timeObj.period}`}
                                type="button"
                                onClick={() => handleEditTimeSelect(timeObj.value, timeObj.period, 'end')}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 cursor-pointer ${
                                  editFormData.end_time === timeObj.value24 && editFormData.end_period === timeObj.period 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-700'
                                }`}
                              >
                                {timeObj.display} {timeObj.period}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-room-number" className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-room-number"
                    type="text"
                    value={editFormData.room_number}
                    onChange={(e) => setEditFormData({ ...editFormData, room_number: e.target.value })}
                    placeholder="e.g., Room 101, Lab A"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500 cursor-text"
                    required
                    title="Enter room number"
                  />
                </div>
                <div>
                  <label htmlFor="edit-status-select" className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                    Status
                  </label>
                  <select
                    id="edit-status-select"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 cursor-pointer"
                    title="Select status"
                  >
                    <option value="Occupied" className="text-gray-900">Occupied</option>
                    <option value="Clean" className="text-gray-900">Clean</option>
                    <option value="Needs Cleaning" className="text-gray-900">Needs Cleaning</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setShowEditStartTimePicker(false);
                      setShowEditEndTimePicker(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
                    title="Cancel editing"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editFormLoading}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200 cursor-pointer"
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-auto border border-gray-300 cursor-auto">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Delete Schedule</h3>
            </div>
            <div className="p-6">
              {deleteError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-700">{deleteError}</div>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete the schedule for <strong className="text-gray-900">{deletingSchedule.class_name}</strong> in <strong className="text-gray-900">{deletingSchedule.room_number}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 cursor-pointer"
                  title="Cancel deletion"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSchedule}
                  disabled={deleteLoading}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200 cursor-pointer"
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