import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, authService } from '../services/authService';
import { Button, Input } from './ui';
import { useUser } from '../contexts/UserContext';

interface LoginFormProps {
  onLoginSuccess?: (role: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = () => {
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginLoading, setShowLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const navigate = useNavigate();
  const { fetchCurrentUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!email.trim() || !password.trim()) {
      setLoginError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting login with:', { email, role });
      
      // Step Authenticate user and get token
      const token = await loginUser(email, password);
      
      if (!token) {
        throw new Error('Authentication failed: No token received');
      }
      
      console.log('Login successful, token received');
      
      // Store token
      localStorage.setItem('authToken', token);
      
      // Step Fetch user profile to get actual role
      try {
        // Try to get user profile using the authenticated token
        const profile = await authService.getUserProfile();
        console.log('User profile from backend:', profile);
        
        // Determine user's actual role from backend
        let actualRole = 'unknown';
        
        // Check role from different possible response structures
        if (profile.role) {
          actualRole = profile.role.toLowerCase();
        } else if (profile.role_type) {
          actualRole = profile.role_type.toLowerCase();
        } else if (profile.user_type) {
          actualRole = profile.user_type.toLowerCase();
        } else if (profile.user_role) {
          actualRole = profile.user_role.toLowerCase();
        }
        
        console.log('Actual user role from backend:', actualRole);
        console.log('Selected role on login form:', role.toLowerCase());
        
        // Step Validate role match - STRICT VALIDATION
        const selectedRole = role.toLowerCase();
        
        // Admin validation: Only users with actual role 'admin' can select admin
        if (selectedRole === 'admin' && actualRole !== 'admin') {
          // User selected admin but is not actually an admin
          console.log('Role mismatch: User selected admin but actual role is', actualRole);
          setLoginError(`You are not authorized as an administrator. Your account is registered as ${actualRole}. Please select the correct role.`);
          setIsLoading(false);
          
          // Clear stored token
          localStorage.removeItem('authToken');
          return;
        }
        
        // Student validation: Only users with actual role 'student' can select student
        if (selectedRole === 'student' && actualRole !== 'student') {
          console.log('Role mismatch: User selected student but actual role is', actualRole);
          setLoginError(`You are not registered as a student. Your account is registered as ${actualRole}. Please select the correct role.`);
          setIsLoading(false);
          localStorage.removeItem('authToken');
          return;
        }
        
        // Teacher validation: Only users with actual role 'teacher' can select teacher
        if (selectedRole === 'teacher' && actualRole !== 'teacher') {
          console.log('Role mismatch: User selected teacher but actual role is', actualRole);
          setLoginError(`You are not registered as a teacher. Your account is registered as ${actualRole}. Please select the correct role.`);
          setIsLoading(false);
          localStorage.removeItem('authToken');
          return;
        }
        
        // Step Role validation passed - show loading animation
        setShowLoginLoading(true);
        
        // Step Store user data
        localStorage.setItem('userRole', actualRole);
        localStorage.setItem('userId', profile.id?.toString() || 
          (actualRole === 'student' ? '2' : 
           actualRole === 'teacher' ? '1' : '3'));
        
        // Store full user profile
        localStorage.setItem('userProfile', JSON.stringify(profile));
        
        // Fetch current user context
        try {
          await fetchCurrentUser();
          console.log('User profile refreshed successfully');
        } catch (error) {
          console.error('Failed to fetch user profile after login:', error);
        }
        
        // Redirect based on actual role
        console.log(`✅ Role validation passed! Redirecting to ${actualRole} dashboard...`);
        
        setTimeout(() => {
          switch (actualRole) {
            case 'admin':
              navigate('/admin/dashboard');
              break;
            case 'teacher':
              navigate('/teacher/dashboard');
              break;
            case 'student':
              navigate('/student/dashboard');
              break;
            default:
              // Unknown role - redirect to generic dashboard
              navigate('/dashboard');
          }
        }, 1500);
        
      } catch (profileError: any) {
        console.error('Failed to fetch user profile:', profileError);
        
        // If we can't get profile, we can't validate role - show error
        setLoginError('Unable to verify your account role. Please contact support.');
        setIsLoading(false);
        localStorage.removeItem('authToken');
        return;
      }
      
    } catch (error: any) {
      console.error('Login failed:', error);
      
      setShowLoginLoading(false);
      setIsLoading(false);

      // Handle specific error cases
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        setLoginError('Network error. Please check your internet connection and try again.');
      } else if (error.response?.status === 401 || error.response?.status === 404) {
        setLoginError('Invalid email or password. Please check your credentials.');
      } else if (error.response?.status === 422) {
        setLoginError('Please fill in all required fields correctly.');
      } else if (error.message.includes('Authentication failed')) {
        setLoginError('Authentication failed. Please check your credentials.');
      } else if (error.message.includes('not authorized') || error.message.includes('not registered')) {
        // Role mismatch error from our validation above
        setLoginError(error.message);
      } else {
        setLoginError('Login failed. Please check your credentials and try again.');
      }
      
      // Clear token on any error
      localStorage.removeItem('authToken');
    }
  };

