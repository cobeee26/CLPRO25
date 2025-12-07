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

// NEW: Get schedule cleanliness function
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

  // Export functions
  async exportAllClasses(): Promise<Class[]> {
    return exportAllClasses();
  }
};

export default authService;