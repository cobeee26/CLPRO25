import React, { useState, useEffect } from 'react';
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

interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  content: string;
  file_path?: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  is_graded: boolean;
  time_spent_minutes: number;
}

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  creator_id: number;
  created_at: string;
  class_name?: string;
  class_code?: string;
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null;
}

const TeacherAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useUser();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingGrades, setEditingGrades] = useState<{[key: number]: {grade: number, feedback: string}}>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = () => {
    try {
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/login');
      return;
    }
    loadAssignmentData();
  }, [user, assignmentId]);

  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load assignment details
      const assignmentResponse = await apiClient.get(`/assignments/${assignmentId}`);
      setAssignment(assignmentResponse.data);

      // Load class info
      await loadClassInfo(assignmentResponse.data.class_id);

      // Load submissions
      await loadSubmissions();

    } catch (error: any) {
      console.error('Error loading assignment:', error);
      setError('Failed to load assignment data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassInfo = async (classId: number) => {
    try {
      const response = await apiClient.get(`/classes/${classId}`);
      setClassInfo(response.data);
    } catch (error: any) {
      console.error('Error loading class info:', error);
      setClassInfo(null);
    }
  };

  const loadSubmissions = async () => {
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/submissions`);
      setSubmissions(response.data);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      // Use mock data if API fails
      setSubmissions(getMockSubmissions());
    }
  };

  const getMockSubmissions = (): Submission[] => {
    return [
      {
        id: 1,
        assignment_id: parseInt(assignmentId || '0'),
        student_id: 101,
        student_name: 'John Doe',
        student_email: 'john.doe@student.plmun.edu.ph',
        content: 'I have completed the algebra assignment. Here are my solutions...',
        submitted_at: '2024-01-15T10:30:00Z',
        grade: 85,
        feedback: 'Good work! Check problem 3 calculation.',
        is_graded: true,
        time_spent_minutes: 45
      },
      {
        id: 2,
        assignment_id: parseInt(assignmentId || '0'),
        student_id: 102,
        student_name: 'Jane Smith',
        student_email: 'jane.smith@student.plmun.edu.ph',
        content: 'My assignment submission with all problems solved.',
        submitted_at: '2024-01-15T14:20:00Z',
        grade: 92,
        feedback: 'Excellent work! All solutions are correct.',
        is_graded: true,
        time_spent_minutes: 38
      },
      {
        id: 3,
        assignment_id: parseInt(assignmentId || '0'),
        student_id: 103,
        student_name: 'Mike Johnson',
        student_email: 'mike.johnson@student.plmun.edu.ph',
        content: 'Here is my assignment. I had some difficulty with problem 4.',
        submitted_at: '2024-01-16T09:15:00Z',
        grade: null,
        feedback: null,
        is_graded: false,
        time_spent_minutes: 52
      },
      {
        id: 4,
        assignment_id: parseInt(assignmentId || '0'),
        student_id: 104,
        student_name: 'Sarah Wilson',
        student_email: 'sarah.wilson@student.plmun.edu.ph',
        content: 'Completed all problems with detailed explanations.',
        submitted_at: '2024-01-16T11:45:00Z',
        grade: 78,
        feedback: 'Good effort. Review problem 5 methodology.',
        is_graded: true,
        time_spent_minutes: 67
      }
    ];
  };

  const handleGradeChange = (submissionId: number, field: 'grade' | 'feedback', value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: field === 'grade' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const handleSaveGrade = async (submissionId: number) => {
    try {
      setIsSaving(true);
      const editedData = editingGrades[submissionId];
      
      if (!editedData) return;

      const gradeValue = parseFloat(editedData.grade.toString());
      if (gradeValue < 0 || gradeValue > 100) {
        alert('Please enter a valid grade between 0 and 100');
        return;
      }

      // API call to save grade and feedback
      await apiClient.patch(`/submissions/${submissionId}/grade`, {
        grade: gradeValue,
        feedback: editedData.feedback
      });

      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { 
              ...sub, 
              grade: gradeValue, 
              feedback: editedData.feedback,
              is_graded: true 
            }
          : sub
      ));

      // Remove from editing state
      setEditingGrades(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });

    } catch (error: any) {
      console.error('Error saving grade:', error);
      alert('Failed to save grade. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditing = (submission: Submission) => {
    setEditingGrades(prev => ({
      ...prev,
      [submission.id]: {
        grade: submission.grade || 0,
        feedback: submission.feedback || ''
      }
    }));
  };

  const handleCancelEditing = (submissionId: number) => {
    setEditingGrades(prev => {
      const newState = { ...prev };
      delete newState[submissionId];
      return newState;
    });
  };

  const handleViewSubmission = (submission: Submission) => {
    // Navigate to submission detail view or show modal
    alert(`Submission Details:\n\nStudent: ${submission.student_name}\nEmail: ${submission.student_email}\nSubmitted: ${formatDate(submission.submitted_at)}\nContent: ${submission.content}\n${submission.feedback ? `Feedback: ${submission.feedback}` : ''}`);
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

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (grade >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (grade >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const calculateStatistics = () => {
    const gradedSubmissions = submissions.filter(s => s.is_graded);
    const averageGrade = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / gradedSubmissions.length 
      : 0;
    
    const totalStudents = 30; // Assuming 30 students in class
    const submissionRate = (submissions.length / totalStudents) * 100;

    return {
      totalSubmissions: submissions.length,
      gradedSubmissions: gradedSubmissions.length,
      pendingSubmissions: submissions.length - gradedSubmissions.length,
      averageGrade: Math.round(averageGrade * 10) / 10,
      submissionRate: Math.round(submissionRate)
    };
  };

  const stats = calculateStatistics();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignment submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="lg:hidden bg-white backdrop-blur-xl border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-xl blur-sm"></div>
              <img 
                src={plmunLogo} 
                alt="PLMun Logo" 
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Submissions</h1>
              <p className="text-xs text-gray-600">Grade student work</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
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
        </header>

        <div className="hidden lg:block">
          <DynamicHeader 
            title={`Submissions - ${assignment?.name}`}
            subtitle="Review and grade student submissions"
            showBackButton={true}
            backTo="/teacher/assignments"
          />
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-red-700">Error</h3>
                    <p className="text-sm text-gray-600 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={loadAssignmentData}
                    className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Assignment Info */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm mb-6">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{assignment?.name}</h2>
                    <p className="text-gray-600 mb-4">{assignment?.description || 'No description provided'}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</div>
                        <div className="text-sm text-gray-500">Total Submissions</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.gradedSubmissions}</div>
                        <div className="text-sm text-gray-500">Graded</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.pendingSubmissions}</div>
                        <div className="text-sm text-gray-500">Pending</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.averageGrade}%</div>
                        <div className="text-sm text-gray-500">Average Grade</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.submissionRate}%</div>
                        <div className="text-sm text-gray-500">Submission Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Student Submissions</h3>
                <p className="text-sm text-gray-600">Click on a submission to view details and grade</p>
              </div>
              
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h4>
                  <p className="text-gray-500">Students haven't submitted this assignment yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Time Spent
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {submissions.map((submission) => {
                        const isEditing = editingGrades[submission.id];
                        
                        return (
                          <tr key={submission.id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm mr-4">
                                  <span className="text-sm font-bold text-white">
                                    {submission.student_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{submission.student_name}</div>
                                  <div className="text-xs text-gray-500">{submission.student_email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">
                                {formatDate(submission.submitted_at)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {submission.time_spent_minutes} min
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={editingGrades[submission.id].grade}
                                  onChange={(e) => handleGradeChange(submission.id, 'grade', e.target.value)}
                                  className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Grade"
                                />
                              ) : submission.is_graded ? (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getGradeColor(submission.grade!)}`}>
                                  {submission.grade}%
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-300">
                                  Not Graded
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                submission.is_graded 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}>
                                {submission.is_graded ? 'Graded' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end space-x-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveGrade(submission.id)}
                                      disabled={isSaving}
                                      className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-all duration-200 border border-green-200 hover:border-green-300 disabled:opacity-50 cursor-pointer"
                                    >
                                      {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => handleCancelEditing(submission.id)}
                                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all duration-200 border border-gray-200 hover:border-gray-300 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleStartEditing(submission)}
                                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-all duration-200 border border-blue-200 hover:border-blue-300 cursor-pointer"
                                  >
                                    {submission.is_graded ? 'Edit Grade' : 'Grade'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleViewSubmission(submission)}
                                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all duration-200 border border-gray-200 hover:border-gray-300 cursor-pointer"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Feedback Section for Editing */}
            {Object.keys(editingGrades).length > 0 && (
              <div className="mt-6 bg-white backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm">
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h4>
                  {Object.entries(editingGrades).map(([submissionId, data]) => {
                    const submission = submissions.find(s => s.id === parseInt(submissionId));
                    return (
                      <div key={submissionId} className="mb-4 last:mb-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-xs font-bold text-white">
                              {submission?.student_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{submission?.student_name}</span>
                        </div>
                        <textarea
                          value={data.feedback}
                          onChange={(e) => handleGradeChange(parseInt(submissionId), 'feedback', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Enter feedback for the student..."
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherAssignmentPage;