// authService.ts - COMPLETE FILE WITH FIXED VIOLATIONS FUNCTIONS
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

// FIXED: Student-specific interfaces with optional fields
export interface StudentClass {
  id: number;
  name: string;
  code: string;
  teacher_id: number;
  teacher_name: string;
  description?: string;  // Optional
  created_at?: string;   // Optional
  student_count?: number; // NEW: Add student count
}

export interface StudentAssignment {
  id: number;
  name: string;
  description?: string;  // Optional
  class_id: number;
  class_name: string;
  class_code?: string;   // Optional
  teacher_name: string;
  creator_id: number;
  created_at?: string;   // Optional
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

// NEW: Cleanliness response interface
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

// NEW: Violations interfaces - UPDATED WITH MORE TYPES
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

// NEW: Enhanced Violation Response with Student Information
export interface ViolationWithStudentResponse extends ViolationResponse {
  student_name: string;
  student_email: string;
  assignment_name: string;
  class_name: string;
}

// NEW: Violation Summary Interface
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

// NEW: Submission with Violations Interface
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

// NEW: Submission with content interface
export interface SubmissionWithContent {
  assignment_id: number;
  content?: string;
  link_url?: string;
  time_spent_minutes: number;
  file_name?: string;
}

// NEW: Submission detail response interface - UPDATED
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
  violations_count?: number; // Add violations count
  violations?: ViolationResponse[]; // Add violations array
}

// NEW: Grade update interface
export interface GradeUpdate {
  grade: number;
  feedback?: string;
}

// NEW: Student assignment detail interface
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
// VIOLATIONS FUNCTIONS FOR TEACHERS - FIXED
// ====================================

/**
 * Get all violations for assignments (Teacher and Admin only)
 * Requires authentication and TEACHER or ADMIN role.
 */
