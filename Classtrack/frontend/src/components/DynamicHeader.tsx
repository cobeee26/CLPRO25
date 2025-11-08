import React from 'react';
import { Link } from 'react-router-dom';
import plmunLogo from "../assets/images/PLMUNLOGO.png";
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { useUser } from '../contexts/UserContext';
import { Button } from './ui';

interface DynamicHeaderProps {
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
  showMenuToggle?: boolean;
}

const DynamicHeader: React.FC<DynamicHeaderProps> = ({ 
  title, 
  subtitle, 
  showBackButton = false,
  backTo = "/admin/dashboard", 
  backLabel = "Back to Dashboard",
  onMenuToggle,
  sidebarOpen = false,
  showMenuToggle = false
}) => {
  const { isSystemActive, lastUpdate } = useSystemStatus();
  const { user } = useUser();

  const getStatusText = () => {
    return isSystemActive ? "System Active" : "System Inactive";
  };

  const getStatusColor = () => {
    return isSystemActive ? "emerald" : "red";
  };

  const getTimeAgo = () => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Get role-specific user display information
  const getUserDisplayInfo = () => {
    if (!user) {
      return {
        name: 'User',
        role: 'User',
        avatar: 'U',
        avatarGradient: 'from-gray-500 to-gray-600'
      };
    }

    const fullName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}` 
      : user.username || 'User';

    switch (user.role) {
      case 'admin':
        return {
          name: 'Admin User',
          role: 'Administrator',
          avatar: 'A',
          avatarGradient: 'from-purple-500 to-pink-500'
        };
      case 'teacher':
        return {
          name: fullName,
          role: 'Teacher',
          avatar: 'T',
          avatarGradient: 'from-red-500 to-red-600'
        };
      case 'student':
        return {
          name: fullName,
          role: 'Student',
          avatar: 'S',
          avatarGradient: 'from-blue-500 to-blue-600'
        };
      default:
        return {
          name: fullName,
          role: 'User',
          avatar: 'U',
          avatarGradient: 'from-gray-500 to-gray-600'
        };
    }
  };

  const userInfo = getUserDisplayInfo();

  return (
    <header className="w-full bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-2xl sticky top-0 z-40 h-16 lg:h-20">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 h-full">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-3 lg:py-4 space-y-2 lg:space-y-0 h-full">
          {/* Left Section - Hamburger Menu, Logo and Title */}
          <div className="flex items-center space-x-3 lg:space-x-4">
            {/* Hamburger Menu Button for Mobile */}
            {showMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 border border-white/20"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? (
                  // Close icon (X)
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  // Menu icon (Hamburger)
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}

            <div className="relative group/logo">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl lg:rounded-2xl blur-lg opacity-30 group-hover/logo:opacity-50 transition-opacity duration-300"></div>
              <img src={plmunLogo} alt="PLMUN Logo" className="relative h-8 w-auto sm:h-10 lg:h-12 group-hover/logo:scale-105 transition-transform duration-300" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-blue-200/80 text-xs sm:text-sm lg:text-base font-medium">{subtitle}</p>
            </div>
          </div>

          {/* Right Section - Dynamic Status and User Profile */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            {/* Dynamic Status Indicator */}
            <div className={`flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 border border-white/20 transition-all duration-300`}>
              <div className="relative">
                <div className={`w-2 h-2 bg-${getStatusColor()}-400 rounded-full ${isSystemActive ? 'animate-pulse' : 'animate-pulse'}`}></div>
                {isSystemActive && (
                  <div className={`absolute inset-0 w-2 h-2 bg-${getStatusColor()}-400 rounded-full animate-ping opacity-75`}></div>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm text-${getStatusColor()}-300 font-medium`}>
                  {getStatusText()}
                </span>
                <span className="text-xs text-white/50">
                  {getTimeAgo()}
                </span>
              </div>
            </div>
            
            {/* Enhanced User Profile - Role-based display */}
            <div className="flex items-center space-x-3 lg:space-x-4 bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
              <div className="text-right space-y-1">
                <p className="text-sm lg:text-base font-semibold text-white group-hover:text-blue-100 transition-colors">{userInfo.name}</p>
                <p className="text-xs lg:text-sm text-blue-200/70 group-hover:text-blue-200/90 transition-colors">{userInfo.role}</p>
              </div>
              <div className="relative group/avatar">
                <div className={`absolute inset-0 bg-gradient-to-r ${userInfo.avatarGradient} rounded-full blur-md opacity-50 group-hover/avatar:opacity-75 transition-opacity duration-300`}></div>
                <div className={`relative h-8 w-8 lg:h-10 lg:w-10 bg-gradient-to-r ${userInfo.avatarGradient} rounded-full flex items-center justify-center shadow-xl group-hover/avatar:shadow-2xl transition-all duration-300 group-hover/avatar:scale-105`}>
                  <span className="text-white font-bold text-sm lg:text-base">{userInfo.avatar}</span>
                </div>
                {/* Dynamic status indicator */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-${getStatusColor()}-400 rounded-full border-2 border-slate-900 ${isSystemActive ? 'animate-pulse' : 'animate-pulse'}`}></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default DynamicHeader;