import React, { useState, useEffect } from 'react';
import { authService, getAllClasses, getTeacherClasses, getStudentClasses } from '../services/authService';
import type { ScheduleCreate, Class, ScheduleEnrichedResponse } from '../services/authService';
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading schedule and class data...');
      console.log('👤 Current user role:', user?.role);
      
      // Determine which classes endpoint to use based on user role
      let classesData: Class[] = [];
      
      if (user?.role === 'admin') {
        console.log('🔑 Admin user - using getAllClasses()');
        classesData = await getAllClasses();
      } else if (user?.role === 'teacher') {
        console.log('👨‍🏫 Teacher user - using getTeacherClasses()');
        const teacherData = await getTeacherClasses();
        classesData = teacherData.classes;
      } else if (user?.role === 'student') {
        console.log('👨‍🎓 Student user - using getStudentClasses()');
        classesData = await getStudentClasses();
      } else {
        console.warn('⚠️  Unknown user role, using empty classes');
        classesData = [];
      }
      
      // Load schedules based on user role
      let schedulesData: ScheduleEnrichedResponse[] = [];
      
      if (user?.role === 'student') {
        console.log('👨‍🎓 Student user - using getStudentSchedule()');
        schedulesData = await authService.getStudentSchedule();
      } else {
        console.log('👨‍🏫 Admin/Teacher user - using getSchedulesLive()');
        schedulesData = await authService.getSchedulesLive();
      }
      
      console.log('📚 Classes loaded:', classesData);
      console.log('📅 Schedules loaded:', schedulesData);
      
      setSchedules(schedulesData);
      setClasses(classesData);
      
      // Log class IDs for debugging
      if (classesData && classesData.length > 0) {
        console.log('✅ Available class IDs:', classesData.map(c => c.id));
        console.log('✅ Available class names:', classesData.map(c => `${c.name} (${c.code})`));
      } else {
        console.warn('⚠️  No classes found for current user role!');
      }
      
    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      console.error('Error details:', {
        status: err.response?.status,
        message: err.message,
        data: err.response?.data
      });
      
      if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to view this data.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Creating schedule with data:', formData);
    
    // Enhanced validation
    if (!formData.class_id || formData.class_id === 0) {
      setFormError('Please select a valid class');
      return;
    }
    
    if (!formData.start_time || !formData.end_time || !formData.room_number) {
      setFormError('Please fill in all required fields');
      return;
    }

    // Validate that the selected class_id exists in the current classes list
    const selectedClass = classes.find(c => c.id === formData.class_id);
    if (!selectedClass) {
      console.error('❌ Selected class not found in classes list:', {
        selectedClassId: formData.class_id,
        availableClasses: classes.map(c => ({ id: c.id, name: c.name, code: c.code }))
      });
      setFormError(`Selected class (ID: ${formData.class_id}) is no longer valid. Please refresh the page and try again.`);
      return;
    }

    console.log('✅ Validating class selection:', {
      selectedClassId: formData.class_id,
      selectedClassName: selectedClass.name,
      selectedClassCode: selectedClass.code
    });

    try {
      setFormLoading(true);
      setFormError(null);
      
      console.log('🚀 Sending schedule creation request...');
      await authService.createSchedule(formData);
      
      console.log('✅ Schedule created successfully!');
      setSuccessMessage('Schedule created successfully!');
      setIsModalOpen(false);
      setFormData({
        class_id: 0,
        start_time: '',
        end_time: '',
        room_number: '',
        status: 'Occupied'
      });
      
      // Reload data to show the new schedule
      await loadData();
    } catch (err: any) {
      console.error('❌ Error creating schedule:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      // Provide more specific error messages
      if (err.response?.status === 404) {
        setFormError(`Class with ID ${formData.class_id} not found. Please refresh the page and select a valid class.`);
      } else {
        setFormError(err.response?.data?.detail || 'Failed to create schedule');
      }
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
      
      // Reload data to show the updated schedule
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
      
      // Reload data to show the updated list
      await loadData();
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete schedule');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Clean': return 'bg-green-100 text-green-800';
      case 'Occupied': return 'bg-blue-100 text-blue-800';
      case 'Needs Cleaning': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
  console.log('🔍 Search term:', searchTerm);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm"></div>
              <img 
                src={plmunLogo} 
                alt="PLMun Logo" 
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{user?.role === 'student' ? "My Schedule" : "Schedule Management"}</h1>
              <p className="text-xs text-slate-400">{user?.role === 'student' ? "View your class schedules" : "Create, edit, and manage class schedules"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Logout Button */}
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
            
            {/* Menu Button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

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
            title={user?.role === 'student' ? "My Schedule" : "Schedule Management"}
            subtitle={user?.role === 'student' ? "View your class schedules and timetables" : "Create, edit, and manage class schedules"}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 bg-transparent p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-7xl mx-auto pb-20">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-2 text-sm text-green-700">{successMessage}</div>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="inline-flex text-green-400 hover:text-green-600"
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

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-white">Class Schedules</h2>
                  <span className="text-sm text-slate-400">
                    {filteredSchedules.length} {filteredSchedules.length === 1 ? 'schedule' : 'schedules'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-slate-600/50 text-sm font-medium rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className={`-ml-1 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                  {user?.role !== 'student' && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Schedule
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search schedules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-600/50 rounded-lg leading-5 bg-slate-700/50 placeholder-slate-400 text-white focus:outline-none focus:placeholder-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700/50">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      End Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800/30 divide-y divide-slate-700/50">
                  {filteredSchedules.length > 0 ? (
                    filteredSchedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-slate-700/50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{schedule.class_name}</div>
                          <div className="text-sm text-slate-400">{schedule.class_code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {schedule.teacher_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {schedule.room_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {formatDateTime(schedule.start_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {formatDateTime(schedule.end_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user?.role !== 'student' ? (
                            <>
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="text-blue-400 hover:text-blue-300 mr-3 transition-colors duration-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule)}
                                className="text-red-400 hover:text-red-300 transition-colors duration-200"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400">View Only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <h3 className="text-lg font-medium text-white mb-2">No schedules found</h3>
                          <p className="text-slate-400 mb-4">
                            {searchTerm ? 'No schedules match your search criteria.' : 'Get started by creating your first schedule.'}
                          </p>
                          {!searchTerm && (
                            <button
                              onClick={() => setIsModalOpen(true)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
                            >
                              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </main>
      </div>

      {/* Create Schedule Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create New Schedule</h3>
                  <button
                    type="button"
                    onClick={loadData}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Classes
                  </button>
                </div>
                
                {formError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-700">{formError}</div>
                  </div>
                )}
                
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => {
                        const selectedClassId = parseInt(e.target.value);
                        console.log('🎯 Class selection changed:', {
                          selectedClassId,
                          selectedClass: classes.find(c => c.id === selectedClassId)
                        });
                        setFormData({ ...formData, class_id: selectedClassId });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value={0}>Select a class</option>
                      {classes.length > 0 ? (
                        classes.map((classItem) => (
                          <option key={classItem.id} value={classItem.id}>
                            {classItem.name} ({classItem.code})
                          </option>
                        ))
                      ) : (
                        <option value={0} disabled>No classes available - Please refresh the page</option>
                      )}
                    </select>
                    {classes.length === 0 && (
                      <p className="mt-1 text-sm text-red-600">
                        ⚠️ No classes found. Please ensure classes exist in the system.
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.room_number}
                      onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                      placeholder="e.g., Room 101, Lab A"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Occupied">Occupied</option>
                      <option value="Clean">Clean</option>
                      <option value="Needs Cleaning">Needs Cleaning</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {formLoading ? 'Creating...' : 'Create Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Schedule Modal */}
        {isEditModalOpen && editingSchedule && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Schedule</h3>
                
                {editFormError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-700">{editFormError}</div>
                  </div>
                )}
                
                <form onSubmit={handleUpdateSchedule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.class_id}
                      onChange={(e) => setEditFormData({ ...editFormData, class_id: parseInt(e.target.value) })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name} ({classItem.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={editFormData.start_time}
                      onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={editFormData.end_time}
                      onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.room_number}
                      onChange={(e) => setEditFormData({ ...editFormData, room_number: e.target.value })}
                      placeholder="e.g., Room 101, Lab A"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Occupied">Occupied</option>
                      <option value="Clean">Clean</option>
                      <option value="Needs Cleaning">Needs Cleaning</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editFormLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Schedule</h3>
                
                {deleteError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-700">{deleteError}</div>
                  </div>
                )}
                
                <p className="text-sm text-gray-700 mb-4">
                  Are you sure you want to delete the schedule for <strong>{deletingSchedule.class_name}</strong> in <strong>{deletingSchedule.room_number}</strong>?
                  This action cannot be undone.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteSchedule}
                    disabled={deleteLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
