import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useUser } from "../contexts/UserContext";
import DynamicHeader from "../components/DynamicHeader";
import Sidebar from "../components/Sidebar";
import plmunLogo from "../assets/images/PLMUNLOGO.png";

// API configuration
const API_BASE_URL = "http://localhost:8000";

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  maxRedirects: 5,
  timeout: 10000,
});

// Request interceptor to add auth token
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

// Response interceptor to handle errors
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
    
    // Handle 422 errors specifically
    if (error.response?.status === 422) {
      console.error("📋 Validation Errors:", error.response.data.detail);
    }
    
    return Promise.reject(error);
  }
);

// INTERFACES
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

  const [loadingStates, setLoadingStates] = useState({
    assignments: true,
    schedule: true,
    announcements: true,
    classes: true,
  });

  // Room Report Modal state
  const [showRoomReportModal, setShowRoomReportModal] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFormErrors, setReportFormErrors] = useState<{ [key: string]: string }>({});
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  // Room report form state
  const [reportFormData, setReportFormData] = useState<RoomReportData>({
    class_id: "",
    is_clean_before: "",
    is_clean_after: "",
    report_text: "",
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form refs for controlled inputs
  const classIdRef = useRef<HTMLSelectElement>(null);
  const reportTextRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Scroll indicators state
  const [showScheduleScrollIndicator, setShowScheduleScrollIndicator] = useState(true);
  const [showAnnouncementsScrollIndicator, setShowAnnouncementsScrollIndicator] = useState(true);
  const [showAssignmentsScrollIndicator, setShowAssignmentsScrollIndicator] = useState(true);

  // Scroll refs
  const scheduleScrollRef = useRef<HTMLDivElement>(null);
  const announcementsScrollRef = useRef<HTMLDivElement>(null);
  const assignmentsScrollRef = useRef<HTMLDivElement>(null);

  // Scroll handlers
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

  // Real-time assignment statistics calculation
  const assignmentStats = {
    total: assignments.length,
    submitted: 0,
    available: assignments.length,
    pending: assignments.length
  };

  // Helper function to construct full image URL
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

  // Helper function to get role icon
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

  // Logout function
  const handleLogout = () => {
    try {
      localStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      window.location.href = "/login";
    }
  };

  // VIEW PROFILE FUNCTION
  const handleViewProfile = () => {
    navigate("/profile");
  };

  useEffect(() => {
    // Check authentication and role
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "student") {
      navigate("/login");
      return;
    }

    // Load student data including assignments from API
    if (user) {
      loadStudentData();
    }
  }, [navigate, user]);

  const loadStudentData = async () => {
    try {
      console.log("🔄 Loading student data...");
      
      // Load classes first, then assignments and other data
      await loadStudentClasses();
      await Promise.all([
        loadStudentAssignments(),
        loadSchedules(),
        loadAnnouncements(),
      ]);
      
      console.log("✅ Student data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading student data:", error);
    }
  };

  // Function to load student classes from API - IMPROVED VERSION
  const loadStudentClasses = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, classes: true }));
      console.log("📚 Loading classes for student from API...");

      try {
        // USING SAME ENDPOINT AS StudentClassesPage
        const response = await apiClient.get("/classes/student/");
        console.log("✅ Classes API response:", response.data);

        if (response.status === 200 && Array.isArray(response.data)) {
          // Transform data exactly like in StudentClassesPage
          const transformedClasses: Class[] = response.data.map((classItem: any) => ({
            id: classItem.id,
            name: classItem.name || `Class ${classItem.id}`,
            code: classItem.code || `CODE-${classItem.id}`,
            teacher_id: classItem.teacher_id || 0,
            teacher_name: classItem.teacher_name || classItem.teacher_username || classItem.teacher?.username || 'Teacher',
            description: classItem.description,
            created_at: classItem.created_at || new Date().toISOString()
          }));
          
          console.log("📊 Transformed classes:", transformedClasses);
          setClasses(transformedClasses);
          localStorage.setItem("student_classes", JSON.stringify(transformedClasses));
        } else {
          console.warn("⚠️ Classes API returned unexpected response");
          setClasses([]);
        }
      } catch (error: any) {
        console.error("❌ Error loading classes from API:", error.message);
        
        // Fallback: Try to load from localStorage
        try {
          const savedClasses = localStorage.getItem('student_classes');
          if (savedClasses) {
            const parsedClasses = JSON.parse(savedClasses);
            console.log('🔄 Loaded classes from localStorage:', parsedClasses);
            setClasses(parsedClasses);
          } else {
            setClasses([]);
          }
        } catch (localStorageError) {
          console.error('Failed to load from localStorage:', localStorageError);
          setClasses([]);
        }
      }
    } catch (error: any) {
      console.error("❌ Error loading classes:", error);
      setClasses([]);
    } finally {
      setLoadingStates((prev) => ({ ...prev, classes: false }));
    }
  };

  // Function to load student assignments from API - IMPROVED VERSION
  const loadStudentAssignments = async (): Promise<Assignment[]> => {
    try {
      setLoadingStates((prev) => ({ ...prev, assignments: true }));
      console.log("📝 Loading assignments for student from API...");

      let assignmentsData: Assignment[] = [];

      try {
        // USING SAME ENDPOINT AS StudentClassesPage
        const response = await apiClient.get("/assignments/student/");
        console.log("✅ Assignments API response:", response.data);

        if (response.status === 200 && Array.isArray(response.data)) {
          assignmentsData = response.data.map((assignment: any) => ({
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
            assignment_type: assignment.assignment_type || "Homework"
          }));

          console.log("📝 Raw assignments from API:", assignmentsData);
        } else {
          console.warn("⚠️ Assignments API returned unexpected response");
        }
      } catch (error: any) {
        console.error("❌ Error loading assignments from API:", error.message);
        
        // Fallback to synchronized assignments from localStorage
        const savedAssignments = localStorage.getItem('student_assignments');
        if (savedAssignments) {
          console.log('🔄 Using saved assignments from localStorage');
          assignmentsData = JSON.parse(savedAssignments);
        }
      }

      // ENHANCE ASSIGNMENTS WITH CLASS DATA - IMPROVED LOGIC
      console.log("🔄 Enhancing assignments with class data...");
      console.log("📚 Available classes:", classes);
      console.log("📝 Assignments before enrichment:", assignmentsData);

      const enrichedAssignments = assignmentsData.map(assignment => {
        // Find the corresponding class from classes state
        const matchingClass = classes.find(c => c.id === assignment.class_id);
        
        console.log(`📋 Assignment ${assignment.id}: class_id=${assignment.class_id}, matchingClass=`, matchingClass);
        
        // Use class info from matching class, fall back to assignment data or default
        let classCode = assignment.class_code;
        let className = assignment.class_name;
        let teacherName = assignment.teacher_name;
        
        if (matchingClass) {
          classCode = matchingClass.code;
          className = matchingClass.name;
          teacherName = matchingClass.teacher_name || teacherName;
        } else {
          // If no matching class, create defaults
          if (!classCode) classCode = `CODE-${assignment.class_id}`;
          if (!className) className = `Class ${assignment.class_id}`;
          if (!teacherName) teacherName = 'Teacher';
        }
        
        return {
          ...assignment,
          class_name: className,
          class_code: classCode,
          teacher_name: teacherName
        };
      });
      
      console.log("🎯 Enriched assignments:", enrichedAssignments);
      setAssignments(enrichedAssignments);
      localStorage.setItem("student_assignments", JSON.stringify(enrichedAssignments));
      return enrichedAssignments;
    } catch (error: any) {
      console.error("❌ Error loading assignments:", error);
      setAssignments([]);
      return [];
    } finally {
      setLoadingStates((prev) => ({ ...prev, assignments: false }));
    }
  };

  // Function to load schedules from API
  const loadSchedules = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, schedule: true }));
      console.log("📅 Loading schedules from API...");

      try {
        const response = await apiClient.get("/schedules/live");
        console.log("✅ Schedules API response:", response.data);

        if (response.status === 200) {
          const responseData = response.data;
          const schedulesArray = Array.isArray(responseData) ? responseData : 
                               (responseData.schedules || responseData.data || []);
          
          if (Array.isArray(schedulesArray)) {
            setSchedule(schedulesArray);
          } else {
            setSchedule([]);
          }
        } else {
          console.warn("⚠️ Schedules API returned unexpected response");
          setSchedule([]);
        }
      } catch (error: any) {
        console.error("❌ Error loading schedules from API:", error.message);
        setSchedule([]);
      }
    } catch (error) {
      console.error("❌ Error loading schedules:", error);
      setSchedule([]);
    } finally {
      setLoadingStates((prev) => ({ ...prev, schedule: false }));
    }
  };

  // Function to load announcements from API
  const loadAnnouncements = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, announcements: true }));
      console.log("📢 Loading announcements from API...");

      try {
        const response = await apiClient.get("/announcements/live");
        console.log("✅ Announcements API response:", response.data);

        if (response.status === 200) {
          const responseData = response.data;
          const announcementsArray = Array.isArray(responseData) ? responseData : 
                                   (responseData.announcements || responseData.data || []);
          
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
        console.error("❌ Error loading announcements from API:", error.message);
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("❌ Error loading announcements:", error);
      setAnnouncements([]);
    } finally {
      setLoadingStates((prev) => ({ ...prev, announcements: false }));
    }
  };

  // Real-time sync for assignments
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "assignments_updated") {
        console.log("🔄 Storage change detected, reloading assignments...");
        loadStudentAssignments();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Set up periodic refresh for real-time updates
    const refreshInterval = setInterval(() => {
      console.log("🔄 Student: Periodic data refresh");
      loadStudentAssignments();
    }, 30000); // Refresh every 30 seconds

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [classes]);

  // Time formatting functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Add timezone offset to convert to local time
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (error) {
      return "Recent";
    }
  };

  const formatTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      // Add timezone offset to convert to local time
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (error) {
      return "Invalid time";
    }
  };

  // Format due date for assignments
  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      const now = new Date();
      const diffTime = localDate.getTime() - now.getTime();
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
        return localDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
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

  // Assignment submission function - navigates to assignments page
  const handleSubmitAssignment = (assignment: Assignment) => {
    // Navigate to assignments page instead of showing modal or submitting directly
    navigate("/student/assignments", { 
      state: { 
        selectedAssignment: assignment,
        assignments: assignments
      } 
    });
  };

  // Room Report Functions
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
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setReportFormErrors({
          photo: "File size must be less than 10MB",
        });
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

  // Validation function
  const validateRoomReportForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    const { class_id, is_clean_before, is_clean_after, report_text } = reportFormData;

    if (!class_id || class_id.trim() === "") {
      errors.class_id = "Please select a class/room";
    }

    if (!is_clean_before || is_clean_before.trim() === "") {
      errors.is_clean_before = "Please indicate if the room was clean before use";
    }

    if (!is_clean_after || is_clean_after.trim() === "") {
      errors.is_clean_after = "Please indicate if the room was clean after use";
    }

    if (!report_text || report_text.trim() === "") {
      errors.report_text = "Please provide a description of the report";
    } else if (report_text.trim().length < 10) {
      errors.report_text = "Please provide a more detailed description (at least 10 characters)";
    }

    setReportFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Room report submission
  const handleSubmitRoomReport = async () => {
    if (!validateRoomReportForm() || !user) {
      return;
    }

    try {
      setIsSubmittingReport(true);
      setReportFormErrors({});

      // Create proper FormData with correct field names
      const formData = new FormData();
      
      // Convert string values to proper types expected by API
      formData.append("class_id", reportFormData.class_id);
      formData.append("is_clean_before", reportFormData.is_clean_before === "true" ? "true" : "false");
      formData.append("is_clean_after", reportFormData.is_clean_after === "true" ? "true" : "false");
      formData.append("report_text", reportFormData.report_text);

      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      console.log("📤 Submitting room report with data:", {
        class_id: reportFormData.class_id,
        is_clean_before: reportFormData.is_clean_before,
        is_clean_after: reportFormData.is_clean_after,
        report_text: reportFormData.report_text,
        has_photo: !!selectedPhoto
      });

      const response = await apiClient.post("/reports", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Room report submitted successfully:", response.data);
      handleCloseRoomReportModal();
      alert("Room report submitted successfully!");
    } catch (error: any) {
      console.error("❌ Error submitting room report:", error);

      // Better error handling for 422 responses
      if (error.response?.status === 422) {
        const apiErrors: { [key: string]: string } = {};
        
        if (Array.isArray(error.response.data?.detail)) {
          // Handle Pydantic validation errors
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.loc.length > 1) {
              const fieldName = err.loc[err.loc.length - 1];
              apiErrors[fieldName] = err.msg;
            }
          });
        } else if (typeof error.response.data?.detail === 'object') {
          // Handle object-style validation errors
          Object.keys(error.response.data.detail).forEach(field => {
            apiErrors[field] = error.response.data.detail[field];
          });
        } else if (error.response.data?.detail) {
          // Handle string error message
          apiErrors.general = error.response.data.detail;
        } else {
          apiErrors.general = "Validation failed. Please check your input.";
        }
        
        setReportFormErrors(apiErrors);
      } else {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Failed to submit room report. Please try again.";
        setReportFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Refresh assignments data when classes are loaded
  useEffect(() => {
    if (classes.length > 0 && assignments.length > 0) {
      console.log("🔄 Classes loaded, re-enriching assignments...");
      loadStudentAssignments();
    }
  }, [classes]);

  // Show loading screen while user data is being fetched
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">
            Please wait while we fetch your data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile Header */}
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
              <h1 className="text-lg font-bold text-gray-900">Student Portal</h1>
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

        {/* Dynamic Header - FOR DESKTOP */}
        <div className="hidden lg:block">
          <DynamicHeader
            title="Student Portal"
            subtitle="ClassTrack Learning Management System"
          />
        </div>

        {/* Status Bar */}
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

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Welcome Section */}
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

            {/* User Profile Card */}
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
                {/* VIEW PROFILE BUTTON */}
                <button
                  onClick={handleViewProfile}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-gray-300 flex items-center gap-2 cursor-pointer"
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

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Schedule Section - WITH SCROLLING */}
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
                        Today's Schedule
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
                      {loadingStates.schedule ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="w-10 h-10 bg-gray-300 rounded-xl animate-pulse"></div>
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse"></div>
                                  <div className="h-3 bg-gray-300 rounded w-1/2 mb-2 animate-pulse"></div>
                                  <div className="h-3 bg-gray-300 rounded w-2/3 animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : schedule.length > 0 ? (
                        schedule.map((item) => (
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
                                <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                  {item.class_name}
                                </h4>
                                <p className="text-xs text-gray-600 mb-1">
                                  {formatTeacherName(item.teacher_full_name)} |{" "}
                                  {item.room_number}
                                </p>
                                <p className="text-xs text-gray-500 mb-2">
                                  {item.class_code}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatTime(item.start_time)} -{" "}
                                    {formatTime(item.end_time)}
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
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-gray-500">
                            No schedule for today
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Scroll Indicator for Schedule - Auto hides when scrolled */}
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
                            Scroll for more
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Announcements Section - WITH SCROLLING */}
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
                      {loadingStates.announcements ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="w-3 h-3 bg-gray-300 rounded-full mt-2 animate-pulse"></div>
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse"></div>
                                  <div className="h-3 bg-gray-300 rounded w-full mb-2 animate-pulse"></div>
                                  <div className="h-3 bg-gray-300 rounded w-2/3 mb-2 animate-pulse"></div>
                                  <div className="h-3 bg-gray-300 rounded w-1/3 animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : announcements.length > 0 ? (
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

                    {/* Scroll Indicator for Announcements - Auto hides when scrolled */}
                    {announcements.length > 3 && showAnnouncementsScrollIndicator && (
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
                            Scroll for more
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignments Section - WITH IMPROVED UI DESIGN */}
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
                        {assignmentStats.total} Total
                      </span>
                    </div>
                  </div>

                  {/* Assignment Statistics - Clean Design */}
                  <div className="mb-4 grid grid-cols-4 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                      <p className="text-lg font-bold text-blue-600">{assignmentStats.total}</p>
                      <p className="text-xs text-blue-700">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                      <p className="text-lg font-bold text-green-600">{assignmentStats.submitted}</p>
                      <p className="text-xs text-green-700">Submitted</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                      <p className="text-lg font-bold text-orange-600">{assignmentStats.available}</p>
                      <p className="text-xs text-orange-700">Available</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
                      <p className="text-lg font-bold text-purple-600">{assignmentStats.pending}</p>
                      <p className="text-xs text-purple-700">Pending</p>
                    </div>
                  </div>

                  {/* Scrollable Assignments Area */}
                  <div className="relative flex-1">
                    <div 
                      className="absolute inset-0 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      ref={assignmentsScrollRef}
                      onScroll={handleAssignmentsScroll}
                    >
                      {loadingStates.assignments ? (
                        <div className="space-y-3">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse"></div>
                                  <div className="h-3 bg-gray-300 rounded w-1/2 mb-2 animate-pulse"></div>
                                  <div className="h-3 bg-gray-300 rounded w-full mb-2 animate-pulse"></div>
                                </div>
                                <div className="w-16 h-6 bg-gray-300 rounded-full ml-2 animate-pulse"></div>
                              </div>
                              <div className="h-8 bg-gray-300 rounded-xl w-full animate-pulse"></div>
                            </div>
                          ))}
                        </div>
                      ) : assignments.length > 0 ? (
                        assignments.map((assignment) => {
                          // Determine class code to display - using enriched data
                          const classCodeToDisplay = assignment.class_code || `CODE-${assignment.class_id}`;
                          
                          // Determine class name to display - using enriched data
                          const classNameToDisplay = assignment.class_name || `Class ${assignment.class_id}`;
                          
                          // Truncate teacher name if too long
                          const teacherDisplayName = assignment.teacher_name 
                            ? (assignment.teacher_name.length > 15 
                                ? assignment.teacher_name.substring(0, 12) + '...' 
                                : assignment.teacher_name)
                            : 'Teacher';
                          
                          return (
                            <div
                              key={assignment.id}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  {/* CLASS NAME AND CODE DISPLAY - IMPROVED UI */}
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full border border-blue-200 flex-shrink-0">
                                      {classCodeToDisplay.length > 10 
                                        ? classCodeToDisplay.substring(0, 8) + '...'
                                        : classCodeToDisplay}
                                    </span>
                                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                                      {classNameToDisplay.length > 15 
                                        ? classNameToDisplay.substring(0, 13) + '...' 
                                        : classNameToDisplay}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                      by {teacherDisplayName}
                                    </span>
                                  </div>

                                  {/* Assignment name - IMPROVED UI */}
                                  <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1 break-words">
                                    {assignment.name.length > 40 
                                      ? assignment.name.substring(0, 38) + '...' 
                                      : assignment.name}
                                  </h4>

                                  {/* Assignment description - IMPROVED UI */}
                                  <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2 break-words">
                                    {assignment.description && assignment.description.length > 80 
                                      ? assignment.description.substring(0, 78) + '...' 
                                      : assignment.description || "No description provided"}
                                  </p>

                                  {/* Assignment details - IMPROVED UI */}
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate max-w-[100px]">
                                        Created: {formatDate(assignment.created_at)}
                                      </span>
                                      {assignment.due_date && (
                                        <span className={`font-medium whitespace-nowrap ${
                                          new Date(assignment.due_date) < new Date() 
                                            ? "text-red-600"
                                            : "text-green-600"
                                        }`}>
                                          {formatDueDate(assignment.due_date)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">
                                      Active
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Button navigates to assignments page - IMPROVED UI */}
                              <button
                                onClick={() => handleSubmitAssignment(assignment)}
                                className={`w-full px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm cursor-pointer bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-lg`}
                              >
                                Submit Assignment
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

                    {/* Scroll Indicator for Assignments - Auto hides when scrolled */}
                    {assignments.length > 2 && showAssignmentsScrollIndicator && (
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
                            Scroll for more
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
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
                {/* Blue - Submit Assignment */}
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

                {/* Orange - Submit Room Report */}
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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

                {/* Green - View Grades */}
                <button
                  onClick={() => navigate("/student/grades")}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      View Grades
                    </p>
                    <p className="text-xs text-gray-600">
                      Check your progress
                    </p>
                  </div>
                </button>

                {/* Violet - View Schedule */}
                <button
                  onClick={() => navigate("/student/schedule")}
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      View Schedule
                    </p>
                    <p className="text-xs text-gray-600">
                      See upcoming events
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Room Report Modal */}
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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
              {/* General Error Message */}
              {reportFormErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-sm">
                    {reportFormErrors.general}
                  </p>
                </div>
              )}

              <form className="space-y-6">
                {/* Class Selection */}
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

                {/* Cleanliness Status */}
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
                        <span className="text-gray-900">Clean</span>
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
                        <span className="text-gray-900">Not Clean</span>
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
                        <span className="text-gray-900">Clean</span>
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
                        <span className="text-gray-900">Not Clean</span>
                      </label>
                    </div>
                    {reportFormErrors.is_clean_after && (
                      <p className="mt-1 text-sm text-red-600">
                        {reportFormErrors.is_clean_after}
                    </p>
                    )}
                  </div>
                </div>

                {/* Report Description */}
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

                {/* Photo Upload */}
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