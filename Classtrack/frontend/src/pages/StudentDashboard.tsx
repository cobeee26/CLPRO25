import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "../contexts/UserContext";
import DynamicHeader from "../components/DynamicHeader";
import Sidebar from "../components/Sidebar";
import plmunLogo from "../assets/images/PLMUNLOGO.png";
import Swal from 'sweetalert2';

const API_BASE_URL = "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  maxRedirects: 5,
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error(
      "🚨 API Response Error:",
      error.response?.status,
      error.response?.data,
      error.message
    );

    if (error.response?.status === 422) {
      console.error("📋 Validation Errors:", error.response.data.detail);
    }

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
  class_subject?: string;
  due_date?: string;
  points?: number;
  assignment_type?: string;
  teacher_name?: string;
  submission_status?: 'not_started' | 'submitted' | 'graded' | 'late';
  grade?: number | null;
  feedback?: string | null;
  submitted_at?: string;
}

interface ScheduleItem {
  id: number;
  class_id: number;
  start_time: string;
  end_time: string;
  room_number: string;
  status: "Occupied" | "Clean" | "Needs Cleaning";
  class_name: string;
  class_code: string;
  teacher_name: string;
  teacher_full_name: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  date_posted: string;
  is_urgent: boolean;
  author_name: string;
  author_role: string;
}

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id: number | null;
  subject?: string;
  description?: string;
  semester?: string;
  academic_year?: string;
  teacher_name?: string;
}

