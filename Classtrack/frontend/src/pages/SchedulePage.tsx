import React, { useState, useEffect } from 'react';
import { authService, getAllClasses, getTeacherClasses, getStudentSchedule } from '../services/authService';
import type { ScheduleCreate, ScheduleEnrichedResponse } from '../services/authService';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import Swal from 'sweetalert2';
import './DashboardPage.css';

interface ApiClass {
  id: number;
  name: string;
  code: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Class extends ApiClass {
  status: string;
  assignedTeacher: string;
}

interface StudentPerformance {
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
  average_grade_in_class: number;
  total_assignments_submitted: number;
  total_assignments_available: number;
  submission_rate: number;
}

interface ClassPerformance {
  class_id: number;
  class_name: string;
  class_code: string;
  total_students: number;
  total_assignments: number;
  average_grade: number;
  submission_rate: number;
  students: StudentPerformance[];
}

interface TeacherReports {
  class_performance: ClassPerformance[];
  student_performance: StudentPerformance[];
  summary: {
    total_classes: number;
    total_students: number;
    overall_average_grade: number;
    overall_submission_rate: number;
  };
}

interface ExtendedUser {
  id: number;
  email: string;
  role: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

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

const SchedulePage: React.FC = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [schedules, setSchedules] = useState<ScheduleEnrichedResponse[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

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
  
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showEditStartTimePicker, setShowEditStartTimePicker] = useState(false);
  const [showEditEndTimePicker, setShowEditEndTimePicker] = useState(false);

