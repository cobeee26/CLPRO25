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
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-white text-lg mb-2">Unable to load profile</p>
          <p className="text-slate-400 text-sm mb-6">
            {'Please check your connection and try again'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              size="md"
            >
              Retry
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Header */}
      <header className="bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
            <IconButton
              onClick={() => navigate(-1)}
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <h1 className="text-2xl font-bold text-white">My Profile</h1>
                <p className="text-sm text-slate-300">Manage your account settings</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="secondary"
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Profile Information Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-6 mb-8">
            {/* Profile Photo Section */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-600">
                {/* Show photo preview if uploading */}
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
                      // Fallback to role icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                
                {/* Default role icon - shown when no photo or photo fails to load */}
                <div className={`w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-4xl ${
                  (!user.profile_picture_url || user.profile_picture_url.trim() === '') && !photoPreview ? '' : 'hidden'
                }`}>
                  {getRoleIcon(user.role)}
                </div>
              </div>
              
              {/* Photo Upload Button */}
              <IconButton
                onClick={() => document.getElementById('photo-upload')?.click()}
                icon={
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                variant="primary"
                size="md"
                className="absolute -bottom-2 -right-2 shadow-lg"
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
            
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-lg text-slate-300 mb-1">{user.username}</p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full border border-purple-500/30">
                  {getRoleDisplayName(user.role)}
                </span>
                <span className="px-3 py-1 bg-slate-600/20 text-slate-400 text-sm rounded-full border border-slate-600/30">
                  ID: {user.id}
                </span>
              </div>
            </div>
          </div>

          {/* Photo Upload Section */}
          {selectedPhoto && (
            <div className="mb-6 p-4 bg-slate-700/60 rounded-xl border border-slate-600/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={photoPreview || ''} 
                    alt="Preview" 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-white font-medium">{selectedPhoto.name}</p>
                    <p className="text-sm text-slate-400">
                      {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedPhoto(null);
                      setPhotoPreview(null);
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePhotoUpload}
                    variant="primary"
                    size="sm"
                    loading={photoUploading}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
              <p className="text-green-400 font-medium">Profile updated successfully!</p>
            </div>
          )}
          
          {profileErrors.general && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-400 font-medium">{profileErrors.general}</p>
            </div>
          )}

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-700/60 rounded-xl p-6 border border-slate-600/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Personal Information
                </h3>
                {!isEditingProfile && (
                  <Button
                    onClick={handleProfileEdit}
                    variant="primary"
                    size="sm"
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    }
                  >
                    Edit
                  </Button>
                )}
              </div>
              
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
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
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="success"
                      size="md"
                      loading={profileLoading}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      }
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      onClick={handleProfileCancel}
                      variant="secondary"
                      size="md"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400">First Name</label>
                    <p className="text-white font-medium">{user.first_name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Last Name</label>
                    <p className="text-white font-medium">{user.last_name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Username</label>
                    <p className="text-white font-medium">{user.username}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-700/60 rounded-xl p-6 border border-slate-600/40">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Account Status
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400">Account Type</label>
                  <p className="text-white font-medium">{getRoleDisplayName(user.role)}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Account Status</label>
                  <p className="text-green-400 font-medium flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Active
                  </p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Member Since</label>
                  <p className="text-white font-medium">October 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              Security Settings
            </h3>
            <Button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              variant="secondary"
              size="md"
              icon={
                showPasswordForm ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              }
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </Button>
          </div>

          {passwordSuccess && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Password changed successfully!
              </p>
            </div>
          )}

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              {/* General Error Message */}
              {passwordErrors.general && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{passwordErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="md:col-span-2">
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
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-700">
                <Button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  variant="secondary"
                  size="lg"
                  disabled={passwordLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="lg"
                  loading={passwordLoading}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                >
                  Update Password
                </Button>
              </div>
            </form>
          )}

          {!showPasswordForm && (
            <div className="bg-slate-700/60 rounded-xl p-6 border border-slate-600/40">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="font-semibold text-white">Password Security</h4>
              </div>
              <p className="text-sm text-slate-300 mb-4">
                Keep your account secure by regularly updating your password. Use a strong password with a mix of letters, numbers, and symbols.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Last updated: October 2024</span>
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Additional Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-700/60 rounded-xl p-6 border border-slate-600/40">
              <h4 className="font-semibold text-white mb-4">System Information</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400">User ID</label>
                  <p className="text-white font-medium">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Account Role</label>
                  <p className="text-white font-medium">{getRoleDisplayName(user.role)}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Profile Status</label>
                  <p className="text-green-400 font-medium">Complete</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-700/60 rounded-xl p-6 border border-slate-600/40">
              <h4 className="font-semibold text-white mb-4">Account Actions</h4>
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  className="justify-start"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Download Account Data
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  className="justify-start"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                >
                  Privacy Settings
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  className="justify-start"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