export const getAllViolations = async (): Promise<ViolationResponse[]> => {
  try {
    console.log('🔍 Fetching all violations...');
    
    // Try multiple endpoints to find violations
    try {
      // First try the main violations endpoint
      const response = await apiClient.get('/violations/');
      console.log('✅ Found violations via /violations/ endpoint:', response.data.length);
      return response.data;
    } catch (firstError: any) {
      console.log('❌ /violations/ endpoint failed, trying alternatives...');
      
      // Try assignments/violations endpoint
      try {
        const response = await apiClient.get('/assignments/violations');
        console.log('✅ Found violations via /assignments/violations endpoint:', response.data.length);
        return response.data;
      } catch (secondError: any) {
        console.log('❌ /assignments/violations endpoint failed, trying enriched endpoint...');
        
        // Try enriched violations endpoint
        try {
          const response = await apiClient.get('/violations/enriched');
          console.log('✅ Found violations via /violations/enriched endpoint:', response.data.length);
          return response.data;
        } catch (thirdError: any) {
          console.log('❌ All violation endpoints failed, returning empty array...');
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
    
    // Check for localStorage backup
    try {
      const allBackupViolations: ViolationResponse[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          allBackupViolations.push(...backupData);
        }
      }
      console.log(`📦 Retrieved ${allBackupViolations.length} violations from localStorage backup`);
      return allBackupViolations;
    } catch (backupError) {
      console.error('Failed to get violations from localStorage:', backupError);
      return [];
    }
  }
};

/**
 * Get violations for a specific assignment (Teacher and Admin only)
 * Requires authentication and TEACHER or ADMIN role.
 * FIXED: Now properly handles the response and merges with submission violations
 */
export const getAssignmentViolations = async (assignmentId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`🔍 Fetching violations for assignment ${assignmentId}...`);
    
    // Try multiple endpoints in sequence
    let violationsData: ViolationResponse[] = [];
    
    try {
      // First try the assignment-specific violations endpoint
      const response = await apiClient.get(`/assignments/${assignmentId}/violations`);
      violationsData = response.data;
      console.log(`✅ Found ${violationsData.length} violations for assignment ${assignmentId} via /assignments/${assignmentId}/violations`);
    } catch (firstError: any) {
      console.log(`❌ First endpoint failed for assignment ${assignmentId}, trying alternative...`);
      
      try {
        // Try the enriched endpoint
        const response = await apiClient.get(`/assignments/${assignmentId}/violations/enriched`);
        violationsData = response.data;
        console.log(`✅ Found ${violationsData.length} violations via enriched endpoint`);
      } catch (secondError: any) {
        console.log(`❌ Enriched endpoint failed for assignment ${assignmentId}, trying all violations...`);
        
        try {
          // Get all violations and filter by assignment ID
          const allViolations = await getAllViolations();
          violationsData = allViolations.filter(v => v.assignment_id === assignmentId);
          console.log(`✅ Found ${violationsData.length} violations via filtering all violations`);
        } catch (thirdError: any) {
          console.log(`❌ All methods failed for assignment ${assignmentId}`);
          violationsData = [];
        }
      }
    }
    
    // Also check submissions for embedded violations
    try {
      const submissionsResponse = await apiClient.get(`/assignments/${assignmentId}/submissions`);
      const submissions = submissionsResponse.data;
      
      submissions.forEach((submission: any) => {
        if (submission.violations && Array.isArray(submission.violations)) {
          // Check if these violations are already in our list
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
      
      console.log(`📊 After checking submissions: ${violationsData.length} total violations`);
    } catch (submissionError) {
      console.log('Could not check submissions for embedded violations:', submissionError);
    }
    
    // Check localStorage for backup violations
    try {
      const key = `violations_backup_${assignmentId}`;
      const backupViolations = JSON.parse(localStorage.getItem(key) || '[]');
      if (backupViolations.length > 0) {
        console.log(`📦 Found ${backupViolations.length} backup violations in localStorage`);
        
        // Merge backup violations
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
        
        console.log(`📊 After merging localStorage: ${violationsData.length} total violations`);
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
    
    // Final fallback to localStorage
    try {
      const key = `violations_backup_${assignmentId}`;
      const backupViolations = JSON.parse(localStorage.getItem(key) || '[]');
      console.log(`📦 Retrieved ${backupViolations.length} violations from localStorage backup as final fallback`);
      return backupViolations;
    } catch (finalError) {
      console.error('Final fallback failed:', finalError);
      return [];
    }
  }
};

/**
 * Get enriched violations for a specific assignment (Teacher only)
 * Returns violations with student and assignment information.
 */
export const getEnrichedViolationsForAssignment = async (assignmentId: number): Promise<ViolationWithStudentResponse[]> => {
  try {
    console.log(`🔍 Fetching enriched violations for assignment ${assignmentId}...`);
    
    let enrichedViolations: ViolationWithStudentResponse[] = [];
    
    try {
      // Try the enriched endpoint first
      const response = await apiClient.get(`/assignments/${assignmentId}/violations/enriched`);
      enrichedViolations = response.data;
      console.log(`✅ Found ${enrichedViolations.length} enriched violations via endpoint`);
    } catch (firstError: any) {
      console.log(`❌ Enriched endpoint failed, trying to enrich manually...`);
      
      try {
        // Get regular violations and student info separately
        const violations = await getAssignmentViolations(assignmentId);
        
        // Enrich each violation with student info
        enrichedViolations = await Promise.all(
          violations.map(async (violation) => {
            try {
              // Try to get student info
              const studentResponse = await apiClient.get(`/users/${violation.student_id}`);
              const student = studentResponse.data;
              
              // Try to get assignment info
              const assignmentResponse = await apiClient.get(`/assignments/${assignmentId}`);
              const assignment = assignmentResponse.data;
              
              // Try to get class info
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
        
        console.log(`✅ Manually enriched ${enrichedViolations.length} violations`);
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

/**
 * Get violations summary for a specific assignment (Teacher only)
 * Returns summary statistics about violations.
 */
export const getViolationsSummary = async (assignmentId: number): Promise<ViolationSummary> => {
  try {
    console.log(`📊 Getting violations summary for assignment ${assignmentId}...`);
    
    let summaryData: ViolationSummary;
    
    try {
      // Try the summary endpoint
      const response = await apiClient.get(`/assignments/${assignmentId}/violations/summary`);
      summaryData = response.data;
      console.log('✅ Got violations summary via endpoint');
    } catch (firstError: any) {
      console.log('❌ Summary endpoint failed, calculating manually...');
      
      // Calculate summary manually
      const violations = await getAssignmentViolations(assignmentId);
      
      // Get assignment info
      let assignmentName = `Assignment ${assignmentId}`;
      let className = 'Unknown Class';
      let totalStudents = 0;
      
      try {
        const assignmentResponse = await apiClient.get(`/assignments/${assignmentId}`);
        const assignment = assignmentResponse.data;
        assignmentName = assignment.name || assignmentName;
        
        // Try to get class info and student count
        try {
          const classResponse = await apiClient.get(`/classes/${assignment.class_id}`);
          className = classResponse.data.name || className;
          
          // Try to get student count
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
      
      // Calculate statistics
      const violationsByType: Record<string, number> = {};
      const violationsBySeverity = {
        low: 0,
        medium: 0,
        high: 0
      };
      
      let totalTimeAway = 0;
      const studentsWithViolations = new Set<number>();
      
      violations.forEach(violation => {
        // Count by type
        violationsByType[violation.violation_type] = (violationsByType[violation.violation_type] || 0) + 1;
        
        // Count by severity
        if (violation.severity === 'low') violationsBySeverity.low++;
        else if (violation.severity === 'medium') violationsBySeverity.medium++;
        else if (violation.severity === 'high') violationsBySeverity.high++;
        
        // Track time away
        totalTimeAway += violation.time_away_seconds || 0;
        
        // Track students with violations
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
        total_students: totalStudents || studentsWithViolations.size * 2 // Estimate if unknown
      };
      
      console.log('✅ Calculated violations summary manually');
    }
    
    return summaryData;
  } catch (error: any) {
    console.error(`Failed to fetch violations summary for assignment ${assignmentId}:`, error);
    
    // Return default summary
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

/**
 * Get submissions with their violations for a specific assignment (Teacher only)
 * Returns submissions along with any violations associated with them.
 */
export const getSubmissionsWithViolations = async (assignmentId: number): Promise<SubmissionWithViolations[]> => {
  try {
    console.log(`📋 Getting submissions with violations for assignment ${assignmentId}...`);
    
    let submissionsWithViolations: SubmissionWithViolations[] = [];
    
    try {
      // Try the dedicated endpoint
      const response = await apiClient.get(`/assignments/${assignmentId}/submissions-with-violations`);
      submissionsWithViolations = response.data;
      console.log(`✅ Found ${submissionsWithViolations.length} submissions with violations via endpoint`);
    } catch (firstError: any) {
      console.log('❌ Dedicated endpoint failed, building manually...');
      
      try {
        // Get submissions
        const submissionsResponse = await apiClient.get(`/assignments/${assignmentId}/submissions`);
        const submissions = submissionsResponse.data;
        
        // Get violations
        const violations = await getAssignmentViolations(assignmentId);
        
        // Build submissions with violations
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
        
        console.log(`✅ Built ${submissionsWithViolations.length} submissions with violations manually`);
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

/**
 * Get all violations (with pagination) - Admin and Teacher only
 */
export const getAllViolationsPaginated = async (skip: number = 0, limit: number = 100): Promise<ViolationResponse[]> => {
  try {
    console.log(`📄 Getting violations paginated (skip: ${skip}, limit: ${limit})...`);
    
    let violations: ViolationResponse[] = [];
    
    try {
      // Try paginated endpoint
      const response = await apiClient.get('/violations/', {
        params: { skip, limit }
      });
      violations = response.data;
      console.log(`✅ Found ${violations.length} violations via paginated endpoint`);
    } catch (firstError: any) {
      console.log('❌ Paginated endpoint failed, getting all and slicing...');
      
      try {
        // Get all violations and slice
        const allViolations = await getAllViolations();
        violations = allViolations.slice(skip, skip + limit);
        console.log(`✅ Sliced ${violations.length} violations from all violations`);
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

/**
 * Get violations for a specific student
 * Teachers and Admins can view violations for any student
 * Students can view their own violations only
 */
export const getViolationsForStudent = async (studentId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`👤 Fetching violations for student ${studentId}...`);
    
    let studentViolations: ViolationResponse[] = [];
    
    try {
      // Try student-specific endpoint
      const response = await apiClient.get(`/violations/student/${studentId}`);
      studentViolations = response.data;
      console.log(`✅ Found ${studentViolations.length} violations via student endpoint`);
    } catch (firstError: any) {
      console.log('❌ Student endpoint failed, filtering from all violations...');
      
      try {
        // Get all violations and filter by student ID
        const allViolations = await getAllViolations();
        studentViolations = allViolations.filter(v => v.student_id === studentId);
        console.log(`✅ Found ${studentViolations.length} violations by filtering`);
      } catch (secondError: any) {
        console.error('Failed to get student violations:', secondError);
        studentViolations = [];
      }
    }
    
    // Also check localStorage for backup violations
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          const studentBackupViolations = backupData.filter((v: any) => v.student_id === studentId);
          
          // Merge backup violations
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
        console.log(`📊 After checking localStorage: ${studentViolations.length} total violations for student`);
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

/**
 * Get a specific violation by ID
 * Teachers and Admins can view any violation
 * Students can view their own violations only
 */
export const getViolationById = async (violationId: number): Promise<ViolationResponse> => {
  try {
    console.log(`🔍 Fetching violation ${violationId}...`);
    
    try {
      const response = await apiClient.get(`/violations/${violationId}`);
      console.log('✅ Found violation via endpoint');
      return response.data;
    } catch (firstError: any) {
      console.log('❌ Violation endpoint failed, searching in all violations...');
      
      // Search in all violations
      const allViolations = await getAllViolations();
      const violation = allViolations.find(v => v.id === violationId);
      
      if (violation) {
        console.log('✅ Found violation by searching all violations');
        return violation;
      }
      
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          const backupViolation = backupData.find((v: any) => v.id === violationId);
          if (backupViolation) {
            console.log('✅ Found violation in localStorage backup');
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

/**
 * Create a new violation record
 * Students can create violations for themselves.
 */
export const createViolation = async (violationData: ViolationCreate): Promise<ViolationResponse> => {
  try {
    console.log('🚨 Creating violation:', violationData);
    
    // Prepare the violation data
    const violationPayload: any = {
      student_id: violationData.student_id,
      assignment_id: violationData.assignment_id,
      violation_type: violationData.violation_type,
      description: violationData.description,
      time_away_seconds: violationData.time_away_seconds,
      severity: violationData.severity
    };
    
    // Add optional fields if they exist
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
      // Try to create violation via API
      response = await apiClient.post('/violations/', violationPayload);
      console.log('✅ Violation created successfully via API:', response.data);
    } catch (apiError: any) {
      console.log('❌ API creation failed, trying alternative endpoint...');
      
      try {
        // Try alternative endpoint
        response = await apiClient.post('/assignments/violations', violationPayload);
        console.log('✅ Violation created via alternative endpoint:', response.data);
      } catch (altError: any) {
        console.log('❌ Alternative endpoint failed, storing locally...');
        
        // Create local violation
        const localViolation: ViolationResponse = {
          id: Date.now(), // Temporary ID
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
        
        // Save to localStorage as backup
        try {
          const key = `violations_backup_${violationData.assignment_id}`;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.push(localViolation);
          localStorage.setItem(key, JSON.stringify(existing));
          console.log('💾 Violation saved to localStorage as backup');
        } catch (storageError) {
          console.error('Failed to save violation to localStorage:', storageError);
        }
        
        return localViolation;
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Failed to create violation:', error);
    
    // Last resort: create a local violation
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
    
    // Try to save to localStorage
    try {
      const key = `violations_backup_${violationData.assignment_id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(localViolation);
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('💾 Violation saved to localStorage as final fallback');
    } catch (storageError) {
      console.error('Failed to save violation to localStorage:', storageError);
    }
    
    return localViolation;
  }
};

/**
 * Delete a violation (Admin only)
 */
export const deleteViolation = async (violationId: number): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete(`/violations/${violationId}`);
    console.log(`✅ Violation ${violationId} deleted successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to delete violation ${violationId}:`, error);
    
    // Also try to remove from localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('violations_backup_')) {
          const backupData = JSON.parse(localStorage.getItem(key) || '[]');
          const filteredData = backupData.filter((v: any) => v.id !== violationId);
          if (filteredData.length !== backupData.length) {
            localStorage.setItem(key, JSON.stringify(filteredData));
            console.log(`✅ Removed violation ${violationId} from localStorage`);
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

/**
 * Get violations for a specific submission
 * Teachers can view violations for submissions in their assignments
 * Students can view violations for their own submissions
 */
export const getViolationsForSubmission = async (submissionId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`📄 Fetching violations for submission ${submissionId}...`);
    
    let submissionViolations: ViolationResponse[] = [];
    
    try {
      // Try submission-specific endpoint
      const response = await apiClient.get(`/submissions/${submissionId}/violations`);
      submissionViolations = response.data;
      console.log(`✅ Found ${submissionViolations.length} violations via submission endpoint`);
    } catch (firstError: any) {
      console.log('❌ Submission endpoint failed, trying to find via assignment...');
      
      try {
        // Get submission details to find assignment ID
        const submissionResponse = await apiClient.get(`/submissions/${submissionId}`);
        const submission = submissionResponse.data;
        
        // Get assignment violations and filter by student
        const assignmentViolations = await getAssignmentViolations(submission.assignment_id);
        submissionViolations = assignmentViolations.filter(v => v.student_id === submission.student_id);
        console.log(`✅ Found ${submissionViolations.length} violations via assignment filtering`);
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

/**
 * Report student violation during assignment submission
 * This should be called when student submits an assignment to record any violations
 */
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
    // Get current user info to get student ID
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
    
    // Get current user from localStorage as fallback
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
    
    // Create a local violation record
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
    
    // Save to localStorage as backup
    try {
      const key = `violations_backup_${assignmentId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(localViolation);
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('💾 Student violation saved to localStorage as backup');
    } catch (storageError) {
      console.error('Failed to save student violation to localStorage:', storageError);
    }
    
    return localViolation;
  }
};

/**
 * Get student's own violations for a specific assignment
 * Students can view their own violations for an assignment
 */
export const getMyViolationsForAssignment = async (assignmentId: number): Promise<ViolationResponse[]> => {
  try {
    console.log(`👤 Getting my violations for assignment ${assignmentId}...`);
    
    let myViolations: ViolationResponse[] = [];
    
    try {
      // Get current user
      const currentUser = await authService.getUserProfile();
      
      // Try to get student violations
      const response = await apiClient.get(`/violations/student/${currentUser.id}`);
      const allViolations = response.data;
      
      // Filter violations for this specific assignment
      myViolations = allViolations.filter(
        (violation: ViolationResponse) => violation.assignment_id === assignmentId
      );
      
      console.log(`✅ Found ${myViolations.length} of my violations via API`);
    } catch (firstError: any) {
      console.log('❌ API failed, trying localStorage...');
      
      // Try to get from localStorage backup
      try {
        const key = `violations_backup_${assignmentId}`;
        const backupViolations = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Get current user ID for filtering
        let studentId = 0;
        try {
          const currentUser = await authService.getUserProfile();
          studentId = currentUser.id;
        } catch (userError) {
          // Try localStorage
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            studentId = user.id || 0;
          }
        }
        
        // Filter by student ID
        myViolations = backupViolations.filter((v: any) => v.student_id === studentId);
        console.log(`📂 Retrieved ${myViolations.length} of my violations from localStorage backup`);
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

/**
 * Get violation statistics for teacher dashboard
 * Returns counts by severity and type for quick overview
 */
export const getViolationStatistics = async (): Promise<{
  total_violations: number;
  by_severity: { low: number; medium: number; high: number };
  by_type: Record<string, number>;
  recent_violations: ViolationResponse[];
}> => {
  try {
    console.log('📊 Getting violation statistics...');
    
    const allViolations = await getAllViolations();
    console.log(`📈 Total violations found: ${allViolations.length}`);
    
    const by_severity = {
      low: allViolations.filter(v => v.severity === 'low').length,
      medium: allViolations.filter(v => v.severity === 'medium').length,
      high: allViolations.filter(v => v.severity === 'high').length
    };
    
    const by_type: Record<string, number> = {};
    allViolations.forEach(violation => {
      by_type[violation.violation_type] = (by_type[violation.violation_type] || 0) + 1;
    });
    
    // Get recent violations (last 10)
    const recent_violations = [...allViolations]
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
      .slice(0, 10);
    
    const stats = {
      total_violations: allViolations.length,
      by_severity,
      by_type,
      recent_violations
    };
    
    console.log('📊 Violation statistics:', stats);
    return stats;
    
  } catch (error: any) {
    console.error('Failed to fetch violation statistics:', error);
    
    // Return default statistics
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

/**
 * Create a new submission with optional file upload (Student only)
 * Requires authentication and STUDENT role.
 */
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

/**
 * Update a submission with optional file upload (Student only)
 * Requires authentication and STUDENT role.
 */
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

/**
 * Download submission file
 * Requires authentication.
 */
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
// TEACHER ASSIGNMENT SUBMISSIONS FUNCTIONS - FIXED
// ====================================

/**
 * Get all submissions for a specific assignment (Teacher and Admin only)
 * Requires authentication and TEACHER or ADMIN role.
 * FIXED: Now properly fetches and merges violations from multiple sources
 */
export const getAssignmentSubmissions = async (assignmentId: number): Promise<SubmissionDetailResponse[]> => {
  try {
    console.log(`📋 Loading submissions for assignment ${assignmentId}...`);
    
    let submissions: any[] = [];
    
    // First get all submissions
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/submissions`);
      submissions = response.data;
      console.log(`✅ Found ${submissions.length} submissions via API`);
    } catch (firstError: any) {
      console.log('❌ Submissions endpoint failed, trying alternative...');
      
      try {
        const response = await apiClient.get(`/teachers/assignments/${assignmentId}/submissions`);
        submissions = response.data;
        console.log(`✅ Found ${submissions.length} submissions via teacher endpoint`);
      } catch (secondError: any) {
        console.error('Failed to get submissions:', secondError);
        submissions = [];
      }
    }
    
    if (submissions.length === 0) {
      console.log('No submissions found');
      return [];
    }
    
    console.log(`✅ Found ${submissions.length} submissions`);
    
    // Get violations for the entire assignment
    let allAssignmentViolations: ViolationResponse[] = [];
    try {
      console.log(`🔍 Fetching violations for assignment ${assignmentId}...`);
      allAssignmentViolations = await getAssignmentViolations(assignmentId);
      console.log(`✅ Found ${allAssignmentViolations.length} violations for assignment`);
    } catch (violationError) {
      console.error('Failed to fetch assignment violations:', violationError);
    }
    
    // Enrich each submission with violations
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission: any) => {
        let submissionViolations: ViolationResponse[] = [];
        
        try {
          // Try to get violations specific to this submission
          const subViolations = await getViolationsForSubmission(submission.id);
          submissionViolations = [...subViolations];
          console.log(`📄 Submission ${submission.id}: Found ${subViolations.length} submission-specific violations`);
        } catch (subViolationError) {
          console.error(`Failed to fetch submission ${submission.id} violations:`, subViolationError);
        }
        
        // Also add any assignment-level violations for this student
        const studentAssignmentViolations = allAssignmentViolations.filter(
          v => v.student_id === submission.student_id
        );
        
        console.log(`📊 Student ${submission.student_id}: ${studentAssignmentViolations.length} assignment-level violations`);
        
        // Merge violations, removing duplicates by ID or content
        const allViolations = [...submissionViolations, ...studentAssignmentViolations];
        const uniqueViolations = Array.from(
          new Map(allViolations.map(v => [
            v.id || `${v.student_id}-${v.violation_type}-${v.detected_at}`, 
            v
          ])).values()
        );
        
        console.log(`📊 Submission ${submission.id}: ${uniqueViolations.length} unique violations`);
        
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
    
    console.log(`✅ Enriched ${enrichedSubmissions.length} submissions with violations`);
    return enrichedSubmissions;
    
  } catch (error: any) {
    console.error(`Failed to get submissions for assignment ${assignmentId}:`, error);
    return [];
  }
};

/**
 * Update the grade for a submission (Teacher and Admin only)
 * Requires authentication and TEACHER or ADMIN role.
 */
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

/**
 * Get assignment details for a student
 * Requires authentication and STUDENT role.
 */
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

/**
 * Get assignment details for the current student
 * Requires authentication and STUDENT role.
 */
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

/**
 * Get the current student's submission for a specific assignment
 * Requires authentication and STUDENT role.
 */
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

/**
 * Get the current student's submission for a specific assignment (alternative endpoint)
 * Requires authentication and STUDENT role.
 */
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
// EXISTING FUNCTIONS (REMAIN UNCHANGED)
// ====================================

// Get schedule cleanliness function
export const getScheduleCleanliness = async (scheduleId: number): Promise<CleanlinessResponse> => {
  try {
    const response = await apiClient.get(`/schedules/${scheduleId}/cleanliness`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch cleanliness for schedule ${scheduleId}:`, error);
    
    // Return default response if endpoint not found
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

// FastAPI OAuth2 login function - COMPLETELY REWRITTEN for correct form data format
export const loginUser = async (username: string, password: string): Promise<string> => {
  try {
    // Create URLSearchParams object for form data
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    // Make POST request with explicit form data headers and body
    const response = await axios.post(`${API_BASE_URL}/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });
    
    // Return the access token from the response
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

// Get all users from the protected backend endpoint (Admin only)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.get('/users/');
    
    // Return the data
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Handle specific error cases
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
    }
    throw error;
  }
};

// Get users for export (Admin only) - uses /exports/users/all endpoint
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

// Get all teachers from the protected backend endpoint
export const getTeachers = async (): Promise<User[]> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.get('/users/');
    
    // Filter the response to return only users with role 'teacher'
    const allUsers = response.data;
    const teachers = allUsers.filter((user: User) => user.role === 'teacher');
    
    // Return only teachers
    return teachers;
  } catch (error: any) {
    console.error('Failed to fetch teachers:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Handle specific error cases
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
    }
    throw error;
  }
};

// Get all classes from the protected backend endpoint (Admin only)
export const getAllClasses = async (): Promise<Class[]> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.get('/classes/');
    
    // Return the classes data
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch classes:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Handle specific error cases
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
    }
    throw error;
  }
};

// Get classes for the current teacher with metrics (Teacher-specific endpoint) - UPDATED
export const getTeacherClasses = async (): Promise<{classes: Class[], metrics: {total_classes: number, total_students: number}}> => {
  try {
    // Use teacher-specific endpoint with metrics
    const response = await apiClient.get('/teachers/me/classes');
    
    // Check if the API returns student_count in each class
    let classesWithStudentCount = response.data.classes || [];
    let totalStudents = response.data.metrics?.total_students || 0;
    
    // If API doesn't provide student count, we need to calculate it ourselves
    if (totalStudents === 0 && classesWithStudentCount.length > 0) {
      // We need to get student count for each class individually
      const classesWithCounts = await Promise.all(
        classesWithStudentCount.map(async (classItem: any) => {
          try {
            // Get roster for each class to count students
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
      // If teacher endpoint doesn't exist, fall back to admin endpoint with role check
      console.log('Teacher endpoint not available, checking admin endpoint...');
      try {
        const response = await apiClient.get('/classes/');
        // Transform admin response to match teacher response format
        return {
          classes: response.data,
          metrics: {
            total_classes: response.data.length,
            total_students: 0 // Can't calculate from admin endpoint
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

// Get student roster for a specific class (Teacher-specific endpoint)
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

// Get teacher reports with student performance data (Teacher-specific endpoint)
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

// Get assignments for the current teacher (Teacher-specific endpoint)
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

// FIXED: Student schedule function
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

// FIXED: Get all classes for students
export const getStudentClassesAll = async (): Promise<StudentClass[]> => {
  try {
    const response = await apiClient.get('/classes/student/');
    
    // Transform the response to ensure all required fields exist
    const classes = response.data.map((classData: any) => ({
      id: classData.id,
      name: classData.name || `Class ${classData.id}`,
      code: classData.code || 'N/A',
      teacher_id: classData.teacher_id || 0,
      teacher_name: classData.teacher_name || 'Unknown Teacher',
      description: classData.description || '',
      created_at: classData.created_at || new Date().toISOString(),
      student_count: classData.student_count || 0 // Add student count
    }));
    
    return classes;
  } catch (error: any) {
    console.error('Error fetching student classes:', error);
    if (error.response?.status === 403) {
      console.log('Student classes endpoint not available, trying enrolled classes endpoint...');
      // Fallback to enrolled classes endpoint
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

// FIXED: Get all assignments for students
export const getStudentAssignmentsAll = async (): Promise<StudentAssignment[]> => {
  try {
    const response = await apiClient.get('/assignments/student/');
    
    // Transform the response to ensure all required fields exist
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
      // Fallback to student assignments endpoint
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

// Get enrolled classes for the current student
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

// Create assignment submission
export const createSubmission = async (submissionData: SubmissionCreate): Promise<SubmissionResponse> => {
  try {
    const response = await apiClient.post('/submissions/', submissionData);
    return response.data;
  } catch (error: any) {
    console.error('Error creating submission:', error);
    throw error;
  }
};

// Get submissions for the current student
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

// Create user by admin from the protected backend endpoint
export const createUserByAdmin = async (userData: UserCreate): Promise<User> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.post('/users/create', userData);
    
    // Return the created user data
    return response.data;
  } catch (error: any) {
    console.error('Failed to create user:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'User creation failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('User creation failed. Please try again.');
  }
};

// Update user by admin from the protected backend endpoint
export const updateUserByAdmin = async (userId: number, updateData: UserUpdate): Promise<User> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.patch(`/users/${userId}`, updateData);
    
    // Return the updated user data
    return response.data;
  } catch (error: any) {
    console.error('Failed to update user:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'User update failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('User update failed. Please try again.');
  }
};

// Delete user by admin from the protected backend endpoint
export const deleteUserByAdmin = async (userId: number): Promise<{ message: string }> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.delete(`/users/${userId}`);
    
    // Return the success message
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'User deletion failed. Please try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('User deletion failed. Please try again.');
  }
};

// Create class function for general use
export const createClass = async (classData: ClassCreate): Promise<Class> => {
  try {
    // Use the configured apiClient which automatically includes auth headers and Content-Type
    const response = await apiClient.post('/classes/', classData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    // Return the created class data
    return response.data;
  } catch (error: any) {
    console.error('Failed to create class:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'Class creation failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('Class creation failed. Please try again.');
  }
};

// Update class function for general use
export const updateClass = async (classId: number, updateData: ClassUpdate): Promise<Class> => {
  try {
    // Use the configured apiClient which automatically includes auth headers and Content-Type
    const response = await apiClient.patch(`/classes/${classId}`, updateData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    // Return the updated class data
    return response.data;
  } catch (error: any) {
    console.error('Failed to update class:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'Class update failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('Class update failed. Please try again.');
  }
};

// Delete class function for general use
export const deleteClass = async (classId: number): Promise<{ message: string }> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.delete(`/classes/${classId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    // Return the success message
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete class:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'Class deletion failed. Please try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('Class deletion failed. Please try again.');
  }
};

// Export all classes data (Admin only)
export const exportAllClasses = async (): Promise<Class[]> => {
  try {
    // Explicitly define the backend URL
    const BACKEND_URL = 'http://localhost:8000';
    const endpoint = `${BACKEND_URL}/exports/classes/all`;
    
    console.log('exportAllClasses: Starting API call to:', endpoint);
    console.log('exportAllClasses: Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
    
    // Get the auth token
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    
    // Make explicit request with full URL and auth header
    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('exportAllClasses: API response received:', response.status, response.data);
    
    // Return the classes data
    return response.data;
  } catch (error: any) {
    console.error('Failed to export classes:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'Failed to export classes data. Please try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
      if (error.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
    
    // Handle network or other errors
    if (error.request) {
      console.error('Network request details:', error.request);
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
      console.error('Request headers:', error.config?.headers);
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('Failed to export classes data. Please try again.');
  }
};

// Update class by admin from the protected backend endpoint
export const updateClassByAdmin = async (classId: number, updateData: ClassUpdate): Promise<Class> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.patch(`/classes/${classId}`, updateData);
    
    // Return the updated class data
    return response.data;
  } catch (error: any) {
    console.error('Failed to update class:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'Class update failed. Please check the input and try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('Class update failed. Please try again.');
  }
};

// Delete class by admin from the protected backend endpoint
export const deleteClassByAdmin = async (classId: number): Promise<{ message: string }> => {
  try {
    // Use the configured apiClient which automatically includes auth headers
    const response = await apiClient.delete(`/classes/${classId}`);
    
    // Return the success message
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete class:', error);
    
    // Handle Axios error response
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Extract error message from response
      let errorMessage = 'Class deletion failed. Please try again.';
      
      if (error.response.data?.detail) {
        // Handle different types of detail responses
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error arrays
          errorMessage = error.response.data.detail.map((err: any) => 
            `${err.loc?.join('.') || 'Field'}: ${err.msg || err.type || 'Invalid value'}`
          ).join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          // Handle object details
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      // Handle specific status codes
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
    
    // Handle network or other errors
    if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Handle other errors
    throw new Error('Class deletion failed. Please try again.');
  }
};

// NEW: Get teacher student count endpoint
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

// NEW: Get user by ID
export const getUserById = async (userId: number): Promise<User> => {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch user ${userId}:`, error);
    throw error;
  }
};

// Main auth service object with all methods
export const authService = {
  // Login user - Updated to use the correct endpoint
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Use the same method as loginUser function
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
      
      // Store token in localStorage
      localStorage.setItem('authToken', token);
      
      // Return simplified response
      return { token, user: { id: '1', email: credentials.email } };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Register user
  async register(userData: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('authToken', token);
      
      return { token, user };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  // Logout user
  logout(): void {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  },

  // Get current user
  async getCurrentUser(): Promise<AuthResponse['user']> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  },

  // Get user profile (assumes GET /users/me endpoint exists)
  async getUserProfile(): Promise<any> {
    try {
      const response = await apiClient.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  },

  // Change password (assumes PUT /users/change-password endpoint exists)
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

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  },

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  // Get all users (Admin only)
  async getAllUsers(): Promise<User[]> {
    return getAllUsers();
  },

  // Export all users (Admin only)
  async exportAllUsers(): Promise<User[]> {
    return exportAllUsers();
  },

  // Get all classes (Admin only)
  async getAllClasses(): Promise<Class[]> {
    return getAllClasses();
  },

  // Create class (Admin only)
  async createClass(classData: ClassCreate): Promise<Class> {
    return createClass(classData);
  },

  // Update class (Admin only)
  async updateClass(classId: number, updateData: ClassUpdate): Promise<Class> {
    return updateClass(classId, updateData);
  },

  // Delete class (Admin only)
  async deleteClass(classId: number): Promise<{ message: string }> {
    return deleteClass(classId);
  },

  // Get current user profile
  async getCurrentUserProfile(): Promise<any> {
    try {
      const response = await apiClient.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  },

  // Update user profile
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

  // Upload profile photo
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

  // Schedule management functions
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

  // NEW: Get schedule cleanliness
  async getScheduleCleanliness(scheduleId: number): Promise<CleanlinessResponse> {
    return getScheduleCleanliness(scheduleId);
  },

  // Teacher-specific functions
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

  // Student-specific functions
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

  // FIXED STUDENT-SPECIFIC METHODS
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

  // NEW: Student assignment detail methods
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

  // ====================================
  // NEW: VIOLATIONS METHODS FOR TEACHERS AND STUDENTS
  // ====================================

  // Create violation
  async createViolation(violationData: ViolationCreate): Promise<ViolationResponse> {
    return createViolation(violationData);
  },

  // Report student violation during assignment submission
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

  // Get student's own violations for a specific assignment
  async getMyViolationsForAssignment(assignmentId: number): Promise<ViolationResponse[]> {
    return getMyViolationsForAssignment(assignmentId);
  },

  // Get all violations (Teacher and Admin only)
  async getAllViolations(): Promise<ViolationResponse[]> {
    return getAllViolations();
  },

  // Get violations for specific assignment (Teacher only) - FIXED
  async getAssignmentViolations(assignmentId: number): Promise<ViolationResponse[]> {
    return getAssignmentViolations(assignmentId);
  },

  // Get enriched violations for assignment (Teacher only)
  async getEnrichedViolationsForAssignment(assignmentId: number): Promise<ViolationWithStudentResponse[]> {
    return getEnrichedViolationsForAssignment(assignmentId);
  },

  // Get violations summary for assignment (Teacher only)
  async getViolationsSummary(assignmentId: number): Promise<ViolationSummary> {
    return getViolationsSummary(assignmentId);
  },

  // Get submissions with violations for assignment (Teacher only)
  async getSubmissionsWithViolations(assignmentId: number): Promise<SubmissionWithViolations[]> {
    return getSubmissionsWithViolations(assignmentId);
  },

  // Get all violations with pagination (Teacher and Admin only)
  async getAllViolationsPaginated(skip: number = 0, limit: number = 100): Promise<ViolationResponse[]> {
    return getAllViolationsPaginated(skip, limit);
  },

  // Get violations for specific student
  async getViolationsForStudent(studentId: number): Promise<ViolationResponse[]> {
    return getViolationsForStudent(studentId);
  },

  // Get specific violation by ID
  async getViolationById(violationId: number): Promise<ViolationResponse> {
    return getViolationById(violationId);
  },

  // Delete violation (Admin only)
  async deleteViolation(violationId: number): Promise<{ message: string }> {
    return deleteViolation(violationId);
  },

  // Get violations for specific submission
  async getViolationsForSubmission(submissionId: number): Promise<ViolationResponse[]> {
    return getViolationsForSubmission(submissionId);
  },

  // Get violation statistics for dashboard
  async getViolationStatistics(): Promise<{
    total_violations: number;
    by_severity: { low: number; medium: number; high: number };
    by_type: Record<string, number>;
    recent_violations: ViolationResponse[];
  }> {
    return getViolationStatistics();
  },

  // ====================================
  // NEW: SUBMISSION WITH FILE METHODS
  // ====================================

  // Create submission with file (Student only)
  async createSubmissionWithFile(
    assignmentId: number,
    timeSpentMinutes: number,
    content?: string,
    linkUrl?: string,
    photoFile?: File
  ): Promise<any> {
    return createSubmissionWithFile(assignmentId, timeSpentMinutes, content, linkUrl, photoFile);
  },

  // Update submission with file (Student only)
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

  // Download submission file
  async downloadSubmissionFile(submissionId: number): Promise<Blob> {
    return downloadSubmissionFile(submissionId);
  },

  // ====================================
  // NEW: TEACHER ASSIGNMENT SUBMISSIONS METHODS - FIXED
  // ====================================

  // Get all submissions for assignment (Teacher and Admin only) - FIXED
  async getAssignmentSubmissions(assignmentId: number): Promise<SubmissionDetailResponse[]> {
    return getAssignmentSubmissions(assignmentId);
  },

  // Update submission grade (Teacher and Admin only)
  async updateSubmissionGrade(submissionId: number, gradeData: GradeUpdate): Promise<any> {
    return updateSubmissionGrade(submissionId, gradeData);
  },

  // Export functions
  async exportAllClasses(): Promise<Class[]> {
    return exportAllClasses();
  },

  // Admin functions
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

  // Helper functions
  async loginUser(username: string, password: string): Promise<string> {
    return loginUser(username, password);
  },

  async getTeachers(): Promise<User[]> {
    return getTeachers();
  },

  // NEW: Get user by ID
  async getUserById(userId: number): Promise<User> {
    return getUserById(userId);
  }
};

export default authService;