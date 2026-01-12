import axios from 'axios';

// Base URL for the API - using backend URL for API calls
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
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

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface User {
  id: number;
  username: string;
  role: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface UserCreate {
  username: string;
  password: string;
  role: 'teacher' | 'student';
}

export interface UserUpdate {
  username?: string;
  password?: string;
  role?: 'teacher' | 'student';
}

export interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id?: number;
  student_count?: number;
}

export interface ClassCreate {
  name: string;
  code: string;
  teacher_id?: number;
}

export interface ClassUpdate {
  name?: string;
  code?: string;
  teacher_id?: number;
}

export interface ScheduleCreate {
  class_id: number;
  start_time: string;
  end_time: string;
  room_number: string;
  status?: string;
}

export interface ScheduleResponse {
  id: number;
  class_id: number;
  start_time: string;
  end_time: string;
  room_number: string;
  status: string;
}

export interface ScheduleEnrichedResponse {
  id: number;
  class_id: number;
  start_time: string;
  end_time: string;
  room_number: string;
  status: string;
  class_name: string;
  class_code: string;
  teacher_name: string;
  teacher_full_name: string;
  cleanliness_before?: string;
  cleanliness_after?: string;
  last_report_time?: string;
}

export interface AssignmentResponse {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  class_name?: string;
  creator_id: number;
  created_at: string;
}

export interface StudentClass {
  id: number;
  name: string;
  code: string;
  teacher_id: number;
  teacher_name: string;
  description?: string;
  created_at?: string;
  student_count?: number;
}

export interface StudentAssignment {
  id: number;
  name: string;
  description?: string;
  class_id: number;
  class_name: string;
  class_code?: string;
  teacher_name: string;
  creator_id: number;
  created_at?: string;
}

export interface SubmissionCreate {
  assignment_id: number;
  time_spent_minutes: number;
}

export interface SubmissionResponse {
  id: number;
  assignment_id: number;
  student_id: number;
  grade?: number;
  time_spent_minutes: number;
  submitted_at: string;
}

export interface CleanlinessResponse {
  schedule_id: number;
  class_id: number;
  cleanliness_status: string;
  has_report: boolean;
  latest_report?: {
    id: number;
    reporter_id: number;
    is_clean_before: string;
    is_clean_after: string;
    report_text: string;
    photo_url?: string;
    created_at: string;
  };
  message?: string;
}

export interface ViolationCreate {
  student_id: number;
  assignment_id: number;
  violation_type: 'tab_switch' | 'app_switch' | 'rapid_completion' | 'paste_detected' | 'suspicious_activity' | 'excessive_inactivity' | 'ai_content_detected';
  description: string;
  time_away_seconds: number;
  severity: 'low' | 'medium' | 'high';
  content_added_during_absence?: number;
  ai_similarity_score?: number;
  paste_content_length?: number;
}

export interface ViolationResponse {
  id: number;
  student_id: number;
  assignment_id: number;
  violation_type: string;
  description: string;
  detected_at: string;
  time_away_seconds: number;
  severity: string;
  content_added_during_absence?: number;
  ai_similarity_score?: number;
  paste_content_length?: number;
}

export interface ViolationWithStudentResponse extends ViolationResponse {
  student_name: string;
  student_email: string;
  assignment_name: string;
  class_name: string;
}

export interface ViolationSummary {
  assignment_id: number;
  assignment_name: string;
  class_name: string;
  total_violations: number;
  violations_by_type: Record<string, number>;
  violations_by_severity: {
    low: number;
    medium: number;
    high: number;
  };
  average_time_away_seconds: number;
  students_with_violations: number;
  total_students: number;
}

export interface SubmissionWithViolations {
  submission_id: number;
  student_id: number;
  student_name: string;
  grade?: number;
  time_spent_minutes: number;
  submitted_at?: string;
  is_graded: boolean;
  violation_count: number;
  violations: ViolationResponse[];
}

export interface SubmissionWithContent {
  assignment_id: number;
  content?: string;
  link_url?: string;
  time_spent_minutes: number;
  file_name?: string;
}

export interface SubmissionDetailResponse {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  content?: string;
  file_path?: string;
  file_name?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  is_graded: boolean;
  time_spent_minutes: number;
  link_url?: string;
  violations_count?: number;
  violations?: ViolationResponse[];
}

export interface GradeUpdate {
  grade: number;
  feedback?: string;
}

export interface StudentAssignmentDetail {
  id: number;
  name: string;
  description: string;
  class_id: number;
  class_name: string;
  class_code?: string;
  teacher_name: string;
  creator_id: number;
  created_at?: string;
  due_date?: string;
}

// ====================================
// VIOLATIONS FUNCTIONS FOR TEACHERS
// ====================================

export const getAllViolations = async (): Promise<ViolationResponse[]> => {
  try {
    console.log('Fetching all violations...');
    
    try {
      const response = await apiClient.get('/violations/');
      console.log(`Found ${response.data.length} violations via /violations/ endpoint`);
      return response.data;
    } catch (firstError: any) {
      console.log('/violations/ endpoint failed, trying alternatives...');
      
      try {
        const response = await apiClient.get('/assignments/violations');
        console.log(`Found ${response.data.length} violations via /assignments/violations endpoint`);
        return response.data;
      } catch (secondError: any) {
        console.log('/assignments/violations endpoint failed, trying enriched endpoint...');
        
        try {
          const response = await apiClient.get('/violations/enriched');
          console.log(`Found ${response.data.length} violations via /violations/enriched endpoint`);
          return response.data;
        } catch (thirdError: any) {
          console.log('All violation endpoints failed, returning empty array...');
          return [];
        }
      }
    }
  } catch (error: any) {
    console.error('Failed to fetch all violations:', error);
    if (error.response?.status === 403) {
      console.log('Not authorized to view violations, returning empty array...');
      return [];
    }
    
    try {
      const allBackupViolations: ViolationResponse[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          allBackupViolations.push(...backupData);
        }
      }
      console.log(`Retrieved ${allBackupViolations.length} violations from localStorage backup`);
      return allBackupViolations;
    } catch (backupError) {
      console.error('Failed to get violations from localStorage:', backupError);
      return [];
    }
  }
};

