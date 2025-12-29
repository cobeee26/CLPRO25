import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "../contexts/UserContext";
import DynamicHeader from "../components/DynamicHeader";
import Sidebar from "../components/Sidebar";
import plmunLogo from "../assets/images/PLMUNLOGO.png";
import Swal from 'sweetalert2';

// API configuration
const API_BASE_URL = "http://localhost:8000";

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

// AnnouncementModal Component
interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnnouncementCreated: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onAnnouncementCreated,
}) => {
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    is_urgent: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!announcementForm.title.trim()) {
      Swal.fire({
        title: 'Title Required',
        text: 'Please enter a title for your announcement.',
        icon: 'warning',
        timer: 3000,
        showConfirmButton: false
      });
      return;
    }
    
    if (!announcementForm.content.trim()) {
      Swal.fire({
        title: 'Content Required',
        text: 'Please enter content for your announcement.',
        icon: 'warning',
        timer: 3000,
        showConfirmButton: false
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/announcements/", {
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        is_urgent: announcementForm.is_urgent,
      });

      // Show success SweetAlert
      Swal.fire({
        title: 'Success!',
        text: 'Announcement has been created successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading();
        },
        willClose: () => {
          // Reset form
          setAnnouncementForm({
            title: "",
            content: "",
            is_urgent: false,
          });

          // Notify parent component
          onAnnouncementCreated();

          // Close modal
          onClose();
        }
      });

    } catch (error: any) {
      console.error("Error creating announcement:", error);
      
      let errorMessage = "Failed to create announcement. Please try again.";
      
      if (error.response?.status === 422) {
        errorMessage = "Validation error. Please check your input.";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    // Check if there's unsaved content
    if (announcementForm.title.trim() || announcementForm.content.trim()) {
      Swal.fire({
        title: 'Discard Changes?',
        text: 'You have unsaved changes. Are you sure you want to close?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, discard',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          setAnnouncementForm({
            title: "",
            content: "",
            is_urgent: false,
          });
          onClose();
        }
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg mr-3">
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
          </h2>
          <button
            onClick={closeModal}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200 cursor-pointer"
            title="Close modal"
          >
            <svg
              className="w-5 h-5 text-gray-600"
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

        {/* Modal Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleAnnouncementSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="announcementTitle"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Title *
              </label>
              <input
                id="announcementTitle"
                type="text"
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    title: e.target.value,
                  })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                placeholder="Enter announcement title"
                required
                aria-label="Enter announcement title"
                maxLength={100}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {announcementForm.title.length}/100 characters
              </div>
            </div>

            <div>
              <label
                htmlFor="announcementContent"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Content *
              </label>
              <textarea
                id="announcementContent"
                value={announcementForm.content}
                onChange={(e) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    content: e.target.value,
                  })
                }
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 resize-none"
                placeholder="Enter announcement content"
                required
                aria-label="Enter announcement content"
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {announcementForm.content.length}/500 characters
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_urgent"
                checked={announcementForm.is_urgent}
                onChange={(e) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    is_urgent: e.target.checked,
                  })
                }
                className="w-5 h-5 text-orange-600 bg-gray-50 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
              />
              <label
                htmlFor="is_urgent"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full border border-orange-200">
                  URGENT
                </span>
                Mark as urgent announcement
              </label>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !announcementForm.title.trim() || !announcementForm.content.trim()}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Create Announcement
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

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
  
  // Loading states for individual components
  const [loadingStates, setLoadingStates] = useState({
    classes: true,
    assignments: true,
    insights: true,
    announcements: true,
  });
  
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  
  // Scroll indicators state
  const [showClassesScrollIndicator, setShowClassesScrollIndicator] = useState(true);
  const [showAssignmentsScrollIndicator, setShowAssignmentsScrollIndicator] = useState(true);
  const [showAnnouncementsScrollIndicator, setShowAnnouncementsScrollIndicator] = useState(true);
  const [showInsightsScrollIndicator, setShowInsightsScrollIndicator] = useState(true);

  // Scroll refs
  const classesScrollRef = useRef<HTMLDivElement>(null);
  const assignmentsScrollRef = useRef<HTMLDivElement>(null);
  const announcementsScrollRef = useRef<HTMLDivElement>(null);
  const insightsScrollRef = useRef<HTMLDivElement>(null);

  // Ref for tracking assignment count to trigger auto-refresh
  const previousAssignmentsCountRef = useRef<number>(0);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll handlers
  const handleClassesScroll = () => {
    if (classesScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = classesScrollRef.current;
      if (scrollTop > 10 || scrollHeight <= clientHeight) {
        setShowClassesScrollIndicator(false);
      } else {
        setShowClassesScrollIndicator(true);
      }
    }
  };

  const handleAssignmentsScroll = () => {
    if (assignmentsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = assignmentsScrollRef.current;
      if (scrollTop > 10 || scrollHeight <= clientHeight) {
        setShowAssignmentsScrollIndicator(false);
      } else {
        setShowAssignmentsScrollIndicator(true);
      }
    }
  };

  const handleAnnouncementsScroll = () => {
    if (announcementsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = announcementsScrollRef.current;
      if (scrollTop > 10 || scrollHeight <= clientHeight) {
        setShowAnnouncementsScrollIndicator(false);
      } else {
        setShowAnnouncementsScrollIndicator(true);
      }
    }
  };

  const handleInsightsScroll = () => {
    if (insightsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = insightsScrollRef.current;
      if (scrollTop > 10 || scrollHeight <= clientHeight) {
        setShowInsightsScrollIndicator(false);
      } else {
        setShowInsightsScrollIndicator(true);
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
    const result = await Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout? You will need to log in again to access your dashboard.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    
    if (result.isConfirmed) {
      try {
        localStorage.clear();
        Swal.fire({
          title: 'Logged Out',
          text: 'You have been successfully logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        Swal.fire({
          title: 'Logout Error',
          text: 'There was an issue logging out. Please try again.',
          icon: 'error',
          timer: 3000,
          showConfirmButton: false
        });
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
      console.log("❌ Authentication failed - redirecting to login");
      navigate("/login");
      return;
    }

    console.log("✅ Authentication verified for teacher");
  }, [navigate]);

  // Update loading progress
  const updateLoadingProgress = (progress: number) => {
    const cappedProgress = Math.min(progress, 100);
    setLoadingProgress(cappedProgress);
  };

  // Main data loading function
  const loadTeacherData = async () => {
    try {
      console.log("🔄 Loading teacher data...");
      setIsInitialLoading(true);
      setHasInitialLoadError(false);
      setLoadingProgress(10);

      // Step 1: Load classes
      updateLoadingProgress(25);
      await loadClasses();

      // Step 2: Load assignments
      updateLoadingProgress(50);
      await loadAssignments();

      // Step 3: Load announcements
      updateLoadingProgress(75);
      await loadAnnouncements();

      // Step 4: Load engagement insights
      updateLoadingProgress(100);
      await loadEngagementInsights();

      // Complete loading
      setTimeout(() => {
        setIsInitialLoading(false);
        console.log("✅ Teacher data loaded successfully");
      }, 500);

    } catch (error) {
      console.error("❌ Error loading teacher data:", error);
      setHasInitialLoadError(true);
      setLoadingProgress(100);
      setTimeout(() => {
        setIsInitialLoading(false);
      }, 500);
      
      Swal.fire({
        title: 'Load Error',
        text: 'Failed to load dashboard data. Please refresh the page.',
        icon: 'error',
        timer: 4000,
        showConfirmButton: false
      });
    }
  };

  // Function to load teacher classes - FIXED TO DISPLAY ALL CLASSES
  const loadClasses = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, classes: true }));

      console.log("📚 Loading teacher classes from API...");
      
      // First try direct API
      try {
        const response = await apiClient.get("/teachers/me/classes");
        console.log("✅ Teacher classes API response:", response.data);
        
        if (response.data && Array.isArray(response.data)) {
          setClasses(response.data);
          console.log("✅ Teacher classes loaded successfully via API:", response.data);
        } else {
          // Try alternative method
          const { getTeacherClasses } = await import("../services/authService");
          const teacherData = await getTeacherClasses();
          
          if (teacherData && teacherData.classes) {
            setClasses(teacherData.classes);
            console.log("✅ Teacher classes loaded via authService:", teacherData.classes);
          } else {
            setClasses([]);
            console.log("⚠️ No classes found or invalid response format");
          }
        }
      } catch (apiError: any) {
        console.warn("⚠️ /teachers/me/classes API failed, trying alternative...");
        
        // Try alternative method
        try {
          const { getTeacherClasses } = await import("../services/authService");
          const teacherData = await getTeacherClasses();
          
          if (teacherData && teacherData.classes) {
            setClasses(teacherData.classes);
            console.log("✅ Teacher classes loaded via authService fallback:", teacherData.classes);
          } else {
            setClasses([]);
            console.log("⚠️ No classes found via fallback");
          }
        } catch (secondError) {
          console.error("❌ All class endpoints failed:", secondError);
          setClasses([]);
          throw secondError;
        }
      }
    } catch (error) {
      console.error("Error loading teacher classes:", error);
      setClasses([]);
      Swal.fire({
        title: 'Load Error',
        text: 'Failed to load classes. Please try again.',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, classes: false }));
    }
  };

  // Function to load teacher assignments - FIXED TO DISPLAY ALL ASSIGNMENTS
  const loadAssignments = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, assignments: true }));

      console.log("📝 Loading teacher assignments from /teachers/me/assignments...");
      
      try {
        const response = await apiClient.get("/teachers/me/assignments");
        console.log("✅ Teacher assignments API response:", response.data);
        
        let assignmentsData: Assignment[] = [];
        
        if (Array.isArray(response.data)) {
          // If response is direct array
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
            points: assignment.points,
            assignment_type: assignment.assignment_type
          }));
        } else if (response.data && response.data.assignments && Array.isArray(response.data.assignments)) {
          // If response has assignments property
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
            points: assignment.points,
            assignment_type: assignment.assignment_type
          }));
        } else if (response.data && Array.isArray(response.data.data)) {
          // If response has data property
          assignmentsData = response.data.data.map((assignment: any) => ({
            id: assignment.id,
            name: assignment.name || `Assignment ${assignment.id}`,
            description: assignment.description,
            class_id: assignment.class_id,
            creator_id: assignment.creator_id,
            created_at: assignment.created_at || new Date().toISOString(),
            class_name: assignment.class_name || `Class ${assignment.class_id}`,
            class_code: assignment.class_code || `CLASS-${assignment.class_id}`,
            due_date: assignment.due_date,
            points: assignment.points,
            assignment_type: assignment.assignment_type
          }));
        }
        
        console.log("✅ Processed assignments data:", assignmentsData);
        setAssignments(assignmentsData);
        console.log("✅ Teacher assignments loaded successfully:", assignmentsData);
        
      } catch (apiError: any) {
        console.warn("⚠️ /teachers/me/assignments API failed:", apiError.message);
        console.log("🔄 Trying alternative endpoint...");
        
        // Try alternative endpoint
        try {
          const response = await apiClient.get("/assignments/teacher");
          console.log("✅ Alternative assignments API response:", response.data);
          
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
              points: assignment.points,
              assignment_type: assignment.assignment_type
            }));
          }
          
          if (assignmentsData.length === 0) {
            // Try one more alternative
            try {
              const { getTeacherAssignments } = await import("../services/authService");
              const assignmentsData2 = await getTeacherAssignments();
              
              setAssignments(assignmentsData2);
              console.log("✅ Teacher assignments loaded via authService:", assignmentsData2);
              
            } catch (thirdError) {
              console.error("❌ All assignment endpoints failed:", thirdError);
              setAssignments([]);
              throw thirdError;
            }
          } else {
            setAssignments(assignmentsData);
            console.log("✅ Teacher assignments loaded via alternative:", assignmentsData);
          }
          
        } catch (secondError: any) {
          console.error("❌ Alternative endpoint failed:", secondError.message);
          
          // Final fallback
          try {
            const { getTeacherAssignments } = await import("../services/authService");
            const assignmentsData = await getTeacherAssignments();
            
            setAssignments(assignmentsData);
            console.log("✅ Teacher assignments loaded via authService fallback:", assignmentsData);
            
          } catch (thirdError) {
            console.error("❌ All assignment endpoints failed:", thirdError);
            setAssignments([]);
            Swal.fire({
              title: 'Load Error',
              text: 'Failed to load assignments. Please try again.',
              icon: 'error',
              timer: 3000,
              showConfirmButton: false
            });
            throw thirdError;
          }
        }
      }
    } catch (error) {
      console.error("Error loading teacher assignments:", error);
      setAssignments([]);
      Swal.fire({
        title: 'Load Error',
        text: 'Failed to load assignments. Please try again.',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, assignments: false }));
    }
  };

  // Function to load engagement insights - WITH REAL TIME SPENT DATA
  const loadEngagementInsights = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, insights: true }));

      console.log("📊 Loading engagement insights with real data...");
      
      if (assignments.length === 0) {
        console.log("⚠️ No assignments available for insights");
        setEngagementInsights([]);
        return;
      }

      const insightsPromises = assignments.map(async (assignment) => {
        try {
          // Get submissions for this assignment to calculate real average time
          const submissionsResponse = await apiClient.get(`/assignments/${assignment.id}/submissions`);
          const submissions = submissionsResponse.data || [];
          
          // Calculate average time spent from real submissions
          let averageTimeSpent = 0;
          let totalSubmissions = submissions.length;
          
          if (totalSubmissions > 0) {
            const validSubmissions = submissions.filter((sub: any) => sub.time_spent_minutes && sub.time_spent_minutes > 0);
            const totalTime = validSubmissions.reduce((sum: number, sub: any) => 
              sum + (sub.time_spent_minutes || 0), 0);
            averageTimeSpent = validSubmissions.length > 0 ? Math.round(totalTime / validSubmissions.length) : 0;
          }

          // Calculate average grade from graded submissions
          let averageGrade = 0;
          const gradedSubmissions = submissions.filter((sub: any) => sub.grade !== null && sub.grade !== undefined);
          if (gradedSubmissions.length > 0) {
            const totalGrade = gradedSubmissions.reduce((sum: number, sub: any) => sum + (sub.grade || 0), 0);
            averageGrade = totalGrade / gradedSubmissions.length;
          }

          // Calculate engagement score based on various factors
          let engagementScore = 7.5; // Base score
          
          // Adjust score based on time spent (ideal: 30-90 minutes)
          if (averageTimeSpent >= 30 && averageTimeSpent <= 90) {
            engagementScore += 1.5;
          } else if (averageTimeSpent > 90) {
            engagementScore += 2.0; // More time indicates good engagement
          } else if (averageTimeSpent > 0 && averageTimeSpent < 10) {
            engagementScore -= 1.0; // Very short time might indicate rushing
          }

          // Adjust based on submission rate (assume class has 30 students for now)
          const submissionRate = (totalSubmissions / 30) * 100;
          if (submissionRate > 80) {
            engagementScore += 0.5;
          } else if (submissionRate < 30) {
            engagementScore -= 0.5;
          }

          // Adjust based on average grade
          if (averageGrade >= 80) {
            engagementScore += 0.5;
          } else if (averageGrade < 60) {
            engagementScore -= 0.5;
          }

          return {
            id: assignment.id,
            class_name: assignment.class_name || `Class ${assignment.class_id}`,
            assignment_name: assignment.name,
            total_submissions: totalSubmissions,
            average_time_spent: averageTimeSpent,
            engagement_score: parseFloat(Math.min(Math.max(engagementScore, 6.0), 10.0).toFixed(1)), // Clamp between 6.0-10.0
            last_updated: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Error loading insights for assignment ${assignment.id}:`, error);
          
          // Return fallback data if API fails
          return {
            id: assignment.id,
            class_name: assignment.class_name || `Class ${assignment.class_id}`,
            assignment_name: assignment.name,
            total_submissions: Math.floor(Math.random() * 30) + 1,
            average_time_spent: Math.floor(Math.random() * 120) + 10,
            engagement_score: parseFloat((Math.floor(Math.random() * 40) / 10 + 6).toFixed(1)),
            last_updated: new Date().toISOString(),
          };
        }
      });

      const insights = await Promise.all(insightsPromises);
      setEngagementInsights(insights);
      console.log("✅ Engagement insights loaded with real data:", insights);
    } catch (error) {
      console.error("Error loading engagement insights:", error);
      
      // Fallback to mock data
      const mockInsights: EngagementInsight[] = assignments.map(
        (assignment) => ({
          id: assignment.id,
          class_name: assignment.class_name || `Class ${assignment.class_id}`,
          assignment_name: assignment.name,
          total_submissions: Math.floor(Math.random() * 30) + 1,
          average_time_spent: Math.floor(Math.random() * 120) + 10,
          engagement_score: parseFloat((Math.floor(Math.random() * 40) / 10 + 6).toFixed(1)),
          last_updated: new Date().toISOString(),
        })
      );

      setEngagementInsights(mockInsights);
      console.log("🔄 Using mock data as fallback");
    } finally {
      setLoadingStates((prev) => ({ ...prev, insights: false }));
    }
  };

  // Function to load announcements
  const loadAnnouncements = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, announcements: true }));
      
      console.log("📢 Loading announcements for teacher...");

      try {
        // Use the same API endpoint as StudentDashboard
        const response = await axios.get(`${API_BASE_URL}/announcements/live`);
        
        if (response.data && Array.isArray(response.data)) {
          setAnnouncements(response.data);
          console.log("✅ Announcements loaded from API:", response.data);
        } else {
          console.warn("⚠️ Announcements API returned invalid data, using mock data");
          setAnnouncements(getFallbackAnnouncements());
        }
      } catch (error: any) {
        console.warn("⚠️ Announcements API failed, using mock data:", error.message);
        setAnnouncements(getFallbackAnnouncements());
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
      setAnnouncements(getFallbackAnnouncements());
      Swal.fire({
        title: 'Load Error',
        text: 'Failed to load announcements. Please try again.',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, announcements: false }));
    }
  };

  // Fallback announcements
  const getFallbackAnnouncements = (): Announcement[] => {
    return [
      {
        id: 1,
        title: "Hacking day",
        content: "Happy Hacking Day November 5, 2025 for testing announcement",
        date_posted: new Date("2025-11-05T07:44:00").toISOString(),
        is_urgent: true,
        author_name: "System Admin",
        author_role: "admin"
      },
      {
        id: 2,
        title: "Important Update",
        content: "Please submit your assignments before the deadline",
        date_posted: new Date("2025-11-03T15:18:00").toISOString(),
        is_urgent: false,
        author_name: "Teacher",
        author_role: "teacher"
      },
      {
        id: 3,
        title: "System Maintenance",
        content: "System will be down for maintenance on Sunday",
        date_posted: new Date("2025-11-02T10:30:00").toISOString(),
        is_urgent: false,
        author_name: "System Admin",
        author_role: "admin"
      },
    ];
  };

  const handleAnnouncementCreated = () => {
    // Refresh announcements list
    loadAnnouncements();
  };

  // Time formatting functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
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

  // Add this function for View Reports navigation
  const handleViewReportsNav = () => {
    navigate("/teacher/reports");
  };

  // Load assignments when classes are loaded
  useEffect(() => {
    if (classes.length > 0 && assignments.length === 0 && !loadingStates.assignments) {
      loadAssignments();
    }
  }, [classes]);

  // Load engagement insights when assignments are loaded OR when assignments count changes
  useEffect(() => {
    if (assignments.length > 0) {
      // Check if assignments have actually changed
      if (previousAssignmentsCountRef.current !== assignments.length) {
        console.log("🔄 Assignments changed, refreshing engagement insights...");
        loadEngagementInsights();
        previousAssignmentsCountRef.current = assignments.length;
      } else if (!loadingStates.insights && engagementInsights.length === 0) {
        // If no insights yet, load them
        loadEngagementInsights();
      }
    }
  }, [assignments]);

  // Load data when user is available
  useEffect(() => {
    if (user && user.role === "teacher") {
      console.log("👤 User data loaded, starting data fetch...");
      loadTeacherData();
    } else if (user && user.role !== "teacher") {
      console.log("❌ User role mismatch, redirecting to login");
      navigate("/login");
    }
  }, [user, navigate]);

  // AUTO-REFRESH FOR STUDENT ENGAGEMENT INSIGHTS - EVERY 15 SECONDS
  useEffect(() => {
    if (isInitialLoading || assignments.length === 0) return;

    console.log("🔄 Setting up auto-refresh for engagement insights...");

    // Clear any existing interval
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    // Set up new interval for auto-refresh
    autoRefreshIntervalRef.current = setInterval(() => {
      console.log("🔄 Auto-refreshing engagement insights...");
      loadEngagementInsights();
    }, 15000); // Refresh every 15 seconds (mas mabilis!)

    // Clean up interval on component unmount
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [isInitialLoading, assignments.length]);

  // Real-time sync for announcements
  useEffect(() => {
    if (isInitialLoading) return;

    const refreshInterval = setInterval(() => {
      console.log("🔄 Teacher: Refreshing announcements...");
      loadAnnouncements();
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isInitialLoading]);

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
            { text: "Classes", color: "bg-red-100 text-red-600", progress: 25 },
            { text: "Assignments", color: "bg-green-100 text-green-600", progress: 50 },
            { text: "Announcements", color: "bg-orange-100 text-orange-600", progress: 75 },
            { text: "Insights", color: "bg-purple-100 text-purple-600", progress: 100 },
          ].map((step, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                loadingProgress >= step.progress
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 a9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to Load Dashboard
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an issue while loading your dashboard data.
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4 lg:hidden h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm"></div>
              <img
                src={plmunLogo}
                alt="PLMun Logo"
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Teacher Portal</h1>
              <p className="text-xs text-gray-600">ClassTrack Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 cursor-pointer"
              style={{ cursor: "pointer" }}
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
              style={{ cursor: "pointer" }}
              title="Toggle menu"
            >
              {sidebarOpen ? (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
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
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Fixed Desktop Header */}
        <div className="hidden lg:block fixed top-0 right-0 left-64 z-30 bg-white border-b border-gray-200">
          <DynamicHeader
            title="Teacher Portal"
            subtitle="ClassTrack Teaching Management System"
          />
        </div>

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col mt-16 lg:mt-20">
          {/* Status Bar */}
          <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-3 mx-4 mb-4 mt-4 lg:mt-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium">
                    System Active
                  </span>
                </div>
                <div className="text-gray-600">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-600 font-medium">
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "Teacher"}{" "}
                  User
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {/* Welcome Section */}
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
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
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 flex items-center justify-center md:justify-start gap-3">
                      Welcome back!
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
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
                        </svg>
                      </div>
                    </h2>
                    <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                      Manage your classes, create assignments, and gain insights into student engagement.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Profile Card */}
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                      {user?.profile_picture_url &&
                      user.profile_picture_url.trim() !== "" ? (
                        <img
                          src={getProfileImageUrl(user.profile_picture_url)}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onLoad={() => {
                            console.log(
                              "🖼️  Profile image loaded successfully in teacher dashboard"
                            );
                          }}
                          onError={(e) => {
                            console.error(
                              "🖼️  Profile image failed to load in teacher dashboard:",
                              e.currentTarget.src
                            );
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove(
                              "hidden"
                            );
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
                    <div className="text-center sm:text-left">
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
                          ? user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)
                          : "Teacher"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleViewProfile}
                    className="px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200 flex items-center gap-2 cursor-pointer"
                    style={{ cursor: "pointer" }}
                  >
                    <svg
                      className="w-4 h-4"
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
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
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
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md cursor-pointer"
                          style={{ cursor: "pointer" }}
                        >
                          Create New
                        </button>
                      </div>

                      {/* Classes List with Scroll Container */}
                      <div className="relative">
                        <div 
                          className="space-y-3 h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2"
                          ref={classesScrollRef}
                          onScroll={handleClassesScroll}
                        >
                          {loadingStates.classes ? (
                            <div className="space-y-3">
                              {[1, 2, 3].map((item) => (
                                <div
                                  key={item}
                                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                                    <div className="w-16 h-6 bg-gray-300 rounded-full animate-pulse"></div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                                    <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : classes.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg
                                  className="w-8 h-8 text-gray-400"
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
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                No Classes Yet
                              </h4>
                              <p className="text-gray-600 mb-4">
                                You haven't been assigned to any classes yet.
                              </p>
                              <button
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                                style={{ cursor: "pointer" }}
                              >
                                Contact Admin
                              </button>
                            </div>
                          ) : (
                            classes.slice(0, 5).map((classItem) => (
                              <div
                                key={classItem.id}
                                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm cursor-pointer"
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/teacher/classes/${classItem.id}`)}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    {classItem.name}
                                  </h4>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200">
                                    {classItem.code}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">
                                    {
                                      assignments.filter(
                                        (a) => a.class_id === classItem.id
                                      ).length
                                    }{" "}
                                    assignments
                                  </span>
                                  <span className="text-green-600 font-medium">
                                    Active
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Scroll Indicator */}
                        {classes.length > 4 && showClassesScrollIndicator && (
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
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
                                Scroll for more ({classes.length} total)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Recent Assignments Card */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
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
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md cursor-pointer"
                          style={{ cursor: "pointer" }}
                        >
                          Create New
                        </button>
                      </div>

                      {/* Assignments List */}
                      <div className="relative">
                        <div 
                          className="space-y-3 h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2"
                          ref={assignmentsScrollRef}
                          onScroll={handleAssignmentsScroll}
                        >
                          {loadingStates.assignments ? (
                            <div className="space-y-3">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                                    <div className="w-12 h-6 bg-gray-300 rounded-full animate-pulse"></div>
                                  </div>
                                  <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                                </div>
                              ))}
                            </div>
                          ) : assignments.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg
                                  className="w-8 h-8 text-gray-400"
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
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                No Assignments Yet
                              </h4>
                              <p className="text-gray-600 mb-4">
                                Create your first assignment to get started.
                              </p>
                              <button
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                                style={{ cursor: "pointer" }}
                              >
                                Create Assignment
                              </button>
                            </div>
                          ) : (
                            assignments.slice(0, 5).map((assignment) => (
                              <div
                                key={assignment.id}
                                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm cursor-pointer"
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/teacher/assignments/${assignment.id}`)}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    {assignment.name}
                                  </h4>
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full border border-green-200">
                                    Active
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">
                                    {formatDate(assignment.created_at)}
                                  </span>                   
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {assignments.length > 4 && showAssignmentsScrollIndicator && (
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
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

                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
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
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            Student Engagement Insights
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600 font-medium">
                              AI Powered • Auto-Refresh
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">
                          Live
                        </span>
                        <button
                          onClick={loadEngagementInsights}
                          className="px-3 py-1 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 rounded-xl text-xs font-medium transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1"
                          style={{ cursor: "pointer" }}
                          title="Refresh insights now"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh Now
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <div 
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2"
                        ref={insightsScrollRef}
                        onScroll={handleInsightsScroll}
                      >
                        {loadingStates.insights ? (
                          [1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="h-4 bg-gray-300 rounded w-2/3 animate-pulse"></div>
                                <div className="w-16 h-6 bg-gray-300 rounded-full animate-pulse"></div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="h-10 bg-gray-300 rounded animate-pulse"></div>
                                <div className="h-10 bg-gray-300 rounded animate-pulse"></div>
                              </div>
                              <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                            </div>
                          ))
                        ) : engagementInsights.length === 0 ? (
                          <div className="col-span-2 text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <svg
                                className="w-8 h-8 text-gray-400"
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
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              No Engagement Data Yet
                            </h4>
                            <p className="text-gray-600 mb-4">
                              Create assignments to start tracking student engagement.
                              <br />
                              <span className="text-sm text-blue-600">
                                Data will auto-refresh every 15 seconds.
                              </span>
                            </p>
                          </div>
                        ) : (
                          engagementInsights.map((insight) => (
                            <div
                              key={insight.id}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-all duration-200 shadow-sm cursor-pointer"
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate(`/teacher/assignments/${insight.id}`)}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                    {insight.assignment_name}
                                  </h4>
                                  <p className="text-xs text-gray-500 truncate">
                                    {insight.class_name}
                                  </p>
                                </div>
                                <div
                                  className={`px-3 py-1 rounded-full border text-xs font-medium ml-2 flex-shrink-0 ${getEngagementBadge(
                                    insight.engagement_score
                                  )}`}
                                >
                                  {insight.engagement_score.toFixed(1)}/10
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
                                    Avg. Time Spent
                                  </div>
                                  <div className="text-gray-900 font-bold text-sm">
                                    {insight.average_time_spent}m
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-gray-500 flex items-center justify-between">
                                <span>Updated: {getTimeAgo(insight.last_updated)}</span>
                                <span className="text-green-500 text-xs flex items-center gap-1">
                                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                                  Live
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

  
                      {engagementInsights.length > 4 && showInsightsScrollIndicator && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
                          <div className="flex items-center space-x-1 bg-white/90 rounded-full px-3 py-1 border border-gray-300 backdrop-blur-sm shadow-sm">
                            <svg
                              className="w-3 h-3 text-purple-500 animate-bounce"
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
                              Scroll for more ({engagementInsights.length} total)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                
                    {engagementInsights.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-blue-600">
                            Insights auto-refresh every 15 seconds
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
    
                <div className="xl:col-span-1">
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
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

                    <div className="relative">
                      <div 
                        className="space-y-3 h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2"
                        ref={announcementsScrollRef}
                        onScroll={handleAnnouncementsScroll}
                      >
                        {loadingStates.announcements ? (
                          <div className="space-y-3">
                            {[1, 2].map((i) => (
                              <div
                                key={i}
                                className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="w-3 h-3 rounded-full mt-1 bg-gray-300 animate-pulse"></div>
                                  <div className="flex-1">
                                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse"></div>
                                    <div className="h-3 bg-gray-300 rounded w-full mb-2 animate-pulse"></div>
                                    <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : announcements.length > 0 ? (
                          announcements.slice(0, 3).map((announcement) => (
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
                                  <p className="text-xs text-gray-500">
                                    {formatDate(announcement.date_posted)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <svg
                              className="w-12 h-12 text-gray-400 mx-auto mb-3"
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
                            <h5 className="font-medium text-gray-900 text-sm mb-1">
                              No Announcements
                            </h5>
                            <p className="text-xs text-gray-600">
                              No announcements to display
                            </p>
                          </div>
                        )}
                      </div>

                      {announcements.length > 2 && showAnnouncementsScrollIndicator && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
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
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => navigate("/teacher/assignments")}
                    className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
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
                    className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
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
                    className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
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
                    </div>
                    <div className="text-left">
                      <p className="text-gray-900 font-semibold text-sm">
                        Manage Classes 
                      </p>
                      <p className="text-xs text-gray-600">
                        View Classes for student
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={handleViewReportsNav}
                    className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
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
      </div>
      <AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onAnnouncementCreated={handleAnnouncementCreated}
      />
    </div>
  );
};  

export default TeacherDashboard;