import React, { useState } from "react";
import LoginForm from "../components/LoginForm";
import loginBg from "../assets/images/PLMUNBG.jpg";
import plmunLogo from "../assets/images/PLMUNlogo.png";

// Developer data - Updated structure
const developers = [
  {
    id: 1,
    name: "Allen Jefferson Calalang Orcino",
    initials: "AO",
    position: "Full Stack Developer",
    teamRole: "Assistant Leader",
    primaryRole: "Full Stack Development & System Flow Design",
    description:
      "Handled the entire system flow, frontend and backend integration, and ensures smooth user experience throughout the application.",
    color: "green",
  },
  {
    id: 2,
    name: "Jacob Alocon",
    initials: "JA",
    position: "Backend Developer",
    teamRole: "Project Leader",
    primaryRole: "Backend Management & Paper Documentation",
    description:
      "Manages server-side logic, database architecture, and oversees project documentation and research paper development.",
    color: "yellow",
  },
  {
    id: 3,
    name: "Lemuel Doblada",
    initials: "LD",
    position: "UI/UX Designer",
    teamRole: "Member",
    primaryRole: "System Design & Paper Contribution",
    description:
      "Responsible for user interface design, user experience optimization, and contributes to research documentation.",
    color: "blue",
  },
];

// Custom SVG Icons
const UsersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 group-hover:scale-110 transition-transform"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 hover:rotate-90 transition-transform duration-300"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const BookIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const LightBulbIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
    <path d="M9 18h6"></path>
    <path d="M10 22h4"></path>
  </svg>
);

const TargetIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const ShieldIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const ChatBotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    <path d="M8 10h.01"></path>
    <path d="M12 10h.01"></path>
    <path d="M16 10h.01"></path>
  </svg>
);

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const LoginPage: React.FC = () => {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const openTeamModal = () => {
    setIsTeamModalOpen(true);
  };

  const closeTeamModal = () => {
    setIsTeamModalOpen(false);
  };

  // Close modal on escape key
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTeamModal();
      }
    };

    if (isTeamModalOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "auto";
    };
  }, [isTeamModalOpen]);

  // Get color classes based on color name
  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return {
          bg: "bg-green-500",
          text: "text-green-400",
          bgLight: "bg-green-500/20",
          border: "border-green-500/30",
          gradient: "from-green-500/20 to-emerald-500/20",
        };
      case "yellow":
        return {
          bg: "bg-yellow-500",
          text: "text-yellow-400",
          bgLight: "bg-yellow-500/20",
          border: "border-yellow-500/30",
          gradient: "from-yellow-500/20 to-amber-500/20",
        };
      case "blue":
        return {
          bg: "bg-blue-500",
          text: "text-blue-400",
          bgLight: "bg-blue-500/20",
          border: "border-blue-500/30",
          gradient: "from-blue-500/20 to-cyan-500/20",
        };
      default:
        return {
          bg: "bg-green-500",
          text: "text-green-400",
          bgLight: "bg-green-500/20",
          border: "border-green-500/30",
          gradient: "from-green-500/20 to-emerald-500/20",
        };
    }
  };

  return (
    <>
      <div
        className="relative flex items-center justify-center min-h-screen w-full overflow-hidden"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Team Button */}
        <button
          onClick={openTeamModal}
          className="fixed right-4 sm:right-6 top-4 sm:top-6 z-30 flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-700/50 group cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          aria-label="View development team information"
        >
          <UsersIcon />
          <span className="font-semibold text-sm">Team</span>
        </button>

        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-900/70"
          aria-hidden="true"
        ></div>

        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-64 sm:h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-64 sm:h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 py-8 sm:px-6 md:px-8">
          <div
            className="w-full max-w-sm sm:max-w-md bg-slate-800/85 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-700/30 transition-all duration-300 hover:shadow-2xl"
            role="region"
            aria-labelledby="login-heading"
            aria-describedby="login-description"
          >
            <header className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg scale-110"></div>
                <img
                  src={plmunLogo}
                  alt="Pamantasan ng Lungsod ng Muntinlupa Logo"
                  className="relative w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-2xl"
                />
              </div>
            </header>

            <section className="text-center mb-8">
              <h1
                id="login-heading"
                className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
              >
                Welcome to Classtrack Pro
              </h1>
              <div className="w-22 h-1 bg-gradient-to-r from-green-600 to-green-500 mx-auto rounded-full mb-3"></div>
              <p
                id="login-description"
                className="text-base sm:text-lg text-slate-200 font-medium leading-tight"
              >
                Pamantasan ng Lungsod ng Muntinlupa
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                Student Information Management System
              </p>
            </section>

            <section
              role="form"
              aria-label="User Authentication Form"
              className="mb-6"
            >
              <LoginForm />
            </section>

            <footer className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium">Secure Connection</span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  © 2025 Classtrack Pro. All rights reserved.
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Student Information Management System
                </p>
              </div>
            </footer>
          </div>
        </div>

        <a
          href="#login-heading"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-red-600 text-white px-4 py-2 rounded-xl z-50 shadow-lg hover:bg-red-700 transition-colors"
        >
          Skip to Login Form
        </a>
      </div>

      {/* Team Modal */}
      {isTeamModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fadeIn cursor-pointer"
            onClick={closeTeamModal}
            aria-hidden="true"
          ></div>

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scaleIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-modal-title"
          >
            <div
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeTeamModal}
                className="absolute right-4 top-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer hover:scale-110 active:scale-95"
                aria-label="Close team modal"
                title="Close"
              >
                <CloseIcon />
              </button>

              {/* Modal Content */}
              <div className="p-6 md:p-8">
                {/* Thesis Title Section */}
                <header className="text-center mb-8 pt-4">
                  <h2
                    id="team-modal-title"
                    className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
                  >
                    CLASSTRACK PRO
                  </h2>
                  <div className="w-32 h-1 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 mx-auto rounded-full mb-4"></div>
                  <p className="text-base md:text-lg text-slate-200 font-medium leading-relaxed px-2">
                    AN AI-INTEGRATED DIGITAL CLASSROOM MANAGEMENT SYSTEM WITH
                    REAL-TIME STUDENT ENGAGEMENT INSIGHTS AND AUTOMATED
                    REPORTING
                  </p>
                </header>

                {/* Thesis Description */}
                <section className="mb-8">
                  <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 border border-slate-700/40 shadow-lg">
                    {/* Header with icon */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl flex items-center justify-center border border-blue-500/30">
                          <BookIcon />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></span>
                          System Description
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          Comprehensive overview of Classtrack Pro
                        </p>
                      </div>
                    </div>

                    {/* Main content in a card layout */}
                    <div className="space-y-6">
                      {/* Introduction Card */}
                      <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30 hover:border-blue-500/30 transition-all duration-300">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            <LightBulbIcon />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                              <span className="text-green-400">Introduction</span>
                            </h4>
                            <p className="text-slate-300 text-sm leading-relaxed">
                              Classtrack Pro is an advanced digital classroom management 
                              and academic integrity platform, developed by 4th-year 
                              students as a thesis project for Pamantasan ng Lungsod ng 
                              Muntinlupa. By leveraging artificial intelligence, it 
                              provides educators with deep, real-time insights into 
                              student engagement while fostering a culture of 
                              accountability and genuine learning.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mission Card */}
                      <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30 hover:border-purple-500/30 transition-all duration-300">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            <TargetIcon />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                              <span className="text-purple-400">Core Mission</span>
                            </h4>
                            <p className="text-slate-300 text-sm leading-relaxed">
                              In an age where AI assistance is prevalent, Classtrack Pro 
                              is designed to encourage academic honesty and motivate 
                              students to put forth their personal best, ensuring their 
                              achievements reflect their own diligence and understanding. 
                              The system centers on a personalized academic dashboard 
                              designed for clarity and efficiency.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Features Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dashboard Features */}
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30">
                          <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                            Dashboard Features
                          </h4>
                          <ul className="space-y-2 text-sm text-slate-300">
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              <span>Teacher's name, and assignment, subject, and unique class code display</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              <span>Integrated class schedule with dates and times</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              <span>Centralized announcement board for updates</span>
                            </li>
                          </ul>
                        </div>

                        {/* AI Chatbot Assistant */}
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30">
                          <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            AI Chatbot Assistant
                          </h4>
                          <ul className="space-y-2 text-sm text-slate-300">
                            <li className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">•</span>
                              <span>24/7 intelligent assistance for Student & Teacher</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">•</span>
                              <span>Answers questions about assignments and deadlines</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">•</span>
                              <span>Provides information on schedules and announcements</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">•</span>
                              <span>Guides users through system features and navigation</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">•</span>
                              <span>Clarifies task requirements and platform usage</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Student Monitoring & Tracking */}
                      <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30">
                        <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Student Monitoring & Tracking
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-slate-900/40 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <EyeIcon />
                              </div>
                              <h5 className="text-sm font-medium text-green-400">Engagement Insights</h5>
                            </div>
                            <p className="text-xs text-slate-300">
                              Real-time tracking of student participation and activity patterns
                            </p>
                          </div>
                          <div className="bg-slate-900/40 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <ClockIcon />
                              </div>
                              <h5 className="text-sm font-medium text-blue-400">Time Management</h5>
                            </div>
                            <p className="text-xs text-slate-300">
                              Strict submission deadlines and activity time tracking
                            </p>
                          </div>
                          <div className="bg-slate-900/40 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                                <ShieldIcon />
                              </div>
                              <h5 className="text-sm font-medium text-red-400">Academic Integrity</h5>
                            </div>
                            <p className="text-xs text-slate-300">
                              Originality checking and tab monitoring for focused learning
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Additional Features */}
                      <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30">
                        <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          Additional Features
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-sm font-medium text-yellow-400 mb-2">Institutional Operations</h5>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              Real-time logging and verification of student-submitted cleaning reports. 
                              Teachers can efficiently confirm room maintenance before vacating.
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-yellow-400 mb-2">Academic Management</h5>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              Centralized assignment management, submission portal, and automated 
                              performance reporting with grade viewing capabilities.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Security & Status */}
                      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            <ShieldIcon />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                              <span className="text-red-400">System Status & Security</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="bg-slate-900/40 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm font-medium text-white">Server Status</span>
                                </div>
                                <p className="text-xs text-slate-400">All systems operational</p>
                              </div>
                              <div className="bg-slate-900/40 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm font-medium text-white">AI Chatbot</span>
                                </div>
                                <p className="text-xs text-slate-400">24/7 Active Assistant</p>
                              </div>
                              <div className="bg-slate-900/40 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm font-medium text-white">Security Protocols</span>
                                </div>
                                <p className="text-xs text-slate-400">All protocols active & updated</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conclusion */}
                      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-5 border border-blue-500/20">
                        <h4 className="text-md font-semibold text-white mb-3 text-center">
                          Final Remarks
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed text-center">
                          By unifying intelligent integrity safeguards, real-time engagement insights, 
                          automated reporting, and AI-driven support, Classtrack Pro does more than 
                          streamline processes—it champions authentic education. It is designed to 
                          cultivate a transparent, efficient, and effective academic ecosystem for 
                          Pamantasan ng Lungsod ng Muntinlupa, where every student is motivated to 
                          strive for excellence through their own hard work.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Developers Section */}
                <section className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-6 text-center">
                    Development Team
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                    {developers.map((developer) => {
                      const colors = getColorClasses(developer.color);
                      return (
                        <div
                          key={developer.id}
                          className={`bg-slate-800/40 rounded-xl p-5 border ${colors.border} transition-all duration-300 hover:scale-[1.02] group cursor-default flex flex-col`}
                        >
                          {/* Developer Header */}
                          <div className="flex items-start gap-3 mb-4">
                            <div className="relative flex-shrink-0">
                              <div
                                className={`w-14 h-14 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center transition-all`}
                              >
                                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-lg">
                                  {developer.initials}
                                </div>
                              </div>
                              <div
                                className={`absolute -bottom-1 -right-1 w-5 h-5 ${colors.bg} rounded-full flex items-center justify-center border border-slate-800`}
                              >
                                <span className="text-[10px] font-bold">✓</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Name with automatic line break */}
                              <h4 className="text-base font-bold text-white group-hover:text-green-300 transition-colors leading-tight break-words">
                                {developer.name}
                              </h4>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span
                                  className={`text-xs font-semibold ${colors.text} px-2 py-1 ${colors.bgLight} rounded-full whitespace-nowrap`}
                                >
                                  {developer.position}
                                </span>
                                <span
                                  className={`text-xs font-semibold ${
                                    developer.teamRole === "Project Leader"
                                      ? "text-yellow-400 bg-yellow-500/20"
                                      : developer.teamRole ===
                                        "Assistant Leader"
                                      ? "text-green-400 bg-green-500/20"
                                      : "text-blue-400 bg-blue-500/20"
                                  } px-2 py-1 rounded-full whitespace-nowrap`}
                                >
                                  {developer.teamRole}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Content that pushes footer down */}
                          <div className="flex-grow">
                            {/* Primary Role */}
                            <div className="mb-4">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div
                                  className={`w-1.5 h-1.5 ${colors.bg} rounded-full`}
                                ></div>
                                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                  Primary Role
                                </h5>
                              </div>
                              <p className="text-sm text-slate-200 font-medium pl-3 leading-tight">
                                {developer.primaryRole}
                              </p>
                            </div>

                            {/* Responsibilities */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div
                                  className={`w-1.5 h-1.5 ${colors.bg} rounded-full`}
                                ></div>
                                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                  Responsibilities
                                </h5>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed pl-3">
                                {developer.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Team Structure Summary */}
                <section className="mb-6">
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
                      Team Structure Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-slate-900/40 rounded-lg flex flex-col items-center justify-center hover:bg-slate-900/60 transition-all duration-300">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-1.5">
                          <span className="text-yellow-400 text-sm">👑</span>
                        </div>
                        <h4 className="font-bold text-yellow-400 text-sm mb-0.5">
                          Leader
                        </h4>
                        <p className="text-xs text-slate-300 break-words text-center">
                          Jacob Alocon
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 text-center">
                          Backend & Documentation Thesis Paper
                        </p>
                      </div>
                      <div className="text-center p-3 bg-slate-900/40 rounded-lg flex flex-col items-center justify-center hover:bg-slate-900/60 transition-all duration-300">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-1.5">
                          <span className="text-green-400 text-sm">👥</span>
                        </div>
                        <h4 className="font-bold text-green-400 text-sm mb-0.5">
                          Assistant Leader
                        </h4>
                        <p className="text-xs text-slate-300 break-words text-center leading-tight">
                          Allen Jefferson Calalang Orcino
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 text-center">
                          Full Stack Development & Contribute Thesis Paper
                        </p>
                      </div>
                      <div className="text-center p-3 bg-slate-900/40 rounded-lg flex flex-col items-center justify-center hover:bg-slate-900/60 transition-all duration-300">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-1.5">
                          <span className="text-blue-400 text-sm">🎨</span>
                        </div>
                        <h4 className="font-bold text-blue-400 text-sm mb-0.5">
                          Member
                        </h4>
                        <p className="text-xs text-slate-300 break-words text-center">
                          Lemuel Doblada
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 text-center">
                          Design & Research Thesis Paper
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-slate-700/50 pt-5 mt-5">
                  <div className="text-center">
                    <p className="text-sm text-slate-400">
                      Pamantasan ng Lungsod ng Muntinlupa
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      © 2025 Classtrack Pro Thesis Project - BS Information
                      Technology
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[11px] text-slate-400">
                          Operational
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-[11px] text-slate-400">
                          AI Assistant Active
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-[11px] text-slate-400">
                          Version 1.0.0
                        </span>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default LoginPage;