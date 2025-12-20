import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
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
    setShowLoginLoading(true);

    try {
      console.log('Attempting login with:', { email, role });
    
      const token = await loginUser(email, password);
      
      console.log('Login successful, token received:', token ? 'Yes' : 'No');
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userRole', role.toLowerCase());
      
      const userId = role.toLowerCase() === 'student' ? '2' : 
                    role.toLowerCase() === 'teacher' ? '1' : '3';
      localStorage.setItem('userId', userId);
      
      console.log('Stored auth data, fetching user profile...');
      
      try {
        await fetchCurrentUser();
        console.log('User profile refreshed successfully');
      } catch (error) {
        console.error('Failed to fetch user profile after login:', error);
      }
      
      console.log('Redirecting to dashboard...');
      
      setTimeout(() => {
        switch (role.toLowerCase()) {
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
            navigate('/dashboard');
        }
      }, 1500);
      
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      setShowLoginLoading(false);

      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        setLoginError('Network error. Please check your internet connection and try again.');
      } else if (error.response?.status === 401 || error.response?.status === 404) {
        setLoginError('Invalid email/student number or password. Please check your credentials.');
      } else if (error.response?.status === 422) {
        setLoginError('Please fill in all required fields correctly.');
      } else {
        setLoginError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
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
                  {role} Login
                </h2>
                <p className="text-gray-300 text-sm">
                  Authenticating your credentials...
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
                  <span>Verifying credentials...</span>
                  <span className="font-medium">{role} Access</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { 
                    text: "Validation", 
                    icon: "✓",
                    desc: "Checking"
                  },
                  { 
                    text: "Security", 
                    icon: "🔒",
                    desc: "Verifying"
                  },
                  { 
                    text: "Access", 
                    icon: "🚪",
                    desc: "Granting"
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
                    Preparing your {role.toLowerCase()} dashboard...
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
        </div>
        <Input
          id="email-or-student-number"
          name="email"
          label={role === 'Student' ? 'Email Address' : 'Email Address'}
          type={role === 'Student' ? 'email' : 'email'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={role === 'Student' ? 'Enter your email address' : 'Enter your email address'}
          leftIcon={
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={role === 'Student' ? "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" : "M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"} />
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
          label={role === 'Student' ? 'Password' : 'Password'}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={role === 'Student' ? 'Enter your password' : 'Enter your password'}
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
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </div>
      </form>
    </>
  );
};

export default LoginForm;