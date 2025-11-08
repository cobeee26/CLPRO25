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

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Get role-specific navigation items and branding
  const getNavigationItems = () => {
    const userRole =
      user?.role || localStorage.getItem("userRole") || "student";

    // Strict role validation - only allow valid roles
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
              "from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:from-blue-500/20 hover:to-purple-500/20 hover:shadow-blue-500/10",
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
              "from-emerald-500/10 to-emerald-600/10 border-emerald-500/20 hover:from-emerald-500/20 hover:to-emerald-600/20 hover:shadow-emerald-500/10",
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
              "from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:from-purple-500/20 hover:to-purple-600/20 hover:shadow-purple-500/10",
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
              "from-indigo-500/10 to-indigo-600/10 border-indigo-500/20 hover:from-indigo-500/20 hover:to-indigo-600/20 hover:shadow-indigo-500/10",
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
              "from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:from-orange-500/20 hover:to-orange-600/20 hover:shadow-orange-500/10",
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
              "from-red-500/10 to-red-600/10 border-red-500/20 hover:from-red-500/20 hover:to-red-600/20 hover:shadow-red-500/10",
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
              "from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:from-blue-500/20 hover:to-blue-600/20 hover:shadow-blue-500/10",
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
              "from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:from-purple-500/20 hover:to-purple-600/20 hover:shadow-purple-500/10",
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
              "from-indigo-500/10 to-indigo-600/10 border-indigo-500/20 hover:from-indigo-500/20 hover:to-indigo-600/20 hover:shadow-indigo-500/10",
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
              "from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:from-orange-500/20 hover:to-orange-600/20 hover:shadow-orange-500/10",
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
              "from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:from-blue-500/20 hover:to-blue-600/20 hover:shadow-blue-500/10",
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
              "from-green-500/10 to-green-600/10 border-green-500/20 hover:from-green-500/20 hover:to-green-600/20 hover:shadow-green-500/10",
            iconColors: "from-green-500 to-green-600",
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
              "from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:from-purple-500/20 hover:to-purple-600/20 hover:shadow-purple-500/10",
            iconColors: "from-purple-500 to-purple-600",
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
              "from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 hover:from-yellow-500/20 hover:to-yellow-600/20 hover:shadow-yellow-500/10",
            iconColors: "from-yellow-500 to-yellow-600",
          },
        ];

      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  // Get role-specific branding
  const getBranding = () => {
    let userRole = user?.role || localStorage.getItem("userRole") || "student";

    // Strict role validation - only allow valid roles
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

  // Get role-specific avatar icon
  const getRoleAvatar = () => {
    let userRole = user?.role || localStorage.getItem("userRole") || "student";

    // Strict role validation - only allow valid roles
    const validRoles = ["admin", "teacher", "student"];
    if (!validRoles.includes(userRole)) {
      console.warn(
        `Invalid user role detected in avatar: ${userRole}. Defaulting to student.`
      );
      userRole = "student";
    }

    switch (userRole) {
      case "admin":
        return (
          <span className="text-white font-bold text-sm">A</span>
        );
      case "teacher":
        return (
          <span className="text-white font-bold text-sm">T</span>
        );
      case "student":
        return (
          <span className="text-white font-bold text-sm">S</span>
        );
      default:
        return (
          <span className="text-white font-bold text-sm">U</span>
        );
    }
  };

  // Get role-specific avatar gradient
  const getRoleAvatarGradient = () => {
    let userRole = user?.role || localStorage.getItem("userRole") || "student";

    // Strict role validation - only allow valid roles
    const validRoles = ["admin", "teacher", "student"];
    if (!validRoles.includes(userRole)) {
      console.warn(
        `Invalid user role detected in avatar gradient: ${userRole}. Defaulting to student.`
      );
      userRole = "student";
    }

    switch (userRole) {
      case "admin":
        return "from-blue-500 to-purple-600";
      case "teacher":
        return "from-red-500 to-red-600";
      case "student":
        return "from-blue-500 to-blue-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        key={`sidebar-${user?.role || "unknown"}`}
        className={`dashboard-sidebar ${
          sidebarOpen ? "open translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-64 bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col flex-shrink-0 shadow-2xl z-30 lg:z-10 dashboard-transition`}
        style={{ height: "100vh", minHeight: "100vh" }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow-lg border border-slate-600/50">
                <img
                  src={plmunLogo}
                  alt="ClassTrack Logo"
                  className="w-6 h-6 object-contain"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight truncate">
                {branding.title}
              </h1>
              <p className="text-xs text-slate-400 font-medium truncate">
                {branding.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 p-3 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 200px)", minHeight: "200px" }}
        >
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active = isActive(item.path);

              const linkClasses = active
                ? `flex items-center px-3 py-2.5 text-white bg-gradient-to-r ${item.activeColors} rounded-xl transition-all duration-300 hover:shadow-lg group`
                : `flex items-center px-3 py-2.5 text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg group`;

              const iconClasses = active
                ? `w-8 h-8 bg-gradient-to-br ${item.iconColors} rounded-lg flex items-center justify-center shadow-lg`
                : `w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-lg group-hover:${item.iconColors
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
                    // Close sidebar on mobile when a link is clicked
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                    // Force a small delay to ensure proper navigation
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

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-700/50 mt-auto">
          {/* User Info */}
          <div className="flex items-center space-x-3 mb-3">
            <div
              className={`w-10 h-10 bg-gradient-to-br ${getRoleAvatarGradient()} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}
            >
              {getRoleAvatar()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {branding.userRole}
              </p>
              <p className="text-xs text-slate-400 font-medium truncate">
                {branding.userTitle}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              localStorage.removeItem("authToken");
              localStorage.removeItem("userRole");
              localStorage.removeItem("userId");
              window.location.href = "/login";
            }}
            className="w-full flex items-center px-3 py-2.5 text-slate-300 hover:bg-red-600/20 hover:text-red-400 rounded-xl transition-all duration-300 hover:shadow-lg group border border-slate-700/50 hover:border-red-500/30 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg group-hover:from-red-500 group-hover:to-red-600 transition-all duration-300 cursor-pointer">
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
            <span className="ml-3 text-sm font-medium">
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
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