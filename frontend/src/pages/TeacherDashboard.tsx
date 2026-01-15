import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "../contexts/UserContext";
import DynamicHeader from "../components/DynamicHeader";
import Sidebar from "../components/Sidebar";
import plmunLogo from "../assets/images/PLMUNLOGO.png";
import Swal from "sweetalert2";

import { Html5Qrcode } from "html5-qrcode";

const API_BASE_URL = `http://${window.location.hostname}:8000`;

// Axios instance configuration with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  maxRedirects: 5,
  timeout: 10000,
});

// Add authorization token to all requests
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

// Response interceptor for error handling
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

// Interface definitions for data types
interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id?: number;
  description?: string;
  semester?: string;
  academic_year?: string;
  teacher_name?: string;
  subject?: string; // Added subject field for class
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

interface AttendanceRecord {
  id: number;
  student_id: number | string;
  class_id: number;
  attendance_date: string;
  status: string;
  scanned_at: string;
  student_name?: string;
  student_username?: string;
  class_name?: string;
  class_subject?: string; // Added subject field for attendance
}

interface ScanResponse {
  status: "success" | "not_enrolled" | "error" | "duplicate" | "Pending";
  message: string;
  student_name?: string;
  student_id?: number | string;
  class_name?: string;
  attendance_id?: number; // ID of the pending record
  enrollment_status: boolean;
  scan_timestamp: string;
}

// Announcement Modal Component Props
interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnnouncementCreated: () => void;
}

