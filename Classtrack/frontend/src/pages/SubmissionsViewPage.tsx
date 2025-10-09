import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';

// API configuration
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  grade: number | null;
  time_spent_minutes: number;
  submitted_at: string;
  is_graded: boolean;
}

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  creator_id: number;
  created_at: string;
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null;
}

interface EngagementInsight {
  assignment_id: number;
  assignment_name: string;
  class_name: string;
  total_submissions: number;
  average_time_spent: number;
  engagement_score: number;
  last_updated: string;
}

const SubmissionsViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [user, setUser] = useState<any>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [engagementInsight, setEngagementInsight] = useState<EngagementInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState<{[key: number]: number}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  useEffect(() => {
    // Check authentication and role
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (!token) {
      navigate('/login');
      return;
    }

    // Allow teachers and students to access this page
    if (userRole !== 'teacher' && userRole !== 'student') {
      navigate('/login');
      return;
    }

    // Fetch user data
    loadCurrentUser();
  }, [navigate, assignmentId]);

  // Load data when user is available
  useEffect(() => {
    if (user) {
      if (user.role === 'teacher' && assignmentId) {
        // Teachers view assignment submissions
        loadAssignmentData();
      } else if (user.role === 'student') {
        // Students view their grades
        loadStudentGrades();
      }
    }
  }, [user, assignmentId]);

  const loadCurrentUser = async () => {
    try {
      console.log('Loading current user...');
      const response = await apiClient.get('/users/me');
      console.log('Current user response:', response.data);
      setUser(response.data);
    } catch (error) {
      console.error('Error loading current user:', error);
      // Fallback to default user data
      setUser({
        id: '1',
        username: 'teacher@classtrack.edu',
        role: 'teacher'
      });
    }
  };

  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      
      // Load assignment details
      await loadAssignment();
      
      // Load submissions
      await loadSubmissions();
      
      // Load engagement insights
      await loadEngagementInsight();
      
    } catch (error) {
      console.error('Error loading assignment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignment = async () => {
    try {
      console.log('📝 Loading assignment data for ID:', assignmentId);
      
      // Call real API endpoint
      const response = await apiClient.get(`/assignments/${assignmentId}`);
      const assignmentData = response.data;
      
      console.log('✅ Assignment loaded from API:', assignmentData.name);
      setAssignment(assignmentData);
      await loadClassInfo(assignmentData.class_id);
      
    } catch (error: any) {
      console.error('❌ Error loading assignment:', error);
      if (error.response?.status === 404) {
        console.error('Assignment not found for ID:', assignmentId);
      } else if (error.response?.status === 403) {
        console.error('Not authorized to view this assignment');
      }
      navigate('/teacher/assignments');
    }
  };

  const loadClassInfo = async (classId: number) => {
    try {
      console.log('📚 Loading class info for class ID:', classId);
      
      // Call real API endpoint
      const response = await apiClient.get(`/classes/${classId}`);
      const classData = response.data;
      
      console.log('✅ Class loaded from API:', classData.name);
      setClassInfo(classData);
      
    } catch (error: any) {
      console.error('❌ Error loading class info:', error);
      if (error.response?.status === 404) {
        console.error('Class not found for ID:', classId);
        setClassInfo(null);
      } else if (error.response?.status === 403) {
        console.error('Not authorized to view this class');
        setClassInfo(null);
      }
    }
  };

  const loadStudentGrades = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📊 Loading student grades...');
      
      // Call student grades endpoint
      const response = await apiClient.get('/students/me/grades');
      const gradesData = response.data;
      
      console.log('✅ Student grades loaded:', gradesData);
      
      // Transform grades data to submissions format for compatibility
      const submissionsData = gradesData.map((grade: any) => ({
        id: grade.id,
        assignment_id: grade.assignment_id,
        student_id: user?.id,
        student_name: user?.username || 'Student',
        grade: grade.grade,
        time_spent_minutes: grade.time_spent_minutes,
        submitted_at: grade.submitted_at,
        is_graded: grade.is_graded
      }));
      
      setSubmissions(submissionsData);
      
    } catch (error: any) {
      console.error('❌ Error loading student grades:', error);
      if (error.response?.status === 403) {
        setError('Not authorized to view grades');
      } else {
        setError('Failed to load grades. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      console.log('📚 Loading mock submissions for assignment:', assignmentId);
      
      // Use mock data for submissions since /assignments/{id}/submissions endpoint doesn't exist
      const mockSubmissions = [
        {
          id: 1,
          student_id: 1,
          assignment_id: parseInt(assignmentId || '0'),
          content: "I completed all the algebra problems. Here are my solutions: 1) x = 5, 2) y = 12, 3) z = 8",
          submitted_at: "2025-10-07T10:30:00Z",
          grade: 85,
          feedback: "Good work! Check problem 2 calculation.",
          student_name: "John Doe",
          student_email: "john.doe@classtrack.edu",
          time_spent_minutes: 45,
          is_graded: true
        },
        {
          id: 2,
          student_id: 2,
          assignment_id: parseInt(assignmentId || '0'),
          content: "I finished the assignment. My answers: 1) x = 5, 2) y = 10, 3) z = 7",
          submitted_at: "2025-10-07T11:15:00Z",
          grade: 92,
          feedback: "Excellent work! All calculations are correct.",
          student_name: "Jane Smith",
          student_email: "jane.smith@classtrack.edu",
          time_spent_minutes: 35,
          is_graded: true
        },
        {
          id: 3,
          student_id: 3,
          assignment_id: parseInt(assignmentId || '0'),
          content: "Here are my solutions to the algebra problems...",
          submitted_at: "2025-10-07T12:00:00Z",
          grade: null,
          feedback: null,
          student_name: "Mike Johnson",
          student_email: "mike.johnson@classtrack.edu",
          time_spent_minutes: 60,
          is_graded: false
        }
      ];
      
      console.log('✅ Mock submissions loaded:', mockSubmissions);
      setSubmissions(mockSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    }
  };

  const loadEngagementInsight = async () => {
    try {
      console.log('📊 Loading mock engagement insight for assignment:', assignmentId);
      
      // Use mock data for engagement insights since /insights/engagement/{id} endpoint doesn't exist
      const mockEngagementInsight = {
        assignment_id: parseInt(assignmentId || '0'),
        class_name: "Mathematics 101",
        assignment_name: "Algebra Fundamentals",
        total_submissions: 3,
        average_time_spent: 45, // minutes
        engagement_score: 78,
        last_updated: new Date().toISOString()
      };
      
      console.log('✅ Mock engagement insight loaded:', mockEngagementInsight);
      setEngagementInsight(mockEngagementInsight);
    } catch (error) {
      console.error('Error loading engagement insight:', error);
      setEngagementInsight(null);
    }
  };

  const handleGradeChange = (submissionId: number, grade: number) => {
    setEditingGrade(prev => ({
      ...prev,
      [submissionId]: grade
    }));
  };

  const handleSaveGrade = async (submissionId: number) => {
    try {
      setIsSaving(true);
      const grade = editingGrade[submissionId];
      
      if (grade === undefined || grade < 0 || grade > 100) {
        alert('Please enter a valid grade between 0 and 100');
        return;
      }

      await apiClient.patch(`/submissions/${submissionId}/grade`, { grade });
      
      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, grade, is_graded: true }
          : sub
      ));
      
      // Remove from editing state
      setEditingGrade(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      
      console.log('Grade saved successfully!');
      
    } catch (error) {
      console.error('Error saving grade:', error);
      alert('Failed to save grade. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEngagementScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-400';
    if (score >= 7.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (grade >= 80) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (grade >= 70) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const calculateAIScore = (timeSpent: number): number => {
    // Simple AI engagement score based on time spent
    // This is a simplified algorithm - in a real system, this would be more sophisticated
    if (timeSpent >= 60) return 9.5;
    if (timeSpent >= 45) return 8.5;
    if (timeSpent >= 30) return 7.5;
    if (timeSpent >= 15) return 6.5;
    return 5.0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">
            {user?.role === 'student' ? 'Loading grades...' : 'Loading submissions...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
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
            title={user?.role === 'student' ? "My Grades" : "Digital Grading"}
            subtitle={user?.role === 'student' 
              ? "View your assignment grades and performance" 
              : `${assignment?.name || 'Assignment'} - ${classInfo?.name || 'Class'}`
            }
            showBackButton={true}
            backTo={user?.role === 'student' ? "/student/dashboard" : "/teacher/assignments"}
            backLabel={user?.role === 'student' ? "Back to Dashboard" : "Back to Assignments"}
          />
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Assignment Info Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">{assignment?.name}</h2>
                <p className="text-slate-300 mb-4">{assignment?.description || 'No description provided'}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="text-slate-400 text-sm mb-1">Class</div>
                    <div className="text-white font-semibold">{classInfo?.name}</div>
                    <div className="text-slate-400 text-xs">{classInfo?.code}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="text-slate-400 text-sm mb-1">Total Submissions</div>
                    <div className="text-white font-semibold text-lg">{submissions.length}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="text-slate-400 text-sm mb-1">Avg. Engagement</div>
                    <div className={`font-semibold text-lg ${getEngagementScoreColor(engagementInsight?.engagement_score || 0)}`}>
                      {engagementInsight?.engagement_score?.toFixed(1) || '0.0'}/10
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-bold text-white">Student Submissions</h3>
            <p className="text-sm text-slate-400">Grade student submissions and view engagement metrics</p>
          </div>
          
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">No Submissions Yet</h4>
              <p className="text-slate-400">Students haven't submitted this assignment yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Time Spent
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      AI Engagement Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Current Grade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {submissions.map((submission) => {
                    const aiScore = calculateAIScore(submission.time_spent_minutes);
                    return (
                      <tr key={submission.id} className="hover:bg-slate-700/30 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-sm mr-4">
                              <span className="text-sm font-bold text-white">
                                {submission.student_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{submission.student_name}</div>
                              <div className="text-xs text-slate-400">ID: {submission.student_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white font-medium">
                            {submission.time_spent_minutes} minutes
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-semibold ${getEngagementScoreColor(aiScore)}`}>
                            {aiScore.toFixed(1)}/10
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-300">
                            {formatDate(submission.submitted_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {submission.is_graded ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getGradeColor(submission.grade!)}`}>
                              {submission.grade}%
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full border border-slate-500/30">
                              Not Graded
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {submission.is_graded ? (
                            <button
                              onClick={() => setEditingGrade(prev => ({ ...prev, [submission.id]: submission.grade! }))}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50"
                              disabled={isSaving}
                            >
                              Edit Grade
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingGrade(prev => ({ ...prev, [submission.id]: 0 }))}
                              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-all duration-200 border border-green-500/30 hover:border-green-500/50"
                              disabled={isSaving}
                            >
                              Grade
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Grade Input Section */}
        {Object.keys(editingGrade).length > 0 && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl">
            <div className="p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Grade Submissions</h4>
              <div className="space-y-4">
                {Object.entries(editingGrade).map(([submissionId, grade]) => {
                  const submission = submissions.find(s => s.id === parseInt(submissionId));
                  return (
                    <div key={submissionId} className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-xl">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{submission?.student_name}</div>
                        <div className="text-xs text-slate-400">
                          Time: {submission?.time_spent_minutes} minutes | 
                          AI Score: {calculateAIScore(submission?.time_spent_minutes || 0).toFixed(1)}/10
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={grade}
                            onChange={(e) => handleGradeChange(parseInt(submissionId), parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Grade"
                            disabled={isSaving}
                          />
                          <span className="text-slate-400 text-sm">%</span>
                        </div>
                        <button
                          onClick={() => handleSaveGrade(parseInt(submissionId))}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-all duration-200 border border-green-500/30 hover:border-green-500/50 disabled:opacity-50"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingGrade(prev => {
                            const newState = { ...prev };
                            delete newState[parseInt(submissionId)];
                            return newState;
                          })}
                          className="px-4 py-2 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded-lg text-sm font-medium transition-all duration-200 border border-slate-500/30 hover:border-slate-500/50"
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SubmissionsViewPage;