  return (
    <>
      {showLoginLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
            <div className="relative bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-6 border-b border-slate-700/50">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-full blur-lg animate-pulse"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
                  <div className="absolute inset-4 border-4 border-white/30 rounded-full animate-ping"></div>
                  <div className="relative text-4xl">
                    {role === 'Student' ? '🎓' : 
                    role === 'Teacher' ? '👨‍🏫' : '⚙️'}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {role} Login Successful
                </h2>
                <p className="text-gray-300 text-sm">
                  Redirecting to {role.toLowerCase()} dashboard...
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex justify-center space-x-2 mb-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 bg-green-500 rounded-full animate-bounce"
                      style={{ 
                        animationDelay: `${i * 150}ms`,
                        animationDuration: '1s',
                        animationIterationCount: 'infinite'
                      }}
                    ></div>
                  ))}
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #10B981 0%, #059669 50%, #10B981 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'slide 2s ease-in-out infinite',
                      width: '100%'
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Role validation successful</span>
                  <span className="font-medium">{role} Dashboard</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { 
                    text: "Authentication", 
                    icon: "✓",
                    desc: "Verified"
                  },
                  { 
                    text: "Role Check", 
                    icon: "👑",
                    desc: "Confirmed"
                  },
                  { 
                    text: "Access", 
                    icon: "🚪",
                    desc: "Granted"
                  },
                ].map((step, index) => (
                  <div
                    key={index}
                    className="relative p-3 rounded-xl text-center bg-slate-800/60 border border-slate-700"
                  >
                    <div className="text-xl mb-1">{step.icon}</div>
                    <div className="font-semibold text-sm text-white mb-1">{step.text}</div>
                    <div className="text-xs text-gray-400">{step.desc}</div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
              <div className="text-center bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-700">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-gray-300 font-medium">
                    Welcome! Loading your {role.toLowerCase()} interface...
                  </p>
                  <div className="flex space-x-1">
                    <span 
                      className="text-gray-500"
                      style={{
                        animation: 'pulse 1s ease-in-out infinite'
                      }}
                    >.</span>
                    <span 
                      className="text-gray-500"
                      style={{
                        animation: 'pulse 1s ease-in-out infinite 0.3s'
                      }}
                    >.</span>
                    <span 
                      className="text-gray-500"
                      style={{
                        animation: 'pulse 1s ease-in-out infinite 0.6s'
                      }}
                    >.</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  This should only take a few seconds...
                </p>
              </div>
            </div>
            <style>{`
              @keyframes slide {
                0% {
                  background-position: 0% 50%;
                }
                50% {
                  background-position: 100% 50%;
                }
                100% {
                  background-position: 0% 50%;
                }
              }
              
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.5;
                }
              }
            `}</style>
          </div>
        </div>
      )}
      {loginError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-red-300">Login Error</p>
              <p className="text-xs text-red-200/80">{loginError}</p>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="role" className="block text-sm font-semibold text-slate-200 mb-3">
            Select Your Role
          </label>
          <div className="relative">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/80 text-white border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer hover:bg-slate-700/90 disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isLoading}
            >
              <option value="Student">🎓 Student</option>
              <option value="Teacher">👨‍🏫 Teacher</option>
              <option value="Admin">⚙️ Admin</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Please select the role that matches your account type
          </p>
        </div>
        <Input
          id="email-or-student-number"
          name="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          leftIcon={
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          required
          disabled={isLoading}
          fullWidth
          size="lg"
        />
        <Input
          id="password-or-pin"
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          leftIcon={
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          required
          disabled={isLoading}
          fullWidth
          size="lg"
        />
        <div className="pt-4">
          <Button 
            type="submit" 
            variant="success"
            size="xl"
            fullWidth
            loading={isLoading}
            icon={
              isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              )
            }
            className="transform hover:scale-[1.02] hover:shadow-xl cursor-pointer transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Sign In'}
          </Button>
        </div>
      </form>
    </>
  );
};

export default LoginForm;