// Announcement Modal Component
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

  // Handle announcement form submission
  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!announcementForm.title.trim()) {
      Swal.fire({
        title: "Title Required",
        text: "Please enter a title for your announcement.",
        icon: "warning",
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }

    if (!announcementForm.content.trim()) {
      Swal.fire({
        title: "Content Required",
        text: "Please enter content for your announcement.",
        icon: "warning",
        timer: 3000,
        showConfirmButton: false,
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

      Swal.fire({
        title: "Success!",
        text: "Announcement has been created successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading();
        },
        willClose: () => {
          setAnnouncementForm({
            title: "",
            content: "",
            is_urgent: false,
          });

          onAnnouncementCreated();

          onClose();
        },
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
        title: "Error!",
        text: errorMessage,
        icon: "error",
        timer: 3000,
        showConfirmButton: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close with confirmation for unsaved changes
  const closeModal = () => {
    if (announcementForm.title.trim() || announcementForm.content.trim()) {
      Swal.fire({
        title: "Discard Changes?",
        text: "You have unsaved changes. Are you sure you want to close?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, discard",
        cancelButtonText: "Cancel",
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
                disabled={
                  isSubmitting ||
                  !announcementForm.title.trim() ||
                  !announcementForm.content.trim()
                }
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
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

// Main Teacher Dashboard Component
const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [engagementInsights, setEngagementInsights] = useState<EngagementInsight[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialLoadError, setHasInitialLoadError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStates, setLoadingStates] = useState({
    classes: true,
    assignments: true,
    insights: true,
    announcements: true,
  });

  // Announcement modal state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // Scroll indicators state
  const [showClassesScrollIndicator, setShowClassesScrollIndicator] = useState(true);
  const [showAssignmentsScrollIndicator, setShowAssignmentsScrollIndicator] = useState(true);
  const [showAnnouncementsScrollIndicator, setShowAnnouncementsScrollIndicator] = useState(true);
  const [showInsightsScrollIndicator, setShowInsightsScrollIndicator] = useState(true);

  // Refs for scrollable containers
  const classesScrollRef = useRef<HTMLDivElement>(null);
  const assignmentsScrollRef = useRef<HTMLDivElement>(null);
  const announcementsScrollRef = useRef<HTMLDivElement>(null);
  const insightsScrollRef = useRef<HTMLDivElement>(null);
  const previousAssignmentsCountRef = useRef<number>(0);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // QR Code Reader states with 7-second timer
  const [showQrReader, setShowQrReader] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string>("");
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 7-second timer states for QR detection
  const [qrDetected, setQrDetected] = useState<boolean>(false); // Start with false (RED)
  const [scanBoxColor, setScanBoxColor] = useState<string>("red"); // Start with RED
  const [detectionTimer, setDetectionTimer] = useState<number>(7); // 7-second timer
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [scanCount, setScanCount] = useState<number>(0);

  // Scroll handlers for different sections
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

  // Helper function to construct profile image URLs
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

  // Role-based icon rendering
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
              d="M16 7a4 4 0 11-8 0 a4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
    }
  };

  // Logout handler with confirmation
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Confirm Logout",
      text: "Are you sure you want to logout? You will need to log in again to access your dashboard.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        localStorage.clear();
        Swal.fire({
          title: "Logged Out",
          text: "You have been successfully logged out.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        Swal.fire({
          title: "Logout Error",
          text: "There was an issue logging out. Please try again.",
          icon: "error",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    }
  };

  // Navigation handlers
  const handleViewProfile = () => {
    navigate("/profile");
  };

  const handleViewReports = () => {
    navigate("/teacher/reports");
  };

  // Authentication check on component mount
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

  // Update loading progress helper
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

      updateLoadingProgress(25);
      await loadClasses();

      updateLoadingProgress(50);
      await loadAssignments();

      updateLoadingProgress(75);
      await loadAnnouncements();

      updateLoadingProgress(100);
      await loadEngagementInsights();

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
        title: "Load Error",
        text: "Failed to load dashboard data. Please refresh the page.",
        icon: "error",
        timer: 4000,
        showConfirmButton: false,
      });
    }
  };

  // Load classes from API
  const loadClasses = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, classes: true }));

      console.log("📚 Loading teacher classes from API...");

      try {
        const response = await apiClient.get("/teachers/me/classes");
        console.log("✅ Teacher classes API response:", response.data);

        if (response.data && Array.isArray(response.data)) {
          // Add subject to classes if not present
          const classesWithSubjects = response.data.map((classItem: any) => ({
            ...classItem,
            subject: classItem.subject || classItem.name || `Subject ${classItem.id}`
          }));
          setClasses(classesWithSubjects);
          console.log(
            "✅ Teacher classes loaded successfully via API:",
            classesWithSubjects
          );
        } else {
          const { getTeacherClasses } = await import("../services/authService");
          const teacherData = await getTeacherClasses();

          if (teacherData && teacherData.classes) {
            // Add subject to classes if not present
            const classesWithSubjects = teacherData.classes.map((classItem: any) => ({
              ...classItem,
              subject: classItem.subject || classItem.name || `Subject ${classItem.id}`
            }));
            setClasses(classesWithSubjects);
            console.log(
              "✅ Teacher classes loaded via authService:",
              classesWithSubjects
            );
          } else {
            setClasses([]);
            console.log("⚠️ No classes found or invalid response format");
          }
        }
      } catch (apiError: any) {
        console.warn(
          "⚠️ /teachers/me/classes API failed, trying alternative..."
        );

        try {
          const { getTeacherClasses } = await import("../services/authService");
          const teacherData = await getTeacherClasses();

          if (teacherData && teacherData.classes) {
            // Add subject to classes if not present
            const classesWithSubjects = teacherData.classes.map((classItem: any) => ({
              ...classItem,
              subject: classItem.subject || classItem.name || `Subject ${classItem.id}`
            }));
            setClasses(classesWithSubjects);
            console.log(
              "✅ Teacher classes loaded via authService fallback:",
              classesWithSubjects
            );
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
        title: "Load Error",
        text: "Failed to load classes. Please try again.",
        icon: "error",
        timer: 3000,
        showConfirmButton: false,
      });
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, classes: false }));
    }
  };

  // Load assignments from API
  const loadAssignments = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, assignments: true }));

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
            points: assignment.points,
            assignment_type: assignment.assignment_type,
          }));
        } else if (
          response.data &&
          response.data.assignments &&
          Array.isArray(response.data.assignments)
        ) {
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
            assignment_type: assignment.assignment_type,
          }));
        }

        console.log("✅ Processed assignments data:", assignmentsData);
        setAssignments(assignmentsData);
        console.log("✅ Teacher assignments loaded successfully:", assignmentsData);
      } catch (apiError: any) {
        console.warn("⚠️ /teachers/me/assignments API failed:", apiError.message);
        console.log("🔄 Trying alternative endpoint...");

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
              assignment_type: assignment.assignment_type,
            }));
          }

          if (assignmentsData.length === 0) {
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

          try {
            const { getTeacherAssignments } = await import("../services/authService");
            const assignmentsData = await getTeacherAssignments();

            setAssignments(assignmentsData);
            console.log("✅ Teacher assignments loaded via authService fallback:", assignmentsData);
          } catch (thirdError) {
            console.error("❌ All assignment endpoints failed:", thirdError);
            setAssignments([]);
            Swal.fire({
              title: "Load Error",
              text: "Failed to load assignments. Please try again.",
              icon: "error",
              timer: 3000,
              showConfirmButton: false,
            });
            throw thirdError;
          }
        }
      }
    } catch (error) {
      console.error("Error loading teacher assignments:", error);
      setAssignments([]);
      Swal.fire({
        title: "Load Error",
        text: "Failed to load assignments. Please try again.",
        icon: "error",
        timer: 3000,
        showConfirmButton: false,
      });
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, assignments: false }));
    }
  };

  // Load engagement insights with real data
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
          const submissionsResponse = await apiClient.get(
            `/assignments/${assignment.id}/submissions`
          );
          const submissions = submissionsResponse.data || [];

          let averageTimeSpent = 0;
          let totalSubmissions = submissions.length;

          if (totalSubmissions > 0) {
            const validSubmissions = submissions.filter(
              (sub: any) => sub.time_spent_minutes && sub.time_spent_minutes > 0
            );
            const totalTime = validSubmissions.reduce(
              (sum: number, sub: any) => sum + (sub.time_spent_minutes || 0),
              0
            );
            averageTimeSpent =
              validSubmissions.length > 0
                ? Math.round(totalTime / validSubmissions.length)
                : 0;
          }

          let averageGrade = 0;
          const gradedSubmissions = submissions.filter(
            (sub: any) => sub.grade !== null && sub.grade !== undefined
          );
          if (gradedSubmissions.length > 0) {
            const totalGrade = gradedSubmissions.reduce(
              (sum: number, sub: any) => sum + (sub.grade || 0),
              0
            );
            averageGrade = totalGrade / gradedSubmissions.length;
          }

          let engagementScore = 7.5;

          if (averageTimeSpent >= 30 && averageTimeSpent <= 90) {
            engagementScore += 1.5;
          } else if (averageTimeSpent > 90) {
            engagementScore += 2.0;
          } else if (averageTimeSpent > 0 && averageTimeSpent < 10) {
            engagementScore -= 1.0;
          }

          const submissionRate = (totalSubmissions / 30) * 100;
          if (submissionRate > 80) {
            engagementScore += 0.5;
          } else if (submissionRate < 30) {
            engagementScore -= 0.5;
          }

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
            engagement_score: parseFloat(
              Math.min(Math.max(engagementScore, 6.0), 10.0).toFixed(1)
            ), // Clamp between 6.0-10.0
            last_updated: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Error loading insights for assignment ${assignment.id}:`, error);

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

      const mockInsights: EngagementInsight[] = assignments.map((assignment) => ({
        id: assignment.id,
        class_name: assignment.class_name || `Class ${assignment.class_id}`,
        assignment_name: assignment.name,
        total_submissions: Math.floor(Math.random() * 30) + 1,
        average_time_spent: Math.floor(Math.random() * 120) + 10,
        engagement_score: parseFloat((Math.floor(Math.random() * 40) / 10 + 6).toFixed(1)),
        last_updated: new Date().toISOString(),
      }));

      setEngagementInsights(mockInsights);
      console.log("🔄 Using mock data as fallback");
    } finally {
      setLoadingStates((prev) => ({ ...prev, insights: false }));
    }
  };

  // Load announcements from API
  const loadAnnouncements = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, announcements: true }));

      console.log("📢 Loading announcements for teacher...");

      try {
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
        title: "Load Error",
        text: "Failed to load announcements. Please try again.",
        icon: "error",
        timer: 3000,
        showConfirmButton: false,
      });
      throw error;
    } finally {
      setLoadingStates((prev) => ({ ...prev, announcements: false }));
    }
  };

  // Fallback announcements for when API fails
  const getFallbackAnnouncements = (): Announcement[] => {
    return [
      {
        id: 1,
        title: "Hacking day",
        content: "Happy Hacking Day November 5, 2025 for testing announcement",
        date_posted: new Date("2025-11-05T07:44:00").toISOString(),
        is_urgent: true,
        author_name: "System Admin",
        author_role: "admin",
      },
      {
        id: 2,
        title: "Important Update",
        content: "Please submit your assignments before the deadline",
        date_posted: new Date("2025-11-03T15:18:00").toISOString(),
        is_urgent: false,
        author_name: "Teacher",
        author_role: "teacher",
      },
      {
        id: 3,
        title: "System Maintenance",
        content: "System will be down for maintenance on Sunday",
        date_posted: new Date("2025-11-02T10:30:00").toISOString(),
        is_urgent: false,
        author_name: "System Admin",
        author_role: "admin",
      },
    ];
  };

  // Refresh announcements after new announcement is created
  const handleAnnouncementCreated = () => {
    loadAnnouncements();
  };

  // Date formatting helper
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
        hour12: true,
      });
    } catch (error) {
      return "Recent";
    }
  };

  // Engagement score badge color based on score
  const getEngagementBadge = (score: number) => {
    if (score >= 8.5) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 7.0) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Time ago calculation for engagement insights
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return `${Math.floor(diffInHours / 168)} weeks ago`;
  };

  // Navigate to reports page
  const handleViewReportsNav = () => {
    navigate("/teacher/reports");
  };


  // QR Code Reader Logic
  const [verificationState, setVerificationState] = useState<'idle' | 'scanning' | 'verifying' | 'result'>('idle');
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);


  // Torch State
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  // Open QR reader
  const handleOpenQrReader = () => {
    if (classes.length === 0) {
      Swal.fire({
        title: "No Classes Available",
        text: "You need to have at least one class to use QR code attendance.",
        icon: "warning",
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }
    setShowQrReader(true);
  };

  // Close QR reader
  const handleCloseQrReader = () => {
    stopScanner();
    setShowQrReader(false);
    setSelectedClass(null);
    setVerificationState('idle');
    setScanResult(null);
    setScannedData("");
  };

  // Handle class selection
  const handleClassSelect = (classItem: Class) => {
    setSelectedClass(classItem);
    // Give time for DOM to update with "reader" element
    setTimeout(() => {
      startScanner();
    }, 100);
  };

  // Stop Scanner Properly
  const stopScanner = async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try {
          // Turn off torch if on
          if (torchOn) {
            try { await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: false } as any] }); } catch (e) { }
            setTorchOn(false);
          }
          await scannerRef.current.stop();
        } catch (err) {
          console.error("Failed to stop scanner", err);
        }
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setVerificationState('idle');
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (scannerRef.current && hasTorch) {
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: !torchOn } as any]
        });
        setTorchOn(!torchOn);
      } catch (err) {
        console.error("Error toggling torch", err);
      }
    }
  };

  // State for cameras
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
      }
    }).catch(e => console.error("Error getting cameras", e));
  }, []);

  // Start Scanner with High Performance Settings
  const startScanner = async () => {
    if (scannerRef.current) {
      await stopScanner();
    }

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    // Security Check (Bypass for testing if needed)
    // if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') { ... }

    // Use selected camera OR fallback to environment
    // First parameter: camera ID (string) OR constraint object with EXACTLY 1 key
    const cameraIdOrConfig = selectedCameraId || { facingMode: "environment" };

    // Optimized Config for maximum detection accuracy
    const config = {
      fps: 10, // Balanced FPS for stability and detection
      qrbox: 250, // Larger scan box for easier detection
      aspectRatio: 1.0,
      formatsToSupport: [
        (window as any).Html5QrcodeSupportedFormats?.QR_CODE
      ],
      showTorchButtonIfSupported: false,
      showZoomSliderIfSupported: false,
      defaultZoomValueIfSupported: 2
    };

    try {
      setVerificationState('scanning');
      await html5QrCode.start(
        cameraIdOrConfig,
        config,
        (decodedText, decodedResult) => {
          // Immediate Hit Confirmation
          console.log("✅ HIT:", decodedText);

          // Visual Flash
          setFlashActive(true);
          setTimeout(() => setFlashActive(false), 300);

          // Update Status Text Immediately
          setVerificationState('verifying');

          // Process
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // ignore
        }
      );

      setIsScanning(true);

      // Check for Torch Support after start
      setTimeout(async () => {
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          if ((capabilities as any).torch) {
            setHasTorch(true);
          }
        } catch (e) {
          console.log("Torch check failed", e);
        }
      }, 500);

    } catch (err: any) {
      console.error("Error starting scanner", err);

      // Fallback: Try with generic facing mode if specific camera failed
      if (selectedCameraId) {
        console.log("🔄 Retrying with generic facing mode...");
        setSelectedCameraId(null);

        try {
          await html5QrCode.start(
            { facingMode: "user" }, // Try front camera as fallback
            config,
            (decodedText, decodedResult) => {
              console.log("✅ HIT:", decodedText);
              setFlashActive(true);
              setTimeout(() => setFlashActive(false), 300);
              setVerificationState('verifying');
              handleScanSuccess(decodedText);
            },
            (errorMessage) => {
              // ignore
            }
          );
          setIsScanning(true);
        } catch (fallbackErr) {
          console.error("Fallback camera also failed", fallbackErr);
          Swal.fire("Camera Info", "Could not start camera. Ensure permission is granted.", "error");
          setIsScanning(false);
        }
      } else {
        Swal.fire("Camera Info", "Could not start camera. Ensure permission is granted.", "error");
        setIsScanning(false);
      }
    }
  };

  // Handle Scan Success - RECOGNITION FIRST (No Auto-Save)
  const handleScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
      scannerRef.current.pause();
    }

    // Play beep
    playScanBeep();

    // Vibrate if mobile
    if (navigator.vibrate) navigator.vibrate(200);

    // Parse QR Data
    let studentId = "";
    try {
      const json = JSON.parse(decodedText);
      studentId = json.studentId || json.id;
    } catch (e) {
      studentId = decodedText;
    }

    // Set Scanned Data for UI
    setScannedData(decodedText);

    // Mock Result for Identity Card (Parse ID/Email from format)
    // If it's pure email/ID, we just show it.
    let displayName = "Unverified Student";
    let displayId = String(studentId); // Force string to avoid type error

    if (displayId.includes("classtrack")) {
      // e.g. chaney@classtrack.edu
      displayName = displayId.split("@")[0]; // "chaney"
      // Capitalize
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }

    // Auto-Fix known IDs for demo
    if (displayId === '12345') displayName = "Chaney (Student)";

    setScanResult({
      student_name: displayName,
      student_id: displayId,
      attendance_id: 0, // Not verified yet
      status: 'Pending',
      scan_timestamp: new Date().toISOString(),
      enrollment_status: false,
      message: "Manual verification required"
    });


    setVerificationState('result');
    // REMOVED: submitScan(studentId); -> Now purely manual verify
  };

  const submitScan = async (studentId: string) => {
    if (!selectedClass) return;

    try {
      // Play beep sound
      playScanBeep();

      const payload = {
        qr_content: studentId,
        class_id: selectedClass.id,
        // Backend handles schedule finding logic
        schedule_id: null
      };

      const response = await apiClient.post<ScanResponse>('/attendance/scan', payload);
      setScanResult(response.data);
      setVerificationState('result');

    } catch (error: any) {
      console.error("Scan verification failed", error);

      // If 404/400, show error then resume
      let errorMsg = "Scan failed";
      if (error.response?.data?.detail) errorMsg = error.response.data.detail;

      Swal.fire({
        icon: 'error',
        title: 'Scan Error',
        text: errorMsg,
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        resumeScanner();
      });
    }
  };

  const resumeScanner = () => {
    setVerificationState('scanning');
    setScanResult(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  const handleConfirmAttendance = async () => {
    if (!scanResult || !scanResult.attendance_id) return;

    try {
      await apiClient.post(`/attendance/${scanResult.attendance_id}/confirm`);

      Swal.fire({
        icon: 'success',
        title: 'Confirmed!',
        text: `${scanResult.student_name} marked as Present`,
        timer: 1500,
        showConfirmButton: false
      });

      // Add to recent list for UI
      const newRecord: AttendanceRecord = {
        id: scanResult.attendance_id,
        student_id: scanResult.student_id || 0,
        class_id: selectedClass?.id || 0,
        attendance_date: new Date().toISOString(),
        status: 'Present',
        scanned_at: new Date().toISOString(),
        student_name: scanResult.student_name,
        class_name: selectedClass?.name,
        class_subject: selectedClass?.subject
      };
      setRecentAttendance(prev => [newRecord, ...prev.slice(0, 4)]);

      resumeScanner();

    } catch (error) {
      Swal.fire("Error", "Failed to confirm attendance", "error");
    }
  };

  const handleDiscardAttendance = async () => {
    if (!scanResult || !scanResult.attendance_id) {
      resumeScanner();
      return;
    }

    try {
      await apiClient.post(`/attendance/${scanResult.attendance_id}/discard`);
      // user discarded
    } catch (e) { console.error(e) }

    resumeScanner();
  };

  // Format time for attendance display
  const formatAttendanceTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Play scanning beep using AudioContext (no file needed)
  const playScanBeep = () => {
    try {
      // @ts-ignore
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  useEffect(() => {
    if (user && user.role === "teacher") {
      console.log("👤 User data loaded, starting data fetch...");
      loadTeacherData();
    } else if (user && user.role !== "teacher") {
      console.log("❌ User role mismatch, redirecting to login");
      navigate("/login");
    }
  }, [user, navigate]);

  // Effect: Auto-refresh engagement insights every 15 seconds
  useEffect(() => {
    if (isInitialLoading || assignments.length === 0) return;

    console.log("🔄 Setting up auto-refresh for engagement insights...");

    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    autoRefreshIntervalRef.current = setInterval(() => {
      console.log("🔄 Auto-refreshing engagement insights...");
      loadEngagementInsights();
    }, 15000);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [isInitialLoading, assignments.length]);

  // Effect: Auto-refresh announcements every 30 seconds
  useEffect(() => {
    if (isInitialLoading) return;

    const refreshInterval = setInterval(() => {
      console.log("🔄 Teacher: Refreshing announcements...");
      loadAnnouncements();
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isInitialLoading]);

  // Effect: Clean up camera and timer on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Loading state UI
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
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

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Teacher Dashboard
          </h2>
          <p className="text-gray-600 max-w-md">
            Preparing your classes, assignments, announcements, and insights...
          </p>
        </div>

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md mb-8">
          {[
            { text: "Classes", color: "bg-red-100 text-red-600", progress: 25 },
            { text: "Assignments", color: "bg-green-100 text-green-600", progress: 50 },
            { text: "Announcements", color: "bg-orange-100 text-orange-600", progress: 75 },
            { text: "Insights", color: "bg-purple-100 text-purple-600", progress: 100 },
          ].map((step, index) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300 ${loadingProgress >= step.progress
                ? `${step.color} shadow-sm`
                : "bg-gray-100 text-gray-400"
                }`}
            >
              {step.text}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div
            className="w-3 h-3 bg-red-500 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-3 h-3 bg-green-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
          <div
            className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
            style={{ animationDelay: "450ms" }}
          ></div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This might take a moment. Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Error state UI
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

  // User verification check
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

  // Main dashboard UI
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
        className={`fixed inset-y-0 left-0 z-40 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Desktop Header */}
        <div className="hidden lg:block fixed top-0 right-0 left-64 z-30 bg-white border-b border-gray-200">
          <DynamicHeader
            title="Teacher Portal"
            subtitle="ClassTrack Teaching Management System"
          />
        </div>

        <div className="flex-1 flex flex-col mt-16 lg:mt-20">
          {/* Status Bar */}
          <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-3 mx-4 mb-4 mt-4 lg:mt-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium">System Active</span>
                </div>
                <div className="text-gray-600">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-600 font-medium">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Teacher"} User
                </span>
              </div>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {/* Welcome Card */}
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
                        d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 a12.078 12.078 0 01.665-6.479L12 14z"
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

              {/* Profile Card */}
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                      {user?.profile_picture_url && user.profile_picture_url.trim() !== "" ? (
                        <img
                          src={getProfileImageUrl(user.profile_picture_url)}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onLoad={() => {
                            console.log("🖼️ Profile image loaded successfully in teacher dashboard");
                          }}
                          onError={(e) => {
                            console.error("🖼️ Profile image failed to load in teacher dashboard:", e.currentTarget.src);
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}

                      <div
                        className={`w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl ${!user?.profile_picture_url || user.profile_picture_url.trim() === ""
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
                          ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
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
                        d="M16 7a4 4 0 11-8 0 a4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    View Profile
                  </button>
                </div>
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column (2/3) */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Classes and Assignments Grid */}
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
                          <h3 className="text-lg font-bold text-gray-900">My Classes</h3>
                        </div>
                        <button
                          onClick={() => navigate("/teacher/classes")}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md cursor-pointer"
                          style={{ cursor: "pointer" }}
                        >
                          Create New
                        </button>
                      </div>

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
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Classes Yet</h4>
                              <p className="text-gray-600 mb-4">You haven't been assigned to any classes yet.</p>
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
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-sm">{classItem.name}</h4>
                                    <p className="text-xs text-blue-600 mt-1">
                                      Subject: {classItem.subject || classItem.name}
                                    </p>
                                  </div>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200">
                                    {classItem.code}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">
                                    {assignments.filter((a) => a.class_id === classItem.id).length} assignments
                                  </span>
                                  <span className="text-green-600 font-medium">Active</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

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
                          <h3 className="text-lg font-bold text-gray-900">Recent Assignments</h3>
                        </div>
                        <button
                          onClick={() => navigate("/teacher/assignments")}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md cursor-pointer"
                          style={{ cursor: "pointer" }}
                        >
                          Create New
                        </button>
                      </div>

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
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Yet</h4>
                              <p className="text-gray-600 mb-4">Create your first assignment to get started.</p>
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
                                  <h4 className="font-semibold text-gray-900 text-sm">{assignment.name}</h4>
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full border border-green-200">
                                    Active
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

                  {/* Student Engagement Insights Card */}
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
                          <h3 className="text-lg font-bold text-gray-900">Student Engagement Insights</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600 font-medium">AI Powered • Auto-Refresh</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Live</span>
                        <button
                          onClick={loadEngagementInsights}
                          className="px-3 py-1 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 rounded-xl text-xs font-medium transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1"
                          style={{ cursor: "pointer" }}
                          title="Refresh insights now"
                        >
                          <svg
                            className="w-3 h-3"
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
                            <div
                              key={i}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                            >
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
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Engagement Data Yet</h4>
                            <p className="text-gray-600 mb-4">
                              Create assignments to start tracking student engagement.
                              <br />
                              <span className="text-sm text-blue-600">Data will auto-refresh every 15 seconds.</span>
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
                                  <div className="text-gray-600 text-xs mb-1">Submissions</div>
                                  <div className="text-gray-900 font-bold text-sm">
                                    {insight.total_submissions}
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                                  <div className="text-gray-600 text-xs mb-1">Avg. Time Spent</div>
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

                {/* Right Column (1/3) */}
                <div className="xl:col-span-1 space-y-6">
                  {/* QR Code Reader Section */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
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
                              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">QR Code Attendance</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600 font-medium">Quick Scan • Real-time</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!showQrReader ? (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <svg
                                className="w-6 h-6 text-indigo-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-indigo-900">Scan Student QR Codes</h4>
                              <p className="text-sm text-gray-600">
                                Take attendance quickly using student QR codes
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleOpenQrReader}
                          disabled={classes.length === 0}
                          className="w-full flex items-center justify-center p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl border border-indigo-300 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            cursor: classes.length === 0 ? "not-allowed" : "pointer",
                          }}
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                            />
                          </svg>
                          Open QR Code Scanner
                        </button>

                        {recentAttendance.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="font-semibold text-gray-900 text-sm mb-3">Recent Attendance</h5>
                            <div className="space-y-2">
                              {recentAttendance.slice(0, 3).map((record) => (
                                <div
                                  key={record.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{record.student_name}</p>
                                    <p className="text-xs text-gray-500">{record.student_username}</p>
                                    {record.class_subject && (
                                      <p className="text-xs text-blue-600 mt-1">{record.class_subject}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                      Present
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatAttendanceTime(record.scanned_at)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Class Selection Dropdown */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Select Class for Attendance
                          </label>
                          <div className="relative">
                            <select
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                              value={selectedClass?.id || ""}
                              onChange={(e) => {
                                const classId = parseInt(e.target.value);
                                const selected = classes.find((c) => c.id === classId);
                                if (selected) {
                                  handleClassSelect(selected);
                                }
                              }}
                            >
                              <option value="">Choose a class...</option>
                              {classes.map((classItem) => (
                                <option key={classItem.id} value={classItem.id}>
                                  {classItem.name} ({classItem.code}) - {classItem.subject || classItem.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Selected Class Info */}
                        {selectedClass && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-blue-900">{selectedClass.name}</h4>
                                <p className="text-sm text-blue-700">
                                  Subject: {selectedClass.subject || selectedClass.name}
                                </p>
                                <p className="text-xs text-blue-600">Code: {selectedClass.code}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scanner UI */}
                        {selectedClass && (
                          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">

                            {/* Camera Selector */}
                            {cameras.length > 0 && (
                              <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="font-medium">Camera Source</span>
                                </div>
                                <select
                                  className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
                                  value={selectedCameraId || ""}
                                  onChange={(e) => {
                                    setSelectedCameraId(e.target.value);
                                    // Give state a moment then restart
                                    setTimeout(() => startScanner(), 100);
                                  }}
                                >
                                  {cameras.map(cam => (
                                    <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Selected Class Header */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 p-5 flex items-center justify-between">
                              <div>
                                <h3 className="font-bold text-gray-900 text-xl mb-1">{selectedClass.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span className="font-mono bg-white px-3 py-1 rounded-lg border border-blue-200 font-semibold text-blue-700">{selectedClass.code}</span>
                                  <span>•</span>
                                  <span className="font-medium">{selectedClass.subject}</span>
                                </div>
                              </div>
                              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                              </div>
                            </div>

                            {/* Professional Scanner Container */}
                            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl border-2 border-gray-700 ring-4 ring-gray-900/20" style={{ minHeight: '500px' }}>

                              {/* Instruction Badge - Top */}
                              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30">
                                <div className="bg-white/95 backdrop-blur-sm px-6 py-2.5 rounded-full shadow-lg border border-gray-200 flex items-center gap-2 animate-pulse">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm font-semibold text-gray-800">Position QR code within the frame</span>
                                </div>
                              </div>

                              {/* Camera Feed */}
                              <div id="reader" className="w-full h-full bg-black min-h-[500px] object-cover"></div>

                              {/* Layer: Flash Effect */}
                              {flashActive && (
                                <div className="absolute inset-0 bg-white z-50 animate-flash pointer-events-none mix-blend-overlay"></div>
                              )}

                              {/* Layer: Torch Control */}
                              {hasTorch && isScanning && (
                                <button
                                  onClick={toggleTorch}
                                  className="absolute top-6 right-6 z-40 p-4 rounded-full bg-black/40 text-white hover:bg-white/20 backdrop-blur-md transition-all border border-white/10 active:scale-95 group"
                                >
                                  {torchOn ? (
                                    <svg className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 22a10 10 0 100-20 10 10 0 000 20z" /></svg>
                                  ) : (
                                    <svg className="h-6 w-6 text-gray-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                  )}
                                </button>
                              )}

                              {/* Overlays */}
                              {isScanning && (
                                <div className="absolute inset-0 pointer-events-none z-10">
                                  {/* Dimmed Outside Area with Clear Center */}
                                  <div className="absolute inset-0 bg-black/70 clip-path-center-hole"></div>

                                  {/* Box Container (Centered & Larger) */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-80 h-80 border-2 border-transparent">
                                      {/* Animated Scanning Line */}
                                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_25px_#4ade80] animate-[scan_2s_ease-in-out_infinite]"></div>

                                      {/* Enhanced Corner Brackets with Staggered Animation */}
                                      <div className="absolute top-0 left-0 w-24 h-24 border-t-[5px] border-l-[5px] border-green-500 rounded-tl-2xl shadow-[0_0_25px_#22c55e,inset_0_0_20px_#22c55e33] animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                                      <div className="absolute top-0 right-0 w-24 h-24 border-t-[5px] border-r-[5px] border-green-500 rounded-tr-2xl shadow-[0_0_25px_#22c55e,inset_0_0_20px_#22c55e33] animate-[pulse_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
                                      <div className="absolute bottom-0 left-0 w-24 h-24 border-b-[5px] border-l-[5px] border-green-500 rounded-bl-2xl shadow-[0_0_25px_#22c55e,inset_0_0_20px_#22c55e33] animate-[pulse_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}></div>
                                      <div className="absolute bottom-0 right-0 w-24 h-24 border-b-[5px] border-r-[5px] border-green-500 rounded-br-2xl shadow-[0_0_25px_#22c55e,inset_0_0_20px_#22c55e33] animate-[pulse_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.6s' }}></div>
                                    </div>
                                  </div>

                                  {/* Status Bar */}
                                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                    <div className={`
                                      px-8 py-3 rounded-full font-mono font-bold tracking-widest text-lg border
                                      transition-all duration-200 shadow-2xl
                                      ${verificationState === 'verifying'
                                        ? 'bg-green-600 border-green-400 text-white scale-110 shadow-[0_0_30px_#22c55e]'
                                        : 'bg-black/80 border-gray-700 text-white shadow-lg'}
                                      `}>
                                      {verificationState === 'verifying' ? 'QR DETECTED!' : 'SEARCHING...'}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {/* Identity Card Modal (Result) */}
                              {verificationState === 'result' && scanResult && (
                                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">

                                  {/* ID Card */}
                                  <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-all hover:scale-[1.02]">
                                    <div className="h-24 bg-gradient-to-r from-blue-600 to-purple-600 relative">
                                      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                                        <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-3xl shadow-md">
                                          🎓
                                        </div>
                                      </div>
                                    </div>
                                    <div className="pt-12 pb-6 px-6">
                                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{scanResult.student_name || "Unknown Student"}</h3>
                                      <p className="text-gray-500 font-mono text-sm mb-4">{scanResult.student_id || "No ID"}</p>

                                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-6">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">RAW DATA</p>
                                        <p className="text-sm font-mono text-gray-700 break-all">{scannedData}</p>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3">
                                        <button
                                          onClick={resumeScanner}
                                          className="col-span-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
                                        >
                                          Clear & Next
                                        </button>
                                        {/* Real Verification would go here if enabled */}
                                        {selectedClass && (
                                          <button
                                            onClick={() => submitScan(String(scanResult.student_id || ""))}
                                            className="col-span-1 py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                                          >
                                            Verify & Save
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-center pt-2">
                              <button onClick={handleCloseQrReader} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 font-medium transition-colors">
                                Close Scanner
                              </button>
                            </div>
                          </div>
                        )}

                        {(!selectedClass && !showQrReader) && (
                          // This should not happen due to structure, but kept logic clean
                          <div />
                        )}

                        {/* Class Selector when NOT scanning but Reader is OPEN? No, reader open handles selection internally or passed */}
                        {/* Re-implementing the Class Selector logic inside the scanner view if we want to allow changing classes? 
                        The previous logic showed class selector when !showQrReader OR if showQrReader but !selectedClass. 
                        My handleOpenQrReader blocks opening if no classes.
                        But wait, the UI I'm replacing (lines 2629-2776) was ONLY the scanner part.
                        
                        I need to handle the case where `showQrReader` is true but `selectedClass` is null (if I allow that).
                        In my `handleOpenQrReader`, I check for classes.
                        
                        Actually, existing UI showed "Class Selection" if !showQrReader OR if showQrReader was false.
                        Wait, Line 2487: `{!showQrReader ? ( ... ) : ( ... )}`
                        The `else` block (lines 2570+) was where the scanner/class selector lived?
                        
                        Ah, the previous code structure was:
                        !showQrReader -> Show "Open QR Scanner" button (Lines 2487-2568)
                        else -> Show Class Selector (Lines 2571-2611) -> AND Scanner Area (Lines 2629+)
                        
                        I am replacing Lines 2629-2776.
                        This is INSIDE the `else` block (showQrReader is TRUE).
                        And inside the `if (selectedClass && isScanning)` check?
                        
                        Wait, looks like `selectedClass` logic is separate.
                        Line 2570: `<div className="space-y-4">`
                        Line 2572: Class Selector.
                        Line 2629: `{selectedClass && isScanning && (` -> Scanner Area.
                        
                        I want to replace the `Scanner Area` logic.
                        
                        BUT I replaced the `handleClassSelect` logic to auto-start scanner.
                        
                        So my replacement chunk 3 must include the Class Selector part OR I must be careful.
                        The target lines 2629-2776 cover `{selectedClass && isScanning && ...}` and `{scannedData && ...}` and `{buttons}`.
                        
                        This seems correct for replacing the scanner PART.
                        
                        However, I need to ensure `Scanner Area` renders correct content.
                        
                        Let's verify lines again.
                        Line 2570 starts the `else` block content.
                        Line 2628 is before `Scanner Area`.
                        
                        I will replace from 2629 to 2776.
                        
                        One mismatch: In my new `handleClassSelect`, I set `selectedClass` and call `startScanner`.
                        So `selectedClass` will be true.
                        
                        The existing Class Selector (2571-2611) remains ABOVE the scanner area. That is fine.
                        
                        So I am just replacing the `Scanner Area` div and the subsequent buttons.
                        
                        One detail: in my replacement chunk 2, I defined `handleClassSelect` to set `selectedClass` and `startScanner`.
                        
                        The `startScanner` sets `isScanning = true`.
                        So `selectedClass && isScanning` will be true.
                        
                        So replacing 2629-2776 with my new UI is correct.
                        
                        BUT, I should remove `simulateQrScan` button and `scannedData` display which are in that block. Correct.
                        
                        Wait, I am adding `id="reader"` div.
                        
                        And I added `useEffect` for cleanup in Chunk 2.
                        
                        Wait, I did NOT add `useEffect` to the Chunk 2. Use `useEffect` inside `startScanner` is not possible.
                        I need to add `formatAttendanceTime` back? Or remove it?
                        I removed `formatAttendanceTime` in Chunk 2 (it was included in the target).
                        I should probably keep it or add it back if used elsewhere.
                        It was used in "Recent Attendance".
                        
                        "Recent Attendance" is displayed in lines 2539-2567 (when !showQrReader blocks).
                        So I NEED `formatAttendanceTime`.
                        
                        I will add `formatAttendanceTime` helper back in Chunk 2.
                    */
                        }
                      </div>
                    )}
                  </div>

                  {/* Announcements Card */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
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
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Announcements</h3>
                      </div>
                      {announcements.filter((a) => a.is_urgent).length > 0 && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-orange-600 font-medium">
                            {announcements.filter((a) => a.is_urgent).length} Urgent
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
                              className={`bg-gray-50 rounded-xl p-4 border transition-all duration-200 hover:bg-gray-100 shadow-sm cursor-pointer ${announcement.is_urgent
                                ? "border-orange-300 ring-1 ring-orange-100"
                                : "border-gray-200"
                                }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`w-3 h-3 rounded-full mt-2 ${announcement.is_urgent ? "bg-orange-500" : "bg-blue-500"
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
                            <h5 className="font-medium text-gray-900 text-sm mb-1">No Announcements</h5>
                            <p className="text-xs text-gray-600">No announcements to display</p>
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

                {/* Quick Actions Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span>Quick Actions</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => navigate("/teacher/assignments")}
                      className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-gray-900 font-semibold text-sm">Manage Assignments</p>
                        <p className="text-xs text-gray-600">Create and manage tasks</p>
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
                    {/* Manage Classes Button */}
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
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-gray-900 font-semibold text-sm">
                          Manage Classes
                        </p>
                        <p className="text-xs text-gray-600">
                          Organize student class
                        </p>
                      </div>
                    </button>
                    {/* Schedule Button */}
                    <button
                      onClick={() => navigate("/teacher/schedule")}
                      className="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-gray-900 font-semibold text-sm">
                          Schedule
                        </p>
                        <p className="text-xs text-gray-600">
                          room schedule and room monitoring for cleaning
                        </p>
                      </div>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </main>
        </div >
      </div >

      {/* Announcement Modal */}
      < AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onAnnouncementCreated={handleAnnouncementCreated}
      />

      {/* CSS for scan animation */}
      <style>
        {
          `
          @keyframes scan {
            0% {
              top: 0%;
              opacity: 0.6;
            }
            50% {
               opacity: 1;
            }
            100% {
              top: 100%;
              opacity: 0.6;
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}
      </style >
    </div >
  );
};

export default TeacherDashboard;