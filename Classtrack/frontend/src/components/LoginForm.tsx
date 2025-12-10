import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { Button, Input } from './ui';
import { useUser } from '../contexts/UserContext';

interface LoginFormProps {
  onLoginSuccess?: (message: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { fetchCurrentUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { email, role });
      
      // Use the loginUser function directly
      const token = await loginUser(email, password);
      
      console.log('Login successful, token received:', token ? 'Yes' : 'No');
      
      // Store authentication data in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('userRole', role.toLowerCase());
      
      // Store user ID based on role (these match our test data)
      const userId = role.toLowerCase() === 'student' ? '2' : 
                    role.toLowerCase() === 'teacher' ? '1' : '3';
      localStorage.setItem('userId', userId);
      
      console.log('Stored auth data, fetching user profile...');
      
      // Show success message
      if (onLoginSuccess) {
        const roleDisplay = role === 'Student' ? '🎓 Student' : 
                          role === 'Teacher' ? '👨‍🏫 Teacher' : '⚙️ Admin';
        onLoginSuccess(`Welcome back! You have successfully logged in as ${roleDisplay}.`);
      }
      
      // Fetch user profile immediately after login to ensure fresh data
      try {
        await fetchCurrentUser();
        console.log('User profile refreshed successfully');
      } catch (error) {
        console.error('Failed to fetch user profile after login:', error);
        // Continue with navigation even if profile fetch fails
      }
      
      console.log('Redirecting to dashboard...');
      
      // Small delay to show the success message before redirecting
      setTimeout(() => {
        // Role-based redirection (role is used only for frontend navigation)
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
      }, 1000);
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      
      {/* Role Selection */}
      <div className="space-y-2">
        <label htmlFor="role" className="block text-sm font-semibold text-slate-200 mb-3">
          Select Your Role
        </label>
        <div className="relative">
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/80 text-white border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer hover:bg-slate-700/90"
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
      
      {/* Email/Student Number Field */}
      <Input
        id="email-or-student-number"
        name="email"
        label={role === 'Student' ? 'Student Number' : 'Email Address'}
        type={role === 'Student' ? 'text' : 'email'}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={role === 'Student' ? 'Enter your email adddress' : 'Enter your email address'}
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
      
      {/* Password/PIN Field */}
      <Input
        id="password-or-pin"
        name="password"
        label={role === 'Student' ? 'PIN' : 'Password'}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={role === 'Student' ? 'Enter your PIN' : 'Enter your password'}
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
      
      {/* Sign In Button */}
      <div className="pt-4">
        <Button 
          type="submit" 
          variant="success"
          size="xl"
          fullWidth
          loading={isLoading}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          }
          className="transform hover:scale-[1.02] hover:shadow-xl cursor-pointer"
        >
          Sign In
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;