export const getAssignmentViolations = async (assignmentId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`Fetching violations for assignment ${assignmentId}...`);
    
    let violationsData: ViolationResponse[] = [];
    
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/violations`);
      violationsData = response.data;
      console.log(`Found ${violationsData.length} violations via /assignments/${assignmentId}/violations`);
    } catch (firstError: any) {
      console.log(`First endpoint failed for assignment ${assignmentId}, trying alternative...`);
      
      try {
        const response = await apiClient.get(`/assignments/${assignmentId}/violations/enriched`);
        violationsData = response.data;
        console.log(`Found ${violationsData.length} violations via enriched endpoint`);
      } catch (secondError: any) {
        console.log(`Enriched endpoint failed for assignment ${assignmentId}, trying all violations...`);
        
        try {
          const allViolations = await getAllViolations();
          violationsData = allViolations.filter(v => v.assignment_id === assignmentId);
          console.log(`Found ${violationsData.length} violations via filtering all violations`);
        } catch (thirdError: any) {
          console.log(`All methods failed for assignment ${assignmentId}`);
          violationsData = [];
        }
      }
    }
    
    try {
      const submissionsResponse = await apiClient.get(`/assignments/${assignmentId}/submissions`);
      const submissions = submissionsResponse.data;
      
      submissions.forEach((submission: any) => {
        if (submission.violations && Array.isArray(submission.violations)) {
          submission.violations.forEach((violation: any) => {
            const exists = violationsData.some(v => 
              v.id === violation.id || 
              (v.student_id === violation.student_id && 
               v.violation_type === violation.violation_type &&
               v.detected_at === violation.detected_at)
            );
            
            if (!exists) {
              violationsData.push({
                id: violation.id || Date.now(),
                student_id: violation.student_id || submission.student_id,
                assignment_id: assignmentId,
                violation_type: violation.violation_type || 'suspicious_activity',
                description: violation.description || 'Violation detected in submission',
                detected_at: violation.detected_at || new Date().toISOString(),
                time_away_seconds: violation.time_away_seconds || 0,
                severity: violation.severity || 'medium',
                content_added_during_absence: violation.content_added_during_absence,
                ai_similarity_score: violation.ai_similarity_score,
                paste_content_length: violation.paste_content_length
              });
            }
          });
        }
      });
      
      console.log(`After checking submissions: ${violationsData.length} total violations`);
    } catch (submissionError) {
      console.log('Could not check submissions for embedded violations:', submissionError);
    }
    
    try {
      const key = `violations_backup_${assignmentId}`;
      const backupViolations = JSON.parse(localStorage.getItem(key) || '[]');
      if (backupViolations.length > 0) {
        console.log(`Found ${backupViolations.length} backup violations in localStorage`);
        
        backupViolations.forEach((backupViolation: any) => {
          const exists = violationsData.some(v => 
            v.id === backupViolation.id || 
            (v.student_id === backupViolation.student_id && 
             v.violation_type === backupViolation.violation_type &&
             v.detected_at === backupViolation.detected_at)
          );
          
          if (!exists) {
            violationsData.push({
              id: backupViolation.id || Date.now(),
              student_id: backupViolation.student_id,
              assignment_id: assignmentId,
              violation_type: backupViolation.violation_type,
              description: backupViolation.description,
              detected_at: backupViolation.detected_at || new Date().toISOString(),
              time_away_seconds: backupViolation.time_away_seconds || 0,
              severity: backupViolation.severity || 'medium',
              content_added_during_absence: backupViolation.content_added_during_absence,
              ai_similarity_score: backupViolation.ai_similarity_score,
              paste_content_length: backupViolation.paste_content_length
            });
          }
        });
        
        console.log(`After merging localStorage: ${violationsData.length} total violations`);
      }
    } catch (backupError) {
      console.error('Error checking localStorage backup:', backupError);
    }
    
    return violationsData;
    
  } catch (error: any) {
    console.error(`Failed to fetch violations for assignment ${assignmentId}:`, error);
    if (error.response?.status === 403) {
      console.log('Not authorized to view assignment violations, returning empty array...');
      return [];
    } else if (error.response?.status === 404) {
      console.log('Assignment not found, returning empty array...');
      return [];
    }
    
    try {
      const key = `violations_backup_${assignmentId}`;
      const backupViolations = JSON.parse(localStorage.getItem(key) || '[]');
      console.log(`Retrieved ${backupViolations.length} violations from localStorage backup as final fallback`);
      return backupViolations;
    } catch (finalError) {
      console.error('Final fallback failed:', finalError);
      return [];
    }
  }
};

export const getEnrichedViolationsForAssignment = async (assignmentId: number): Promise<ViolationWithStudentResponse[]> => {
  try {
    console.log(`Fetching enriched violations for assignment ${assignmentId}...`);
    
    let enrichedViolations: ViolationWithStudentResponse[] = [];
    
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/violations/enriched`);
      enrichedViolations = response.data;
      console.log(`Found ${enrichedViolations.length} enriched violations via endpoint`);
    } catch (firstError: any) {
      console.log(`Enriched endpoint failed, trying to enrich manually...`);
      
      try {
        const violations = await getAssignmentViolations(assignmentId);
        
        enrichedViolations = await Promise.all(
          violations.map(async (violation) => {
            try {
              const studentResponse = await apiClient.get(`/users/${violation.student_id}`);
              const student = studentResponse.data;
              
              const assignmentResponse = await apiClient.get(`/assignments/${assignmentId}`);
              const assignment = assignmentResponse.data;
              
              let className = 'Unknown Class';
              try {
                const classResponse = await apiClient.get(`/classes/${assignment.class_id}`);
                className = classResponse.data.name || 'Unknown Class';
              } catch (classError) {
                console.log('Could not fetch class info:', classError);
              }
              
              return {
                ...violation,
                student_name: student.username || student.name || `Student ${violation.student_id}`,
                student_email: student.email || 'No email',
                assignment_name: assignment.name || `Assignment ${assignmentId}`,
                class_name: className
              };
            } catch (enrichError) {
              console.log(`Could not enrich violation ${violation.id}:`, enrichError);
              return {
                ...violation,
                student_name: `Student ${violation.student_id}`,
                student_email: 'No email',
                assignment_name: `Assignment ${assignmentId}`,
                class_name: 'Unknown Class'
              };
            }
          })
        );
        
        console.log(`Manually enriched ${enrichedViolations.length} violations`);
      } catch (manualError) {
        console.error('Manual enrichment failed:', manualError);
        enrichedViolations = [];
      }
    }
    
    return enrichedViolations;
  } catch (error: any) {
    console.error(`Failed to fetch enriched violations for assignment ${assignmentId}:`, error);
    if (error.response?.status === 403) {
      console.log('Not authorized to view enriched violations, returning empty array...');
      return [];
    } else if (error.response?.status === 404) {
      console.log('Assignment not found, returning empty array...');
      return [];
    }
    return [];
  }
};

