import React, { useState, useEffect } from 'react';
import { getAllUsers, getAllClasses, exportAllUsers, exportAllClasses, getTeacherReports, type User, type Class as ApiClass } from '../services/authService';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import './DashboardPage.css';

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

// Extended User interface to include name property
interface ExtendedUser {
  id: number;
  email: string;
  role: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

const ReportsPage: React.FC = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teacherReports, setTeacherReports] = useState<TeacherReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<{ users: boolean; classes: boolean }>({
    users: false,
    classes: false
  });

  // Helper function to get user display name
  const getUserDisplayName = (user: any): string => {
    if (!user) return 'User';
    
    // Try different possible name properties
    if (user.name) return user.name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0]; // Use part of email as fallback
    
    return user.role === 'admin' ? 'Admin User' : 'Teacher';
  };

  // Fetch data on component mount - role-aware
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        console.log('Fetching reports data for user role:', user.role);
        setLoading(true);
        setError(null);
        
        if (user.role === 'admin') {
          console.log('🔑 Admin user - fetching all users and classes');
          const [usersData, classesData] = await Promise.all([
            getAllUsers(),
            getAllClasses()
          ]);
          
          console.log('Users data fetched:', usersData);
          console.log('Classes data fetched:', classesData);
          
          setUsers(usersData);
          
          const enhancedClasses: Class[] = classesData.map(cls => ({
            ...cls,
            status: 'Active',
            assignedTeacher: cls.teacher_id ? `Teacher ${cls.teacher_id}` : 'Unassigned'
          }));
          
          setClasses(enhancedClasses);
        } else if (user.role === 'teacher') {
          console.log('👨‍🏫 Teacher user - fetching teacher reports');
          const reportsData = await getTeacherReports();
          console.log('Teacher reports fetched:', reportsData);
          
          // Validate and ensure the data structure is correct
          if (reportsData) {
            const validatedReports: TeacherReports = {
              class_performance: reportsData.class_performance || [],
              student_performance: reportsData.student_performance || [],
              summary: reportsData.summary || {
                total_classes: 0,
                total_students: 0,
                overall_average_grade: 0,
                overall_submission_rate: 0
              }
            };
            setTeacherReports(validatedReports);
          } else {
            // If no data returned, set empty structure
            setTeacherReports({
              class_performance: [],
              student_performance: [],
              summary: {
                total_classes: 0,
                total_students: 0,
                overall_average_grade: 0,
                overall_submission_rate: 0
              }
            });
          }
        } else {
          console.warn('⚠️  Unknown or unauthorized user role for reports');
        }
        
        console.log('Data fetch completed successfully');
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate metrics
  const totalActiveUsers = users.filter(user => user.role === 'teacher' || user.role === 'student').length;
  const totalActiveClasses = classes.filter(cls => cls.status === 'Active').length;
  const totalTeachers = users.filter(user => user.role === 'teacher').length;
  const totalStudents = users.filter(user => user.role === 'student').length;

  // Calculate total students across all teacher's classes
  const totalStudentsInMyClasses = teacherReports?.class_performance.reduce((total, classData) => {
    return total + (classData.total_students || 0);
  }, 0) || 0;

  // CSV Helper Function
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) {
              return '';
            }
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw new Error('Failed to generate CSV file');
    }
  };

  // Export functions
  const exportUsersToCSV = async () => {
    console.log('Export Users Data button clicked');
    setExportLoading(prev => ({ ...prev, users: true }));
    try {
      const usersData = await exportAllUsers();
      console.log('Users data received:', usersData);
      downloadCSV(usersData, 'users_export.csv');
      console.log('CSV download initiated successfully');
    } catch (err) {
      console.error('Failed to export users:', err);
      alert(`Failed to export users data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExportLoading(prev => ({ ...prev, users: false }));
    }
  };

  const exportClassesToCSV = async () => {
    console.log('Export Classes Data button clicked');
    setExportLoading(prev => ({ ...prev, classes: true }));
    try {
      const classesData = await exportAllClasses();
      console.log('Classes data received:', classesData);
      downloadCSV(classesData, 'classes_export.csv');
      console.log('CSV download initiated successfully');
    } catch (err) {
      console.error('Failed to export classes:', err);
      alert(`Failed to export classes data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExportLoading(prev => ({ ...prev, classes: false }));
    }
  };

  return (
    <div className="h-screen w-full bg-white overflow-hidden relative flex">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={plmunLogo} 
              alt="PLMun Logo" 
              className="w-8 h-8 rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {user?.role === 'admin' ? 'System Reports & Analytics' : 'My Reports & Analytics'}
              </h1>
              <p className="text-xs text-gray-600">
                {user?.role === 'admin' ? 'Comprehensive data insights and export capabilities' : 'Student performance and class analytics'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Toggle navigation menu"
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
            title={user?.role === 'admin' ? "System Reports & Analytics" : "My Reports & Analytics"}
            subtitle={user?.role === 'admin' ? "Comprehensive data insights and export capabilities" : "Student performance and class analytics"}
            userInfo={{
              name: getUserDisplayName(user),
              role: user?.role === 'admin' ? 'Administrator' : (user?.role || 'User'),
              status: 'active',
              lastActive: 'Just now'
            }}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 relative z-20">
          <div className="dashboard-content w-full max-w-7xl mx-auto">
            
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-4 border-blue-200 border-t-blue-500"></div>
                    <div className="absolute inset-0 rounded-full h-12 w-12 lg:h-16 lg:w-16 border-4 border-transparent border-r-purple-500/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 text-base lg:text-lg font-medium">Loading Analytics Dashboard</p>
                    <p className="text-gray-500 text-xs lg:text-sm">Gathering system insights...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 lg:px-6 py-3 lg:py-4 rounded-2xl mb-6 lg:mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm lg:text-base">{error}</span>
                </div>
              </div>
            )}

            {/* Main Content */}
            {!loading && !error && (
              <div className="space-y-6 lg:space-y-8">
                {/* Hero Section */}
                <div className="text-center py-4 lg:py-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl lg:rounded-3xl mb-4 lg:mb-6 shadow-2xl shadow-blue-500/25">
                    <svg className="w-6 h-6 lg:w-10 lg:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3 lg:mb-4">
                    {user?.role === 'admin' ? 'System Analytics' : 'My Reports & Analytics'}
                  </h1>
                  <p className="text-base lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
                    {user?.role === 'admin' 
                      ? "Comprehensive insights into your educational platform's performance and data management"
                      : "Student performance insights and class analytics for your assigned classes"
                    }
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                  {/* Active Users / My Students - BLUE CARD */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100 to-purple-100 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-blue-200 hover:border-blue-300 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-6 lg:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-xl lg:text-3xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                            {user?.role === 'admin' ? totalActiveUsers : (teacherReports?.summary.total_students || 0)}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600">
                            {user?.role === 'admin' ? 'Active Users' : 'My Students'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 lg:space-y-2">
                        <p className="text-gray-700 font-medium text-sm lg:text-base">
                          {user?.role === 'admin' ? 'Teachers and students' : 'Student Count'}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500">
                          {user?.role === 'admin' 
                            ? 'Teachers and students in the system'
                            : 'Total students enrolled in your classes'
                          }
                        </p>
                        <div className="flex justify-between text-xs text-gray-400">
                          {user?.role === 'admin' ? (
                            <>
                              <span>{totalTeachers} teachers</span>
                              <span>{totalStudents} students</span>
                            </>
                          ) : (
                            <span>{teacherReports?.summary.total_classes || 0} Classes</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Classes / My Classes - GREEN CARD */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-emerald-200 hover:border-emerald-300 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-6 lg:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-xl lg:text-3xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                            {user?.role === 'admin' ? totalActiveClasses : (teacherReports?.summary.total_classes || 0)}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600">
                            {user?.role === 'admin' ? 'Active Classes' : 'My Classes'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 lg:space-y-2">
                        <p className="text-gray-700 font-medium text-sm lg:text-base">
                          {user?.role === 'admin' ? 'System Classes' : 'Assigned Classes'}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500">
                          {user?.role === 'admin' 
                            ? 'Currently active classes in the system'
                            : 'Classes assigned to you'
                          }
                        </p>
                        <div className="text-xs text-gray-400">
                          <span>{user?.role === 'admin' ? 'All classes operational' : `${totalStudentsInMyClasses} Students enrolled`}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Health / Class Performance - PURPLE CARD */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-purple-100 to-pink-100 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-purple-200 hover:border-purple-300 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-6 lg:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-xl lg:text-3xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300">
                            {user?.role === 'admin' ? '100%' : `${teacherReports?.summary.overall_average_grade || 0}%`}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600">
                            {user?.role === 'admin' ? 'System Health' : 'Avg Grade'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 lg:space-y-2">
                        <p className="text-gray-700 font-medium text-sm lg:text-base">
                          {user?.role === 'admin' ? 'All Systems Operational' : 'Class Performance'}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500">
                          {user?.role === 'admin' 
                            ? 'Platform running smoothly'
                            : 'Overall average grade across classes'
                          }
                        </p>
                        <div className="text-xs text-gray-400">
                          <span>Last updated: Now</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Integrity / Submission Rate - ORANGE CARD */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 via-orange-100 to-red-100 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-orange-200 hover:border-orange-300 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
                          <svg className="h-4 w-4 lg:h-6 lg:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-xl lg:text-3xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">
                            {user?.role === 'admin' ? (users.length + classes.length) : `${teacherReports?.summary.overall_submission_rate || 0}%`}
                          </p>
                          <p className="text-xs lg:text-sm text-gray-600">
                            {user?.role === 'admin' ? 'Data Records' : 'Submission Rate'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 lg:space-y-2">
                        <p className="text-gray-700 font-medium text-sm lg:text-base">
                          {user?.role === 'admin' ? 'Data Integrity' : 'Assignment Completion'}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500">
                          {user?.role === 'admin' 
                            ? 'All records validated and secure'
                            : 'Overall assignment submission rate'
                          }
                        </p>
                        <div className="text-xs text-gray-400">
                          <span>{user?.role === 'admin' ? 'Backup: Enabled' : 'All assignments'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teacher-specific Student Performance Section */}
                {user?.role === 'teacher' && teacherReports && (
                  <div className="space-y-6 lg:space-y-8">
                    {/* Class Performance Overview */}
                    {teacherReports.class_performance.length > 0 ? (
                      <div className="bg-white border border-gray-200 rounded-2xl lg:rounded-3xl p-4 lg:p-12 shadow-2xl">
                        <div className="text-center mb-6 lg:mb-8">
                          <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl lg:rounded-2xl mb-3 lg:mb-4 shadow-lg">
                            <svg className="h-6 w-6 lg:h-8 lg:w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <h2 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">Class Performance Overview</h2>
                          <p className="text-gray-600 text-sm lg:text-lg max-w-2xl mx-auto">
                            Performance metrics for each of your assigned classes
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 lg:gap-6">
                          {teacherReports.class_performance.map((classData) => (
                            <div key={classData.class_id} className="bg-gray-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-gray-200">
                              <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <h3 className="text-base lg:text-xl font-bold text-gray-900 truncate">{classData.class_name}</h3>
                                <span className="text-xs lg:text-sm text-gray-600">{classData.class_code}</span>
                              </div>
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-3 lg:mb-4">
                                <div className="text-center">
                                  <p className="text-lg lg:text-2xl font-bold text-blue-600">{classData.total_students}</p>
                                  <p className="text-xs lg:text-sm text-gray-600">Students</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg lg:text-2xl font-bold text-emerald-600">{classData.total_assignments}</p>
                                  <p className="text-xs lg:text-sm text-gray-600">Assignments</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg lg:text-2xl font-bold text-purple-600">{classData.average_grade}%</p>
                                  <p className="text-xs lg:text-sm text-gray-600">Avg Grade</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg lg:text-2xl font-bold text-orange-600">{classData.submission_rate}%</p>
                                  <p className="text-xs lg:text-sm text-gray-600">Submission Rate</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-2xl lg:rounded-3xl p-8 lg:p-12 shadow-2xl text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl lg:rounded-3xl mb-4 lg:mb-6 shadow-lg">
                          <svg className="h-8 w-8 lg:h-10 lg:w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <h2 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">No Classes Assigned</h2>
                        <p className="text-gray-600 text-sm lg:text-lg max-w-2xl mx-auto">
                          You don't have any classes assigned to you yet. Please contact the administrator to get assigned to classes.
                        </p>
                      </div>
                    )}

                    {/* Individual Student Performance Table */}
                    {teacherReports.student_performance.length > 0 ? (
                      <div className="bg-white border border-gray-200 rounded-2xl lg:rounded-3xl p-4 lg:p-12 shadow-2xl">
                        <div className="text-center mb-6 lg:mb-8">
                          <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl lg:rounded-2xl mb-3 lg:mb-4 shadow-lg">
                            <svg className="h-6 w-6 lg:h-8 lg:w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <h2 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">Individual Student Performance</h2>
                          <p className="text-gray-600 text-sm lg:text-lg max-w-2xl mx-auto">
                            Detailed performance data for each student across your classes
                          </p>
                        </div>
                        
                        {/* Mobile Card View */}
                        <div className="block lg:hidden space-y-3">
                          {teacherReports.student_performance.map((student) => (
                            <div key={`${student.student_id}-${student.class_id}`} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                              <div className="space-y-3">
                                <div>
                                  <h3 className="text-gray-900 font-semibold text-sm mb-1">{student.student_name}</h3>
                                  <p className="text-gray-600 text-xs">{student.class_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-gray-700 text-xs">Average Grade</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      student.average_grade_in_class >= 90 ? 'bg-green-100 text-green-800' :
                                      student.average_grade_in_class >= 80 ? 'bg-blue-100 text-blue-800' :
                                      student.average_grade_in_class >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {student.average_grade_in_class}%
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-gray-700 text-xs">Submission Rate</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      student.submission_rate >= 90 ? 'bg-green-100 text-green-800' :
                                      student.submission_rate >= 70 ? 'bg-blue-100 text-blue-800' :
                                      student.submission_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {student.submission_rate}%
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-700 text-xs">Assignments</p>
                                  <p className="text-gray-900 text-xs">{student.total_assignments_submitted} / {student.total_assignments_available} submitted</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-gray-300">
                                <th className="pb-4 text-gray-900 font-semibold">Student Name</th>
                                <th className="pb-4 text-gray-900 font-semibold">Class</th>
                                <th className="pb-4 text-gray-900 font-semibold">Average Grade</th>
                                <th className="pb-4 text-gray-900 font-semibold">Assignments Submitted</th>
                                <th className="pb-4 text-gray-900 font-semibold">Submission Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherReports.student_performance.map((student) => (
                                <tr key={`${student.student_id}-${student.class_id}`} className="border-b border-gray-200">
                                  <td className="py-4 text-gray-900 font-medium">{student.student_name}</td>
                                  <td className="py-4 text-gray-700">{student.class_name}</td>
                                  <td className="py-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      student.average_grade_in_class >= 90 ? 'bg-green-100 text-green-800' :
                                      student.average_grade_in_class >= 80 ? 'bg-blue-100 text-blue-800' :
                                      student.average_grade_in_class >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {student.average_grade_in_class}%
                                    </span>
                                  </td>
                                  <td className="py-4 text-gray-700">
                                    {student.total_assignments_submitted} / {student.total_assignments_available}
                                  </td>
                                  <td className="py-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      student.submission_rate >= 90 ? 'bg-green-100 text-green-800' :
                                      student.submission_rate >= 70 ? 'bg-blue-100 text-blue-800' :
                                      student.submission_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {student.submission_rate}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : teacherReports.class_performance.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-2xl lg:rounded-3xl p-8 lg:p-12 shadow-2xl text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl lg:rounded-3xl mb-4 lg:mb-6 shadow-lg">
                          <svg className="h-8 w-8 lg:h-10 lg:w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <h2 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">No Student Data Available</h2>
                        <p className="text-gray-600 text-sm lg:text-lg max-w-2xl mx-auto">
                          There are no students enrolled in your classes yet, or no performance data has been recorded.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Data Export Section - Admin Only */}
                {user?.role === 'admin' && (
                  <div className="bg-white border border-gray-200 rounded-2xl lg:rounded-3xl p-4 lg:p-12 shadow-2xl">
                    <div className="text-center mb-6 lg:mb-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl lg:rounded-2xl mb-3 lg:mb-4 shadow-lg">
                        <svg className="h-6 w-6 lg:h-8 lg:w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h2 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3">Data Export Center</h2>
                      <p className="text-gray-600 text-sm lg:text-lg max-w-2xl mx-auto">
                        Export comprehensive system data in CSV format for analysis, reporting, and backup purposes
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                      {/* Export Users Button */}
                      <button
                        onClick={exportUsersToCSV}
                        disabled={exportLoading.users}
                        className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold py-4 lg:py-6 px-4 lg:px-8 rounded-xl lg:rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        title="Export users data to CSV"
                        aria-label={`Export users data to CSV format containing ${totalActiveUsers} records`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center justify-center space-x-3 lg:space-x-4">
                          {exportLoading.users ? (
                            <div className="flex items-center space-x-2 lg:space-x-3">
                              <div className="animate-spin rounded-full h-4 w-4 lg:h-6 lg:w-6 border-2 border-white/30 border-t-white"></div>
                              <span className="text-sm lg:text-lg">Exporting Users...</span>
                            </div>
                          ) : (
                            <>
                              <div className="p-1 lg:p-2 bg-white/20 rounded-lg lg:rounded-xl">
                                <svg className="h-4 w-4 lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                              </div>
                              <div className="text-left">
                                <p className="text-sm lg:text-lg font-semibold">Export Users Data</p>
                                <p className="text-xs lg:text-sm text-blue-100">CSV format • {totalActiveUsers} records</p>
                              </div>
                            </>
                          )}
                        </div>
                      </button>

                      {/* Export Classes Button */}
                      <button
                        onClick={exportClassesToCSV}
                        disabled={exportLoading.classes}
                        className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white font-semibold py-4 lg:py-6 px-4 lg:px-8 rounded-xl lg:rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        title="Export classes data to CSV"
                        aria-label={`Export classes data to CSV format containing ${totalActiveClasses} records`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center justify-center space-x-3 lg:space-x-4">
                          {exportLoading.classes ? (
                            <div className="flex items-center space-x-2 lg:space-x-3">
                              <div className="animate-spin rounded-full h-4 w-4 lg:h-6 lg:w-6 border-2 border-white/30 border-t-white"></div>
                              <span className="text-sm lg:text-lg">Exporting Classes...</span>
                            </div>
                          ) : (
                            <>
                              <div className="p-1 lg:p-2 bg-white/20 rounded-lg lg:rounded-xl">
                                <svg className="h-4 w-4 lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                              <div className="text-left">
                                <p className="text-sm lg:text-lg font-semibold">Export Classes Data</p>
                                <p className="text-xs lg:text-sm text-emerald-100">CSV format • {totalActiveClasses} records</p>
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 lg:mt-8 p-4 lg:p-6 bg-gray-50 rounded-xl lg:rounded-2xl border border-gray-200">
                      <div className="flex items-start space-x-3 lg:space-x-4">
                        <div className="p-1 lg:p-2 bg-blue-100 rounded-lg">
                          <svg className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-gray-900 font-medium mb-1 lg:mb-2 text-sm lg:text-base">Export Information</h4>
                          <p className="text-gray-600 text-xs lg:text-sm leading-relaxed">
                            All exports include comprehensive data with proper formatting. CSV files are compatible with Excel, Google Sheets, and other data analysis tools. 
                            Exports are generated in real-time and include the most current system data.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;