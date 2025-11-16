import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useUser } from '../contexts/UserContext';
import { Button, IconButton, Input } from '../components/ui';

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, fetchCurrentUser } = useUser();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: ''
  });
  const [profileErrors, setProfileErrors] = useState<{[key: string]: string}>({});
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Photo upload states
  const [photoUploading, setPhotoUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Helper function to construct full image URL
  const getProfileImageUrl = (url: string | null): string => {
    if (!url || url.trim() === '') {
      console.log('🖼️  No profile image URL provided');
      return '';
    }

    console.log('🖼️  Constructing image URL for:', url);

    // If it's already an absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('🖼️  Absolute URL detected:', url);
      return url;
    }

    // Construct full URL with backend base URL
    const baseUrl = 'http://localhost:8000';
    let constructedUrl = '';

    // Handle different URL formats
    if (url.startsWith('/')) {
      // URL starts with / (e.g., /uploads/filename.jpg)
      constructedUrl = `${baseUrl}${url}`;
    } else if (url.startsWith('uploads/') || url.startsWith('photos/') || url.startsWith('static/')) {
      // URL starts with directory (e.g., uploads/filename.jpg)
      constructedUrl = `${baseUrl}/${url}`;
    } else {
      // Just filename (e.g., filename.jpg) - assume it's in uploads
      constructedUrl = `${baseUrl}/uploads/${url}`;
    }

    console.log('🖼️  Constructed image URL:', constructedUrl);
    return constructedUrl;
  };

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (!token || !userRole) {
      navigate('/login');
      return;
    }

    // Set profile data when user is loaded
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      });
    }
  }, [user, navigate]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validatePasswordForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!passwordData.current_password.trim()) {
      errors.current_password = 'Current password is required';
    }
    
    if (!passwordData.new_password.trim()) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'New password must be at least 8 characters long';
    }
    
    if (!passwordData.confirm_password.trim()) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    if (passwordData.current_password === passwordData.new_password) {
      errors.new_password = 'New password must be different from current password';
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
      
      // Call the backend API to change password
      await authService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      setPasswordSuccess(true);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setPasswordSuccess(false);
      }, 5000);
      
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorDetail = error.response.data?.detail || '';
        if (errorDetail.includes('Current password is incorrect')) {
          setPasswordErrors({ 
            current_password: 'Current password is incorrect' 
          });
        } else if (errorDetail.includes('New password must be at least 8 characters')) {
          setPasswordErrors({ 
            new_password: 'New password must be at least 8 characters long' 
          });
        } else if (errorDetail.includes('Current password is required')) {
          setPasswordErrors({ 
            current_password: 'Current password is required' 
          });
        } else if (errorDetail.includes('New password is required')) {
          setPasswordErrors({ 
            new_password: 'New password is required' 
          });
        } else {
          setPasswordErrors({ 
            general: errorDetail || 'Invalid request. Please check your input.' 
          });
        }
      } else if (error.response?.status === 422) {
        // Handle Pydantic validation errors
        const apiErrors: {[key: string]: string} = {};
        if (Array.isArray(error.response.data.detail)) {
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.loc.length > 1) {
              const field = err.loc[1];
              if (field === 'current_password') {
                apiErrors.current_password = err.msg;
              } else if (field === 'new_password') {
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
          general: 'User not found. Please try logging in again.' 
        });
      } else if (error.response?.status === 500) {
        setPasswordErrors({ 
          general: 'Server error. Please try again later.' 
        });
      } else {
        // Generic error message
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to change password. Please try again.';
        setPasswordErrors({ 
          general: errorMessage 
        });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  // Profile editing functions
  const handleProfileEdit = () => {
    setIsEditingProfile(true);
    setProfileData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || ''
    });
    setProfileErrors({});
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    setProfileData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || ''
    });
    setProfileErrors({});
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (profileErrors[name]) {
      setProfileErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfileForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!profileData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    
    if (!profileData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }

    try {
      setProfileLoading(true);
      setProfileSuccess(false);
      
      // Call the backend API to update profile
      console.log('🔄 Updating profile with data:', {
        first_name: profileData.first_name,
        last_name: profileData.last_name
      });
      
      await authService.updateUserProfile({
        first_name: profileData.first_name,
        last_name: profileData.last_name
      });
      
      console.log('✅ Profile updated successfully, refreshing user state...');
      
      // Force refresh of global user state from backend to ensure consistency
      await fetchCurrentUser();
      setProfileSuccess(true);
      setIsEditingProfile(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorDetail = error.response.data?.detail || '';
        setProfileErrors({ 
          general: errorDetail || 'Invalid request. Please check your input.' 
        });
      } else if (error.response?.status === 422) {
        const apiErrors: {[key: string]: string} = {};
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
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to update profile. Please try again.';
        setProfileErrors({ 
          general: errorMessage 
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Photo upload functions
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setProfileErrors({ general: 'Please select an image file' });
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setProfileErrors({ general: 'File size must be less than 5MB' });
        return;
      }
      
      setSelectedPhoto(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      
      // Clear any previous errors
      setProfileErrors({});
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;

    try {
      setPhotoUploading(true);
      
      console.log('🔄 Uploading profile photo...');
      const response = await authService.uploadProfilePhoto(selectedPhoto);
      console.log('✅ Photo uploaded successfully:', response);
      
      // Force refresh of global user state from backend to ensure consistency
      console.log('🔄 Refreshing user state after photo upload...');
      await fetchCurrentUser();
      
      setProfileSuccess(true);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload photo. Please try again.';
      setProfileErrors({ 
        general: errorMessage 
      });
    } finally {
      setPhotoUploading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'teacher': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  if (loading) {
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
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-900 text-lg mb-2">Unable to load profile</p>
          <p className="text-gray-600 text-sm mb-6">
            {'Please check your connection and try again'}
          </p>
          <div className="flex gap-3 justify-center cursor-pointer">
            <Button
              onClick={() => window.location.reload()}
              variant="success"
              size="md"
            >
              Retry
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="success"
              size="md"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-y-auto">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <IconButton
                onClick={() => navigate(-1)}
                icon={
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                }
                variant="ghost"
                size="lg"
                tooltip="Go Back"
              />
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-sm text-gray-600">Manage your account settings</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="danger"
              size="md"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              }
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with padding for fixed header */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 mt-20">
        {/* Profile Header Card */}
        <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Profile Photo Section */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-200 bg-gradient-to-br from-purple-100 to-blue-100">
                {photoPreview ? (
                  <img 
                    src={photoPreview}
                    alt="Profile Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : user.profile_picture_url && user.profile_picture_url.trim() !== '' ? (
                  <img 
                    src={getProfileImageUrl(user.profile_picture_url)}
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      console.log('🖼️  Profile image loaded successfully');
                    }}
                    onError={(e) => {
                      console.error('🖼️  Profile image failed to load:', e.currentTarget.src);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                
                {/* Default role icon */}
                <div className={`w-full h-full flex items-center justify-center text-5xl ${
                  (!user.profile_picture_url || user.profile_picture_url.trim() === '') && !photoPreview ? '' : 'hidden'
                }`}>
                  {getRoleIcon(user.role)}
                </div>
              </div>
              
              {/* Photo Upload Button */}
              <IconButton
                onClick={() => document.getElementById('photo-upload')?.click()}
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                variant="primary"
                size="lg"
                className="absolute -bottom-3 -right-3 shadow-xl border-2 border-white"
                tooltip="Upload Photo"
              />
              
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                {user.first_name || 'Not'} {user.last_name || 'Set'}
              </h2>
              <p className="text-xl text-gray-600 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

          {/* Photo Upload Section */}
          {selectedPhoto && (
            <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={photoPreview || ''} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-300"
                  />
                  <div>
                    <p className="text-gray-900 font-medium text-lg">{selectedPhoto.name}</p>
                    <p className="text-sm text-gray-600">
                      {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedPhoto(null);
                      setPhotoPreview(null);
                    }}
                    variant="secondary"
                    size="md"
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePhotoUpload}
                    variant="primary"
                    size="md"
                    loading={photoUploading}
                    className="px-6"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    }
                  >
                    Upload Photo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success/Error Messages */}
          {profileSuccess && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl backdrop-blur-sm">
              <p className="text-green-700 font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Profile updated successfully!
              </p>
            </div>
          )}
          
          {profileErrors.general && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl backdrop-blur-sm">
              <p className="text-red-700 font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {profileErrors.general}
              </p>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Personal Info & Account Status */}
          <div className="xl:col-span-2 space-y-8">
            {/* Personal Information Card */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Personal Information
                </h3>
                {!isEditingProfile && (
                  <Button
                    onClick={handleProfileEdit}
                    variant="primary"
                    size="md"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    }
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
              
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="First Name"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleProfileChange}
                      error={profileErrors.first_name}
                      placeholder="Enter first name"
                      fullWidth
                    />
                    
                    <Input
                      label="Last Name"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleProfileChange}
                      error={profileErrors.last_name}
                      placeholder="Enter last name"
                      fullWidth
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      variant="success"
                      size="lg"
                      loading={profileLoading}
                      className="px-8"
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      }
                    >
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      onClick={handleProfileCancel}
                      variant="secondary"
                      size="lg"
                      className="px-8"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <label className="text-sm text-gray-600 font-medium mb-2 block">First Name</label>
                      <p className="text-gray-900 font-semibold text-lg">{user.first_name || 'Not set'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <label className="text-sm text-gray-600 font-medium mb-2 block">Username</label>
                      <p className="text-gray-900 font-semibold text-lg">{user.username}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <label className="text-sm text-gray-600 font-medium mb-2 block">Last Name</label>
                      <p className="text-gray-900 font-semibold text-lg">{user.last_name || 'Not set'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <label className="text-sm text-gray-600 font-medium mb-2 block">Email</label>
                      <p className="text-gray-900 font-semibold text-lg">{user.username}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security Settings Card */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  Security Settings
                </h3>
                <Button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  variant={showPasswordForm ? "secondary" : "primary"}
                  size="md"
                  icon={
                    showPasswordForm ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )
                  }
                >
                  {showPasswordForm ? 'Cancel' : 'Change Password'}
                </Button>
              </div>

              {passwordSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl backdrop-blur-sm">
                  <p className="text-green-700 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Password changed successfully!
                  </p>
                </div>
              )}

              {showPasswordForm ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {passwordErrors.general && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                      <p className="text-red-700 text-sm">{passwordErrors.general}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    <Input
                      label="Current Password"
                      name="current_password"
                      type="password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      error={passwordErrors.current_password}
                      placeholder="Enter current password"
                      showPasswordToggle={true}
                      showPassword={showCurrentPassword}
                      onPasswordToggle={() => setShowCurrentPassword(!showCurrentPassword)}
                      fullWidth
                    />

                    <Input
                      label="New Password"
                      name="new_password"
                      type="password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      error={passwordErrors.new_password}
                      placeholder="Enter new password"
                      showPasswordToggle={true}
                      showPassword={showNewPassword}
                      onPasswordToggle={() => setShowNewPassword(!showNewPassword)}
                      fullWidth
                    />

                    <Input
                      label="Confirm New Password"
                      name="confirm_password"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      error={passwordErrors.confirm_password}
                      placeholder="Confirm new password"
                      showPasswordToggle={true}
                      showPassword={showConfirmPassword}
                      onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                      fullWidth
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      variant="secondary"
                      size="lg"
                      disabled={passwordLoading}
                      className="px-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="danger"
                      size="lg"
                      loading={passwordLoading}
                      className="px-8"
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      }
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200 backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">Password Security</h4>
                      <p className="text-gray-600 text-sm">Last updated: October 2024</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-6">
                    Keep your account secure by regularly updating your password. Use a strong password with a mix of letters, numbers, and symbols.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Your password is securely encrypted</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Account Status & Quick Actions */}
          <div className="space-y-8">
            {/* Account Status Card */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Account Status
              </h3>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <label className="text-sm text-gray-600 font-medium mb-2 block">Account Type</label>
                  <p className="text-gray-900 font-semibold text-lg">{getRoleDisplayName(user.role)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <label className="text-sm text-gray-600 font-medium mb-2 block">Account Status</label>
                  <p className="text-green-600 font-semibold text-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    Active
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <label className="text-sm text-gray-600 font-medium mb-2 block">Member Since</label>
                  <p className="text-gray-900 font-semibold text-lg">October 2024</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Quick Actions
              </h3>
              
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  className="justify-start py-4 px-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Download Account Data
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  className="justify-start py-4 px-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                >
                  Privacy Settings
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  className="justify-start py-4 px-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17h8l-2.586-2.586a2 2 0 00-2.828 0L4.828 17z" />
                    </svg>
                  }
                >
                  Notification Preferences
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;