export const getViolationsSummary = async (assignmentId: number): Promise<ViolationSummary> => {
  try {
    console.log(`Getting violations summary for assignment ${assignmentId}...`);
    
    let summaryData: ViolationSummary;
    
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/violations/summary`);
      summaryData = response.data;
      console.log('Got violations summary via endpoint');
    } catch (firstError: any) {
      console.log('Summary endpoint failed, calculating manually...');
      
      const violations = await getAssignmentViolations(assignmentId);
      
      let assignmentName = `Assignment ${assignmentId}`;
      let className = 'Unknown Class';
      let totalStudents = 0;
      
      try {
        const assignmentResponse = await apiClient.get(`/assignments/${assignmentId}`);
        const assignment = assignmentResponse.data;
        assignmentName = assignment.name || assignmentName;
        
        try {
          const classResponse = await apiClient.get(`/classes/${assignment.class_id}`);
          className = classResponse.data.name || className;
          
          try {
            const rosterResponse = await apiClient.get(`/classes/${assignment.class_id}/students`);
            totalStudents = Array.isArray(rosterResponse.data) ? rosterResponse.data.length : 0;
          } catch (rosterError) {
            console.log('Could not get student roster:', rosterError);
          }
        } catch (classError) {
          console.log('Could not get class info:', classError);
        }
      } catch (assignmentError) {
        console.log('Could not get assignment info:', assignmentError);
      }
      
      const violationsByType: Record<string, number> = {};
      const violationsBySeverity = {
        low: 0,
        medium: 0,
        high: 0
      };
      
      let totalTimeAway = 0;
      const studentsWithViolations = new Set<number>();
      
      violations.forEach(violation => {
        violationsByType[violation.violation_type] = (violationsByType[violation.violation_type] || 0) + 1;
        
        if (violation.severity === 'low') violationsBySeverity.low++;
        else if (violation.severity === 'medium') violationsBySeverity.medium++;
        else if (violation.severity === 'high') violationsBySeverity.high++;
        
        totalTimeAway += violation.time_away_seconds || 0;
        studentsWithViolations.add(violation.student_id);
      });
      
      summaryData = {
        assignment_id: assignmentId,
        assignment_name: assignmentName,
        class_name: className,
        total_violations: violations.length,
        violations_by_type: violationsByType,
        violations_by_severity: violationsBySeverity,
        average_time_away_seconds: violations.length > 0 ? totalTimeAway / violations.length : 0,
        students_with_violations: studentsWithViolations.size,
        total_students: totalStudents || studentsWithViolations.size * 2
      };
      
      console.log('Calculated violations summary manually');
    }
    
    return summaryData;
  } catch (error: any) {
    console.error(`Failed to fetch violations summary for assignment ${assignmentId}:`, error);
    
    return {
      assignment_id: assignmentId,
      assignment_name: 'Unknown Assignment',
      class_name: 'Unknown Class',
      total_violations: 0,
      violations_by_type: {},
      violations_by_severity: {
        low: 0,
        medium: 0,
        high: 0
      },
      average_time_away_seconds: 0,
      students_with_violations: 0,
      total_students: 0
    };
  }
};

export const getSubmissionsWithViolations = async (assignmentId: number): Promise<SubmissionWithViolations[]> => {
  try {
    console.log(`Getting submissions with violations for assignment ${assignmentId}...`);
    
    let submissionsWithViolations: SubmissionWithViolations[] = [];
    
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/submissions-with-violations`);
      submissionsWithViolations = response.data;
      console.log(`Found ${submissionsWithViolations.length} submissions with violations via endpoint`);
    } catch (firstError: any) {
      console.log('Dedicated endpoint failed, building manually...');
      
      try {
        const submissionsResponse = await apiClient.get(`/assignments/${assignmentId}/submissions`);
        const submissions = submissionsResponse.data;
        
        const violations = await getAssignmentViolations(assignmentId);
        
        submissionsWithViolations = submissions.map((submission: any) => {
          const submissionViolations = violations.filter(v => v.student_id === submission.student_id);
          
          return {
            submission_id: submission.id,
            student_id: submission.student_id,
            student_name: submission.student_name || `Student ${submission.student_id}`,
            grade: submission.grade,
            time_spent_minutes: submission.time_spent_minutes || 0,
            submitted_at: submission.submitted_at,
            is_graded: submission.grade !== null && submission.grade !== undefined,
            violation_count: submissionViolations.length,
            violations: submissionViolations
          };
        });
        
        console.log(`Built ${submissionsWithViolations.length} submissions with violations manually`);
      } catch (manualError) {
        console.error('Manual building failed:', manualError);
        submissionsWithViolations = [];
      }
    }
    
    return submissionsWithViolations;
  } catch (error: any) {
    console.error(`Failed to fetch submissions with violations for assignment ${assignmentId}:`, error);
    return [];
  }
};

export const getAllViolationsPaginated = async (skip: number = 0, limit: number = 100): Promise<ViolationResponse[]> => {
  try {
    console.log(`Getting violations paginated (skip: ${skip}, limit: ${limit})...`);
    
    let violations: ViolationResponse[] = [];
    
    try {
      const response = await apiClient.get('/violations/', {
        params: { skip, limit }
      });
      violations = response.data;
      console.log(`Found ${violations.length} violations via paginated endpoint`);
    } catch (firstError: any) {
      console.log('Paginated endpoint failed, getting all and slicing...');
      
      try {
        const allViolations = await getAllViolations();
        violations = allViolations.slice(skip, skip + limit);
        console.log(`Sliced ${violations.length} violations from all violations`);
      } catch (secondError: any) {
        console.error('Failed to get paginated violations:', secondError);
        violations = [];
      }
    }
    
    return violations;
  } catch (error: any) {
    console.error('Failed to fetch all violations:', error);
    return [];
  }
};

export const getViolationsForStudent = async (studentId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`Fetching violations for student ${studentId}...`);
    
    let studentViolations: ViolationResponse[] = [];
    
    try {
      const response = await apiClient.get(`/violations/student/${studentId}`);
      studentViolations = response.data;
      console.log(`Found ${studentViolations.length} violations via student endpoint`);
    } catch (firstError: any) {
      console.log('Student endpoint failed, filtering from all violations...');
      
      try {
        const allViolations = await getAllViolations();
        studentViolations = allViolations.filter(v => v.student_id === studentId);
        console.log(`Found ${studentViolations.length} violations by filtering`);
      } catch (secondError: any) {
        console.error('Failed to get student violations:', secondError);
        studentViolations = [];
      }
    }
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          const studentBackupViolations = backupData.filter((v: any) => v.student_id === studentId);
          
          studentBackupViolations.forEach((backupViolation: any) => {
            const exists = studentViolations.some(v => 
              v.id === backupViolation.id || 
              (v.student_id === backupViolation.student_id && 
               v.violation_type === backupViolation.violation_type &&
               v.detected_at === backupViolation.detected_at)
            );
            
            if (!exists) {
              studentViolations.push({
                id: backupViolation.id || Date.now(),
                student_id: backupViolation.student_id,
                assignment_id: backupViolation.assignment_id,
                violation_type: backupViolation.violation_type,
                description: backupViolation.description,
                detected_at: backupViolation.detected_at || new Date().toISOString(),
                time_away_seconds: backupViolation.time_away_seconds || 0,
                severity: backupViolation.severity || 'medium',
                content_added_during_absence: backupViolation.content_added_during_absence,
                ai_similarity_score: backupViolation.ai_similarity_score,
                paste_content_length: backupViolation.paste_content_length
              });
            }
          });
        }
      }
      
      if (studentViolations.length > 0) {
        console.log(`After checking localStorage: ${studentViolations.length} total violations for student`);
      }
    } catch (backupError) {
      console.error('Error checking localStorage for student violations:', backupError);
    }
    
    return studentViolations;
  } catch (error: any) {
    console.error(`Failed to fetch violations for student ${studentId}:`, error);
    return [];
  }
};

export const getViolationById = async (violationId: number): Promise<ViolationResponse> => {
  try {
    console.log(`Fetching violation ${violationId}...`);
    
    try {
      const response = await apiClient.get(`/violations/${violationId}`);
      console.log('Found violation via endpoint');
      return response.data;
    } catch (firstError: any) {
      console.log('Violation endpoint failed, searching in all violations...');
      
      const allViolations = await getAllViolations();
      const violation = allViolations.find(v => v.id === violationId);
      
      if (violation) {
        console.log('Found violation by searching all violations');
        return violation;
      }
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          const backupViolation = backupData.find((v: any) => v.id === violationId);
          if (backupViolation) {
            console.log('Found violation in localStorage backup');
            return backupViolation;
          }
        }
      }
      
      throw new Error('Violation not found');
    }
  } catch (error: any) {
    console.error(`Failed to fetch violation ${violationId}:`, error);
    if (error.message === 'Violation not found') {
      throw new Error('Violation not found');
    }
    throw error;
  }
};

