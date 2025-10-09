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

  // Fetch data on component mount - role-aware
  useEffect(() => {
    if (!user) return; // Wait for user context to load
    
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
          
          // Add missing properties to classes data
          const enhancedClasses: Class[] = classesData.map(cls => ({
            ...cls,
            status: 'Active', // Default status
            assignedTeacher: cls.teacher_id ? `Teacher ${cls.teacher_id}` : 'Unassigned'
          }));
          
          setClasses(enhancedClasses);
        } else if (user.role === 'teacher') {
          console.log('👨‍🏫 Teacher user - fetching teacher reports');
          const reportsData = await getTeacherReports();
          console.log('Teacher reports fetched:', reportsData);
          setTeacherReports(reportsData);
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
  }, [user]); // Depend on user context

  // Calculate metrics
  const totalActiveUsers = users.filter(user => user.role === 'teacher' || user.role === 'student').length;
  const totalActiveClasses = classes.filter(cls => cls.status === 'Active').length;
  const totalTeachers = users.filter(user => user.role === 'teacher').length;
  const totalStudents = users.filter(user => user.role === 'student').length;

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
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-y-auto relative flex">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={plmunLogo} alt="PLMun Logo" className="w-8 h-8 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">System Reports</h1>
              <p className="text-xs text-white/70">Data export and analytics</p>
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
            title={user?.role === 'admin' ? "System Reports & Analytics" : "My Reports & Analytics"}
            subtitle={user?.role === 'admin' ? "Comprehensive data insights and export capabilities" : "Student performance and class analytics"}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 min-h-0" style={{ minHeight: 'calc(100vh - 80px)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="dashboard-content w-full max-w-7xl mx-auto px-4 lg:px-8">
            
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500"></div>
                    <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-purple-500/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <div className="text-center">
                    <p className="text-white/80 text-lg font-medium">Loading Analytics Dashboard</p>
                    <p className="text-white/50 text-sm">Gathering system insights...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-200 px-6 py-4 rounded-2xl mb-8 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Main Content */}
            {!loading && !error && (
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl shadow-blue-500/25">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-4">
                    {user?.role === 'admin' ? 'System Analytics' : 'My Reports & Analytics'}
                  </h1>
                  <p className="text-xl text-white/70 max-w-2xl mx-auto">
                    {user?.role === 'admin' 
                      ? "Comprehensive insights into your educational platform's performance and data management"
                      : "Student performance insights and class analytics for your assigned classes"
                    }
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Users */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-purple-500/10 rounded-3xl p-6 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-white group-hover:text-blue-200 transition-colors duration-300">
                            {totalActiveUsers}
                          </p>
                          <p className="text-sm text-white/60">Total Users</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 font-medium">Active Users</p>
                        <p className="text-sm text-white/50">Teachers and students in the system</p>
                        <div className="flex justify-between text-xs text-white/40">
                          <span>{totalTeachers} Teachers</span>
                          <span>{totalStudents} Students</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Classes */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-teal-500/10 rounded-3xl p-6 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-white group-hover:text-emerald-200 transition-colors duration-300">
                            {totalActiveClasses}
                          </p>
                          <p className="text-sm text-white/60">Active Classes</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 font-medium">System Classes</p>
                        <p className="text-sm text-white/50">Currently active classes in the system</p>
                        <div className="text-xs text-white/40">
                          <span>All classes operational</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-pink-500/10 rounded-3xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-white group-hover:text-purple-200 transition-colors duration-300">
                            100%
                          </p>
                          <p className="text-sm text-white/60">System Health</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 font-medium">All Systems Operational</p>
                        <p className="text-sm text-white/50">Platform running smoothly</p>
                        <div className="text-xs text-white/40">
                          <span>Last updated: Now</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Integrity */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-red-500/10 rounded-3xl p-6 border border-orange-500/20 hover:border-orange-400/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-white group-hover:text-orange-200 transition-colors duration-300">
                            {users.length + classes.length}
                          </p>
                          <p className="text-sm text-white/60">Data Records</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 font-medium">Data Integrity</p>
                        <p className="text-sm text-white/50">All records validated and secure</p>
                        <div className="text-xs text-white/40">
                          <span>Backup: Enabled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teacher-specific Student Performance Section */}
                {user?.role === 'teacher' && teacherReports && (
                  <div className="space-y-8">
                    {/* Class Performance Overview */}
                    {teacherReports.class_performance.length > 0 && (
                      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 lg:p-12 border border-white/10 shadow-2xl">
                        <div className="text-center mb-8">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
                            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <h2 className="text-3xl font-bold text-white mb-3">Class Performance Overview</h2>
                          <p className="text-white/70 text-lg max-w-2xl mx-auto">
                            Performance metrics for each of your assigned classes
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {teacherReports.class_performance.map((classData) => (
                            <div key={classData.class_id} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">{classData.class_name}</h3>
                                <span className="text-sm text-white/60">{classData.class_code}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-blue-400">{classData.total_students}</p>
                                  <p className="text-sm text-white/60">Students</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-emerald-400">{classData.total_assignments}</p>
                                  <p className="text-sm text-white/60">Assignments</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-purple-400">{classData.average_grade}%</p>
                                  <p className="text-sm text-white/60">Avg Grade</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-orange-400">{classData.submission_rate}%</p>
                                  <p className="text-sm text-white/60">Submission Rate</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Individual Student Performance Table */}
                    {teacherReports.student_performance.length > 0 && (
                      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 lg:p-12 border border-white/10 shadow-2xl">
                        <div className="text-center mb-8">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4 shadow-lg">
                            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <h2 className="text-3xl font-bold text-white mb-3">Individual Student Performance</h2>
                          <p className="text-white/70 text-lg max-w-2xl mx-auto">
                            Detailed performance data for each student across your classes
                          </p>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-white/20">
                                <th className="pb-4 text-white font-semibold">Student Name</th>
                                <th className="pb-4 text-white font-semibold">Class</th>
                                <th className="pb-4 text-white font-semibold">Average Grade</th>
                                <th className="pb-4 text-white font-semibold">Assignments Submitted</th>
                                <th className="pb-4 text-white font-semibold">Submission Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherReports.student_performance.map((student) => (
                                <tr key={`${student.student_id}-${student.class_id}`} className="border-b border-white/10">
                                  <td className="py-4 text-white font-medium">{student.student_name}</td>
                                  <td className="py-4 text-white/80">{student.class_name}</td>
                                  <td className="py-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      student.average_grade_in_class >= 90 ? 'bg-green-500/20 text-green-400' :
                                      student.average_grade_in_class >= 80 ? 'bg-blue-500/20 text-blue-400' :
                                      student.average_grade_in_class >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {student.average_grade_in_class}%
                                    </span>
                                  </td>
                                  <td className="py-4 text-white/80">
                                    {student.total_assignments_submitted} / {student.total_assignments_available}
                                  </td>
                                  <td className="py-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      student.submission_rate >= 90 ? 'bg-green-500/20 text-green-400' :
                                      student.submission_rate >= 70 ? 'bg-blue-500/20 text-blue-400' :
                                      student.submission_rate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
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
                    )}
                  </div>
                )}

                {/* Data Export Section - Admin Only */}
                {user?.role === 'admin' && (
                <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 lg:p-12 border border-white/10 shadow-2xl">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-4 shadow-lg">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Data Export Center</h2>
                    <p className="text-white/70 text-lg max-w-2xl mx-auto">
                      Export comprehensive system data in CSV format for analysis, reporting, and backup purposes
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Export Users Button */}
                    <button
                      onClick={exportUsersToCSV}
                      disabled={exportLoading.users}
                      className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold py-6 px-8 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative flex items-center justify-center space-x-4">
                        {exportLoading.users ? (
                          <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
                            <span className="text-lg">Exporting Users...</span>
                          </div>
                        ) : (
                          <>
                            <div className="p-2 bg-white/20 rounded-xl">
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="text-lg font-semibold">Export Users Data</p>
                              <p className="text-sm text-blue-100">CSV format • {totalActiveUsers} records</p>
                            </div>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Export Classes Button */}
                    <button
                      onClick={exportClassesToCSV}
                      disabled={exportLoading.classes}
                      className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white font-semibold py-6 px-8 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative flex items-center justify-center space-x-4">
                        {exportLoading.classes ? (
                          <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
                            <span className="text-lg">Exporting Classes...</span>
                          </div>
                        ) : (
                          <>
                            <div className="p-2 bg-white/20 rounded-xl">
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="text-lg font-semibold">Export Classes Data</p>
                              <p className="text-sm text-emerald-100">CSV format • {totalActiveClasses} records</p>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">Export Information</h4>
                        <p className="text-white/70 text-sm leading-relaxed">
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