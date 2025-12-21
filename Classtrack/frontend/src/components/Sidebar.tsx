import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import plmunLogo from "../assets/images/PLMUNLOGO.png";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { user } = useUser();

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
            className="w-4 h-4 text-white"
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
            className="w-4 h-4 text-white"
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
            className="w-4 h-4 text-white"
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
            className="w-4 h-4 text-white"
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

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavigationItems = () => {
    const userRole =
      user?.role || localStorage.getItem("userRole") || "student";

    const validRoles = ["admin", "teacher", "student"];
    if (!validRoles.includes(userRole)) {
      console.warn(
        `Invalid user role detected: ${userRole}. Defaulting to student.`
      );
      return [];
    }

    switch (userRole) {
      case "admin":
        return [
          {
            path: "/admin/dashboard",
            label: "Dashboard",
            icon: (
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                />
              </svg>
            ),
            activeColors:
              "bg-blue-50 border-blue-200 hover:bg-blue-100",
            iconColors: "from-blue-500 to-blue-600",
          },
          {
            path: "/admin/users",
            label: "Users",
            icon: (
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            ),
            activeColors:
              "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
            iconColors: "from-emerald-500 to-emerald-600",
          },
          {
            path: "/admin/classes",
            label: "Classes",
            icon: (
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            ),
            activeColors:
              "bg-purple-50 border-purple-200 hover:bg-purple-100",
            iconColors: "from-purple-500 to-purple-600",
          },
          {
            path: "/admin/schedules",
            label: "Schedules",
            icon: (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ),
            activeColors:
              "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
            iconColors: "from-indigo-500 to-indigo-600",
          },
          {
            path: "/admin/reports",
            label: "Reports",
            icon: (
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
            ),
            activeColors:
              "bg-orange-50 border-orange-200 hover:bg-orange-100",
            iconColors: "from-orange-500 to-orange-600",
          },
        ];

      case "teacher":
        return [
          {
            path: "/teacher/dashboard",
            label: "Dashboard",
            icon: (
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                />
              </svg>
            ),
            activeColors:
              "bg-red-50 border-red-200 hover:bg-red-100",
            iconColors: "from-red-500 to-red-600",
          },
          {
            path: "/teacher/assignments",
            label: "Assignments",
            icon: (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            ),
            activeColors:
              "bg-blue-50 border-blue-200 hover:bg-blue-100",
            iconColors: "from-blue-500 to-blue-600",
          },
          {
            path: "/teacher/classes",
            label: "My Classes",
            icon: (
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            ),
            activeColors:
              "bg-purple-50 border-purple-200 hover:bg-purple-100",
            iconColors: "from-purple-500 to-purple-600",
          },
          {
            path: "/teacher/schedule",
            label: "Schedule",
            icon: (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ),
            activeColors:
              "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
            iconColors: "from-indigo-500 to-indigo-600",
          },
          {
            path: "/teacher/reports",
            label: "Reports",
            icon: (
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
            ),
            activeColors:
              "bg-orange-50 border-orange-200 hover:bg-orange-100",
            iconColors: "from-orange-500 to-orange-600",
          },
        ];

      case "student":
        return [
          {
            path: "/student/dashboard",
            label: "Dashboard",
            icon: (
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                />
              </svg>
            ),
            activeColors:
              "bg-blue-50 border-blue-200 hover:bg-blue-100",
            iconColors: "from-blue-500 to-blue-600",
          },
          {
            path: "/student/assignments",
            label: "Assignments", 
            icon: (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            ),
            activeColors:
              "bg-green-50 border-green-200 hover:bg-green-100",
            iconColors: "from-green-500 to-green-600",
          },
          {
            path: "/student/classes",
            label: "My Classes", 
            icon: (
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            ),
            activeColors:
              "bg-purple-50 border-purple-200 hover:bg-purple-100",
            iconColors: "from-purple-500 to-purple-600",
          },
          {
            path: "/student/schedule",
            label: "Schedule",
            icon: (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ),
            activeColors:
              "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
            iconColors: "from-indigo-500 to-indigo-600",
          },
          {
            path: "/student/grades",
            label: "Grades",
            icon: (
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
            ),
            activeColors:
              "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
            iconColors: "from-yellow-500 to-yellow-600",
          },
        ];

      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  const getBranding = () => {
    let userRole = user?.role || localStorage.getItem("userRole") || "student";

    const validRoles = ["admin", "teacher", "student"];
    if (!validRoles.includes(userRole)) {
      console.warn(
        `Invalid user role detected in branding: ${userRole}. Defaulting to student.`
      );
      userRole = "student";
    }

    switch (userRole) {
      case "admin":
        return {
          title: "ClassTrack Pro Admin",
          subtitle: "Management System",
          userTitle: "Administrator",
          userRole: "Admin User",
        };
      case "teacher":
        return {
          title: "ClassTrack Pro Teacher",
          subtitle: "Teacher Portal",
          userTitle: "Teacher",
          userRole:
            user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.username || "Teacher User",
        };
      case "student":
        return {
          title: "ClassTrack Pro Student",
          subtitle: "Student Portal",
          userTitle: "Student",
          userRole:
            user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.username || "Student User",
        };
      default:
        return {
          title: "ClassTrack Pro",
          subtitle: "Learning Portal",
          userTitle: "User",
          userRole: "Portal User",
        };
    }
  };

  const branding = getBranding();

  const getRoleAvatarGradient = () => {
    let userRole = user?.role || localStorage.getItem("userRole") || "student";

    const validRoles = ["admin", "teacher", "student"];
    if (!validRoles.includes(userRole)) {
      console.warn(
        `Invalid user role detected in avatar gradient: ${userRole}. Defaulting to student.`
      );
      userRole = "student";
    }

    switch (userRole) {
      case "admin":
        return "from-purple-400 to-pink-500";
      case "teacher":
        return "from-red-400 to-red-500";
      case "student":
        return "from-blue-400 to-blue-500";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("student_classes");
    localStorage.removeItem("student_assignments");
    window.location.href = "/login";
  };

  return (
    <>
      <div
        key={`sidebar-${user?.role || "unknown"}`}
        className={`dashboard-sidebar ${
          sidebarOpen ? "open translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-64 bg-white backdrop-blur-xl border-r border-gray-200 flex flex-col flex-shrink-0 shadow-lg z-30 lg:z-10 dashboard-transition`}
        style={{ height: "100vh", minHeight: "100vh" }}
      >

        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-lg border border-gray-300">
                <img
                  src={plmunLogo}
                  alt="ClassTrack Logo"
                  className="w-6 h-6 object-contain"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 tracking-tight truncate">
                {branding.title}
              </h1>
              <p className="text-xs text-gray-600 font-medium truncate">
                {branding.subtitle}
              </p>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
              aria-label="Close sidebar"
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

        <nav
          className="flex-1 p-3 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 200px)", minHeight: "200px" }}
        >
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active = isActive(item.path);

              const linkClasses = active
                ? `flex items-center px-3 py-2.5 text-gray-900 ${item.activeColors} rounded-xl transition-all duration-300 hover:shadow-md group border`
                : `flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all duration-300 hover:shadow-md group`;

              const iconClasses = active
                ? `w-8 h-8 bg-gradient-to-br ${item.iconColors} rounded-lg flex items-center justify-center shadow-lg`
                : `w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center shadow-lg group-hover:${item.iconColors
                    .replace("from-", "from-")
                    .replace("to-", "to-")} transition-all duration-300`;

              const textClasses = active
                ? "ml-3 text-sm font-semibold"
                : "ml-3 text-sm font-medium";

              return (
                <Link
                  key={`${user?.role || "unknown"}-${item.path}`}
                  to={item.path}
                  className={linkClasses}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                    }, 100);
                  }}
                >
                  <div className={iconClasses}>{item.icon}</div>
                  <span className={textClasses}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-gray-200 mt-auto">
          <div className="flex items-center space-x-3 mb-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
              {user?.profile_picture_url &&
              user.profile_picture_url.trim() !== "" ? (
                <img
                  src={getProfileImageUrl(user.profile_picture_url)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    console.log(
                      "🖼️ Profile image loaded successfully in sidebar"
                    );
                  }}
                  onError={(e) => {
                    console.error(
                      "🖼️ Profile image failed to load in sidebar:",
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
                className={`w-full h-full bg-gradient-to-br ${getRoleAvatarGradient()} flex items-center justify-center ${
                  !user?.profile_picture_url ||
                  user.profile_picture_url.trim() === ""
                    ? ""
                    : "hidden"
                }`}
              >
                {getRoleIcon(user?.role || "teacher")}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {branding.userRole}
              </p>
              <p className="text-xs text-gray-600 font-medium truncate">
                {branding.userTitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300 hover:shadow-md group border border-gray-200 hover:border-red-200 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg group-hover:from-red-600 group-hover:to-red-700 transition-all duration-300 cursor-pointer">
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <span className="ml-3 text-sm font-medium">Logout</span>
          </button>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">
              Created by Allen Jefferson Orcino
              <br />
              Full Stack Developer
            </p>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;