export const createViolation = async (violationData: ViolationCreate): Promise<ViolationResponse> => {
  try {
    console.log('Creating violation:', violationData);
    
    const violationPayload: any = {
      student_id: violationData.student_id,
      assignment_id: violationData.assignment_id,
      violation_type: violationData.violation_type,
      description: violationData.description,
      time_away_seconds: violationData.time_away_seconds,
      severity: violationData.severity
    };
    
    if (violationData.content_added_during_absence !== undefined) {
      violationPayload.content_added_during_absence = violationData.content_added_during_absence;
    }
    if (violationData.ai_similarity_score !== undefined) {
      violationPayload.ai_similarity_score = violationData.ai_similarity_score;
    }
    if (violationData.paste_content_length !== undefined) {
      violationPayload.paste_content_length = violationData.paste_content_length;
    }
    
    let response;
    try {
      response = await apiClient.post('/violations/', violationPayload);
      console.log('Violation created successfully via API:', response.data);
    } catch (apiError: any) {
      console.log('API creation failed, trying alternative endpoint...');
      
      try {
        response = await apiClient.post('/assignments/violations', violationPayload);
        console.log('Violation created via alternative endpoint:', response.data);
      } catch (altError: any) {
        console.log('Alternative endpoint failed, storing locally...');
        
        const localViolation: ViolationResponse = {
          id: Date.now(),
          student_id: violationData.student_id,
          assignment_id: violationData.assignment_id,
          violation_type: violationData.violation_type,
          description: violationData.description,
          detected_at: new Date().toISOString(),
          time_away_seconds: violationData.time_away_seconds,
          severity: violationData.severity,
          content_added_during_absence: violationData.content_added_during_absence,
          ai_similarity_score: violationData.ai_similarity_score,
          paste_content_length: violationData.paste_content_length
        };
        
        try {
          const key = `violations_backup_${violationData.assignment_id}`;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.push(localViolation);
          localStorage.setItem(key, JSON.stringify(existing));
          console.log('Violation saved to localStorage as backup');
        } catch (storageError) {
          console.error('Failed to save violation to localStorage:', storageError);
        }
        
        return localViolation;
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Failed to create violation:', error);
    
    const localViolation: ViolationResponse = {
      id: Date.now(),
      student_id: violationData.student_id,
      assignment_id: violationData.assignment_id,
      violation_type: violationData.violation_type,
      description: violationData.description,
      detected_at: new Date().toISOString(),
      time_away_seconds: violationData.time_away_seconds,
      severity: violationData.severity,
      content_added_during_absence: violationData.content_added_during_absence,
      ai_similarity_score: violationData.ai_similarity_score,
      paste_content_length: violationData.paste_content_length
    };
    
    try {
      const key = `violations_backup_${violationData.assignment_id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(localViolation);
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('Violation saved to localStorage as final fallback');
    } catch (storageError) {
      console.error('Failed to save violation to localStorage:', storageError);
    }
    
    return localViolation;
  }
};

export const deleteViolation = async (violationId: number): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete(`/violations/${violationId}`);
    console.log(`Violation ${violationId} deleted successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to delete violation ${violationId}:`, error);
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          const filteredData = backupData.filter((v: any) => v.id !== violationId);
          if (filteredData.length !== backupData.length) {
            localStorage.setItem(key, JSON.stringify(filteredData));
            console.log(`Removed violation ${violationId} from localStorage`);
            return { message: 'Violation deleted from local storage' };
          }
        }
      }
    } catch (localError) {
      console.error('Failed to delete from localStorage:', localError);
    }
    
    throw new Error('Failed to delete violation');
  }
};

export const getViolationsForSubmission = async (submissionId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`Fetching violations for submission ${submissionId}...`);
    
    let submissionViolations: ViolationResponse[] = [];
    
    try {
      const response = await apiClient.get(`/submissions/${submissionId}/violations`);
      submissionViolations = response.data;
      console.log(`Found ${submissionViolations.length} violations via submission endpoint`);
    } catch (firstError: any) {
      console.log('Submission endpoint failed, trying to find via assignment...');
      
      try {
        const submissionResponse = await apiClient.get(`/submissions/${submissionId}`);
        const submission = submissionResponse.data;
        
        const assignmentViolations = await getAssignmentViolations(submission.assignment_id);
        submissionViolations = assignmentViolations.filter(v => v.student_id === submission.student_id);
        console.log(`Found ${submissionViolations.length} violations via assignment filtering`);
      } catch (secondError: any) {
        console.error('Failed to get submission violations:', secondError);
        submissionViolations = [];
      }
    }
    
    return submissionViolations;
  } catch (error: any) {
    console.error(`Failed to fetch violations for submission ${submissionId}:`, error);
    return [];
  }
};

export const reportStudentViolation = async (
  assignmentId: number,
  violationData: {
    violation_type: 'tab_switch' | 'app_switch' | 'rapid_completion' | 'paste_detected' | 
                    'suspicious_activity' | 'excessive_inactivity' | 'ai_content_detected';
    description: string;
    time_away_seconds: number;
    severity: 'low' | 'medium' | 'high';
    content_added_during_absence?: number;
    ai_similarity_score?: number;
    paste_content_length?: number;
  }
): Promise<ViolationResponse> => {
  try {
    const currentUser = await authService.getUserProfile();
    
    const violationPayload: ViolationCreate = {
      student_id: currentUser.id,
      assignment_id: assignmentId,
      violation_type: violationData.violation_type,
      description: violationData.description,
      time_away_seconds: violationData.time_away_seconds,
      severity: violationData.severity,
      content_added_during_absence: violationData.content_added_during_absence,
      ai_similarity_score: violationData.ai_similarity_score,
      paste_content_length: violationData.paste_content_length
    };
    
    return await createViolation(violationPayload);
  } catch (error: any) {
    console.error('Failed to report student violation:', error);
    
    let studentId = 0;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        studentId = user.id || 0;
      }
    } catch (parseError) {
      console.error('Could not parse user from localStorage:', parseError);
    }
    
    const localViolation: ViolationResponse = {
      id: Date.now(),
      student_id: studentId,
      assignment_id: assignmentId,
      violation_type: violationData.violation_type,
      description: violationData.description,
      detected_at: new Date().toISOString(),
      time_away_seconds: violationData.time_away_seconds,
      severity: violationData.severity,
      content_added_during_absence: violationData.content_added_during_absence,
      ai_similarity_score: violationData.ai_similarity_score,
      paste_content_length: violationData.paste_content_length
    };
    
    try {
      const key = `violations_backup_${assignmentId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(localViolation);
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('Student violation saved to localStorage as backup');
    } catch (storageError) {
      console.error('Failed to save student violation to localStorage:', storageError);
    }
    
    return localViolation;
  }
};

export const getMyViolationsForAssignment = async (assignmentId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`Getting my violations for assignment ${assignmentId}...`);
    
    let myViolations: ViolationResponse[] = [];
    
    try {
      const currentUser = await authService.getUserProfile();
      
      const response = await apiClient.get(`/violations/student/${currentUser.id}`);
      const allViolations = response.data;
      
      myViolations = allViolations.filter(
        (violation: ViolationResponse) => violation.assignment_id === assignmentId
      );
      
      console.log(`Found ${myViolations.length} of my violations via API`);
    } catch (firstError: any) {
      console.log('API failed, trying localStorage...');
      
      try {
        const key = `violations_backup_${assignmentId}`;
        const backupViolations = JSON.parse(localStorage.getItem(key) || '[]');
        
        let studentId = 0;
        try {
          const currentUser = await authService.getUserProfile();
          studentId = currentUser.id;
        } catch (userError) {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            studentId = user.id || 0;
          }
        }
        
        myViolations = backupViolations.filter((v: any) => v.student_id === studentId);
        console.log(`Retrieved ${myViolations.length} of my violations from localStorage backup`);
      } catch (backupError) {
        console.error('Failed to get violations from localStorage:', backupError);
        myViolations = [];
      }
    }
    
    return myViolations;
  } catch (error: any) {
    console.error(`Failed to fetch my violations for assignment ${assignmentId}:`, error);
    return [];
  }
};

