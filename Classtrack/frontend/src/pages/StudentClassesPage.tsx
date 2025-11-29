import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentClassesAll, getStudentAssignmentsAll } from '../services/authService';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import './DashboardPage.css';

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number;
  teacher_name: string;
  description?: string;
  created_at: string;
}

interface Assignment {
  id: number;
  name: string;
  description?: string;
  class_id: number;
  class_name: string;
  class_code?: string;
  teacher_name: string;
  creator_id: number;
  created_at: string;
}

const StudentClassesPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Metrics for student
  const [studentMetrics, setStudentMetrics] = useState({
    total_classes: 0,
    total_assignments: 0,
    upcoming_assignments: 0
  });

  // Fetch student classes and assignments on component mount
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const fetchStudentData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching student data...');

        // Fetch classes and assignments in parallel
        const [classesData, assignmentsData] = await Promise.all([
          getStudentClassesAll(),
          getStudentAssignmentsAll()
        ]);

        console.log('✅ Student classes loaded:', classesData);
        console.log('✅ Student assignments loaded:', assignmentsData);

        // Transform the data to ensure proper structure
        const transformedClasses: Class[] = classesData.map((classItem: any) => ({
          id: classItem.id,
          name: classItem.name || `Class ${classItem.id}`,
          code: classItem.code || `CODE${classItem.id}`,
          teacher_id: classItem.teacher_id || 0,
          teacher_name: classItem.teacher_name || classItem.teacher_username || 'Default Teacher',
          description: classItem.description,
          created_at: classItem.created_at || new Date().toISOString()
        }));

        // ENHANCED: Enrich assignments with proper class names and codes from classes data
        const transformedAssignments: Assignment[] = assignmentsData.map((assignment: any) => {
          // Find the corresponding class to get accurate class name and code
          const classInfo = transformedClasses.find(cls => cls.id === assignment.class_id);
          
          return {
            id: assignment.id,
            name: assignment.name || `Assignment ${assignment.id}`,
            description: assignment.description,
            class_id: assignment.class_id,
            class_name: classInfo?.name || assignment.class_name || `Class ${assignment.class_id}`,
            class_code: classInfo?.code || assignment.class_code || `CODE${assignment.class_id}`,
            teacher_name: assignment.teacher_name || assignment.teacher_username || classInfo?.teacher_name || 'Default Teacher',
            creator_id: assignment.creator_id,
            created_at: assignment.created_at || new Date().toISOString()
          };
        });

        setClasses(transformedClasses);
        setAssignments(transformedAssignments);

        // Calculate metrics
        const metrics = {
          total_classes: transformedClasses.length,
          total_assignments: transformedAssignments.length,
          upcoming_assignments: transformedAssignments.filter(a => 
            new Date(a.created_at) > new Date()
          ).length
        };

        setStudentMetrics(metrics);
        console.log('📊 Student metrics:', metrics);

      } catch (err) {
        console.error('Failed to fetch student data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch your classes and assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user]);

  // Filter classes based on search term
  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter assignments based on search term
  const filteredAssignments = assignments.filter(assignment =>
    assignment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.class_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get assignments for a specific class
  const getAssignmentsForClass = (classId: number) => {
    return assignments.filter(assignment => assignment.class_id === classId);
  };

  // Navigate to assignments page
  const handleViewAllAssignments = () => {
    navigate('/student/assignments');
  };

  // Navigate to submit work page
  const handleSubmitWork = (assignmentId: number) => {
    navigate('/student/assignments', { state: { assignmentId } });
  };

  // Refresh data
  const refreshData = async () => {
    if (!user || user.role !== 'student') return;

    try {
      setLoading(true);
      const [classesData, assignmentsData] = await Promise.all([
        getStudentClassesAll(),
        getStudentAssignmentsAll()
      ]);

      // Transform the data to ensure proper structure
      const transformedClasses: Class[] = classesData.map((classItem: any) => ({
        id: classItem.id,
        name: classItem.name || `Class ${classItem.id}`,
        code: classItem.code || `CODE${classItem.id}`,
        teacher_id: classItem.teacher_id || 0,
        teacher_name: classItem.teacher_name || classItem.teacher_username || 'Default Teacher',
        description: classItem.description,
        created_at: classItem.created_at || new Date().toISOString()
      }));

      // ENHANCED: Enrich assignments with proper class names and codes from classes data
      const transformedAssignments: Assignment[] = assignmentsData.map((assignment: any) => {
        // Find the corresponding class to get accurate class name and code
        const classInfo = transformedClasses.find(cls => cls.id === assignment.class_id);
        
        return {
          id: assignment.id,
          name: assignment.name || `Assignment ${assignment.id}`,
          description: assignment.description,
          class_id: assignment.class_id,
          class_name: classInfo?.name || assignment.class_name || `Class ${assignment.class_id}`,
          class_code: classInfo?.code || assignment.class_code || `CODE${assignment.class_id}`,
          teacher_name: assignment.teacher_name || assignment.teacher_username || classInfo?.teacher_name || 'Default Teacher',
          creator_id: assignment.creator_id,
          created_at: assignment.created_at || new Date().toISOString()
        };
      });

      setClasses(transformedClasses);
      setAssignments(transformedAssignments);

      const metrics = {
        total_classes: transformedClasses.length,
        total_assignments: transformedAssignments.length,
        upcoming_assignments: transformedAssignments.filter(a => 
          new Date(a.created_at) > new Date()
        ).length
      };

      setStudentMetrics(metrics);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-white overflow-hidden relative flex">
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
              <h1 className="text-lg font-bold text-gray-900">My Classes</h1>
              <p className="text-xs text-gray-600">View your enrolled classes and assignments</p>
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
            title="My Classes & Assignments"
            subtitle="View your enrolled classes and upcoming assignments"
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 relative z-20">
          <div className="dashboard-content w-full max-w-7xl mx-auto">
            {/* Search & Overview Card */}
            <div className="w-full bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 lg:mb-8 shadow-lg">
              {/* Header Section */}
              <div className="flex flex-col space-y-4 mb-6 lg:mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                      <svg className="h-5 w-5 lg:h-6 lg:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
                        My Academic Overview
                      </h2>
                      <p className="text-xs text-gray-600 mt-1 lg:hidden">
                        Search and manage your classes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></div>
                    <span className="font-medium">Student</span>
                  </div>
                </div>
                
                {/* Search Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Search Classes & Assignments
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl blur-sm group-hover:blur transition-all duration-300"></div>
                    <input
                      type="text"
                      placeholder="Search by class name, teacher, or assignment..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="relative w-full px-4 py-3 lg:py-4 pl-12 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base lg:text-base font-medium"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              </div>
              
              {/* Student Metrics */}
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 lg:p-4 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-100 transition-all duration-300 group cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 lg:p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                      <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                        {studentMetrics.total_classes}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-600 font-medium">Enrolled Classes</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 lg:p-4 border-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 transition-all duration-300 group cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 lg:p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                      <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200">
                        {studentMetrics.total_assignments}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-600 font-medium">Total Assignments</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 lg:p-4 border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-100 transition-all duration-300 group cursor-pointer col-span-2 lg:col-span-1">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 lg:p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                      <svg className="h-4 w-4 lg:h-5 lg:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-200">
                        {studentMetrics.upcoming_assignments}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-600 font-medium">Upcoming</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 lg:px-6 py-3 lg:py-4 rounded-xl mb-6 lg:mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm lg:text-base">Failed to load data</p>
                    <p className="text-xs lg:text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Classes Section */}
            <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg mb-6 lg:mb-8">
              <div className="px-4 lg:px-8 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">My Enrolled Classes</h3>
                  <div className="flex items-center space-x-2 text-xs lg:text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">{filteredClasses.length} classes</span>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <div className="p-6 lg:p-12 text-center">
                  <div className="inline-flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-10 h-10 lg:w-16 lg:h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-10 h-10 lg:w-16 lg:h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm lg:text-lg font-semibold text-gray-700">Loading Your Classes</p>
                      <p className="text-xs lg:text-sm text-gray-500">Please wait while we fetch your data...</p>
                    </div>
                  </div>
                </div>
              ) : filteredClasses.length === 0 ? (
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
                        {searchTerm ? 'No classes found' : 'No classes enrolled'}
                      </h3>
                      <p className="text-gray-600 max-w-md text-xs lg:text-base">
                        {searchTerm 
                          ? `No classes match your search for "${searchTerm}". Try adjusting your search terms.`
                          : "You haven't been enrolled in any classes yet. Please contact your administrator."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Mobile Card View */}
                  <div className="block lg:hidden">
                    <div className="space-y-3 p-4">
                      {filteredClasses.map((classItem) => {
                        const classAssignments = getAssignmentsForClass(classItem.id);
                        return (
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
                                  <p className="text-xs text-gray-600 truncate">Code: {classItem.code}</p>
                                </div>
                              </div>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-700 border border-emerald-200">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>
                                Enrolled
                              </span>
                            </div>
                            
                            {/* Details */}
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">Teacher:</span>
                                <span className="text-gray-900 font-medium truncate ml-2">{classItem.teacher_name}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">Assignments:</span>
                                <span className="text-gray-900 font-bold">{classAssignments.length}</span>
                              </div>
                            </div>
                            
                            {/* Assignments Preview */}
                            {classAssignments.length > 0 && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gray-700">Recent Assignments:</span>
                                  <span className="text-xs text-blue-600 font-medium">{classAssignments.length} total</span>
                                </div>
                                <div className="space-y-2">
                                  {classAssignments.slice(0, 2).map(assignment => (
                                    <div key={assignment.id} className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-900 truncate flex-1 mr-2">
                                          {assignment.name}
                                        </span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                          {new Date(assignment.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        Class: {assignment.class_name} ({assignment.class_code})
                                      </div>
                                    </div>
                                  ))}
                                  {classAssignments.length > 2 && (
                                    <div className="text-center">
                                      <span className="text-xs text-gray-500">
                                        +{classAssignments.length - 2} more assignments
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <table className="hidden lg:table min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <tr>
                        <th className="px-6 lg:px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Class Name & Code
                        </th>
                        <th className="px-6 lg:px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Teacher
                        </th>
                        <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Assignments
                        </th>
                        <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredClasses.map((classItem) => {
                        const classAssignments = getAssignmentsForClass(classItem.id);
                        return (
                          <tr key={classItem.id} className="hover:bg-gray-50 transition-all duration-300 group border-b border-gray-100">
                            <td className="px-6 lg:px-8 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors duration-200">
                                    {classItem.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">Code: {classItem.code}</div>
                                  {classItem.description && (
                                    <div className="text-xs text-gray-600 mt-1 truncate">
                                      {classItem.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 lg:px-8 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700 truncate group-hover:text-emerald-700 transition-colors duration-200">
                                  {classItem.teacher_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center space-y-2">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-100 text-blue-700 border border-blue-200 shadow-sm hover:shadow-blue-500/20 transition-all duration-200">
                                  <svg className="w-3 h-3 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {classAssignments.length} assignments
                                </span>
                                {classAssignments.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    Latest: {new Date(classAssignments[0]?.created_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 lg:px-8 py-5 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-700 border border-emerald-200 shadow-sm hover:shadow-emerald-500/20 transition-all duration-200">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shadow-sm"></div>
                                <svg className="w-3 h-3 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Enrolled
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assignments Section - IMPROVED UI */}
            <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-4 lg:px-8 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900">All Assignments</h3>
                    <button 
                      onClick={handleViewAllAssignments}
                      className="inline-flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-300 text-xs font-medium shadow-sm hover:shadow-md transform hover:scale-105 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>View All Assignments</span>
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-xs lg:text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">{filteredAssignments.length} assignments</span>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <div className="p-6 lg:p-8 text-center">
                  <div className="inline-flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="text-gray-700">Loading assignments...</span>
                  </div>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="p-6 lg:p-8 text-center">
                  <div className="inline-flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">No Assignments</h4>
                      <p className="text-gray-600 text-sm">
                        {searchTerm 
                          ? `No assignments match your search for "${searchTerm}".`
                          : "No assignments have been posted for your classes yet."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Mobile Card View for Assignments - IMPROVED */}
                  <div className="block lg:hidden">
                    <div className="space-y-4 p-4">
                      {filteredAssignments.map((assignment) => (
                        <div key={assignment.id} className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-gray-900 truncate">{assignment.name}</h4>
                                <p className="text-xs text-gray-600 truncate">
                                  Class: {assignment.class_name} ({assignment.class_code})
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Assignment Details */}
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium">Teacher:</span>
                              <span className="text-gray-900 font-medium truncate ml-2 max-w-[120px]">{assignment.teacher_name}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium">Posted:</span>
                              <span className="text-gray-900 font-medium">{new Date(assignment.created_at).toLocaleDateString()}</span>
                            </div>
                            {assignment.description && (
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-700 line-clamp-3">
                                  {assignment.description}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons - IMPROVED LAYOUT */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border border-yellow-200">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></div>
                              Pending
                            </span>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => handleSubmitWork(assignment.id)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-300 text-xs font-medium shadow-sm hover:shadow-md transform hover:scale-105 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Submit</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Table View for Assignments - IMPROVED */}
                  <table className="hidden lg:table min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-orange-50">
                      <tr>
                        <th className="px-6 lg:px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Assignment Details
                        </th>
                        <th className="px-6 lg:px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Class & Teacher
                        </th>
                        <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Date & Status
                        </th>
                        <th className="px-6 lg:px-8 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAssignments.map((assignment) => (
                        <tr key={assignment.id} className="hover:bg-gray-50 transition-all duration-300 group border-b border-gray-100">
                          <td className="px-6 lg:px-8 py-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-200 mb-1">
                                  {assignment.name}
                                </div>
                                {assignment.description && (
                                  <div className="text-xs text-gray-600 line-clamp-2 max-w-md">
                                    {assignment.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-700 truncate group-hover:text-purple-700 transition-colors duration-200">
                                    {assignment.class_name}
                                  </span>
                                  <div className="text-xs text-gray-500">
                                    Code: {assignment.class_code}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-600">
                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="truncate">{assignment.teacher_name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="flex flex-col items-center space-y-2">
                              <span className="text-sm text-gray-600 font-medium">
                                {new Date(assignment.created_at).toLocaleDateString()}
                              </span>
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border border-yellow-200 shadow-sm hover:shadow-yellow-500/20 transition-all duration-200">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 shadow-sm"></div>
                                Pending Submission
                              </span>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="flex justify-center">
                              <button 
                                onClick={() => handleSubmitWork(assignment.id)}
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 border border-blue-400 cursor-pointer font-medium"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Submit Work</span>
                              </button>
                            </div>
                          </td>
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
    </div>
  );
};

export default StudentClassesPage;