import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "../contexts/UserContext";
import Sidebar from "../components/Sidebar";
import DynamicHeader from "../components/DynamicHeader";
import plmunLogo from "../assets/images/PLMUNLOGO.png";

// API Configuration
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

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ProfileUpdateData {
  first_name: string;
  last_name: string;
}

// Interface for User Profile
interface UserProfile {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  profile_picture_url?: string | null;
  updated_at?: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, fetchCurrentUser } = useUser();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    [key: string]: string;
  }>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    first_name: "",
    last_name: "",
  });
  const [profileErrors, setProfileErrors] = useState<{ [key: string]: string }>(
    {}
  );
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Simplified function to get current date as member since
  const getMemberSince = (): string => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPasswordLastUpdated = (): string => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || !userRole) {
      navigate("/login");
      return;
    }

    if (user) {
      setProfileData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
      });
      setIsLoading(false);
    }
  }, [user, navigate]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validatePasswordForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!passwordData.current_password.trim()) {
      errors.current_password = "Current password is required";
    }

    if (!passwordData.new_password.trim()) {
      errors.new_password = "New password is required";
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = "New password must be at least 8 characters long";
    }

    if (!passwordData.confirm_password.trim()) {
      errors.confirm_password = "Please confirm your new password";
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = "Passwords do not match";
    }

    if (passwordData.current_password === passwordData.new_password) {
      errors.new_password =
        "New password must be different from current password";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordSuccess(false);

      await apiClient.post("/auth/change-password", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setPasswordSuccess(true);
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      setTimeout(() => {
        setPasswordSuccess(false);
      }, 5000);
    } catch (error: any) {
      console.error("Error changing password:", error);

      if (error.response?.status === 400) {
        const errorDetail = error.response.data?.detail || "";
        if (errorDetail.includes("Current password is incorrect")) {
          setPasswordErrors({
            current_password: "Current password is incorrect",
          });
        } else if (
          errorDetail.includes("New password must be at least 8 characters")
        ) {
          setPasswordErrors({
            new_password: "New password must be at least 8 characters long",
          });
        } else if (errorDetail.includes("Current password is required")) {
          setPasswordErrors({
            current_password: "Current password is required",
          });
        } else if (errorDetail.includes("New password is required")) {
          setPasswordErrors({
            new_password: "New password is required",
          });
        } else {
          setPasswordErrors({
            general: errorDetail || "Invalid request. Please check your input.",
          });
        }
      } else if (error.response?.status === 422) {
        const apiErrors: { [key: string]: string } = {};
        if (Array.isArray(error.response.data.detail)) {
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.loc.length > 1) {
              const field = err.loc[1];
              if (field === "current_password") {
                apiErrors.current_password = err.msg;
              } else if (field === "new_password") {
                apiErrors.new_password = err.msg;
              } else {
                apiErrors.general = err.msg;
              }
            }
          });
        }
        setPasswordErrors(apiErrors);
      } else if (error.response?.status === 404) {
        setPasswordErrors({
          general: "User not found. Please try logging in again.",
        });
      } else if (error.response?.status === 500) {
        setPasswordErrors({
          general: "Server error. Please try again later.",
        });
      } else {
        const errorMessage =
          error.response?.data?.detail ||
          error.message ||
          "Failed to change password. Please try again.";
        setPasswordErrors({
          general: errorMessage,
        });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  const handleProfileEdit = () => {
    setIsEditingProfile(true);
    setProfileData({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
    });
    setProfileErrors({});
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    setProfileData({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
    });
    setProfileErrors({});
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (profileErrors[name]) {
      setProfileErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateProfileForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!profileData.first_name.trim()) {
      errors.first_name = "First name is required";
    }

    if (!profileData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // FIXED: Updated endpoint from /auth/profile to /users/me
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    try {
      setProfileLoading(true);
      setProfileSuccess(false);

      // FIX: Changed from /auth/profile to /users/me
      await apiClient.put("/users/me", {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
      });

      await fetchCurrentUser();

      setProfileSuccess(true);
      setIsEditingProfile(false);

      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error updating profile:", error);

      if (error.response?.status === 400) {
        const errorDetail = error.response.data?.detail || "";
        setProfileErrors({
          general: errorDetail || "Invalid request. Please check your input.",
        });
      } else if (error.response?.status === 422) {
        const apiErrors: { [key: string]: string } = {};
        if (Array.isArray(error.response.data.detail)) {
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.loc.length > 1) {
              const field = err.loc[1];
              apiErrors[field] = err.msg;
            }
          });
        }
        setProfileErrors(apiErrors);
      } else {
        const errorMessage =
          error.response?.data?.detail ||
          error.message ||
          "Failed to update profile. Please try again.";
        setProfileErrors({
          general: errorMessage,
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setProfileErrors({ general: "Please select an image file" });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setProfileErrors({ general: "File size must be less than 5MB" });
        return;
      }

      setSelectedPhoto(file);

      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);

      setProfileErrors({});
    }
  };

  // FIXED: Updated endpoint from /auth/upload-photo to /users/me/photo
  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;

    try {
      setPhotoUploading(true);

      const formData = new FormData();
      formData.append("photo", selectedPhoto);

      // FIX: Changed from /auth/upload-photo to /users/me/photo
      await apiClient.post("/users/me/photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchCurrentUser();

      setProfileSuccess(true);
      setSelectedPhoto(null);
      setPhotoPreview(null);

      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error uploading photo:", error);

      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to upload photo. Please try again.";
      setProfileErrors({
        general: errorMessage,
      });
    } finally {
      setPhotoUploading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "teacher":
        return "Teacher";
      case "student":
        return "Student";
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return "👑";
      case "teacher":
        return "👨‍🏫";
      case "student":
        return "🎓";
      default:
        return "👤";
    }
  };

  const handleBackToDashboard = () => {
    const userRole = localStorage.getItem("userRole");
    switch (userRole) {
      case "student":
        navigate("/student/dashboard");
        break;
      case "teacher":
        navigate("/teacher/dashboard");
        break;
      default:
        navigate("/dashboard");
    }
  };

  // QUICK ACTIONS NAVIGATION FUNCTIONS
  const handleViewGrades = () => {
    const userRole = localStorage.getItem("userRole");
    switch (userRole) {
      case "student":
        navigate("/student/grades");
        break;
      case "teacher":
        navigate("/teacher/grades");
        break;
      default:
        navigate("/grades");
    }
  };

  const handleViewSchedule = () => {
    const userRole = localStorage.getItem("userRole");
    switch (userRole) {
      case "student":
        navigate("/student/schedule");
        break;
      case "teacher":
        navigate("/teacher/schedule");
        break;
      default:
        navigate("/schedule");
    }
  };

  const handleViewClasses = () => {
    const userRole = localStorage.getItem("userRole");
    switch (userRole) {
      case "student":
        navigate("/student/classes");
        break;
      case "teacher":
        navigate("/teacher/classes");
        break;
      default:
        navigate("/classes");
    }
  };

  const handleViewAssignments = () => {
    const userRole = localStorage.getItem("userRole");
    switch (userRole) {
      case "student":
        navigate("/student/assignments");
        break;
      case "teacher":
        navigate("/teacher/assignments");
        break;
      default:
        navigate("/assignments");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-gray-900 text-lg mb-2">Unable to load profile</p>
          <p className="text-gray-600 text-sm mb-6">
            Please check your connection and try again
          </p>
          <div className="flex gap-3 justify-center cursor-pointer">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-green-300 cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-blue-300 cursor-pointer"
            >
              Go Back
            </button>
          </div>
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
              <h1 className="text-lg font-bold text-gray-900">
                Profile Settings
              </h1>
              <p className="text-xs text-gray-600">
                Manage your account and settings
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
            title="Profile Settings"
            subtitle="Manage your account and personal information"
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                <div className="relative flex-shrink-0">
                  <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-200 bg-gradient-to-br from-purple-100 to-blue-100">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : user.profile_picture_url &&
                      user.profile_picture_url.trim() !== "" ? (
                      <img
                        src={getProfileImageUrl(user.profile_picture_url)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <div
                      className={`w-full h-full flex items-center justify-center text-5xl ${
                        (!user.profile_picture_url ||
                          user.profile_picture_url.trim() === "") &&
                        !photoPreview
                          ? ""
                          : "hidden"
                      }`}
                    >
                      {getRoleIcon(user.role)}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      document.getElementById("photo-upload")?.click()
                    }
                    className="absolute -bottom-3 -right-3 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl border-2 border-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                    title="Upload Photo"
                  >
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
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>

                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-4xl font-bold text-gray-900 mb-3">
                    {user.first_name || "Not"} {user.last_name || "Set"}
                  </h2>
                  <p className="text-xl text-gray-600 mb-4 flex items-center gap-2">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {user.username}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-2xl border border-purple-200 backdrop-blur-sm">
                      {getRoleDisplayName(user.role)}
                    </span>
                    <span className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-2xl border border-gray-200 backdrop-blur-sm">
                      ID: {user.id}
                    </span>
                    <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-2xl border border-green-200 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {selectedPhoto && (
                <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={photoPreview || ""}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-gray-300"
                      />
                      <div>
                        <p className="text-gray-900 font-medium text-lg">
                          {selectedPhoto.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedPhoto(null);
                          setPhotoPreview(null);
                        }}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePhotoUpload}
                        disabled={photoUploading}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                      >
                        {photoUploading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
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
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        Upload Photo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {profileSuccess && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl backdrop-blur-sm">
                  <p className="text-green-700 font-medium flex items-center gap-2">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Profile updated successfully!
                  </p>
                </div>
              )}

              {profileErrors.general && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl backdrop-blur-sm">
                  <p className="text-red-700 font-medium flex items-center gap-2">
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    {profileErrors.general}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                {/* Personal Information */}
                <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
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
                      Personal Information
                    </h3>
                    {!isEditingProfile && (
                      <button
                        onClick={handleProfileEdit}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-blue-300 cursor-pointer flex items-center gap-2"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="first_name"
                            value={profileData.first_name}
                            onChange={handleProfileChange}
                            className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text ${
                              profileErrors.first_name
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Enter first name"
                          />
                          {profileErrors.first_name && (
                            <p className="mt-1 text-sm text-red-600">
                              {profileErrors.first_name}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="last_name"
                            value={profileData.last_name}
                            onChange={handleProfileChange}
                            className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text ${
                              profileErrors.last_name
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Enter last name"
                          />
                          {profileErrors.last_name && (
                            <p className="mt-1 text-sm text-red-600">
                              {profileErrors.last_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={profileLoading}
                          className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-green-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                        >
                          {profileLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={handleProfileCancel}
                          className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                          <label className="text-sm text-gray-600 font-medium mb-2 block">
                            First Name
                          </label>
                          <p className="text-gray-900 font-semibold text-lg">
                            {user.first_name || "Not set"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                          <label className="text-sm text-gray-600 font-medium mb-2 block">
                            Username
                          </label>
                          <p className="text-gray-900 font-semibold text-lg">
                            {user.username}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                          <label className="text-sm text-gray-600 font-medium mb-2 block">
                            Last Name
                          </label>
                          <p className="text-gray-900 font-semibold text-lg">
                            {user.last_name || "Not set"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                          <label className="text-sm text-gray-600 font-medium mb-2 block">
                            Email
                          </label>
                          <p className="text-gray-900 font-semibold text-lg">
                            {user.username}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Settings */}
                <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
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
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      Security Settings
                    </h3>
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm border cursor-pointer flex items-center gap-2 ${
                        showPasswordForm
                          ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                          : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-300"
                      }`}
                    >
                      {showPasswordForm ? (
                        <>
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Cancel
                        </>
                      ) : (
                        <>
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
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          Change Password
                        </>
                      )}
                    </button>
                  </div>

                  {passwordSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl backdrop-blur-sm">
                      <p className="text-green-700 text-sm flex items-center gap-2">
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Password changed successfully!
                      </p>
                    </div>
                  )}

                  {showPasswordForm ? (
                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                      {passwordErrors.general && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                          <p className="text-red-700 text-sm">
                            {passwordErrors.general}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              name="current_password"
                              value={passwordData.current_password}
                              onChange={handlePasswordChange}
                              className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-text ${
                                passwordErrors.current_password
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                              {showCurrentPassword ? (
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
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                  />
                                </svg>
                              ) : (
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
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                          {passwordErrors.current_password && (
                            <p className="mt-1 text-sm text-red-600">
                              {passwordErrors.current_password}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              name="new_password"
                              value={passwordData.new_password}
                              onChange={handlePasswordChange}
                              className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-text ${
                                passwordErrors.new_password
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                              {showNewPassword ? (
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
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                  />
                                </svg>
                              ) : (
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
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                          {passwordErrors.new_password && (
                            <p className="mt-1 text-sm text-red-600">
                              {passwordErrors.new_password}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirm_password"
                              value={passwordData.confirm_password}
                              onChange={handlePasswordChange}
                              className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-text ${
                                passwordErrors.confirm_password
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="Confirm new password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                              {showConfirmPassword ? (
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
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                  />
                                </svg>
                              ) : (
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
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                          {passwordErrors.confirm_password && (
                            <p className="mt-1 text-sm text-red-600">
                              {passwordErrors.confirm_password}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setShowPasswordForm(false)}
                          disabled={passwordLoading}
                          className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                        >
                          {passwordLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
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
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          Update Password
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200 backdrop-blur-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-600"
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
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">
                            Password Security
                          </h4>
                          <p className="text-gray-600 text-sm">
                            Last updated: {formatPasswordLastUpdated()}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-6">
                        Keep your account secure by regularly updating your
                        password. Use a strong password with a mix of letters,
                        numbers, and symbols.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
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
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <span>Your password is securely encrypted</span>
                      </div>
                    </div>
                  )}

                  {/* BACK TO DASHBOARD BUTTON (MOVED TO BOTTOM OF SECURITY SETTINGS) */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <button
                      onClick={handleBackToDashboard}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl border border-blue-300 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
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
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">
                            Back to Dashboard
                          </p>
                          <p className="text-xs text-white/80">
                            Return to main dashboard
                          </p>
                        </div>
                      </div>
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Account Status */}
                <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    Account Status
                  </h3>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <label className="text-sm text-gray-600 font-medium mb-2 block text-center">
                        Account Type
                      </label>
                      <p className="text-gray-900 font-semibold text-lg text-center">
                        {getRoleDisplayName(user.role)}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <label className="text-sm text-gray-600 font-medium mb-2 block text-center">
                        Account Status
                      </label>
                      <p className="text-green-600 font-semibold text-lg flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        Active
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <label className="text-sm text-gray-600 font-medium mb-2 block text-center">
                        Member Since
                      </label>
                      <p className="text-gray-900 font-semibold text-lg text-center">
                        {getMemberSince()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions - WITH WORKING NAVIGATION */}
                <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
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
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    Quick Actions
                  </h3>

                  <div className="space-y-4">
                    <button
                      onClick={handleViewGrades}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl border border-green-200 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow">
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
                            View Grades
                          </p>
                          <p className="text-xs text-gray-600">
                            Check your grades
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={handleViewSchedule}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl border border-blue-200 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow">
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
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-gray-900 font-semibold text-sm">
                            View Schedule
                          </p>
                          <p className="text-xs text-gray-600">
                            See your schedule
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={handleViewClasses}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl border border-purple-200 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow">
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
                        <div className="text-left">
                          <p className="text-gray-900 font-semibold text-sm">
                            View Classes
                          </p>
                          <p className="text-xs text-gray-600">
                            See your classes
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={handleViewAssignments}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl border border-orange-200 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow">
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
                          <p className="text-gray-900 font-semibold text-sm">
                            View Assignments
                          </p>
                          <p className="text-xs text-gray-600">
                            See your assignments
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 rounded-xl border border-red-200 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow">
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
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-gray-900 font-semibold text-sm">
                            Logout
                          </p>
                          <p className="text-xs text-gray-600">
                            Sign out from your account
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;