export const getViolationStatistics = async (): Promise<{
  total_violations: number;
  by_severity: { low: number; medium: number; high: number };
  by_type: Record<string, number>;
  recent_violations: ViolationResponse[];
}> => {
  try {
    console.log('Getting violation statistics...');
    
    const allViolations = await getAllViolations();
    console.log(`Total violations found: ${allViolations.length}`);
    
    const by_severity = {
      low: allViolations.filter(v => v.severity === 'low').length,
      medium: allViolations.filter(v => v.severity === 'medium').length,
      high: allViolations.filter(v => v.severity === 'high').length
    };
    
    const by_type: Record<string, number> = {};
    allViolations.forEach(violation => {
      by_type[violation.violation_type] = (by_type[violation.violation_type] || 0) + 1;
    });
    
    const recent_violations = [...allViolations]
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
      .slice(0, 10);
    
    const stats = {
      total_violations: allViolations.length,
      by_severity,
      by_type,
      recent_violations
    };
    
    console.log('Violation statistics:', stats);
    return stats;
    
  } catch (error: any) {
    console.error('Failed to fetch violation statistics:', error);
    
    return {
      total_violations: 0,
      by_severity: { low: 0, medium: 0, high: 0 },
      by_type: {},
      recent_violations: []
    };
  }
};

// ====================================
// SUBMISSIONS WITH FILE UPLOAD FUNCTIONS
// ====================================

export const createSubmissionWithFile = async (
  assignmentId: number,
  timeSpentMinutes: number,
  content?: string,
  linkUrl?: string,
  photoFile?: File
): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('assignment_id', assignmentId.toString());
    formData.append('time_spent_minutes', timeSpentMinutes.toString());
    
    if (content) formData.append('content', content);
    if (linkUrl) formData.append('link_url', linkUrl);
    if (photoFile) formData.append('photo', photoFile);
    
    const response = await apiClient.post('/submissions/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to create submission with file:', error);
    throw error;
  }
};

export const updateSubmissionWithFile = async (
  submissionId: number,
  assignmentId: number,
  timeSpentMinutes: number,
  content?: string,
  linkUrl?: string,
  photoFile?: File
): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('assignment_id', assignmentId.toString());
    formData.append('time_spent_minutes', timeSpentMinutes.toString());
    
    if (content) formData.append('content', content);
    if (linkUrl) formData.append('link_url', linkUrl);
    if (photoFile) formData.append('photo', photoFile);
    
    const response = await apiClient.put(`/submissions/${submissionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to update submission with file:', error);
    throw error;
  }
};

export const downloadSubmissionFile = async (submissionId: number): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/submissions/${submissionId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error: any) {
    console.error(`Failed to download file for submission ${submissionId}:`, error);
    throw error;
  }
};

// ====================================
// TEACHER ASSIGNMENT SUBMISSIONS FUNCTIONS
// ====================================

export const getAssignmentSubmissions = async (assignmentId: number): Promise<SubmissionDetailResponse[]> => {
  try {
    console.log(`Loading submissions for assignment ${assignmentId}...`);
    
    let submissions: any[] = [];
    
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/submissions`);
      submissions = response.data;
      console.log(`Found ${submissions.length} submissions via API`);
    } catch (firstError: any) {
      console.log('Submissions endpoint failed, trying alternative...');
      
      try {
        const response = await apiClient.get(`/teachers/assignments/${assignmentId}/submissions`);
        submissions = response.data;
        console.log(`Found ${submissions.length} submissions via teacher endpoint`);
      } catch (secondError: any) {
        console.error('Failed to get submissions:', secondError);
        submissions = [];
      }
    }
    
    if (submissions.length === 0) {
      console.log('No submissions found');
      return [];
    }
    
    console.log(`Found ${submissions.length} submissions`);
    
    let allAssignmentViolations: ViolationResponse[] = [];
    try {
      console.log(`Fetching violations for assignment ${assignmentId}...`);
      allAssignmentViolations = await getAssignmentViolations(assignmentId);
      console.log(`Found ${allAssignmentViolations.length} violations for assignment`);
    } catch (violationError) {
      console.error('Failed to fetch assignment violations:', violationError);
    }
    
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission: any) => {
        let submissionViolations: ViolationResponse[] = [];
        
        try {
          const subViolations = await getViolationsForSubmission(submission.id);
          submissionViolations = [...subViolations];
          console.log(`Submission ${submission.id}: Found ${subViolations.length} submission-specific violations`);
        } catch (subViolationError) {
          console.error(`Failed to fetch submission ${submission.id} violations:`, subViolationError);
        }
        
        const studentAssignmentViolations = allAssignmentViolations.filter(
          v => v.student_id === submission.student_id
        );
        
        console.log(`Student ${submission.student_id}: ${studentAssignmentViolations.length} assignment-level violations`);
        
        const allViolations = [...submissionViolations, ...studentAssignmentViolations];
        const uniqueViolations = Array.from(
          new Map(allViolations.map(v => [
            v.id || `${v.student_id}-${v.violation_type}-${v.detected_at}`, 
            v
          ])).values()
        );
        
        console.log(`Submission ${submission.id}: ${uniqueViolations.length} unique violations`);
        
        return {
          ...submission,
          student_name: submission.student_name || `Student ${submission.student_id}`,
          student_email: submission.student_email || 'No email',
          content: submission.content || '',
          file_path: submission.file_path,
          file_name: submission.file_name,
          submitted_at: submission.submitted_at || new Date().toISOString(),
          grade: submission.grade,
          feedback: submission.feedback,
          is_graded: submission.grade !== null && submission.grade !== undefined,
          time_spent_minutes: submission.time_spent_minutes || 0,
          link_url: submission.link_url,
          violations_count: uniqueViolations.length,
          violations: uniqueViolations
        };
      })
    );
    
    console.log(`Enriched ${enrichedSubmissions.length} submissions with violations`);
    return enrichedSubmissions;
    
  } catch (error: any) {
    console.error(`Failed to get submissions for assignment ${assignmentId}:`, error);
    return [];
  }
};

export const updateSubmissionGrade = async (
  submissionId: number,
  gradeData: GradeUpdate
): Promise<any> => {
  try {
    const response = await apiClient.patch(`/submissions/${submissionId}/grade`, gradeData);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to update grade for submission ${submissionId}:`, error);
    throw error;
  }
};

// ====================================
// STUDENT ASSIGNMENTS FUNCTIONS
// ====================================

export const getStudentAssignmentDetail = async (assignmentId: number): Promise<StudentAssignmentDetail> => {
  try {
    const response = await apiClient.get(`/assignments/student/${assignmentId}`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to get assignment detail ${assignmentId}:`, error);
    if (error.response?.status === 404) {
      console.log('Assignment not found, throwing error...');
      throw new Error('Assignment not found');
    } else if (error.response?.status === 403) {
      console.log('Not authorized to view assignment, throwing error...');
      throw new Error('You are not authorized to view this assignment');
    }
    throw error;
  }
};

