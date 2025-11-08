import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useUser } from "../contexts/UserContext";
import DynamicHeader from "../components/DynamicHeader";
import Sidebar from "../components/Sidebar";
import plmunLogo from "../assets/images/PLMUNLOGO.png";

interface Class {
  id: number;
  name: string;
  code: string;
  teacher_id?: number;
}

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  creator_id: number;
  created_at: string;
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

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [engagementInsights, setEngagementInsights] = useState<
    EngagementInsight[]
  >([]);
  const [loadingStates, setLoadingStates] = useState({
    classes: true,
    assignments: true,
    insights: true,
  });

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

  useEffect(() => {
    if (user && user.role === "teacher") {
      console.log("👤 User data loaded, starting data fetch...");
      loadTeacherData();
    } else if (user && user.role !== "teacher") {
      console.log("❌ User role mismatch, redirecting to login");
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      console.log("👤 Teacher user data loaded:", {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
      });
    }
  }, [user]);

  const loadTeacherData = async () => {
    try {
      await Promise.all([loadClasses(), loadAssignments()]);
    } catch (error) {
      console.error("Error loading teacher data:", error);
    }
  };

  const loadClasses = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, classes: true }));

      console.log("📚 Loading teacher classes from API...");
      const { getTeacherClasses } = await import("../services/authService");
      const teacherData = await getTeacherClasses();

      setClasses(teacherData.classes);
      console.log(
        "✅ Teacher classes loaded successfully:",
        teacherData.classes
      );
    } catch (error) {
      console.error("Error loading teacher classes:", error);
      setClasses([]);
    } finally {
      setLoadingStates((prev) => ({ ...prev, classes: false }));
    }
  };

  const loadAssignments = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, assignments: true }));

      console.log("📝 Loading teacher assignments from API...");
      const { getTeacherAssignments } = await import("../services/authService");
      const assignmentsData = await getTeacherAssignments();

      setAssignments(assignmentsData);
      console.log(
        "✅ Teacher assignments loaded successfully:",
        assignmentsData
      );

      await loadEngagementInsights(assignmentsData);
    } catch (error) {
      console.error("Error loading teacher assignments:", error);
      setAssignments([]);
    } finally {
      setLoadingStates((prev) => ({ ...prev, assignments: false }));
    }
  };

  const loadEngagementInsights = async (assignmentsList: Assignment[]) => {
    try {
      setLoadingStates((prev) => ({ ...prev, insights: true }));

      console.log("📊 Loading mock engagement insights for teacher...");
      const mockInsights: EngagementInsight[] = assignmentsList.map(
        (assignment) => ({
          id: assignment.id,
          class_name: assignment.name,
          assignment_name: assignment.name,
          total_submissions: Math.floor(Math.random() * 50) + 10,
          average_time_spent: Math.floor(Math.random() * 120) + 30,
          engagement_score: Math.floor(Math.random() * 40) + 60,
          last_updated: new Date().toISOString(),
        })
      );

      setEngagementInsights(mockInsights);
      console.log("✅ Mock engagement insights loaded successfully");
    } catch (error) {
      console.error("Error loading engagement insights:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, insights: false }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEngagementBadge = (score: number) => {
    if (score >= 8.5)
      return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 7.0)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">
            Please wait while we fetch your data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex relative">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 p-4 lg:hidden h-16">
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
              <h1 className="text-lg font-bold text-white">Teacher Portal</h1>
              <p className="text-xs text-slate-400">ClassTrack Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("userRole");
                localStorage.removeItem("userId");
                window.location.href = "/login";
              }}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all duration-200 border border-red-500/30 hover:border-red-500/50 cursor-pointer"
              style={{ cursor: 'pointer' }}
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
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 transition-colors cursor-pointer"
              style={{ cursor: 'pointer' }}
              title="Toggle menu"
            >
              {sidebarOpen ? (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
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
        {/* Fixed Desktop Header - SOLID BACKGROUND */}
        <div className="hidden lg:block fixed top-0 right-0 left-64 z-30 bg-slate-900 border-b border-slate-700/50">
          <DynamicHeader
            title="Teacher Portal"
            subtitle="ClassTrack Teaching Management System"
          />
        </div>

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col mt-16">
          {/* Status Bar */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-3 mx-4 mb-4 mt-4 lg:mt-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">
                    System Active
                  </span>
                </div>
                <div className="text-slate-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-400 font-medium">
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "Teacher"}{" "}
                  User
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {/* Welcome Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-8 h-8 text-white"
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
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                          />
                        </svg>
                      </div>
                    </h2>
                    <p className="text-slate-200 leading-relaxed">
                      Manage your classes, create assignments, and gain insights
                      into student engagement. Everything you need to teach
                      effectively.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Profile Card */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
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
                            console.log(
                              "🖼️  Image URL:",
                              getProfileImageUrl(user.profile_picture_url)
                            );
                          }}
                          onError={(e) => {
                            console.error(
                              "🖼️  Profile image failed to load in teacher dashboard:",
                              e.currentTarget.src
                            );
                            console.error(
                              "🖼️  User profile_picture_url:",
                              user?.profile_picture_url
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
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.username || "User"}
                      </h3>
                      <p className="text-slate-300 mb-2">
                        {user?.username || "user@classtrack.edu"}
                      </p>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full border border-purple-500/30">
                        {user?.role
                          ? user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)
                          : "Teacher"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/profile")}
                    className="px-4 py-2 bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl border border-slate-600/50 flex items-center gap-2 cursor-pointer"
                    style={{ cursor: 'pointer' }}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Left Column - My Classes & Recent Assignments (SEPARATED) */}
                <div className="lg:col-span-1 space-y-6">
                  {/* My Classes Card - SEPARATE */}
                  <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
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
                        <h3 className="text-lg font-bold text-white">
                          My Classes
                        </h3>
                      </div>
                      <button
                        onClick={() => navigate("/teacher/classes")}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md cursor-pointer"
                        style={{ cursor: 'pointer' }}
                      >
                        Create New
                      </button>
                    </div>

                    {/* Classes List - NO SCROLLING */}
                    <div className="space-y-3">
                      {loadingStates.classes ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40">
                              <div className="flex items-center justify-between mb-3">
                                <SkeletonLoader className="h-4 w-3/4" />
                                <SkeletonLoader className="w-16 h-6 rounded-full" />
                              </div>
                              <div className="flex items-center justify-between">
                                <SkeletonLoader className="h-3 w-1/2" />
                                <SkeletonLoader className="h-3 w-12" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : classes.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-slate-700/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg
                              className="w-8 h-8 text-slate-400"
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
                          <h4 className="text-lg font-semibold text-white mb-2">
                            No Classes Yet
                          </h4>
                          <p className="text-slate-400 mb-4">
                            You haven't been assigned to any classes yet.
                          </p>
                          <button 
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                            style={{ cursor: 'pointer' }}
                          >
                            Contact Admin
                          </button>
                        </div>
                      ) : (
                        classes.slice(0, 4).map((classItem) => (
                          <div
                            key={classItem.id}
                            className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm cursor-pointer"
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-white text-sm">
                                {classItem.name}
                              </h4>
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                                {classItem.code}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">
                                {
                                  assignments.filter(
                                    (a) => a.class_id === classItem.id
                                  ).length
                                }{" "}
                                assignments
                              </span>
                              <span className="text-green-400 font-medium">
                                Active
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Assignments Card - SEPARATE */}
                  <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
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
                        <h3 className="text-lg font-bold text-white">
                          Recent Assignments
                        </h3>
                      </div>
                      <button
                        onClick={() => navigate("/teacher/assignments")}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md cursor-pointer"
                        style={{ cursor: 'pointer' }}
                      >
                        Create New
                      </button>
                    </div>

                    {/* Assignments List - NO SCROLLING */}
                    <div className="space-y-3">
                      {assignments.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 bg-slate-700/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <svg
                              className="w-6 h-6 text-slate-400"
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
                          <h5 className="font-medium text-white text-sm mb-1">
                            No Assignments Yet
                          </h5>
                          <p className="text-xs text-slate-400">
                            Create your first assignment to get started
                          </p>
                        </div>
                      ) : (
                        assignments.slice(0, 4).map((assignment) => (
                          <div
                            key={assignment.id}
                            className="bg-slate-600/60 rounded-xl p-3 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm cursor-pointer"
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-white text-sm truncate">
                                  {assignment.name}
                                </h5>
                                <p className="text-xs text-slate-300">
                                  {formatDate(assignment.created_at)}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 ml-2 flex-shrink-0">
                                Active
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Activity - NO SCROLLING */}
                  <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <span>Recent Activity</span>
                    </h3>

                    <div className="space-y-4">
                      <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 cursor-pointer" style={{ cursor: 'pointer' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg
                                className="w-4 h-4 text-green-400"
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
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium text-sm">
                                New Assignment Created
                              </p>
                              <p className="text-xs text-slate-300">
                                Algebra Fundamentals - Mathematics 101
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-3 flex-shrink-0">
                            2 hours ago
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 cursor-pointer" style={{ cursor: 'pointer' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg
                                className="w-4 h-4 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium text-sm">
                                Student Submissions
                              </p>
                              <p className="text-xs text-slate-300">
                                25 new submissions for Mechanics Lab Report
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-3 flex-shrink-0">
                            4 hours ago
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 cursor-pointer" style={{ cursor: 'pointer' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg
                                className="w-4 h-4 text-yellow-400"
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
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium text-sm">
                                Announcement Posted
                              </p>
                              <p className="text-xs text-slate-300">
                                Midterm exam schedule updated
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-3 flex-shrink-0">
                            1 day ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Student Engagement Insights & Others */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
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
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          Student Engagement Insights
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-400 font-medium">
                          AI Powered
                        </span>
                      </div>
                    </div>

                    {/* Engagement Metrics - WITH SCROLLING */}
                    <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700/50 pr-2">
                      {engagementInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm cursor-pointer"
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white text-sm mb-1">
                                {insight.assignment_name}
                              </h4>
                              <p className="text-xs text-slate-300">
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

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-slate-500/40 rounded-xl p-3 border border-slate-400/30 shadow-sm">
                              <div className="text-slate-300 text-xs mb-1">
                                Submissions
                              </div>
                              <div className="text-white font-bold text-lg">
                                {insight.total_submissions}
                              </div>
                            </div>
                            <div className="bg-slate-500/40 rounded-xl p-3 border border-slate-400/30 shadow-sm">
                              <div className="text-slate-300 text-xs mb-1">
                                Avg. Time
                              </div>
                              <div className="text-white font-bold text-lg">
                                {insight.average_time_spent}m
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400">
                            Last updated: {formatDate(insight.last_updated)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Insights Summary */}
                    <div className="mt-6 bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 shadow-sm cursor-pointer" style={{ cursor: 'pointer' }}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
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
                        <h4 className="font-bold text-white">
                          AI Insights Summary
                        </h4>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        Your students show strong engagement in Chemistry
                        assignments. Consider creating more interactive content
                        for Mathematics to boost participation.
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-3">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => navigate("/teacher/assignments")}
                        className="flex items-center space-x-4 p-4 bg-slate-600/60 hover:bg-slate-600/80 rounded-xl border border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                        style={{ cursor: 'pointer' }}
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
                          <p className="text-white font-semibold text-sm">
                            Manage Assignments
                          </p>
                          <p className="text-xs text-slate-300">
                            Create and manage tasks
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => navigate("/teacher/reports")}
                        className="flex items-center space-x-4 p-4 bg-slate-600/60 hover:bg-slate-600/80 rounded-xl border border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                        style={{ cursor: 'pointer' }}
                      >
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm">
                            View Reports
                          </p>
                          <p className="text-xs text-slate-300">
                            Analytics & insights
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => navigate("/teacher/classes")}
                        className="flex items-center space-x-4 p-4 bg-slate-600/60 hover:bg-slate-600/80 rounded-xl border border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                        style={{ cursor: 'pointer' }}
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
                          <p className="text-white font-semibold text-sm">
                            Manage Students
                          </p>
                          <p className="text-xs text-slate-300">
                            Student administration
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Teaching Resources Section */}
                  <div className="bg-slate-700/60 rounded-2xl p-6 border border-slate-600/40 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-md">
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
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <span>Teaching Resources</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Course Materials */}
                      <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm cursor-pointer group" style={{ cursor: 'pointer' }}>
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
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
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-white text-sm mb-2">
                            Course Materials
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Access your teaching resources and course content
                          </p>
                        </div>
                      </div>

                      {/* Student Groups */}
                      <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm cursor-pointer group" style={{ cursor: 'pointer' }}>
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
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
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-white text-sm mb-2">
                            Student Groups
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Manage study groups and collaborative projects
                          </p>
                        </div>
                      </div>

                      {/* Schedule */}
                      <div 
                        onClick={() => navigate("/teacher/schedule")}
                        className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm cursor-pointer group" 
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
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
                          <h4 className="font-semibold text-white text-sm mb-2">
                            Schedule
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            View and manage your class schedule
                          </p>
                        </div>
                      </div>

                      {/* Announcements */}
                      <div className="bg-slate-600/60 rounded-xl p-4 border border-slate-500/40 hover:bg-slate-600/80 transition-all duration-200 shadow-sm cursor-pointer group" style={{ cursor: 'pointer' }}>
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
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
                          <h4 className="font-semibold text-white text-sm mb-2">
                            Announcements
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Post important updates to your students
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;