interface RoomReportData {
  class_id: string;
  is_clean_before: string;
  is_clean_after: string;
  report_text: string;
  photo?: File | null;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [showRoomReportModal, setShowRoomReportModal] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFormErrors, setReportFormErrors] = useState<{
    [key: string]: string;
  }>({});
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  
  const [reportFormData, setReportFormData] = useState<RoomReportData>({
    class_id: "",
    is_clean_before: "",
    is_clean_after: "",
    report_text: "",
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const classIdRef = useRef<HTMLSelectElement>(null);
  const reportTextRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [showScheduleScrollIndicator, setShowScheduleScrollIndicator] =
    useState(true);
  const [
    showAnnouncementsScrollIndicator,
    setShowAnnouncementsScrollIndicator,
  ] = useState(true);
  const [showAssignmentsScrollIndicator, setShowAssignmentsScrollIndicator] =
    useState(true);

  const scheduleScrollRef = useRef<HTMLDivElement>(null);
  const announcementsScrollRef = useRef<HTMLDivElement>(null);
  const assignmentsScrollRef = useRef<HTMLDivElement>(null);

  const swalConfig = {
    customClass: {
      title: 'text-lg font-bold text-gray-900',
      htmlContainer: 'text-sm text-gray-600',
      confirmButton: 'px-4 py-2 rounded-lg font-medium cursor-pointer',
      cancelButton: 'px-4 py-2 rounded-lg font-medium cursor-pointer',
      popup: 'rounded-xl border border-gray-200'
    },
    buttonsStyling: false,
    background: '#ffffff'
  };

  const showSuccessAlert = (
    title: string, 
    text: string = '', 
    type: 'room_report' | 'logout' | 'refresh' | 'assignment' = 'room_report',
    autoDismiss: boolean = true,
    dismissTime: number = 3000
  ) => {
    const iconColor = type === 'logout' ? 'warning' : 'success';
    const confirmButtonColor = type === 'logout' ? '#F59E0B' : '#10B981';
    
    const alertConfig: any = {
      title,
      text,
      icon: iconColor,
      confirmButtonText: 'OK',
      confirmButtonColor,
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: `text-lg font-bold ${
          type === 'logout' ? 'text-yellow-900' : 
          type === 'refresh' ? 'text-blue-900' : 
          'text-green-900'
        }`,
        confirmButton: `px-4 py-2 rounded-lg font-medium ${
          type === 'logout' ? 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer' :
          type === 'refresh' ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' :
          'bg-green-500 hover:bg-green-600 text-white'
        }`
      }
    };

    if (autoDismiss) {
      alertConfig.timer = dismissTime;
      alertConfig.timerProgressBar = true;
      alertConfig.showConfirmButton = false;
    }

    return Swal.fire(alertConfig);
  };

  const showErrorAlert = (
    title: string, 
    text: string = '',
    autoDismiss: boolean = true,
    dismissTime: number = 4000
  ) => {
    const alertConfig: any = {
      title,
      text,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#EF4444',
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-red-900',
        confirmButton: 'px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white cursor-pointer'
      }
    };

    if (autoDismiss) {
      alertConfig.timer = dismissTime;
      alertConfig.timerProgressBar = true;
      alertConfig.showConfirmButton = false;
    }

    return Swal.fire(alertConfig);
  };

  const showConfirmDialog = (
    title: string, 
    text: string, 
    confirmText: string = 'Yes, proceed',
    autoDismiss: boolean = false
  ) => {
    const alertConfig: any = {
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      reverseButtons: true,
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-gray-900',
        confirmButton: 'px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white cursor-pointer',
        cancelButton: 'px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer'
      }
    };

    return Swal.fire(alertConfig);
  };

  const showLoadingAlert = (
    title: string = 'Processing...',
    autoDismiss: boolean = false
  ) => {
    const alertConfig: any = {
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
      ...swalConfig
    };

    if (autoDismiss) {
      alertConfig.timer = 3000;
      alertConfig.timerProgressBar = true;
    }

    return Swal.fire(alertConfig);
  };

  const closeAlert = () => {
    Swal.close();
  };

  const showDraggableAlert = (
    title: string, 
    text: string = '',
    autoDismiss: boolean = true,
    dismissTime: number = 2500
  ) => {
    const alertConfig: any = {
      title,
      text,
      icon: 'success',
      draggable: true,
      confirmButtonText: 'OK',
      confirmButtonColor: '#3B82F6',
      ...swalConfig
    };

    if (autoDismiss) {
      alertConfig.timer = dismissTime;
      alertConfig.timerProgressBar = true;
      alertConfig.showConfirmButton = false;
    }

    return Swal.fire(alertConfig);
  };

  const showInfoAlert = (
    title: string,
    text: string = '',
    autoDismiss: boolean = true,
    dismissTime: number = 3000
  ) => {
    const alertConfig: any = {
      title,
      text,
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3B82F6',
      ...swalConfig,
      customClass: {
        ...swalConfig.customClass,
        title: 'text-lg font-bold text-blue-900',
        confirmButton: 'px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
      }
    };

    if (autoDismiss) {
      alertConfig.timer = dismissTime;
      alertConfig.timerProgressBar = true;
      alertConfig.showConfirmButton = false;
    }

    return Swal.fire(alertConfig);
  };

  const handleScheduleScroll = () => {
    if (scheduleScrollRef.current) {
      const { scrollTop } = scheduleScrollRef.current;
      if (scrollTop > 10) {
        setShowScheduleScrollIndicator(false);
      } else {
        setShowScheduleScrollIndicator(true);
      }
    }
  };

  const handleAnnouncementsScroll = () => {
    if (announcementsScrollRef.current) {
      const { scrollTop } = announcementsScrollRef.current;
      if (scrollTop > 10) {
        setShowAnnouncementsScrollIndicator(false);
      } else {
        setShowAnnouncementsScrollIndicator(true);
      }
    }
  };

  const handleAssignmentsScroll = () => {
    if (assignmentsScrollRef.current) {
      const { scrollTop } = assignmentsScrollRef.current;
      if (scrollTop > 10) {
        setShowAssignmentsScrollIndicator(false);
      } else {
        setShowAssignmentsScrollIndicator(true);
      }
    }
  };

  const getProfileImageUrl = (url: string | null): string => {
    if (!url || url.trim() === "") {
      return "";
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    const baseUrl = "http://localhost:8000";
    let constructedUrl = "";

    if (url.startsWith("/")) {
      constructedUrl = `${baseUrl}${url}`;
    } else if (
      url.startsWith("uploads/") ||
      url.startsWith("photos/") ||
      url.startsWith("static/")
    ) {
      constructedUrl = `${baseUrl}/${url}`;
    } else {
      constructedUrl = `${baseUrl}/uploads/${url}`;
    }

    return constructedUrl;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        );
      case "teacher":
        return (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l9-5-9-5-9 5 9 5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            />
          </svg>
        );
      case "student":
        return (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l9-5-9-5-9 5 9 5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
    }
  };

  const handleLogout = async () => {
    const result = await showConfirmDialog(
      'Confirm Logout',
      'Are you sure you want to logout? You will need to log in again to access your dashboard.',
      'Yes, logout'
    );
    
    if (result.isConfirmed) {
      try {
        localStorage.clear();
        showSuccessAlert('Logged Out', 'You have been successfully logged out.', 'logout', true, 1500);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        showErrorAlert('Logout Error', 'There was an issue logging out. Please try again.', true, 3000);
      }
    }
  };

  const handleViewProfile = () => {
    navigate("/profile");
  };

  const handleViewClasses = () => {
    navigate("/student/classes");
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "student") {
      navigate("/login");
      return;
    }

    if (user) {
      loadStudentData();
    }
  }, [navigate, user]);

  const updateLoadingProgress = (step: number, totalSteps: number = 4) => {
    const progress = Math.floor((step / totalSteps) * 100);
    setLoadingProgress(progress);
  };

  const loadStudentSubmissions = async () => {
    try {
      console.log("📥 Loading student submissions...");
      
      const submissions: any[] = [];
      
      if (!user) {
        console.log('❌ No user found');
        return [];
      }
      
      try {
     
        const assignmentsResponse = await apiClient.get("/assignments/student/");
        const assignmentsData = assignmentsResponse.data || [];
        console.log('📝 Total assignments found:', assignmentsData.length);
        
        for (const assignment of assignmentsData) {
          try {
          
            try {
              const response = await apiClient.get(`/assignments/${assignment.id}/submissions/my`);
              console.log(`✅ Found submission for assignment ${assignment.id}:`, response.data);
              if (response.data) {
                submissions.push({
                  id: response.data.id,
                  assignment_id: assignment.id,
                  student_id: user.id,
                  content: response.data.content || '',
                  file_path: response.data.file_path,
                  submitted_at: response.data.submitted_at,
                  grade: response.data.grade,
                  feedback: response.data.feedback
                });
              }
            } catch (firstError: any) {
              console.log(`❌ First endpoint failed for assignment ${assignment.id}:`, firstError.message);
              
              try {
               
                const response = await apiClient.get(`/assignments/${assignment.id}/submissions`);
                console.log(`✅ Found submission (alternative) for assignment ${assignment.id}`);
                if (response.data && Array.isArray(response.data)) {
                  const mySubmission = response.data.find((sub: any) => sub.student_id === user.id);
                  if (mySubmission) {
                    submissions.push({
                      id: mySubmission.id,
                      assignment_id: assignment.id,
                      student_id: user.id,
                      content: mySubmission.content || '',
                      file_path: mySubmission.file_path,
                      submitted_at: mySubmission.submitted_at,
                      grade: mySubmission.grade,
                      feedback: mySubmission.feedback
                    });
                  }
                }
              } catch (secondError: any) {
                console.log(`❌ Both endpoints failed for assignment ${assignment.id}:`, secondError.message);
                
                if (secondError.response?.status === 404 || firstError.response?.status === 404) {
                  console.log(`ℹ️ No submission found for assignment ${assignment.id} (404)`);
                  continue;
                }
              }
            }
          } catch (submissionError: any) {
            console.warn(`⚠️ Error loading submission for assignment ${assignment.id}:`, submissionError.message);
          }
        }
        
        console.log(`✅ Total loaded submissions: ${submissions.length}`);
        console.log('📋 Submission details:', submissions.map(s => ({
          id: s.id,
          assignment_id: s.assignment_id,
          grade: s.grade,
          submitted_at: s.submitted_at
        })));
        
      } catch (error: any) {
        console.warn('⚠️ Could not load assignments for submissions:', error.message);
      }
      
      setStudentSubmissions(submissions);
      return submissions;
    } catch (error) {
      console.error('❌ Error loading student submissions:', error);
      return [];
    }
  };

  const loadStudentData = async () => {
    try {
      console.log("🔄 Loading student data...");
      setIsInitialLoading(true);
      setHasInitialLoadError(false);
      setLoadingProgress(10); 

      updateLoadingProgress(1, 5);
      await loadStudentClasses();

      updateLoadingProgress(2, 5);
     
      const submissions = await loadStudentSubmissions();
      console.log("📥 Loaded submissions:", submissions);
      setStudentSubmissions(submissions);

      updateLoadingProgress(3, 5);

      await loadStudentAssignments();

      updateLoadingProgress(4, 5);
      await loadSchedules();

      updateLoadingProgress(5, 5);
      await loadAnnouncements();

      console.log("✅ Student data loaded successfully");
      setIsInitialLoading(false);
      setLoadingProgress(100);
    } catch (error) {
      console.error("❌ Error loading student data:", error);
      setHasInitialLoadError(true);
      setIsInitialLoading(false);
      
      showErrorAlert("Load Error", "Failed to load dashboard data. Please refresh the page.", true, 4000);
    }
  };

  const loadStudentClasses = async () => {
    try {
      console.log("📚 Loading classes for student from API...");

      try {
        const response = await apiClient.get("/classes/student/");
        console.log("✅ Classes API response:", response.data);

        if (response.status === 200 && Array.isArray(response.data)) {
          const transformedClasses: Class[] = response.data.map(
            (classItem: any) => ({
              id: classItem.id,
              name: classItem.name || `Class ${classItem.id}`,
              code: classItem.code || `CODE-${classItem.id}`,
              teacher_id: classItem.teacher_id || 0,
              teacher_name:
                classItem.teacher_name ||
                classItem.teacher_username ||
                classItem.teacher?.username ||
                "Teacher",
              description: classItem.description,
              created_at: classItem.created_at || new Date().toISOString(),
            })
          );

          console.log("📊 Transformed classes:", transformedClasses);
          setClasses(transformedClasses);
          localStorage.setItem(
            "student_classes",
            JSON.stringify(transformedClasses)
          );
        } else {
          console.warn("⚠️ Classes API returned unexpected response");
          setClasses([]);
        }
      } catch (error: any) {
        console.error("❌ Error loading classes from API:", error.message);

        try {
          const savedClasses = localStorage.getItem("student_classes");
          if (savedClasses) {
            const parsedClasses = JSON.parse(savedClasses);
            console.log("🔄 Loaded classes from localStorage:", parsedClasses);
            setClasses(parsedClasses);
          } else {
            setClasses([]);
          }
        } catch (localStorageError) {
          console.error("Failed to load from localStorage:", localStorageError);
          setClasses([]);
        }
      }
    } catch (error: any) {
      console.error("❌ Error loading classes:", error);
      setClasses([]);
      throw error; 
    }
  };

  const loadStudentAssignments = async (): Promise<Assignment[]> => {
    try {
      console.log("📝 Loading assignments for student from API...");

      let assignmentsData: Assignment[] = [];

      try {
        const response = await apiClient.get("/assignments/student/");
        console.log("✅ Assignments API response:", response.data);

        if (response.status === 200 && Array.isArray(response.data)) {
          assignmentsData = response.data.map((assignment: any) => {
        
            const submission = studentSubmissions.find(sub => sub.assignment_id === assignment.id);
            
            let submissionStatus: 'not_started' | 'submitted' | 'graded' | 'late' = 'not_started';
            let grade = null;
            let feedback = null;
            let submittedAt = undefined;
            
            if (submission) {
              submittedAt = submission.submitted_at;
              
              if (submission.grade !== null && submission.grade !== undefined) {
                submissionStatus = 'graded';
                grade = submission.grade;
                feedback = submission.feedback;
              } else if (submission.submitted_at) {
                submissionStatus = 'submitted';
              }
            }

            return {
              id: assignment.id,
              name: assignment.name || `Assignment ${assignment.id}`,
              description: assignment.description,
              class_id: assignment.class_id,
              creator_id: assignment.creator_id || 0,
              created_at: assignment.created_at || new Date().toISOString(),
              class_name: assignment.class_name,
              class_code: assignment.class_code,
              teacher_name: assignment.teacher_name,
              due_date: assignment.due_date,
              points: assignment.points || 100,
              assignment_type: assignment.assignment_type || "Homework",
              submission_status: submissionStatus, // Set status here
              grade: grade,
              feedback: feedback,
              submitted_at: submittedAt
            };
          });

          console.log("📝 Raw assignments from API:", assignmentsData);
        } else {
          console.warn("⚠️ Assignments API returned unexpected response");
        }
      } catch (error: any) {
        console.error("❌ Error loading assignments from API:", error.message);

        const savedAssignments = localStorage.getItem("student_assignments");
        if (savedAssignments) {
          console.log("🔄 Using saved assignments from localStorage");
          assignmentsData = JSON.parse(savedAssignments);
        }
      }

      console.log("🔄 Enhancing assignments with class data...");
      console.log("📚 Available classes:", classes);
      console.log("📝 Assignments before enrichment:", assignmentsData);

      const enrichedAssignments = assignmentsData.map((assignment) => {
        const matchingClass = classes.find((c) => c.id === assignment.class_id);

        console.log(
          `📋 Assignment ${assignment.id}: class_id=${assignment.class_id}, matchingClass=`,
          matchingClass
        );

        let classCode = assignment.class_code;
        let className = assignment.class_name;
        let teacherName = assignment.teacher_name;

        if (matchingClass) {
          classCode = matchingClass.code;
          className = matchingClass.name;
          teacherName = matchingClass.teacher_name || teacherName;
        } else {
          if (!classCode) classCode = `CODE-${assignment.class_id}`;
          if (!className) className = `Class ${assignment.class_id}`;
          if (!teacherName) teacherName = "Teacher";
        }

        return {
          ...assignment,
          class_name: className,
          class_code: classCode,
          teacher_name: teacherName,
        };
      });

      console.log("🎯 Enriched assignments:", enrichedAssignments);
      setAssignments(enrichedAssignments);
      localStorage.setItem(
        "student_assignments",
        JSON.stringify(enrichedAssignments)
      );
      return enrichedAssignments;
    } catch (error: any) {
      console.error("❌ Error loading assignments:", error);
      setAssignments([]);
      throw error; 
    }
  };

  const loadSchedules = async () => {
    try {
      console.log("📅 Loading student schedules...");

      try {
        const response = await apiClient.get("/schedules/live");
        console.log("✅ Schedules API response:", response.data);

        if (response.status === 200) {
          let schedulesArray: any[] = [];

          if (Array.isArray(response.data)) {
            schedulesArray = response.data;
          } else if (
            response.data.schedules &&
            Array.isArray(response.data.schedules)
          ) {
            schedulesArray = response.data.schedules;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            schedulesArray = response.data.data;
          } else if (
            response.data.student_schedules &&
            Array.isArray(response.data.student_schedules)
          ) {
            schedulesArray = response.data.student_schedules;
          } else if (
            response.data.class_schedules &&
            Array.isArray(response.data.class_schedules)
          ) {
            schedulesArray = response.data.class_schedules;
          } else {
            Object.keys(response.data).forEach((key) => {
              if (Array.isArray(response.data[key])) {
                schedulesArray = response.data[key];
              }
            });
          }

          console.log("📋 Extracted schedules array:", schedulesArray);

          const transformedSchedules: ScheduleItem[] = schedulesArray
            .map((item: any) => {
              try {
                const startTime = new Date(
                  item.start_time || item.startTime || new Date()
                );
                const endTime = new Date(
                  item.end_time ||
                    item.endTime ||
                    new Date(startTime.getTime() + 2 * 60 * 60 * 1000)
                ); 

                const now = new Date();
                let status: "Occupied" | "Clean" | "Needs Cleaning" = "Clean";

                if (now >= startTime && now <= endTime) {
                  status = "Occupied";
                } else if (item.status) {
                  status = item.status;
                }

                return {
                  id:
                    item.id ||
                    item.schedule_id ||
                    Math.floor(Math.random() * 1000),
                  class_id: item.class_id || item.class?.id || 0,
                  start_time: item.start_time || startTime.toISOString(),
                  end_time: item.end_time || endTime.toISOString(),
                  room_number:
                    item.room_number ||
                    item.room ||
                    item.classroom ||
                    `Room ${Math.floor(Math.random() * 100) + 100}`,
                  status: status,
                  class_name:
                    item.class_name ||
                    item.class?.name ||
                    `Class ${item.class_id || "Unknown"}`,
                  class_code:
                    item.class_code ||
                    item.class?.code ||
                    `CODE-${item.class_id || "000"}`,
                  teacher_name:
                    item.teacher_name ||
                    item.teacher?.name ||
                    item.teacher_full_name ||
                    "Teacher",
                  teacher_full_name:
                    item.teacher_full_name || item.teacher_name || "Teacher",
                };
              } catch (error) {
                console.error("Error transforming schedule item:", item, error);
                return null;
              }
            })
            .filter((item) => item !== null) as ScheduleItem[];

          console.log("🎯 Transformed schedules:", transformedSchedules);

          const sortedSchedules = transformedSchedules.sort((a, b) => {
            return (
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime()
            );
          });

          setSchedule(sortedSchedules);
          console.log(
            "✅ Schedules loaded successfully:",
            sortedSchedules.length,
            "items"
          );
        } else {
          console.warn("⚠️ Schedules API returned unexpected response");
          setSchedule([]);
        }
      } catch (error: any) {
        console.error("❌ Error loading schedules from API:", error.message);

        const mockSchedules: ScheduleItem[] = [
          {
            id: 1,
            class_id: 101,
            start_time: new Date(Date.now()).toISOString(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            room_number: "Room 101",
            status: "Occupied",
            class_name: "Mathematics",
            class_code: "MATH101",
            teacher_name: "Dr. Smith",
            teacher_full_name: "Dr. John Smith",
          },
          {
            id: 2,
            class_id: 102,
            start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
            room_number: "Room 202",
            status: "Clean",
            class_name: "Computer Science",
            class_code: "CS201",
            teacher_name: "Prof. Johnson",
            teacher_full_name: "Prof. Jane Johnson",
          },
          {
            id: 3,
            class_id: 103,
            start_time: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
            end_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
            room_number: "Room 303",
            status: "Clean",
            class_name: "Physics",
            class_code: "PHY301",
            teacher_name: "Dr. Wilson",
            teacher_full_name: "Dr. Robert Wilson",
          },
        ];

        setSchedule(mockSchedules);
        console.log("✅ Using mock schedule data:", mockSchedules);
      }
    } catch (error) {
      console.error("❌ Error loading schedules:", error);
      setSchedule([]);
      throw error; 
    }
  };

  const loadAnnouncements = async () => {
    try {
      console.log("📢 Loading announcements from API...");

      try {
        const response = await apiClient.get("/announcements/live");
        console.log("✅ Announcements API response:", response.data);

        if (response.status === 200) {
          const responseData = response.data;
          const announcementsArray = Array.isArray(responseData)
            ? responseData
            : responseData.announcements || responseData.data || [];

          if (Array.isArray(announcementsArray)) {
            setAnnouncements(announcementsArray);
          } else {
            setAnnouncements([]);
          }
        } else {
          console.warn("⚠️ Announcements API returned unexpected response");
          setAnnouncements([]);
        }
      } catch (error: any) {
        console.error(
          "❌ Error loading announcements from API:",
          error.message
        );
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("❌ Error loading announcements:", error);
      setAnnouncements([]);
      throw error; 
    }
  };

  useEffect(() => {
    if (studentSubmissions.length > 0 && assignments.length > 0) {
      console.log("🔄 Updating assignments with submission status...");
      console.log("📥 Student submissions:", studentSubmissions);
      console.log("📝 Current assignments:", assignments);
      
      const updatedAssignments = assignments.map(assignment => {
        const submission = studentSubmissions.find(sub => sub.assignment_id === assignment.id);
        
        if (submission) {
          console.log(`✅ Found submission for assignment ${assignment.id}:`, submission);
          
          let submissionStatus: 'not_started' | 'submitted' | 'graded' | 'late' = 'submitted';
          
          if (submission.grade !== null && submission.grade !== undefined) {
            submissionStatus = 'graded';
          }
          
          return {
            ...assignment,
            submission_status: submissionStatus,
            grade: submission.grade || null,
            feedback: submission.feedback || null,
            submitted_at: submission.submitted_at
          };
        }
        
        return assignment;
      });
      
      console.log("✅ Updated assignments:", updatedAssignments);
      setAssignments(updatedAssignments);
    }
  }, [studentSubmissions]);

  useEffect(() => {
    if (isInitialLoading) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "assignments_updated") {
        console.log("🔄 Storage change detected, reloading assignments...");
        showInfoAlert("New Assignments", "New assignments are available!", true, 2000);
        loadStudentAssignments();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const refreshInterval = setInterval(() => {
      console.log("🔄 Student: Periodic data refresh");
      loadSchedules();
    }, 30000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [classes, isInitialLoading]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Recent";
    }
  };

  const formatTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", dateTimeString, error);
      return "Invalid time";
    }
  };

  const formatTimeRange = (startTime: string, endTime: string) => {
    try {
      const start = formatTime(startTime);
      const end = formatTime(endTime);

      return `${start} - ${end}`;
    } catch (error) {
      return "Invalid time range";
    }
  };

  const formatScheduleDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return "Today";
      }

      if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
      }

      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return "Overdue";
      } else if (diffDays === 0) {
        return "Due today";
      } else if (diffDays === 1) {
        return "Due tomorrow";
      } else if (diffDays <= 7) {
        return `Due in ${diffDays} days`;
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch (error) {
      return "No due date";
    }
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case "Clean":
        return "bg-green-100 text-green-700 border-green-200";
      case "Occupied":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Needs Cleaning":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getAssignmentStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTeacherName = (fullName: string) => {
    if (!fullName || fullName === "Unknown Teacher") return "Teacher";

    const parts = fullName.trim().split(" ");

    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];

      if (
        firstName.toLowerCase().includes("dr.") ||
        firstName.toLowerCase().includes("doctor")
      ) {
        return `Dr. ${lastName}`;
      } else if (
        firstName.toLowerCase().includes("prof.") ||
        firstName.toLowerCase().includes("professor")
      ) {
        return `Prof. ${lastName}`;
      } else {
        const firstLetter = firstName.charAt(0).toLowerCase();
        const title = ["a", "e", "i", "o", "u"].includes(firstLetter)
          ? "Ms."
          : "Mr.";
        return `${title} ${lastName}`;
      }
    }

    return fullName;
  };

  const handleSubmitAssignment = (assignment: Assignment) => {
    navigate(`/student/assignments/${assignment.id}`);
  };

  const handleCloseRoomReportModal = () => {
    setShowRoomReportModal(false);
    setReportFormErrors({});
    setSelectedPhoto(null);
    setReportFormData({
      class_id: "",
      is_clean_before: "",
      is_clean_after: "",
      report_text: "",
    });
    if (classIdRef.current) classIdRef.current.value = "";
    if (reportTextRef.current) reportTextRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setReportFormErrors({
          photo: "Please select a valid image file (JPG, PNG, GIF, or WebP)",
        });
        showErrorAlert("Invalid File", "Please select a valid image file (JPG, PNG, GIF, or WebP)", true, 3000);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setReportFormErrors({
          photo: "File size must be less than 10MB",
        });
        showErrorAlert("File Too Large", "File size must be less than 10MB", true, 3000);
        return;
      }

      setSelectedPhoto(file);
      setReportFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }
  };

  const validateRoomReportForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    const { class_id, is_clean_before, is_clean_after, report_text } =
      reportFormData;

    if (!class_id || class_id.trim() === "") {
      errors.class_id = "Please select a class/room";
    }

    if (!is_clean_before || is_clean_before.trim() === "") {
      errors.is_clean_before =
        "Please indicate if the room was clean before use";
    }

    if (!is_clean_after || is_clean_after.trim() === "") {
      errors.is_clean_after = "Please indicate if the room was clean after use";
    }

    if (!report_text || report_text.trim() === "") {
      errors.report_text = "Please provide a description of the report";
    } else if (report_text.trim().length < 10) {
      errors.report_text =
        "Please provide a more detailed description (at least 10 characters)";
    }

    setReportFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      showErrorAlert("Validation Error", firstError, true, 3000);
    }
    
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRoomReport = async () => {
    if (!validateRoomReportForm() || !user) {
      return;
    }

    try {
      setIsSubmittingReport(true);
      setReportFormErrors({});
      
      showLoadingAlert("Submitting room report...", false);

      console.log("📤 Submitting room report with data:", reportFormData);

      const formData = new FormData();

      formData.append("class_id", reportFormData.class_id);
      formData.append("is_clean_before", reportFormData.is_clean_before);
      formData.append("is_clean_after", reportFormData.is_clean_after);
      formData.append("report_text", reportFormData.report_text);

      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      const response = await apiClient.post("/reports", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Room report submitted successfully:", response.data);

      closeAlert();

      await loadSchedules();

      handleCloseRoomReportModal();

      showSuccessAlert(
        "Room Report Submitted!",
        "Your room condition report has been submitted successfully.",
        'room_report',
        true,
        3000
      );
      
      setTimeout(() => {
        showDraggableAlert("Successful!", "Room report submitted successfully!", true, 2000);
      }, 100);

    } catch (error: any) {
      console.error("❌ Error submitting room report:", error);
      closeAlert();

      if (error.response?.status === 422) {
        const apiErrors: { [key: string]: string } = {};

        if (Array.isArray(error.response.data?.detail)) {
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.loc.length > 1) {
              const fieldName = err.loc[err.loc.length - 1];
              apiErrors[fieldName] = err.msg;
            }
          });
        } else if (typeof error.response.data?.detail === "object") {
          Object.keys(error.response.data.detail).forEach((field) => {
            apiErrors[field] = error.response.data.detail[field];
          });
        } else if (error.response.data?.detail) {
          apiErrors.general = error.response.data.detail;
        } else {
          apiErrors.general = "Validation failed. Please check your input.";
        }

        setReportFormErrors(apiErrors);
        
        if (apiErrors.general) {
          showErrorAlert("Submission Error", apiErrors.general, true, 4000);
        } else if (Object.keys(apiErrors).length > 0) {
          const firstError = Object.values(apiErrors)[0];
          showErrorAlert("Validation Error", firstError, true, 4000);
        }
      } else {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Oops! 😅 Something went wrong. Please try again.";

        setReportFormErrors({ general: errorMessage });
        showErrorAlert("Submission Failed", errorMessage, true, 4000);
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  useEffect(() => {
    if (classes.length > 0 && !isInitialLoading) {
      console.log("🔄 Classes loaded, automatically enriching assignments...");
      loadStudentAssignments();
    }
  }, [classes, isInitialLoading]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-2xl blur-xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="relative w-16 h-16 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Student Dashboard
          </h2>
          <p className="text-gray-600 max-w-md">
            Preparing your schedule, assignments, and announcements...
          </p>
        </div>

        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Loading data...</span>
            <span>{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md mb-8">
          {[
            { text: "Classes", color: "bg-blue-100 text-blue-600" },
            { text: "Assignments", color: "bg-green-100 text-green-600" },
            { text: "Schedule", color: "bg-purple-100 text-purple-600" },
            { text: "Announcements", color: "bg-orange-100 text-orange-600" },
          ].map((step, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= ((index + 1) * 25)
                  ? `${step.color} shadow-sm`
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.text}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This might take a moment. Please wait...
          </p>
        </div>
      </div>
    );
  }

  if (hasInitialLoadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 a9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to Load Dashboard
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an issue while loading your dashboard data. This could be due to network issues or server problems.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={loadStudentData}
              className="w-full px-6 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry Loading Dashboard
            </button>
            
            <button
              onClick={() => navigate("/login")}
              className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 cursor-pointer"
            >
              Return to Login
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Troubleshooting tips:</p>
            <ul className="text-sm text-gray-500 text-left space-y-1">
              <li>• Check your internet connection</li>
              <li>• Refresh the page (F5 or Ctrl+R)</li>
              <li>• Clear browser cache and try again</li>
              <li>• Contact system administrator if problem persists</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your session...</p>
          <p className="text-gray-500 text-sm mt-2">
            Please wait while we authenticate your account
          </p>
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
              <h1 className="text-lg font-bold text-gray-900">
                Student Portal
              </h1>
              <p className="text-xs text-gray-600">
                ClassTrack Learning Management System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 cursor-pointer"
              title="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              title="Toggle menu"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="hidden lg:block">
          <DynamicHeader
            title="Student Portal"
            subtitle="ClassTrack Learning Management System"
          />
        </div>

        <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-3 mx-4 mb-4 mt-3 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">
                  System Active
                </span>
              </div>
              <div className="text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-600 font-medium">
                {user?.role
                  ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  : "Student"}{" "}
                User
              </span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    Welcome back!
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l9-5-9-5-9 5 9 5z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                        />
                      </svg>
                    </div>
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    Stay organized with your schedule, announcements, and
                    assignments. Track your progress and never miss important
                    deadlines.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-sm">
                    {user?.profile_picture_url &&
                    user.profile_picture_url.trim() !== "" ? (
                      <img
                        src={getProfileImageUrl(user.profile_picture_url)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(
                            "🖼️  Profile image failed to load in dashboard:",
                            e.currentTarget.src
                          );
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <div
                      className={`w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl ${
                        !user?.profile_picture_url ||
                        user.profile_picture_url.trim() === ""
                          ? ""
                          : "hidden"
                      }`}
                    >
                      {getRoleIcon(user?.role || "student")}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {user?.first_name && user?.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user?.username || "User"}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      {user?.username || "user@classtrack.edu"}
                    </p>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full border border-purple-200">
                      {user?.role
                        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                        : "Student"}
                    </span>
                  </div>
                </div>
          
                <button
                  onClick={handleViewProfile}
                  className="px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-gray-300 flex items-center gap-2 cursor-pointer"
                  aria-label="View and edit user profile"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  View Profile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        My Schedule
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">
                        Live
                      </span>
                    </div>
                  </div>

                  <div className="relative flex-1">
                    <div
                      className="absolute inset-0 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      ref={scheduleScrollRef}
                      onScroll={handleScheduleScroll}
                    >
                      {schedule.length > 0 ? (
                        <>
                          <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 a9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-sm text-blue-700">
                                Showing {schedule.length} schedule(s)
                              </span>
                            </div>
                          </div>

                          {schedule.map((item) => (
                            <div
                              key={item.id}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm cursor-pointer"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg shadow-sm">
                                  <svg
                                    className="w-6 h-6 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-1">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                                      {item.class_name}
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                      {formatScheduleDate(item.start_time)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-1">
                                    {formatTeacherName(item.teacher_full_name)}{" "}
                                    | {item.room_number}
                                  </p>
                                  <p className="text-xs text-gray-500 mb-2">
                                    {item.class_code}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatTimeRange(
                                        item.start_time,
                                        item.end_time
                                      )}
                                    </p>
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full border ${getRoomStatusColor(
                                        item.status
                                      )}`}
                                    >
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-gray-500 mb-2">
                            No schedules found
                          </p>
                          <button
                            onClick={loadSchedules}
                            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                          >
                            Refresh Schedules
                          </button>
                        </div>
                      )}
                    </div>

                    {schedule.length > 3 && showScheduleScrollIndicator && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 transition-opacity duration-300">
                        <div className="flex items-center space-x-1 bg-white/90 rounded-full px-3 py-1 border border-gray-300 backdrop-blur-sm shadow-sm">
                          <svg
                            className="w-3 h-3 text-blue-500 animate-bounce"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                          <span className="text-xs text-gray-600">
                            Scroll for more ({schedule.length} total)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Announcements
                      </h3>
                    </div>
                    {announcements.filter((a) => a.is_urgent).length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-orange-600 font-medium">
                          {announcements.filter((a) => a.is_urgent).length}{" "}
                          Urgent
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="relative flex-1">
                    <div
                      className="absolute inset-0 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      ref={announcementsScrollRef}
                      onScroll={handleAnnouncementsScroll}
                    >
                      {announcements.length > 0 ? (
                        announcements.map((announcement) => (
                          <div
                            key={announcement.id}
                            className={`bg-gray-50 rounded-xl p-4 border transition-all duration-200 hover:bg-gray-100 shadow-sm cursor-pointer ${
                              announcement.is_urgent
                                ? "border-orange-300 ring-1 ring-orange-100"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`w-3 h-3 rounded-full mt-2 ${
                                  announcement.is_urgent
                                    ? "bg-orange-500"
                                    : "bg-blue-500"
                                }`}
                              ></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                    {announcement.title}
                                  </h4>
                                  {announcement.is_urgent && (
                                    <span className="px-2 py-1 text-xs rounded-full border ml-2 flex-shrink-0 bg-orange-100 border-orange-200 text-orange-700">
                                      🚨 URGENT
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                                  {announcement.content}
                                </p>
                                <div className="flex justify-between items-center">
                                  <p className="text-xs text-gray-500">
                                    {formatDate(announcement.date_posted)}
                                  </p>
                                  {announcement.author_name && (
                                    <p className="text-xs text-gray-500">
                                      By: {announcement.author_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                            />
                          </svg>
                          <p className="text-gray-500">No announcements</p>
                        </div>
                      )}
                    </div>

                    {announcements.length > 3 &&
                      showAnnouncementsScrollIndicator && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 transition-opacity duration-300">
                          <div className="flex items-center space-x-1 bg-white/90 rounded-full px-3 py-1 border border-gray-300 backdrop-blur-sm shadow-sm">
                            <svg
                              className="w-3 h-3 text-orange-500 animate-bounce"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                            <span className="text-xs text-gray-600">
                              Scroll for more ({announcements.length} total)
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 xl:col-span-1">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        My Assignments
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-blue-600 font-medium">
                        {assignments.length} Total
                      </span>
                    </div>
                  </div>

                  <div className="relative flex-1">
                    <div
                      className="absolute inset-0 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      ref={assignmentsScrollRef}
                      onScroll={handleAssignmentsScroll}
                    >
                      {assignments.length > 0 ? (
                        assignments.map((assignment) => {
                          const classCodeToDisplay =
                            assignment.class_code ||
                            `CODE-${assignment.class_id}`;
                          const classNameToDisplay =
                            assignment.class_name ||
                            `Class ${assignment.class_id}`;
                          const teacherDisplayName = assignment.teacher_name
                            ? assignment.teacher_name.length > 15
                              ? assignment.teacher_name.substring(0, 12) + "..."
                              : assignment.teacher_name
                            : "Teacher";
                          
                          const isSubmitted = assignment.submission_status === 'submitted' || assignment.submission_status === 'graded';
                          const isGraded = assignment.submission_status === 'graded';
                          const hasGrade = assignment.grade !== null && assignment.grade !== undefined;

                          return (
                            <div
                              key={assignment.id}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full border border-blue-200 flex-shrink-0">
                                      {classCodeToDisplay}
                                    </span>
                                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                                      {classNameToDisplay}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                      by {teacherDisplayName}
                                    </span>
                                  </div>

                                  <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1 break-words">
                                    {assignment.name}
                                    {isSubmitted && (
                                      <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                        ✓
                                      </span>
                                    )}
                                  </h4>

                                  <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2 break-words">
                                    {assignment.description ||
                                      "No description provided"}
                                  </p>

                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate max-w-[100px]">
                                        Created:{" "}
                                        {formatDate(assignment.created_at)}
                                      </span>
                                      {assignment.due_date && (
                                        <span
                                          className={`font-medium whitespace-nowrap ${
                                            new Date(assignment.due_date) <
                                            new Date()
                                              ? "text-red-600"
                                              : "text-green-600"
                                          }`}
                                        >
                                          {formatDueDate(assignment.due_date)}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full border whitespace-nowrap ${
                                        isGraded 
                                          ? 'bg-green-100 text-green-700 border-green-200'
                                          : isSubmitted
                                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                                          : 'bg-gray-100 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {isGraded
                                        ? '✓ Graded'
                                        : isSubmitted
                                        ? '✓ Submitted'
                                        : 'Active'}
                                    </span>
                                  </div>
                                  
                                  {hasGrade && (
                                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-green-700 font-medium">Grade:</span>
                                        <span className="text-sm font-bold text-green-800">{assignment.grade}%</span>
                                      </div>
                                      {assignment.feedback && (
                                        <div className="text-xs text-green-600 mt-1 truncate" title={assignment.feedback}>
                                          Feedback: {assignment.feedback}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  handleSubmitAssignment(assignment)
                                }
                                className={`w-full px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm cursor-pointer ${
                                  isSubmitted
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-lg'
                                }`}
                              >
                                {isSubmitted ? 'View Submission' : 'Submit Assignment'}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-gray-500">
                            No assignments available
                          </p>
                        </div>
                      )}
                    </div>

                    {assignments.length > 2 &&
                      showAssignmentsScrollIndicator && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 transition-opacity duration-300">
                          <div className="flex items-center space-x-1 bg-white/90 rounded-full px-3 py-1 border border-gray-300 backdrop-blur-sm shadow-sm">
                            <svg
                              className="w-3 h-3 text-green-500 animate-bounce"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                            <span className="text-xs text-gray-600">
                              Scroll for more ({assignments.length} total)
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <span>Quick Actions</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate("/student/assignments")}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      Submit Assignment
                    </p>
                    <p className="text-xs text-gray-600">Upload your work</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowRoomReportModal(true)}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                  aria-label="Submit room condition report"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      Submit Room Report
                    </p>
                    <p className="text-xs text-gray-600">
                      Report classroom issues
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleViewClasses}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      View Classes
                    </p>
                    <p className="text-xs text-gray-600">
                      See your enrolled classes
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/student/schedule")}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      View Schedule
                    </p>
                    <p className="text-xs text-gray-600">
                      See upcoming Schedule
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showRoomReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-300 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  Submit Room Report
                </h3>
                <button
                  onClick={handleCloseRoomReportModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                  aria-label="Close room report modal"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {reportFormErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-red-400 mt-0.5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 a9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-red-700 text-sm">
                      {reportFormErrors.general}
                    </p>
                  </div>
                </div>
              )}

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class/Room <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportFormData.class_id}
                    onChange={(e) =>
                      setReportFormData((prev) => ({
                        ...prev,
                        class_id: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer ${
                      reportFormErrors.class_id
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    aria-label="Select class or room for report"
                    aria-required="true"
                  >
                    <option value="">Select a class/room</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.code})
                      </option>
                    ))}
                  </select>
                  {reportFormErrors.class_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {reportFormErrors.class_id}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Room Cleanliness Before Use{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="is_clean_before"
                          value="true"
                          checked={reportFormData.is_clean_before === "true"}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              is_clean_before: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-orange-500 bg-white border-gray-300 focus:ring-orange-500 cursor-pointer"
                        />
                        <span className="text-gray-900">Clean </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="is_clean_before"
                          value="false"
                          checked={reportFormData.is_clean_before === "false"}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              is_clean_before: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-orange-500 bg-white border-gray-300 focus:ring-orange-500 cursor-pointer"
                        />
                        <span className="text-gray-900">Not Clean </span>
                      </label>
                    </div>
                    {reportFormErrors.is_clean_before && (
                      <p className="mt-1 text-sm text-red-600">
                        {reportFormErrors.is_clean_before}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Room Cleanliness After Use{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="is_clean_after"
                          value="true"
                          checked={reportFormData.is_clean_after === "true"}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              is_clean_after: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-orange-500 bg-white border-gray-300 focus:ring-orange-500 cursor-pointer"
                        />
                        <span className="text-gray-900">Clean </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="is_clean_after"
                          value="false"
                          checked={reportFormData.is_clean_after === "false"}
                          onChange={(e) =>
                            setReportFormData((prev) => ({
                              ...prev,
                              is_clean_after: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-orange-500 bg-white border-gray-300 focus:ring-orange-500 cursor-pointer"
                        />
                        <span className="text-gray-900">Not Clean </span>
                      </label>
                    </div>
                    {reportFormErrors.is_clean_after && (
                      <p className="mt-1 text-sm text-red-600">
                        {reportFormErrors.is_clean_after}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reportFormData.report_text}
                    onChange={(e) =>
                      setReportFormData((prev) => ({
                        ...prev,
                        report_text: e.target.value,
                      }))
                    }
                    rows={4}
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-text ${
                      reportFormErrors.report_text
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Describe the classroom condition, any issues found, or observations..."
                  />
                  {reportFormErrors.report_text && (
                    <p className="mt-1 text-sm text-red-600">
                      {reportFormErrors.report_text}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo Evidence (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors duration-200 cursor-pointer">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center space-y-2">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-gray-600 text-sm">
                          {selectedPhoto
                            ? selectedPhoto.name
                            : "Click to upload photo evidence"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          JPG, PNG, GIF, WebP (Max 10MB)
                        </p>
                      </div>
                    </label>
                  </div>
                  {selectedPhoto && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg
                            className="w-5 h-5 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-gray-900 text-sm">
                            {selectedPhoto.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhoto(null);
                            if (photoInputRef.current)
                              photoInputRef.current.value = "";
                          }}
                          className="text-red-600 hover:text-red-700 text-sm cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  {reportFormErrors.photo && (
                    <p className="mt-1 text-sm text-red-600">
                      {reportFormErrors.photo}
                    </p>
                  )}
                </div>
              </form>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCloseRoomReportModal}
                  disabled={isSubmittingReport}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRoomReport}
                  disabled={isSubmittingReport}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingReport && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;