export const getStudentMyAssignment = async (assignmentId: number): Promise<StudentAssignmentDetail> => {
  try {
    const response = await apiClient.get(`/students/me/assignments/${assignmentId}`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to get student assignment ${assignmentId}:`, error);
    if (error.response?.status === 404) {
      throw new Error('Assignment not found');
    } else if (error.response?.status === 403) {
      throw new Error('You are not authorized to view this assignment');
    }
    throw error;
  }
};

export const getStudentSubmissionForAssignment = async (assignmentId: number): Promise<any> => {
  try {
    const response = await apiClient.get(`/submissions/assignment/${assignmentId}/student`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to get submission for assignment ${assignmentId}:`, error);
    if (error.response?.status === 404) {
      console.log('No submission found, returning null...');
      return null;
    } else if (error.response?.status === 403) {
      console.log('Not authorized to view submission, returning null...');
      return null;
    }
    throw error;
  }
};

export const getStudentMySubmission = async (assignmentId: number): Promise<any> => {
  try {
    const response = await apiClient.get(`/students/me/submissions/${assignmentId}`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to get student submission ${assignmentId}:`, error);
    if (error.response?.status === 404) {
      console.log('No submission found, returning null...');
      return null;
    } else if (error.response?.status === 403) {
      console.log('Not authorized to view submission, returning null...');
      return null;
    }
    throw error;
  }
};

// ====================================
// EXISTING FUNCTIONS
// ====================================

export const getScheduleCleanliness = async (scheduleId: number): Promise<CleanlinessResponse> => {
  try {
    const response = await apiClient.get(`/schedules/${scheduleId}/cleanliness`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch cleanliness for schedule ${scheduleId}:`, error);
    
    if (error.response?.status === 404) {
      console.log('Cleanliness endpoint not available, returning default...');
      return {
        schedule_id: scheduleId,
        class_id: 0,
        cleanliness_status: 'Unknown',
        has_report: false,
        message: 'Cleanliness endpoint not available'
      };
    }
    throw error;
  }
};

export const loginUser = async (username: string, password: string): Promise<string> => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${API_BASE_URL}/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });
    
    return response.data.access_token;
  } catch (error: any) {
    console.error('Login failed:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get('/users/');
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
    }
    throw error;
  }
};

export const exportAllUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get('/exports/users/all');
    return response.data;
  } catch (error: any) {
    console.error('Failed to export users:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'Failed to export users data. Please try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('Failed to export users data. Please try again.');
  }
};

export const getTeachers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get('/users/');
    const allUsers = response.data;
    const teachers = allUsers.filter((user: User) => user.role === 'teacher');
    return teachers;
  } catch (error: any) {
    console.error('Failed to fetch teachers:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
    }
    throw error;
  }
};

export const getAllClasses = async (): Promise<Class[]> => {
  try {
    const response = await apiClient.get('/classes/');
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch classes:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
    }
    throw error;
  }
};

export const getTeacherClasses = async (): Promise<{classes: Class[], metrics: {total_classes: number, total_students: number}}> => {
  try {
    const response = await apiClient.get('/teachers/me/classes');
    
    let classesWithStudentCount = response.data.classes || [];
    let totalStudents = response.data.metrics?.total_students || 0;
    
    if (totalStudents === 0 && classesWithStudentCount.length > 0) {
      const classesWithCounts = await Promise.all(
        classesWithStudentCount.map(async (classItem: any) => {
          try {
            const rosterResponse = await apiClient.get(`/teachers/me/classes/${classItem.id}/roster`);
            const studentCount = rosterResponse.data?.length || 0;
            return {
              ...classItem,
              student_count: studentCount
            };
          } catch (rosterError) {
            console.error(`Failed to get roster for class ${classItem.id}:`, rosterError);
            return {
              ...classItem,
              student_count: 0
            };
          }
        })
      );
      
      classesWithStudentCount = classesWithCounts;
      totalStudents = classesWithCounts.reduce((sum, classItem) => sum + (classItem.student_count || 0), 0);
    }
    
    return {
      classes: classesWithStudentCount,
      metrics: {
        total_classes: classesWithStudentCount.length,
        total_students: totalStudents
      }
    };
  } catch (error: any) {
    console.error('Failed to fetch teacher classes:', error);
    if (error.response?.status === 403) {
      console.log('Teacher endpoint not available, checking admin endpoint...');
      try {
        const response = await apiClient.get('/classes/');
        return {
          classes: response.data,
          metrics: {
            total_classes: response.data.length,
            total_students: 0
          }
        };
      } catch (adminError: any) {
        if (adminError.response?.status === 403) {
          throw new Error('Access denied. Teacher or admin privileges required.');
        }
        throw adminError;
      }
    }
    throw error;
  }
};

export const getClassRoster = async (classId: number): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/teachers/me/classes/${classId}/roster`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch roster for class ${classId}:`, error);
    if (error.response?.status === 403) {
      console.log('Roster endpoint not available, returning empty roster...');
      return [];
    }
    throw error;
  }
};

export const getTeacherReports = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/teachers/me/reports');
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch teacher reports:', error);
    if (error.response?.status === 403) {
      console.log('Teacher reports endpoint not available...');
      return {
        class_performance: [],
        student_performance: [],
        summary: {
          total_classes: 0,
          total_students: 0,
          overall_average_grade: 0,
          overall_submission_rate: 0
        }
      };
    }
    throw error;
  }
};

export const getTeacherAssignments = async (): Promise<AssignmentResponse[]> => {
  try {
    const response = await apiClient.get('/teachers/me/assignments');
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch teacher assignments:', error);
    if (error.response?.status === 403) {
      console.log('Teacher assignments endpoint not available, returning empty array...');
      return [];
    }
    throw error;
  }
};

export const getStudentSchedule = async (): Promise<ScheduleEnrichedResponse[]> => {
  try {
    const response = await apiClient.get('/students/me/schedule');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching student schedule:', error);
    if (error.response?.status === 403) {
      console.log('Student schedule endpoint not available, returning empty array...');
      return [];
    }
    throw error;
  }
};

export const getStudentClassesAll = async (): Promise<StudentClass[]> => {
  try {
    const response = await apiClient.get('/classes/student/');
    
    const classes = response.data.map((classData: any) => ({
      id: classData.id,
      name: classData.name || `Class ${classData.id}`,
      code: classData.code || 'N/A',
      teacher_id: classData.teacher_id || 0,
      teacher_name: classData.teacher_name || 'Unknown Teacher',
      description: classData.description || '',
      created_at: classData.created_at || new Date().toISOString(),
      student_count: classData.student_count || 0
    }));
    
    return classes;
  } catch (error: any) {
    console.error('Error fetching student classes:', error);
    if (error.response?.status === 403) {
      console.log('Student classes endpoint not available, trying enrolled classes endpoint...');
      try {
        const response = await apiClient.get('/students/me/classes');
        return response.data;
      } catch (enrolledError) {
        console.error('Failed to fetch enrolled classes:', enrolledError);
        return [];
      }
    }
    throw error;
  }
};

export const getStudentAssignmentsAll = async (): Promise<StudentAssignment[]> => {
  try {
    const response = await apiClient.get('/assignments/student/');
    
    const assignments = response.data.map((assignment: any) => ({
      id: assignment.id,
      name: assignment.name || `Assignment ${assignment.id}`,
      description: assignment.description || '',
      class_id: assignment.class_id || 0,
      class_name: assignment.class_name || `Class ${assignment.class_id}`,
      class_code: assignment.class_code || 'N/A',
      teacher_name: assignment.teacher_name || 'Unknown Teacher',
      creator_id: assignment.creator_id || 0,
      created_at: assignment.created_at || new Date().toISOString()
    }));
    
    return assignments;
  } catch (error: any) {
    console.error('Error fetching student assignments:', error);
    if (error.response?.status === 403) {
      console.log('Student assignments endpoint not available, trying student assignments endpoint...');
      try {
        const response = await apiClient.get('/students/me/assignments');
        return response.data;
      } catch (studentError) {
        console.error('Failed to fetch student assignments:', studentError);
        return [];
      }
    }
    throw error;
  }
};