  // Color palette for schedule cards (Google Classroom style)
  const scheduleColors = [
    { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', text: 'text-white', icon: 'text-blue-100' },
    { bg: 'bg-gradient-to-br from-purple-500 to-purple-600', text: 'text-white', icon: 'text-purple-100' },
    { bg: 'bg-gradient-to-br from-green-500 to-green-600', text: 'text-white', icon: 'text-green-100' },
    { bg: 'bg-gradient-to-br from-pink-500 to-pink-600', text: 'text-white', icon: 'text-pink-100' },
    { bg: 'bg-gradient-to-br from-orange-500 to-orange-600', text: 'text-white', icon: 'text-orange-100' },
    { bg: 'bg-gradient-to-br from-teal-500 to-teal-600', text: 'text-white', icon: 'text-teal-100' },
    { bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', text: 'text-white', icon: 'text-indigo-100' },
    { bg: 'bg-gradient-to-br from-red-500 to-red-600', text: 'text-white', icon: 'text-red-100' },
  ];

  const getScheduleColor = (index: number) => {
    return scheduleColors[index % scheduleColors.length];
  };

  const showSuccessAlert = (
    title: string, 
    text: string = '', 
    type: 'create' | 'update' | 'delete' | 'refresh' | 'cleanliness' | 'logout' = 'create',
    autoDismiss: boolean = true,
    dismissTime: number = 3000
  ) => {
    const iconColor = type === 'delete' || type === 'logout' ? 'warning' : 'success';
    const confirmButtonColor = type === 'delete' || type === 'logout' ? '#F59E0B' : '#10B981';
    
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
          type === 'delete' || type === 'logout' ? 'text-yellow-900' : 
          type === 'refresh' || type === 'cleanliness' ? 'text-blue-900' : 
          'text-green-900'
        }`,
        confirmButton: `px-4 py-2 rounded-lg font-medium ${
          type === 'delete' || type === 'logout' ? 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer' :
          type === 'refresh' || type === 'cleanliness' ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' :
          'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
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

  const convertApiClassToLocalClass = (apiClass: any): Class => {
    return {
      id: apiClass.id || apiClass.class_id || 0,
      name: apiClass.name || apiClass.class_name || '',
      code: apiClass.code || apiClass.class_code || '',
      description: apiClass.description || '',
      createdAt: apiClass.createdAt || apiClass.created_at || '',
      updatedAt: apiClass.updatedAt || apiClass.updated_at || '',
      status: apiClass.status || 'active',
      assignedTeacher: apiClass.assignedTeacher || apiClass.teacher_name || apiClass.teacher_full_name || ''
    };
  };

  const loadScheduleData = async () => {
    try {
      console.log('🔄 Loading schedule data...');
      setIsInitialLoading(true);
      setHasInitialLoadError(false);
      setLoadingProgress(10);

      updateLoadingProgress(1, 3);
      
      if (!user) {
        showErrorAlert("Session Expired", "Please login again", true, 2000);
        setTimeout(() => window.location.href = "/login", 2000);
        return;
      }

      console.log('🔄 Loading unified schedule data...');
      console.log('👤 Current user role:', user?.role);

      let schedulesData: any[] = [];

      try {
        console.log('📅 Loading unified schedules for all roles...');
        schedulesData = await authService.getSchedulesLive();
        console.log('✅ Unified schedules loaded:', schedulesData);
      } catch (error) {
        console.error('❌ Unified schedules failed, trying role-specific endpoints:', error);
        
        if (user?.role === 'admin') {
          schedulesData = await authService.getSchedulesLive();
        } else if (user?.role === 'teacher') {
          const teacherData = await getTeacherClasses();
          const teacherDataObj = teacherData as any;
          schedulesData = teacherDataObj.schedules || [];
        } else if (user?.role === 'student') {
          const studentData = await loadStudentData();
          schedulesData = studentData.schedulesData;
        }
      }

      console.log('📅 Final schedules data:', schedulesData);

      const enrichedSchedules = Array.isArray(schedulesData) 
        ? schedulesData.map(schedule => convertToEnrichedSchedule(schedule))
        : [];
      
      console.log('📅 Enriched schedules:', enrichedSchedules);

      let finalSchedules = enrichedSchedules;
      if (user?.role === 'student') {
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

      updateLoadingProgress(2, 3);
      
      if (user?.role !== 'student') {
        try {
          let classesData: any[] = [];
          if (user?.role === 'admin') {
            const apiClasses = await getAllClasses();
            classesData = Array.isArray(apiClasses) 
              ? apiClasses.map(convertApiClassToLocalClass)
              : [];
          } else if (user?.role === 'teacher') {
            const teacherData = await getTeacherClasses();
            const teacherDataObj = teacherData as any;
            const rawClasses = Array.isArray(teacherDataObj) ? teacherDataObj : teacherDataObj?.classes || [];
            classesData = rawClasses.map(convertApiClassToLocalClass);
          }
          setClasses(classesData);
        } catch (error) {
          console.warn('⚠️ Could not load classes for form');
        }
      }

      updateLoadingProgress(3, 3);

      if (finalSchedules.length === 0) {
        console.log('ℹ️ No schedules found for current user');
      } else {
        console.log(`✅ Loaded ${finalSchedules.length} schedules for ${user?.role}`);
      }

      setTimeout(() => {
        setIsInitialLoading(false);
        setLoading(false);
        setLoadingProgress(100);
      }, 500);
      
      console.log('✅ Schedule data loaded successfully');
      
    } catch (err: any) {
      console.error('❌ Error loading schedule data:', err);
      setHasInitialLoadError(true);
      setIsInitialLoading(false);
      setLoading(false);
      const errorMsg = err.response?.data?.detail || 'Failed to load data. Please try again.';
      setError(errorMsg);
      showErrorAlert('Load Error', errorMsg, true, 4000);
    }
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { 
        const displayHour = hour % 12 || 12; 
        const period = hour < 12 ? 'AM' : 'PM';
        const timeString = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push({ 
          display: timeString, 
          value: timeString, 
          period,
          value24: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}` 
        });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

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

  const getDisplayTime = (time24: string, period: string) => {
    if (!time24) return 'Select time';
    const time12 = convertTo12Hour(time24);
    return `${time12.time} ${period}`;
  };

  useEffect(() => {
    loadScheduleData();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'room_report_submitted') {
        console.log('🔄 Room report submitted, reloading schedules...');
        loadScheduleData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen && classes.length === 0) {
      console.log('🔄 Modal opened with no classes, reloading data...');
      loadScheduleData();
    }
  }, [isModalOpen]);

  const convertToEnrichedSchedule = (schedule: any): ScheduleEnrichedResponse => {
    console.log('🔄 Converting schedule with full data:', schedule);
    
    let teacher_name = '';
    
    if (schedule.teacher_full_name && schedule.teacher_full_name !== 'Unknown Teacher') {
      teacher_name = schedule.teacher_full_name;
    } else if (schedule.teacher_name && schedule.teacher_name !== 'Unknown Teacher') {
      teacher_name = schedule.teacher_name;
    } else if (schedule.teacherName) {
      teacher_name = schedule.teacherName;
    } else if (schedule.instructor_name) {
      teacher_name = schedule.instructor_name;
    } else if (schedule.teacher) {
      teacher_name = schedule.teacher;
    } else if (schedule.instructor) {
      teacher_name = schedule.instructor;
    } else if (schedule.teacher_info) {
      const teacherInfo = schedule.teacher_info;
      if (typeof teacherInfo === 'string') {
        teacher_name = teacherInfo;
      } else if (teacherInfo.first_name || teacherInfo.last_name) {
        teacher_name = `${teacherInfo.first_name || ''} ${teacherInfo.last_name || ''}`.trim();
      } else if (teacherInfo.name) {
        teacher_name = teacherInfo.name;
      } else if (teacherInfo.username) {
        teacher_name = teacherInfo.username;
      }
    }
    
    if (!teacher_name && schedule.class_info && schedule.class_info.teacher) {
      teacher_name = schedule.class_info.teacher;
    }
    
    if (!teacher_name) {
      teacher_name = 'Unknown Teacher';
      console.log('⚠️ Could not find teacher name in schedule:', schedule);
    }
    
    let class_name = '';
    let class_code = '';
    
    if (schedule.class_name && schedule.class_name !== 'Class Name') {
      class_name = schedule.class_name;
    } else if (schedule.className) {
      class_name = schedule.className;
    } else if (schedule.name) {
      class_name = schedule.name;
    } else if (schedule.title) {
      class_name = schedule.title;
    } else if (schedule.class_info && schedule.class_info.name) {
      class_name = schedule.class_info.name;
    } else {
      class_name = `Class ${schedule.class_id || schedule.id || ''}`;
    }
    
    if (schedule.class_code && schedule.class_code !== 'N/A') {
      class_code = schedule.class_code;
    } else if (schedule.code) {
      class_code = schedule.code;
    } else if (schedule.course_code) {
      class_code = schedule.course_code;
    } else if (schedule.class_info && schedule.class_info.code) {
      class_code = schedule.class_info.code;
    } else {
      class_code = 'N/A';
    }

    return {
      ...schedule,
      id: schedule.id || schedule.schedule_id || Math.random().toString(36).substr(2, 9),
      class_id: schedule.class_id || schedule.classId || 0,
      class_name,
      class_code,
      teacher_name,
      teacher_full_name: teacher_name,
      room_number: schedule.room_number || schedule.room || schedule.room_name || 'Room 101',
      start_time: schedule.start_time || schedule.startTime || schedule.start_date || new Date().toISOString(),
      end_time: schedule.end_time || schedule.endTime || schedule.end_date || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: schedule.status || 'Occupied',
      cleanliness_before: schedule.cleanliness_before || schedule.is_clean_before || 'Unknown',
      cleanliness_after: schedule.cleanliness_after || schedule.is_clean_after || 'Unknown',
      last_report_time: schedule.last_report_time || schedule.report_time || null,
      // Extract semester/term information
      semester: schedule.semester || schedule.term || schedule.academic_term || '2025-2026_4th',
      day_of_week: schedule.day_of_week || formatDayOfWeek(schedule.start_time || schedule.start_date),
      time_slot: schedule.time_slot || formatTimeRange(schedule.start_time || schedule.start_date, schedule.end_time || schedule.end_date)
    };
  };

  const loadStudentData = async (): Promise<{ schedulesData: any[] }> => {
    let schedulesData: any[] = [];

    try {
      console.log('📅 Student: Loading student-specific schedule...');
      const response = await authService.getStudentSchedule();
      console.log('📊 Student schedule response:', response);
      console.log('📊 Student schedule response TYPE:', typeof response);
      console.log('📊 Student schedule response IS ARRAY:', Array.isArray(response));
      
      if (Array.isArray(response)) {
        schedulesData = response;
        console.log('✅ Student schedule is array with', schedulesData.length, 'items');
        
        schedulesData.forEach((schedule, index) => {
          console.log(`📊 Schedule ${index}:`, {
            id: schedule.id,
            class_id: schedule.class_id,
            class_name: schedule.class_name,
            teacher_name: schedule.teacher_name,
            teacher_full_name: schedule.teacher_full_name,
            class_info: schedule.class_info,
            teacher_info: schedule.teacher_info,
            raw_keys: Object.keys(schedule)
          });
        });
      } else if (response && typeof response === 'object') {
        const responseObj = response as any;
        console.log('📊 Response object keys:', Object.keys(responseObj));
        
        if (Array.isArray(responseObj.schedules)) {
          schedulesData = responseObj.schedules;
          console.log('✅ Found schedules in responseObj.schedules:', schedulesData.length);
        } else if (Array.isArray(responseObj.data)) {
          schedulesData = responseObj.data;
          console.log('✅ Found schedules in responseObj.data:', schedulesData.length);
        } else if (Array.isArray(responseObj.student_schedules)) {
          schedulesData = responseObj.student_schedules;
          console.log('✅ Found schedules in responseObj.student_schedules:', schedulesData.length);
        } else if (responseObj.data && typeof responseObj.data === 'object') {
          schedulesData = [responseObj.data];
          console.log('✅ Found single schedule in responseObj.data');
        } else if (responseObj.schedule && typeof responseObj.schedule === 'object') {
          schedulesData = [responseObj.schedule];
          console.log('✅ Found single schedule in responseObj.schedule');
        } else {
          for (const key in responseObj) {
            if (Array.isArray(responseObj[key])) {
              schedulesData = responseObj[key];
              console.log(`✅ Found schedules in responseObj.${key}:`, schedulesData.length);
              break;
            }
          }
          
          if (schedulesData.length === 0) {
            schedulesData = [responseObj];
            console.log('✅ Using entire response object as schedule');
          }
        }
      }
      
      console.log('✅ Final student-specific schedules:', schedulesData);
      
    } catch (error) {
      console.warn('⚠️ All student endpoints failed, using empty data');
    }

    return { schedulesData };
  };

  const handleRefreshCleanliness = async (scheduleId: number) => {
    console.log(`🔄 Manual refresh requested for schedule ${scheduleId}`);
    await loadScheduleData();
    return false;
  };

  const refreshAllCleanliness = async () => {
    try {
      console.log('🔄 Refreshing cleanliness for all schedules...');
      showLoadingAlert('Refreshing cleanliness status...');
      await loadScheduleData();
      closeAlert();
      showSuccessAlert('Cleanliness Refreshed!', 'All schedule cleanliness status has been refreshed successfully.', 'cleanliness', true, 3000);
    } catch (error) {
      console.error('❌ Error refreshing all cleanliness:', error);
      closeAlert();
      showErrorAlert('Refresh Failed', 'Failed to refresh cleanliness status', true, 3000);
    }
  };

  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    return new Date(`${date}T${time}`).toISOString();
  };

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
      showErrorAlert('Validation Error', 'Please select a valid class', true, 3000);
      return;
    }

    if (!formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time || !formData.room_number) {
      setFormError('Please fill in all required fields');
      showErrorAlert('Validation Error', 'Please fill in all required fields', true, 3000);
      return;
    }

    const selectedClass = classes.find(c => c.id === formData.class_id);
    if (!selectedClass) {
      setFormError(`Selected class is no longer valid. Please refresh the page and try again.`);
      showErrorAlert('Validation Error', 'Selected class is no longer valid. Please refresh the page and try again.', true, 3000);
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);
      showLoadingAlert('Creating schedule...', false);
      
      await authService.createSchedule(scheduleData);
      
      closeAlert();
      showSuccessAlert('Schedule Created!', 'New schedule has been created successfully.', 'create', true, 3000);
      
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
      await loadScheduleData();
    } catch (err: any) {
      console.error('❌ Error creating schedule:', err);
      closeAlert();
      const errorMsg = err.response?.data?.detail || 'Failed to create schedule';
      setFormError(errorMsg);
      showErrorAlert('Create Failed', errorMsg, true, 4000);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSchedule = (schedule: ScheduleEnrichedResponse) => {
    setEditingSchedule(schedule);
    
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
    
    const startDateTime = combineDateTime(editFormData.start_date, editFormData.start_time);
    const endDateTime = combineDateTime(editFormData.end_date, editFormData.end_time);
    
    if (!editingSchedule || !editFormData.class_id || !editFormData.start_date || !editFormData.start_time || !editFormData.end_date || !editFormData.end_time || !editFormData.room_number) {
      setEditFormError('Please fill in all required fields');
      showErrorAlert('Validation Error', 'Please fill in all required fields', true, 3000);
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
      showLoadingAlert('Updating schedule...', false);
      
      await authService.updateSchedule(editingSchedule.id, scheduleData);
      
      closeAlert();
      showSuccessAlert('Schedule Updated!', 'Schedule has been updated successfully.', 'update', true, 3000);
      
      setIsEditModalOpen(false);
      setEditingSchedule(null);
      await loadScheduleData();
    } catch (err: any) {
      console.error('Error updating schedule:', err);
      closeAlert();
      const errorMsg = err.response?.data?.detail || 'Failed to update schedule';
      setEditFormError(errorMsg);
      showErrorAlert('Update Failed', errorMsg, true, 4000);
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleDeleteSchedule = async (schedule: ScheduleEnrichedResponse) => {
    const result = await showConfirmDialog(
      'Delete Schedule?',
      `Are you sure you want to delete the schedule for "${schedule.class_name}" in ${schedule.room_number}? This action cannot be undone.`,
      'Yes, delete it'
    );
    
    if (result.isConfirmed) {
      setDeletingSchedule(schedule);
      setIsDeleteModalOpen(true);
      setDeleteError(null);
    }
  };

  const confirmDeleteSchedule = async () => {
    if (!deletingSchedule) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      showLoadingAlert('Deleting schedule...', false);
      
      await authService.deleteSchedule(deletingSchedule.id);
      
      closeAlert();
      showSuccessAlert('Schedule Deleted!', 'Schedule has been deleted successfully.', 'delete', true, 3000);
      
      setIsDeleteModalOpen(false);
      setDeletingSchedule(null);
      await loadScheduleData();
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      closeAlert();
      const errorMsg = err.response?.data?.detail || 'Failed to delete schedule';
      setDeleteError(errorMsg);
      showErrorAlert('Delete Failed', errorMsg, true, 4000);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatTime = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Time';
    }
  };

  const formatTimeRange = (startDateTime: string, endDateTime: string) => {
    try {
      const startTime = formatTime(startDateTime);
      const endTime = formatTime(endDateTime);
      return `${startTime} - ${endTime}`;
    } catch (error) {
      console.error('Error formatting time range:', error);
      return 'Invalid Time Range';
    }
  };

  const formatDateOnly = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatDayOfWeek = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleDateString('en-US', {
        weekday: 'long'
      });
    } catch (error) {
      console.error('Error formatting day of week:', error);
      return 'Invalid Day';
    }
  };

  const formatDayOfWeekShort = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleDateString('en-US', {
        weekday: 'short'
      }).toUpperCase();
    } catch (error) {
      console.error('Error formatting day of week short:', error);
      return 'Invalid Day';
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

  const getDayOfWeekNumber = (day: string) => {
    const dayMap: { [key: string]: number } = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7
    };
    return dayMap[day] || 8;
  };

  // Filter schedules based on search term
  const filteredSchedules = schedules.filter(schedule =>
    schedule.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort schedules by start time
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-2xl blur-xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-400 rounded-full animate-pulse"></div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Schedule Manager
          </h2>
          <p className="text-gray-600 max-w-md">
            Preparing your class schedules and timetable...
          </p>
        </div>

        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Loading schedules...</span>
            <span>{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md mb-8">
          {[
            { text: "Schedules", color: "bg-blue-100 text-blue-600" },
            { text: "Classes", color: "bg-purple-100 text-purple-600" },
            { text: "Teachers", color: "bg-green-100 text-green-600" },
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

        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Loading your timetable and class information...
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
            Unable to Load Schedules
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an issue while loading your schedule data. This could be due to network issues or server problems.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={loadScheduleData}
              className="w-full px-6 py-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
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
              Retry Loading Schedules
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
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
                const handleLogout = async () => {
                  const result = await showConfirmDialog(
                    'Confirm Logout',
                    'Are you sure you want to logout? You will need to log in again to access your schedule.',
                    'Yes, logout'
                  );
                  
                  if (result.isConfirmed) {
                    try {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('userRole');
                      localStorage.removeItem('userId');
                      showSuccessAlert('Logged Out', 'You have been successfully logged out.', 'logout', true, 1500);
                      setTimeout(() => {
                        window.location.href = '/login';
                      }, 1500);
                    } catch (error) {
                      showErrorAlert('Logout Error', 'There was an issue logging out. Please try again.', true, 3000);
                    }
                  }
                };
                
                handleLogout();
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

      <div className={`fixed inset-y-0 left-0 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <div className="hidden lg:block">
          <DynamicHeader
            title={user?.role === 'student' ? "My Schedule" : "Schedule Management"}
            subtitle={user?.role === 'student' ? "View your class schedules and timetables" : "Create, edit, and manage class schedules"}
          />
        </div>

        {/* Stats Dashboard */}
        <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-4 mx-4 mb-4 mt-3 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Schedules</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{schedules.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Active Classes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Array.from(new Set(schedules.map(s => s.class_id))).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Different Rooms</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Array.from(new Set(schedules.map(s => s.room_number))).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Today's Schedules</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {schedules.filter(s => {
                      const scheduleDate = new Date(s.start_time);
                      const today = new Date();
                      return scheduleDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

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

            {/* Schedule Cards Section */}
            <div className="bg-white backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0">
              <div className="flex-shrink-0 bg-white backdrop-blur-sm rounded-t-xl border-b border-gray-200 p-4">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {user?.role === 'student' ? "My Class Schedule" : "Class Schedules"}
                    </h2>
                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                      {filteredSchedules.length} {filteredSchedules.length === 1 ? 'schedule' : 'schedules'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
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
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all duration-200 cursor-text"
                      />
                    </div>
                    <button
                      onClick={loadScheduleData}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                      title="Refresh schedules"
                    >
                      <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    {user?.role !== 'student' && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm cursor-pointer"
                        title="Create new schedule"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        New Schedule
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 lg:p-6">
                {user?.role === 'student' && filteredSchedules.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
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
                
                {filteredSchedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
                    <p className="text-gray-500 text-center max-w-md mb-4">
                      {searchTerm ? 'No schedules match your search criteria.' : 
                       user?.role === 'student' ? 'No schedules assigned to you yet. Please check back later.' : 
                       'Get started by creating your first schedule.'}
                    </p>
                    {!searchTerm && user?.role !== 'student' && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm cursor-pointer"
                        title="Create new schedule"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Schedule
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* All Schedules - Responsive Grid 4 cards per row */}
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-3 mb-4">
                        <h3 className="text-xl font-bold text-gray-900">All Schedules</h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {sortedSchedules.length} total
                        </span>
                      </div>
                      
                      {/* Responsive Grid - 4 cards per row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedSchedules.map((schedule, index) => {
                          const scheduleColor = getScheduleColor(index);
                          const dayShort = formatDayOfWeekShort(schedule.start_time);
                          const timeRange = formatTimeRange(schedule.start_time, schedule.end_time);
                          const semester = schedule.semester || '2025-2026_4th';
                          
                          return (
                            <div 
                              key={schedule.id} 
                              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-default flex flex-col h-full"
                            >
                              {/* Schedule Header with Color - Similar to Google Classroom */}
                              <div className={`${scheduleColor.bg} h-40 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                
                                {/* Course Title Section - Top Left */}
                                <div className="absolute top-4 left-4 right-4">
                                  <h3 className={`${scheduleColor.text} font-bold text-xl leading-tight line-clamp-2`}>
                                    {schedule.class_code || schedule.class_name}
                                  </h3>
                                  <p className={`${scheduleColor.icon} text-sm opacity-90 mt-1 line-clamp-2`}>
                                    {schedule.class_name}
                                  </p>
                                </div>
                                
                                {/* Time Slot - Middle */}
                                <div className="absolute top-20 left-4 right-4">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center ${scheduleColor.icon}`}>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className={`${scheduleColor.text} font-medium text-sm`}>
                                        {dayShort} {timeRange}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Semester/Term - Bottom */}
                                <div className="absolute bottom-4 left-4 right-4">
                                  <p className={`${scheduleColor.icon} text-xs opacity-80 truncate`}>
                                    {semester}
                                  </p>
                                </div>
                                
                                {/* Status Badge - Top Right */}
                                <span className={`absolute top-4 right-4 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(schedule.status)}`}>
                                  {schedule.status}
                                </span>
                              </div>
                              
                              {/* Schedule Content - Flexible Height */}
                              <div className="flex-1 p-4 flex flex-col">
                                <div className="space-y-3 flex-1">
                                  {/* Teacher Info */}
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-500 font-medium">Teacher</p>
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {schedule.teacher_name}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Room Info */}
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-500 font-medium">Room</p>
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {schedule.room_number}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Action Buttons */}
                                  {user?.role !== 'student' && (
                                    <div className="pt-3 border-t border-gray-100 mt-auto">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleEditSchedule(schedule)}
                                          className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-lg transition-all duration-300 text-xs border border-blue-200 font-medium cursor-pointer"
                                          title="Edit schedule"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSchedule(schedule)}
                                          className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded-lg transition-all duration-300 text-xs border border-red-200 font-medium cursor-pointer"
                                          title="Delete schedule"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Add New Schedule Card (Admin/Teacher only) */}
                        {user?.role !== 'student' && (
                          <div 
                            className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group cursor-pointer flex flex-col items-center justify-center p-6 min-h-[380px]"
                            onClick={() => setIsModalOpen(true)}
                          >
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Add New Schedule</h3>
                            <p className="text-sm text-gray-600 text-center mb-4">
                              Create a new class schedule
                            </p>
                            <div className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              Click to create
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto border border-gray-300 cursor-auto">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Create New Schedule</h2>
                  <p className="text-sm text-gray-600 mt-1">Add new class schedule to the system</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6">
              {formError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-700">{formError}</div>
                </div>
              )}

              <div className="space-y-4">
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