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

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id?: number;
  description?: string;
  semester?: string;
  academic_year?: string;
  teacher_name?: string;
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
  due_date?: string;
  points?: number;
  assignment_type?: string;
}

interface EngagementInsight {
  id: number;
  class_name: string;
  assignment_name: string;
  total_submissions: number;
  average_time_spent: number;
  engagement_score: number;
  last_updated: string;
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

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  
  // State declarations
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [engagementInsights, setEngagementInsights] = useState<EngagementInsight[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Announcement modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    is_urgent: false,
  });
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
  const [announcementFormErrors, setAnnouncementFormErrors] = useState<{
    [key: string]: string;
  }>({});
  
  // Scroll indicators state
  const [showClassesScrollIndicator, setShowClassesScrollIndicator] = useState(true);
  const [showAssignmentsScrollIndicator, setShowAssignmentsScrollIndicator] = useState(true);
  const [showAnnouncementsScrollIndicator, setShowAnnouncementsScrollIndicator] = useState(true);

  // Scroll refs
  const classesScrollRef = useRef<HTMLDivElement>(null);
  const assignmentsScrollRef = useRef<HTMLDivElement>(null);
  const announcementsScrollRef = useRef<HTMLDivElement>(null);

  // SweetAlert2 Configuration with Auto-Dismiss Timer
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

  // SweetAlert Helper Functions with Auto-Dismiss
  const showSuccessAlert = (
    title: string, 
    text: string = '', 
    type: 'announcement' | 'assignment' | 'class' | 'logout' | 'refresh' = 'announcement',
    autoDismiss: boolean = true,
    dismissTime: number = 3000
  ) => {
    const iconColor = type === 'logout' ? 'warning' : 'success';
    const confirmButtonColor = type === 'logout' ? '#F59E0B' : 
                              type === 'assignment' ? '#10B981' :
                              type === 'class' ? '#3B82F6' : 
                              '#EC4899';
    
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
          type === 'assignment' ? 'text-green-900' :
          type === 'class' ? 'text-blue-900' : 
          'text-pink-900'
        }`,
        confirmButton: `px-4 py-2 rounded-lg font-medium ${
          type === 'logout' ? 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer' :
          type === 'assignment' ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer' :
          type === 'class' ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' :
          'bg-pink-500 hover:bg-pink-600 text-white'
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

  // Scroll handlers
  const handleClassesScroll = () => {
    if (classesScrollRef.current) {
      const { scrollTop } = classesScrollRef.current;
      if (scrollTop > 10) {
        setShowClassesScrollIndicator(false);
      } else {
        setShowClassesScrollIndicator(true);
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

  // Handle logout
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

  // Handle view profile
  const handleViewProfile = () => {
    navigate("/profile");
  };

  // Handle view reports
  const handleViewReports = () => {
    navigate("/teacher/reports");
  };

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "teacher") {
      navigate("/login");
      return;
    }

    if (user) {
      loadTeacherData();
    }
  }, [navigate, user]);

  // Update loading progress
  const updateLoadingProgress = (step: number, totalSteps: number = 4) => {
    const progress = Math.floor((step / totalSteps) * 100);
    setLoadingProgress(progress);
  };

  // Main data loading function
  const loadTeacherData = async () => {
    try {
      console.log("🔄 Loading teacher data...");
      setIsInitialLoading(true);
      setHasInitialLoadError(false);
      setLoadingProgress(10); // Start at 10%

      // Step 1: Load classes
      updateLoadingProgress(1, 4);
      await loadClasses();

      // Step 2: Load assignments
      updateLoadingProgress(2, 4);
      await loadAssignments();

      // Step 3: Load announcements
      updateLoadingProgress(3, 4);
      await loadAnnouncements();

      // Step 4: Load engagement insights
      updateLoadingProgress(4, 4);
      await loadEngagementInsights();

      // Complete loading
      setTimeout(() => {
        setIsInitialLoading(false);
        setLoadingProgress(100);
      }, 500);

      console.log("✅ Teacher data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading teacher data:", error);
      setHasInitialLoadError(true);
      setIsInitialLoading(false);
      
      showErrorAlert("Load Error", "Failed to load dashboard data. Please refresh the page.", true, 4000);
    }
  };

  // Function to load teacher classes from API
  const loadClasses = async () => {
    try {
      setLoadingProgress(25);
      console.log("📚 Loading teacher classes from API...");
      
      try {
        const response = await apiClient.get("/teachers/me/classes");
        console.log("✅ Teacher classes API response:", response.data);
        
        if (response.status === 200) {
          // Check if response is an array or has a classes property
          let classesData = [];
          if (Array.isArray(response.data)) {
            classesData = response.data;
          } else if (response.data && response.data.classes && Array.isArray(response.data.classes)) {
            classesData = response.data.classes;
          } else {
            console.warn("⚠️ Classes API returned unexpected format");
            classesData = [];
          }
          
          setClasses(classesData);
          console.log("✅ Teacher classes loaded successfully:", classesData);
        } else {
          console.warn("⚠️ Classes API returned unexpected response");
          setClasses([]);
        }
      } catch (error: any) {
        console.error("❌ Error loading classes from API:", error.message);
        setClasses([]);
      }
    } catch (error) {
      console.error("❌ Error loading classes:", error);
      setClasses([]);
      throw error;
    }
  };

  // Function to load teacher assignments from API
  const loadAssignments = async () => {
    try {
      setLoadingProgress(50);
      console.log("📝 Loading teacher assignments from /teachers/me/assignments...");
      
      try {
        const response = await apiClient.get("/teachers/me/assignments");
        console.log("✅ Teacher assignments API response:", response.data);
        
        let assignmentsData: Assignment[] = [];
        
        if (Array.isArray(response.data)) {
          assignmentsData = response.data.map((assignment: any) => ({
            id: assignment.id,
            name: assignment.name || `Assignment ${assignment.id}`,
            description: assignment.description,
            class_id: assignment.class_id,
            creator_id: assignment.creator_id,
            created_at: assignment.created_at || new Date().toISOString(),
            class_name: assignment.class_name || `Class ${assignment.class_id}`,
            class_code: assignment.class_code || `CLASS-${assignment.class_id}`,
            due_date: assignment.due_date,
            points: assignment.points || 100,
            assignment_type: assignment.assignment_type || "Homework"
          }));
        } else if (response.data && response.data.assignments && Array.isArray(response.data.assignments)) {
          assignmentsData = response.data.assignments.map((assignment: any) => ({
            id: assignment.id,
            name: assignment.name || `Assignment ${assignment.id}`,
            description: assignment.description,
            class_id: assignment.class_id,
            creator_id: assignment.creator_id,
            created_at: assignment.created_at || new Date().toISOString(),
            class_name: assignment.class_name || `Class ${assignment.class_id}`,
            class_code: assignment.class_code || `CLASS-${assignment.class_id}`,
            due_date: assignment.due_date,
            points: assignment.points || 100,
            assignment_type: assignment.assignment_type || "Homework"
          }));
        }
        
        // After setting assignments, load class details for assignments
        await enrichAssignmentsWithClassData(assignmentsData);
        
        console.log("✅ Teacher assignments loaded successfully:", assignmentsData);
      } catch (apiError: any) {
        console.warn("⚠️ /teachers/me/assignments API failed:", apiError.message);
        setAssignments([]);
      }
    } catch (error) {
      console.error("❌ Error loading assignments:", error);
      setAssignments([]);
      throw error;
    }
  };

  // Function to enrich assignments with class data
  const enrichAssignmentsWithClassData = async (assignmentsData: Assignment[]) => {
    try {
      // Get all class IDs from assignments
      const classIds = [...new Set(assignmentsData.map(a => a.class_id))];
      
      // Load class details for each class ID
      const enrichedAssignments = await Promise.all(
        assignmentsData.map(async (assignment) => {
          try {
            // Try to get class details
            const classResponse = await apiClient.get(`/classes/${assignment.class_id}`);
            const classData = classResponse.data;
            
            return {
              ...assignment,
              class_name: classData.name || assignment.class_name || `Class ${assignment.class_id}`,
              class_code: classData.code || assignment.class_code || `CLASS-${assignment.class_id}`
            };
          } catch (classError: any) {
            console.warn(`⚠️ Failed to load class ${assignment.class_id}:`, classError.message);
            // Keep original assignment data if class fetch fails
            return assignment;
          }
        })
      );
      
      setAssignments(enrichedAssignments);
    } catch (error: any) {
      console.error("❌ Error enriching assignments with class data:", error.message);
      // If enrichment fails, just set the assignments as they are
      setAssignments(assignmentsData);
    }
  };

  // Function to load announcements from API
  const loadAnnouncements = async () => {
    try {
      setLoadingProgress(75);
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
        console.error("❌ Error loading announcements from API:", error.message);
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("❌ Error loading announcements:", error);
      setAnnouncements([]);
      throw error;
    }
  };

  // Function to load engagement insights
  const loadEngagementInsights = async () => {
    try {
      setLoadingProgress(90);
      console.log("📊 Loading engagement insights...");
      
      // Generate mock insights based on assignments
      const mockInsights: EngagementInsight[] = assignments.map(
        (assignment) => ({
          id: assignment.id,
          class_name: assignment.class_name || `Class ${assignment.class_id}`,
          assignment_name: assignment.name,
          total_submissions: Math.floor(Math.random() * 50) + 10,
          average_time_spent: Math.floor(Math.random() * 120) + 30,
          engagement_score: Math.floor(Math.random() * 40) + 60,
          last_updated: new Date().toISOString(),
        })
      );

      setEngagementInsights(mockInsights);
      console.log("✅ Engagement insights loaded successfully");
    } catch (error) {
      console.error("❌ Error loading engagement insights:", error);
      setEngagementInsights([]);
      throw error;
    }
  };

  // Real-time sync for assignments
  useEffect(() => {
    if (isInitialLoading) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "assignments_updated") {
        console.log("🔄 Storage change detected, reloading assignments...");
        showInfoAlert("New Data", "Refreshing assignment data...", true, 2000);
        loadAssignments();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Set up periodic refresh for real-time updates
    const refreshInterval = setInterval(() => {
      console.log("🔄 Teacher: Periodic data refresh");
      loadAnnouncements();
    }, 30000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [isInitialLoading]);

  // Load assignments when classes are loaded to ensure class data is available
  useEffect(() => {
    if (classes.length > 0 && assignments.length === 0) {
      // If we have classes but no assignments, try to load assignments
      loadAssignments();
    }
  }, [classes]);

  // Time formatting functions
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

  const getEngagementBadge = (score: number) => {
    if (score >= 8.5)
      return "bg-green-100 text-green-800 border-green-200";
    if (score >= 7.0)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return `${Math.floor(diffInHours / 168)} weeks ago`;
  };

  // Announcement modal functions
  const handleCloseAnnouncementModal = () => {
    setShowAnnouncementModal(false);
    setAnnouncementFormErrors({});
    setAnnouncementForm({
      title: "",
      content: "",
      is_urgent: false,
    });
  };

  const validateAnnouncementForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    const { title, content } = announcementForm;

    if (!title || title.trim() === "") {
      errors.title = "Please enter an announcement title";
    }

    if (!content || content.trim() === "") {
      errors.content = "Please enter announcement content";
    } else if (content.trim().length < 10) {
      errors.content = "Please provide more detailed content (at least 10 characters)";
    }

    setAnnouncementFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      showErrorAlert("Validation Error", firstError, true, 3000);
    }
    
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAnnouncement = async () => {
    if (!validateAnnouncementForm()) {
      return;
    }

    try {
      setIsSubmittingAnnouncement(true);
      setAnnouncementFormErrors({});
      
      showLoadingAlert("Creating announcement...", false);

      console.log("📤 Submitting announcement with data:", announcementForm);

      const response = await apiClient.post("/announcements/", {
        title: announcementForm.title,
        content: announcementForm.content,
        is_urgent: announcementForm.is_urgent,
      });

      console.log("✅ Announcement created successfully:", response.data);

      closeAlert();

      // Refresh announcements
      await loadAnnouncements();

      handleCloseAnnouncementModal();

      showSuccessAlert(
        "Announcement Created!",
        "Your announcement has been posted successfully.",
        'announcement',
        true,
        3000
      );
      
      setTimeout(() => {
        showDraggableAlert("Successful!", "Announcement posted successfully!", true, 2000);
      }, 100);

    } catch (error: any) {
      console.error("❌ Error creating announcement:", error);
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

        setAnnouncementFormErrors(apiErrors);
        
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

        setAnnouncementFormErrors({ general: errorMessage });
        showErrorAlert("Submission Failed", errorMessage, true, 4000);
      }
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  // Loading Screen
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-2xl blur-xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
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

        {/* Loading Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Teacher Dashboard
          </h2>
          <p className="text-gray-600 max-w-md">
            Preparing your classes, assignments, announcements, and insights...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Loading data...</span>
            <span>{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-orange-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md mb-8">
          {[
            { text: "Classes", color: "bg-red-100 text-red-600" },
            { text: "Assignments", color: "bg-green-100 text-green-600" },
            { text: "Announcements", color: "bg-orange-100 text-orange-600" },
            { text: "Insights", color: "bg-purple-100 text-purple-600" },
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

        {/* Loading Animation */}
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
        </div>

        {/* Loading Message */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This might take a moment. Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Error Screen
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
              onClick={loadTeacherData}
              className="w-full px-6 py-3 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
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
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white backdrop-blur-xl border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-xl blur-sm"></div>
              <img
                src={plmunLogo}
                alt="PLMun Logo"
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Teacher Portal
              </h1>
              <p className="text-xs text-gray-600">
                ClassTrack Teaching Management System
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
            title="Teacher Portal"
            subtitle="ClassTrack Teaching Management System"
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
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-600 font-medium">
                {user?.role
                  ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  : "Teacher"}{" "}
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
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-sm">
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
                    Manage your classes, create assignments, and gain insights into student engagement. 
                    Everything you need to teach effectively.
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
                      {getRoleIcon(user?.role || "teacher")}
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
                        : "Teacher"}
                    </span>
                  </div>
                </div>
                {/* VIEW PROFILE BUTTON */}
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

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - My Classes & Recent Assignments */}
              <div className="xl:col-span-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* My Classes Card */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
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
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          My Classes
                        </h3>
                      </div>
                      <button
                        onClick={() => navigate("/teacher/classes")}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm cursor-pointer"
                      >
                        Manage Classes
                      </button>
                    </div>

                    {/* Classes List with Scroll Container */}
                    <div className="relative flex-1">
                      <div
                        className="absolute inset-0 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                        ref={classesScrollRef}
                        onScroll={handleClassesScroll}
                      >
                        {classes.length > 0 ? (
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
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="text-sm text-blue-700">
                                  {classes.length} class(es) assigned
                                </span>
                              </div>
                            </div>

                            {classes.map((classItem) => (
                              <div
                                key={classItem.id}
                                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm cursor-pointer"
                                onClick={() => navigate(`/teacher/classes/${classItem.id}`)}
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
                                        {classItem.name}
                                      </h4>
                                      <span className="text-xs text-gray-500">
                                        {classItem.code}
                                      </span>
                                    </div>
                                    {classItem.description && (
                                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                        {classItem.description}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-gray-900">
                                        {
                                          assignments.filter(
                                            (a) => a.class_id === classItem.id
                                          ).length
                                        }{" "}
                                        assignments
                                      </p>
                                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">
                                        Active
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
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            <p className="text-gray-500 mb-2">
                              No classes found
                            </p>
                            <button
                              onClick={() => navigate("/teacher/classes")}
                              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                            >
                              Create Class
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Scroll Indicator for Classes */}
                      {classes.length > 3 && showClassesScrollIndicator && (
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

                  {/* Recent Assignments Card */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          Recent Assignments
                        </h3>
                      </div>
                      <button
                        onClick={() => navigate("/teacher/assignments")}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm cursor-pointer"
                      >
                        Create New
                      </button>
                    </div>

                    {/* Assignments List */}
                    <div className="relative flex-1">
                      <div
                        className="absolute inset-0 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                        ref={assignmentsScrollRef}
                        onScroll={handleAssignmentsScroll}
                      >
                        {assignments.length > 0 ? (
                          assignments.map((assignment) => {
                            const classCodeToDisplay = assignment.class_code || `CLASS-${assignment.class_id}`;

                            return (
                              <div
                                key={assignment.id}
                                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm cursor-pointer"
                                onClick={() => navigate(`/teacher/assignments/${assignment.id}`)}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                    </div>

                                    <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1 break-words">
                                      {assignment.name}
                                    </h4>

                                    <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2 break-words">
                                      {assignment.description ||
                                        "No description provided"}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <div className="flex items-center gap-2">
                                        <span>
                                          Created:{" "}
                                          {formatDate(assignment.created_at)}
                                        </span>
                                        {assignment.due_date && (
                                          <span className="font-medium text-blue-600">
                                            Due: {formatDate(assignment.due_date)}
                                          </span>
                                        )}
                                      </div>
                                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">
                                        Active
                                      </span>
                                    </div>
                                  </div>
                                </div>
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

                      {/* Scroll Indicator for Assignments */}
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

                {/* Student Engagement Insights */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
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
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Student Engagement Insights
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-purple-600 font-medium">
                        AI Powered
                      </span>
                    </div>
                  </div>

                  {/* Engagement Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {engagementInsights.slice(0, 4).map((insight) => (
                      <div
                        key={insight.id}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                              {insight.assignment_name}
                            </h4>
                            <p className="text-xs text-gray-600 truncate">
                              {insight.class_name}
                            </p>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full border text-xs font-medium ml-2 flex-shrink-0 ${getEngagementBadge(
                              insight.engagement_score
                            )}`}
                          >
                            {insight.engagement_score}/10
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                            <div className="text-gray-600 text-xs mb-1">
                              Submissions
                            </div>
                            <div className="text-gray-900 font-bold text-sm">
                              {insight.total_submissions}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                            <div className="text-gray-600 text-xs mb-1">
                              Avg. Time
                            </div>
                            <div className="text-gray-900 font-bold text-sm">
                              {insight.average_time_spent}m
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Updated: {getTimeAgo(insight.last_updated)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Announcements */}
              <div className="xl:col-span-1">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
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

                    {/* Scroll Indicator for Announcements */}
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
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  onClick={() => navigate("/teacher/assignments")}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      Manage Assignments
                    </p>
                    <p className="text-xs text-gray-600">
                      Create and manage tasks
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
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
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      Post Announcements
                    </p>
                    <p className="text-xs text-gray-600">
                      Share updates with students
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/teacher/classes")}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      Manage Classes
                    </p>
                    <p className="text-xs text-gray-600">
                      Class administration
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleViewReports}
                  className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold text-sm">
                      View Reports
                    </p>
                    <p className="text-xs text-gray-600">
                      Analytics and insights
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
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
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                  </div>
                  Create Announcement
                </h3>
                <button
                  onClick={handleCloseAnnouncementModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                  aria-label="Close announcement modal"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
              {announcementFormErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-red-400 mt=0.5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-red-700 text-sm">
                      {announcementFormErrors.general}
                    </p>
                  </div>
                </div>
              )}

              <form className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-text ${
                      announcementFormErrors.title
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter announcement title"
                    aria-label="Enter announcement title"
                    aria-required="true"
                  />
                  {announcementFormErrors.title && (
                    <p className="mt-1 text-sm text-red-600">
                      {announcementFormErrors.title}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={announcementForm.content}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    rows={6}
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-text ${
                      announcementFormErrors.content
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter announcement content..."
                  />
                  {announcementFormErrors.content && (
                    <p className="mt-1 text-sm text-red-600">
                      {announcementFormErrors.content}
                    </p>
                  )}
                </div>

                {/* Urgent Checkbox */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_urgent"
                    checked={announcementForm.is_urgent}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({
                        ...prev,
                        is_urgent: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                  />
                  <label
                    htmlFor="is_urgent"
                    className="text-sm font-semibold text-gray-700 cursor-pointer"
                  >
                    Mark as urgent announcement
                  </label>
                </div>
              </form>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCloseAnnouncementModal}
                  disabled={isSubmittingAnnouncement}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAnnouncement}
                  disabled={isSubmittingAnnouncement}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingAnnouncement && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSubmittingAnnouncement ? "Creating..." : "Create Announcement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;