export const getStudentEnrolledClasses = async (): Promise<StudentClass[]> => {
  try {
    const response = await apiClient.get('/students/me/classes');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching enrolled classes:', error);
    if (error.response?.status === 403) {
      console.log('Enrolled classes endpoint not available, returning empty array...');
      return [];
    }
    throw error;
  }
};

export const createSubmission = async (submissionData: SubmissionCreate): Promise<SubmissionResponse> => {
  try {
    const response = await apiClient.post('/submissions/', submissionData);
    return response.data;
  } catch (error: any) {
    console.error('Error creating submission:', error);
    throw error;
  }
};

export const getStudentSubmissions = async (): Promise<SubmissionResponse[]> => {
  try {
    const response = await apiClient.get('/students/me/submissions');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching student submissions:', error);
    if (error.response?.status === 404) {
      console.log('Submissions endpoint not available, returning empty array...');
      return [];
    }
    throw error;
  }
};

export const createUserByAdmin = async (userData: UserCreate): Promise<User> => {
  try {
    const response = await apiClient.post('/users/create', userData);
    return response.data;
  } catch (error: any) {
    console.error('Failed to create user:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'User creation failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 400) {
        errorMessage = errorMessage || 'Invalid user data provided.';
      } else if (error.response.status === 422) {
        errorMessage = errorMessage || 'Invalid request data. Please check all fields.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('User creation failed. Please try again.');
  }
};

export const updateUserByAdmin = async (userId: number, updateData: UserUpdate): Promise<User> => {
  try {
    const response = await apiClient.patch(`/users/${userId}`, updateData);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update user:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'User update failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 404) {
        errorMessage = 'User not found.';
      } else if (error.response.status === 400) {
        errorMessage = errorMessage || 'Invalid user data provided.';
      } else if (error.response.status === 422) {
        errorMessage = errorMessage || 'Invalid request data. Please check all fields.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('User update failed. Please try again.');
  }
};

export const deleteUserByAdmin = async (userId: number): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'User deletion failed. Please try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 404) {
        errorMessage = 'User not found.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('User deletion failed. Please try again.');
  }
};

