  import React, { useState, useEffect, useRef } from 'react';
  import { useNavigate, useParams } from 'react-router-dom';
  import axios from 'axios';
  import DynamicHeader from '../components/DynamicHeader';
  import Sidebar from '../components/Sidebar';
  import { useUser } from '../contexts/UserContext';
  import plmunLogo from '../assets/images/PLMUNLOGO.png';

  const API_BASE_URL = 'http://localhost:8000';

  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  interface Assignment {
    id: number;
    name: string;
    description: string | null;
    class_id: number;
    creator_id: number;
    created_at: string;
    class_name?: string;
    class_code?: string;
    due_date?: string;
    teacher_name?: string;
  }

  interface Submission {
    id?: number;
    assignment_id: number;
    student_id: number;
    content: string;
    file_path?: string;
    submitted_at?: string;
    grade?: number | null;
    feedback?: string | null;
    is_graded?: boolean;
    file_name?: string;
  }

  interface Schedule {
    id: number;
    class_id: number;
    class_name: string;
    class_code: string;
    teacher_name: string;
    teacher_full_name: string;
    room_number: string;
    start_time: string;
    end_time: string;
    status: string;
  }

  const StudentAssignmentPage: React.FC = () => {
    const navigate = useNavigate();
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const { user } = useUser();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleLogout = () => {
      try {
        localStorage.clear();
        window.location.href = '/login';
      } catch (error) {
        window.location.href = '/login';
      }
    };

    useEffect(() => {
      if (!user || user.role !== 'student') {
        navigate('/login');
        return;
      }
      loadAssignmentData();
    }, [user, assignmentId]);

    // NEW: Load schedules to get teacher names
    const loadSchedules = async (): Promise<Schedule[]> => {
      try {
        console.log('📅 Loading schedules for teacher info...');
        const response = await apiClient.get('/schedules/');
        console.log('✅ Schedules loaded:', response.data);
        
        if (Array.isArray(response.data)) {
          return response.data.map((schedule: any) => ({
            id: schedule.id,
            class_id: schedule.class_id,
            class_name: schedule.class_name,
            class_code: schedule.class_code,
            teacher_name: schedule.teacher_name,
            teacher_full_name: schedule.teacher_full_name,
            room_number: schedule.room_number,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            status: schedule.status
          }));
        }
        return [];
      } catch (error) {
        console.error('❌ Error loading schedules:', error);
        return [];
      }
    };

    // NEW: Get teacher name from schedules based on class_id
    const getTeacherNameFromSchedules = (classId: number): string => {
      const schedule = schedules.find(s => s.class_id === classId);
      if (schedule) {
        console.log(`👨‍🏫 Found teacher for class ${classId}:`, schedule.teacher_name);
        return schedule.teacher_name || schedule.teacher_full_name || 'Teacher';
      }
      
      console.log(`⚠️ No teacher found for class ${classId} in schedules`);
      return 'Teacher';
    };

    const loadAssignmentData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Loading assignment data for ID:', assignmentId);

        // Load schedules first to get teacher names
        const schedulesData = await loadSchedules();
        setSchedules(schedulesData);

        // FIXED: Add validation for assignmentId
        if (!assignmentId) {
          setError('Assignment ID is required');
          setIsLoading(false);
          return;
        }

        // Load assignment details from our API
        const assignmentResponse = await apiClient.get(`/assignments/${assignmentId}`);
        const assignmentData = assignmentResponse.data;
        
        console.log('✅ Assignment API response:', assignmentData);

        // FIXED: Ensure assignment name is properly set
        if (!assignmentData.name) {
          console.warn('⚠️ Assignment name is missing from API response, using fallback');
          // Try to get from localStorage as backup
          const savedAssignments = localStorage.getItem('synchronized_assignments');
          if (savedAssignments) {
            const assignments = JSON.parse(savedAssignments);
            const savedAssignment = assignments.find((a: any) => a.id === parseInt(assignmentId));
            if (savedAssignment && savedAssignment.name) {
              assignmentData.name = savedAssignment.name;
              console.log('🔄 Using assignment name from localStorage:', savedAssignment.name);
            }
          }
          
          // Final fallback
          if (!assignmentData.name) {
            assignmentData.name = 'Assignment ' + assignmentId;
          }
        }

        console.log('📝 Final assignment name:', assignmentData.name);

        // NEW: Get teacher name from schedules using class_id
        try {
          console.log('👨‍🏫 Getting teacher name for class_id:', assignmentData.class_id);
          assignmentData.teacher_name = getTeacherNameFromSchedules(assignmentData.class_id);
          console.log('✅ Teacher name set to:', assignmentData.teacher_name);
        } catch (error) {
          console.warn('Could not get teacher name from schedules:', error);
          assignmentData.teacher_name = 'Teacher';
        }

        // Load class info for additional context
        try {
          console.log('🏫 Loading class info for class_id:', assignmentData.class_id);
          const classResponse = await apiClient.get(`/classes/${assignmentData.class_id}`);
          assignmentData.class_name = classResponse.data.name;
          assignmentData.class_code = classResponse.data.code;
          console.log('✅ Class info:', assignmentData.class_name, assignmentData.class_code);
        } catch (error) {
          console.warn('Could not load class info:', error);
        }

        setAssignment(assignmentData);

        // Load existing submission if any
        try {
          console.log('📤 Loading existing submission for assignment:', assignmentId);
          const submissionResponse = await apiClient.get(`/submissions/assignment/${assignmentId}/student`);
          if (submissionResponse.data) {
            setSubmission(submissionResponse.data);
            if (submissionResponse.data.file_path) {
              setSelectedFileName(submissionResponse.data.file_name || 'Uploaded file');
            }
            console.log('✅ Found existing submission');
          }
        } catch (error) {
          // No submission exists yet, which is fine
          console.log('No existing submission found');
        }

      } catch (error: any) {
        console.error('❌ Error loading assignment:', error);
        
        // FALLBACK: Try to get assignment from localStorage
        try {
          const savedAssignments = localStorage.getItem('synchronized_assignments');
          if (savedAssignments && assignmentId) {
            const assignments = JSON.parse(savedAssignments);
            const fallbackAssignment = assignments.find((a: any) => a.id === parseInt(assignmentId));
            if (fallbackAssignment) {
              console.log('🔄 Using fallback assignment data from localStorage');
              
              // Try to get teacher name for fallback assignment
              try {
                fallbackAssignment.teacher_name = getTeacherNameFromSchedules(fallbackAssignment.class_id);
              } catch (error) {
                console.warn('Could not get teacher name for fallback assignment');
                fallbackAssignment.teacher_name = 'Teacher';
              }
              
              setAssignment(fallbackAssignment);
              return;
            }
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
        
        setError('Failed to load assignment. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFileName(file.name);
      } else {
        setSelectedFileName('');
      }
    };

    const handleRemoveFile = () => {
      if (fileRef.current) {
        fileRef.current.value = '';
        setSelectedFileName('');
      }
    };

    const handleSubmitAssignment = async () => {
      try {
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        const content = contentRef.current?.value.trim() || '';
        const file = fileRef.current?.files?.[0];

        if (!content && !file) {
          setError('Please provide either text content or upload a file');
          return;
        }

        // FIXED: Complete validation for assignmentId
        if (!assignmentId) {
          setError('Assignment ID is required');
          return;
        }

        const assignmentIdNum = parseInt(assignmentId);
        if (isNaN(assignmentIdNum)) {
          setError('Invalid assignment ID');
          return;
        }

        const formData = new FormData();
        formData.append('assignment_id', assignmentIdNum.toString());
        formData.append('content', content);
        if (file) {
          formData.append('file', file);
        }

        let response;
        if (submission?.id) {
          // Update existing submission
          console.log('📝 Updating existing submission:', submission.id);
          response = await apiClient.put(`/submissions/${submission.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          setSuccess('Assignment updated successfully!');
        } else {
          // Create new submission
          console.log('📝 Creating new submission for assignment:', assignmentId);
          response = await apiClient.post('/submissions/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          setSuccess('Assignment submitted successfully!');
        }

        setSubmission(response.data);
        setSelectedFileName('');
        
        // Clear form
        if (contentRef.current) contentRef.current.value = '';
        if (fileRef.current) fileRef.current.value = '';

      } catch (error: any) {
        console.error('Error submitting assignment:', error);
        setError('Failed to submit assignment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleUnsubmit = async () => {
      if (!submission?.id || !window.confirm('Are you sure you want to unsubmit this assignment?')) {
        return;
      }

      try {
        await apiClient.delete(`/submissions/${submission.id}`);
        setSubmission(null);
        setSelectedFileName('');
        setSuccess('Assignment unsubmitted successfully!');
      } catch (error: any) {
        console.error('Error unsubmitting assignment:', error);
        setError('Failed to unsubmit assignment. Please try again.');
      }
    };

    const formatDate = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return 'Invalid Date';
      }
    };

    const getGradeColor = (grade: number) => {
      if (grade >= 90) return 'text-green-600 bg-green-50 border-green-200';
      if (grade >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
      if (grade >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      return 'text-red-600 bg-red-50 border-red-200';
    };

    const downloadFile = async () => {
      if (!submission?.file_path || !submission.id) return;
      
      try {
        const response = await apiClient.get(`/submissions/${submission.id}/download`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', submission.file_name || 'downloaded_file');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        setError('Failed to download file');
      }
    };

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Loading assignment...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-blue-500/20 rounded-xl blur-sm"></div>
                <img 
                  src={plmunLogo} 
                  alt="PLMun Logo" 
                  className="relative w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Assignment</h1>
                <p className="text-xs text-gray-600">Submit your work</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm"
                title="Toggle menu"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </header>

          <div className="hidden lg:block">
            <DynamicHeader 
              title={assignment?.name || "Assignment"}
              subtitle="Submit your work and track your progress"
              showBackButton={true}
              backTo="/student/assignments"
            />
          </div>

          <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-red-700">Error</h3>
                      <p className="text-sm text-gray-600 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-green-700">Success</h3>
                      <p className="text-sm text-gray-600 mt-1">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg mb-6 overflow-hidden">
                {/* Assignment Header with Teacher Info */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{assignment?.name}</h2>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Teacher: {assignment?.teacher_name || 'N/A'}
                        </div>
                        {assignment?.class_name && (
                          <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Class: {assignment.class_name}
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Created: {assignment?.created_at ? formatDate(assignment.created_at) : 'N/A'}
                        </div>
                        {assignment?.due_date && (
                          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 text-yellow-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Due: {formatDate(assignment.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                    {submission && (
                      <div className="flex items-center gap-2">
                        {submission.is_graded && submission.grade !== null && (
                          <div className={`px-3 py-2 rounded-xl border font-semibold ${getGradeColor(submission.grade)}`}>
                            Grade: {submission.grade}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Assignment Description */}
                  <div className="prose max-w-none mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Description
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {assignment?.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Existing Submission Display */}
                  {submission && (
                    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Your Submission
                      </h3>
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="text-sm text-blue-700 bg-white px-3 py-1 rounded-full border border-blue-200">
                            Submitted: {submission.submitted_at ? formatDate(submission.submitted_at) : 'N/A'}
                          </span>
                          {submission.is_graded && (
                            <div className="flex items-center gap-2">
                              {submission.feedback && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full border border-purple-200">
                                  Feedback Provided
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {submission.content && (
                          <div className="text-sm text-blue-800 bg-white/50 p-3 rounded-xl border border-blue-200">
                            <strong className="text-blue-900">Content:</strong> 
                            <div className="mt-1">{submission.content}</div>
                          </div>
                        )}
                        {submission.file_path && (
                          <div className="flex items-center justify-between text-sm text-blue-800 bg-white/50 p-3 rounded-xl border border-blue-200">
                            <div>
                              <strong className="text-blue-900">File:</strong> {submission.file_name || 'Uploaded file'}
                            </div>
                            <button
                              onClick={downloadFile}
                              className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                              title="Download file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </button>
                          </div>
                        )}
                        {submission.feedback && (
                          <div className="text-sm text-purple-800 bg-white/50 p-3 rounded-xl border border-purple-200">
                            <strong className="text-purple-900">Teacher Feedback:</strong> 
                            <div className="mt-1">{submission.feedback}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submission Form */}
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="assignment-content" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Your Work
                      </label>
                      <textarea
                        id="assignment-content"
                        ref={contentRef}
                        rows={8}
                        className="w-full px-4 py-4 bg-white border-2 border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200 shadow-sm"
                        placeholder="Type your assignment submission here... (You can also upload a file below)"
                        defaultValue={submission?.content || ''}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="assignment-file" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload File (Optional)
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer">
                            <input
                              type="file"
                              id="assignment-file"
                              ref={fileRef}
                              onChange={handleFileChange}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.txt"
                            />
                            <div className="w-full px-4 py-4 bg-yellow-50 border-2 border-yellow-300 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 shadow-sm hover:bg-yellow-100 hover:border-yellow-400 cursor-pointer flex items-center justify-center gap-2">
                              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-yellow-700 font-medium">Browse Files</span>
                            </div>
                          </label>
                        </div>
                        
                        {selectedFileName && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-green-700 text-sm font-medium">{selectedFileName}</span>
                            </div>
                            <button
                              onClick={handleRemoveFile}
                              className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          Supported formats: PDF, DOC, DOCX, TXT (Max: 10MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - FIXED: Mobile responsive layout */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => navigate('/student/assignments')}
                      className="px-4 sm:px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span className="whitespace-nowrap">Back to Assignments</span>
                    </button>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                      {submission && (
                        <button
                          onClick={handleUnsubmit}
                          className="px-4 sm:px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm text-sm sm:text-base flex-1 sm:flex-none cursot-pointer"
                          disabled={isSubmitting}
                        >
                          Unsubmit
                        </button>
                      )}
                      
                      <button
                        onClick={handleSubmitAssignment}
                        disabled={isSubmitting}
                        className="px-4 sm:px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-none"
                      >
                        {isSubmitting && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="whitespace-nowrap">
                          {isSubmitting 
                            ? (submission ? 'Updating...' : 'Submitting...') 
                            : (submission ? 'Update Submission' : 'Submit Assignment')
                          }
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  };

  export default StudentAssignmentPage;