export const createClass = async (classData: ClassCreate): Promise<Class> => {
  try {
    const response = await apiClient.post('/classes/', classData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to create class:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'Class creation failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 400) {
        errorMessage = errorMessage || 'Invalid class data provided.';
      } else if (error.response.status === 422) {
        errorMessage = errorMessage || 'Invalid request data. Please check all fields.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('Class creation failed. Please try again.');
  }
};

export const updateClass = async (classId: number, updateData: ClassUpdate): Promise<Class> => {
  try {
    const response = await apiClient.patch(`/classes/${classId}`, updateData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to update class:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'Class update failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 404) {
        errorMessage = 'Class not found.';
      } else if (error.response.status === 400) {
        errorMessage = errorMessage || 'Invalid class data provided.';
      } else if (error.response.status === 422) {
        errorMessage = errorMessage || 'Invalid request data. Please check all fields.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('Class update failed. Please try again.');
  }
};

export const deleteClass = async (classId: number): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete(`/classes/${classId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete class:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'Class deletion failed. Please try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 404) {
        errorMessage = 'Class not found.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('Class deletion failed. Please try again.');
  }
};

export const exportAllClasses = async (): Promise<Class[]> => {
  try {
    const BACKEND_URL = 'http://localhost:8000';
    const endpoint = `${BACKEND_URL}/exports/classes/all`;
    
    console.log('exportAllClasses: Starting API call to:', endpoint);
    console.log('exportAllClasses: Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    
    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('exportAllClasses: API response received:', response.status, response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('Failed to export classes:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'Failed to export classes data. Please try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      console.error('Network request details:', error.request);
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
      console.error('Request headers:', error.config?.headers);
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('Failed to export classes data. Please try again.');
  }
};

export const updateClassByAdmin = async (classId: number, updateData: ClassUpdate): Promise<Class> => {
  try {
    const response = await apiClient.patch(`/classes/${classId}`, updateData);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update class:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'Class update failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 404) {
        errorMessage = 'Class not found.';
      } else if (error.response.status === 400) {
        errorMessage = errorMessage || 'Invalid class data provided.';
      } else if (error.response.status === 422) {
        errorMessage = errorMessage || 'Invalid request data. Please check all fields.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('Class update failed. Please try again.');
  }
};

export const deleteClassByAdmin = async (classId: number): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete(`/classes/${classId}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete class:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      let errorMessage = 'Class deletion failed. Please try again.';
      
      if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 404) {
        errorMessage = 'Class not found.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error('Class deletion failed. Please try again.');
  }
};

export const getTeacherStudentsCount = async (): Promise<{ total_students: number }> => {
  try {
    const response = await apiClient.get('/teachers/me/students/count');
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch teacher student count:', error);
    if (error.response?.status === 403) {
      console.log('Teacher student count endpoint not available, returning 0...');
      return { total_students: 0 };
    }
    throw error;
  }
};

export const getUserById = async (userId: number): Promise<User> => {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch user ${userId}:`, error);
    throw error;
  }
};

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);
      
      const response = await axios.post(`${API_BASE_URL}/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      });
      
      const token = response.data.access_token;
      
      localStorage.setItem('authToken', token);
      
      return { token, user: { id: '1', email: credentials.email } };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  async register(userData: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('authToken', token);
      
      return { token, user };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  logout(): void {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  },

  async getCurrentUser(): Promise<AuthResponse['user']> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  },

  async getUserProfile(): Promise<any> {
    try {
      const response = await apiClient.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  },

  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
  }): Promise<any> {
    try {
      const response = await apiClient.put('/users/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  },

  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  async getAllUsers(): Promise<User[]> {
    return getAllUsers();
  },

  async exportAllUsers(): Promise<User[]> {
    return exportAllUsers();
  },

  async getAllClasses(): Promise<Class[]> {
    return getAllClasses();
  },

  async createClass(classData: ClassCreate): Promise<Class> {
    return createClass(classData);
  },

  async updateClass(classId: number, updateData: ClassUpdate): Promise<Class> {
    return updateClass(classId, updateData);
  },

  async deleteClass(classId: number): Promise<{ message: string }> {
    return deleteClass(classId);
  },

  async getCurrentUserProfile(): Promise<any> {
    try {
      const response = await apiClient.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  },

  async updateUserProfile(profileData: {
    first_name?: string;
    last_name?: string;
  }): Promise<any> {
    try {
      const response = await apiClient.put('/users/me', profileData);
      return response.data;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  },

  async uploadProfilePhoto(photoFile: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await apiClient.post('/users/me/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to upload profile photo:', error);
      throw error;
    }
  },

  async getAllSchedules(): Promise<ScheduleResponse[]> {
    try {
      const response = await apiClient.get('/schedules/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      throw error;
    }
  },

  async getSchedulesLive(): Promise<ScheduleEnrichedResponse[]> {
    try {
      const response = await apiClient.get('/schedules/live');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch live schedules:', error);
      throw error;
    }
  },

  async createSchedule(scheduleData: ScheduleCreate): Promise<ScheduleResponse> {
    try {
      const response = await apiClient.post('/schedules/', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  },

  async updateSchedule(scheduleId: number, scheduleData: ScheduleCreate): Promise<ScheduleResponse> {
    try {
      const response = await apiClient.put(`/schedules/${scheduleId}`, scheduleData);
      return response.data;
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  },

  async deleteSchedule(scheduleId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/schedules/${scheduleId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  },

  async getScheduleCleanliness(scheduleId: number): Promise<CleanlinessResponse> {
    return getScheduleCleanliness(scheduleId);
  },

  async getTeacherClasses(): Promise<{classes: Class[], metrics: {total_classes: number, total_students: number}}> {
    return getTeacherClasses();
  },

  async getTeacherAssignments(): Promise<AssignmentResponse[]> {
    return getTeacherAssignments();
  },

  async getTeacherReports(): Promise<any> {
    return getTeacherReports();
  },

  async getClassRoster(classId: number): Promise<any[]> {
    return getClassRoster(classId);
  },

  async getTeacherStudentsCount(): Promise<{ total_students: number }> {
    return getTeacherStudentsCount();
  },

  async getStudentAssignments(): Promise<AssignmentResponse[]> {
    try {
      const response = await apiClient.get('/students/me/assignments');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch student assignments:', error);
      if (error.response?.status === 403) {
        console.log('Student assignments endpoint not available, returning empty array...');
        return [];
      }
      throw error;
    }
  },

  async getStudentSchedule(): Promise<ScheduleEnrichedResponse[]> {
    return getStudentSchedule();
  },

  async getStudentGrades(): Promise<any[]> {
    try {
      const response = await apiClient.get('/students/me/grades');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch student grades:', error);
      if (error.response?.status === 403) {
        console.log('Student grades endpoint not available, returning empty array...');
        return [];
      }
      throw error;
    }
  },

  async getStudentClassesAll(): Promise<StudentClass[]> {
    return getStudentClassesAll();
  },

  async getStudentAssignmentsAll(): Promise<StudentAssignment[]> {
    return getStudentAssignmentsAll();
  },

  async getStudentEnrolledClasses(): Promise<StudentClass[]> {
    return getStudentEnrolledClasses();
  },

  async createSubmission(submissionData: SubmissionCreate): Promise<SubmissionResponse> {
    return createSubmission(submissionData);
  },

  async getStudentSubmissions(): Promise<SubmissionResponse[]> {
    return getStudentSubmissions();
  },

  async getStudentAssignmentDetail(assignmentId: number): Promise<StudentAssignmentDetail> {
    return getStudentAssignmentDetail(assignmentId);
  },

  async getStudentMyAssignment(assignmentId: number): Promise<StudentAssignmentDetail> {
    return getStudentMyAssignment(assignmentId);
  },

  async getStudentSubmissionForAssignment(assignmentId: number): Promise<any> {
    return getStudentSubmissionForAssignment(assignmentId);
  },

  async getStudentMySubmission(assignmentId: number): Promise<any> {
    return getStudentMySubmission(assignmentId);
  },

  async createViolation(violationData: ViolationCreate): Promise<ViolationResponse> {
    return createViolation(violationData);
  },

  async reportStudentViolation(
    assignmentId: number,
    violationData: {
      violation_type: 'tab_switch' | 'app_switch' | 'rapid_completion' | 'paste_detected' | 
                      'suspicious_activity' | 'excessive_inactivity' | 'ai_content_detected';
      description: string;
      time_away_seconds: number;
      severity: 'low' | 'medium' | 'high';
      content_added_during_absence?: number;
      ai_similarity_score?: number;
      paste_content_length?: number;
    }
  ): Promise<ViolationResponse> {
    return reportStudentViolation(assignmentId, violationData);
  },

  async getMyViolationsForAssignment(assignmentId: number): Promise<ViolationResponse[]> {
    return getMyViolationsForAssignment(assignmentId);
  },

  async getAllViolations(): Promise<ViolationResponse[]> {
    return getAllViolations();
  },

  async getAssignmentViolations(assignmentId: number): Promise<ViolationResponse[]> {
    return getAssignmentViolations(assignmentId);
  },

  async getEnrichedViolationsForAssignment(assignmentId: number): Promise<ViolationWithStudentResponse[]> {
    return getEnrichedViolationsForAssignment(assignmentId);
  },

  async getViolationsSummary(assignmentId: number): Promise<ViolationSummary> {
    return getViolationsSummary(assignmentId);
  },

  async getSubmissionsWithViolations(assignmentId: number): Promise<SubmissionWithViolations[]> {
    return getSubmissionsWithViolations(assignmentId);
  },

  async getAllViolationsPaginated(skip: number = 0, limit: number = 100): Promise<ViolationResponse[]> {
    return getAllViolationsPaginated(skip, limit);
  },

  async getViolationsForStudent(studentId: number): Promise<ViolationResponse[]> {
    return getViolationsForStudent(studentId);
  },

  async getViolationById(violationId: number): Promise<ViolationResponse> {
    return getViolationById(violationId);
  },

  async deleteViolation(violationId: number): Promise<{ message: string }> {
    return deleteViolation(violationId);
  },

  async getViolationsForSubmission(submissionId: number): Promise<ViolationResponse[]> {
    return getViolationsForSubmission(submissionId);
  },

  async getViolationStatistics(): Promise<{
    total_violations: number;
    by_severity: { low: number; medium: number; high: number };
    by_type: Record<string, number>;
    recent_violations: ViolationResponse[];
  }> {
    return getViolationStatistics();
  },

  async createSubmissionWithFile(
    assignmentId: number,
    timeSpentMinutes: number,
    content?: string,
    linkUrl?: string,
    photoFile?: File
  ): Promise<any> {
    return createSubmissionWithFile(assignmentId, timeSpentMinutes, content, linkUrl, photoFile);
  },

  async updateSubmissionWithFile(
    submissionId: number,
    assignmentId: number,
    timeSpentMinutes: number,
    content?: string,
    linkUrl?: string,
    photoFile?: File
  ): Promise<any> {
    return updateSubmissionWithFile(submissionId, assignmentId, timeSpentMinutes, content, linkUrl, photoFile);
  },

  async downloadSubmissionFile(submissionId: number): Promise<Blob> {
    return downloadSubmissionFile(submissionId);
  },

  async getAssignmentSubmissions(assignmentId: number): Promise<SubmissionDetailResponse[]> {
    return getAssignmentSubmissions(assignmentId);
  },

  async updateSubmissionGrade(submissionId: number, gradeData: GradeUpdate): Promise<any> {
    return updateSubmissionGrade(submissionId, gradeData);
  },

  async exportAllClasses(): Promise<Class[]> {
    return exportAllClasses();
  },

  async createUserByAdmin(userData: UserCreate): Promise<User> {
    return createUserByAdmin(userData);
  },

  async updateUserByAdmin(userId: number, updateData: UserUpdate): Promise<User> {
    return updateUserByAdmin(userId, updateData);
  },

  async deleteUserByAdmin(userId: number): Promise<{ message: string }> {
    return deleteUserByAdmin(userId);
  },

  async updateClassByAdmin(classId: number, updateData: ClassUpdate): Promise<Class> {
    return updateClassByAdmin(classId, updateData);
  },

  async deleteClassByAdmin(classId: number): Promise<{ message: string }> {
    return deleteClassByAdmin(classId);
  },

  async loginUser(username: string, password: string): Promise<string> {
    return loginUser(username, password);
  },

  async getTeachers(): Promise<User[]> {
    return getTeachers();
  },

  async getUserById(userId: number): Promise<User> {
    return getUserById(userId);
  }
};

export default authService;