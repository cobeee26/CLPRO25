import React from 'react';
import LoginForm from '../components/LoginForm';
import loginBg from '../assets/images/PLMUNBG.jpg?url';
import plmunLogo from '../assets/images/PLMUNlogo.png?url';

const LoginPage: React.FC = () => {
  return (
    <div 
      className="h-screen relative bg-slate-900 overflow-y-auto"
      role="main"
      aria-label="PLMUN Login Page"
      style={{ 
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%'
      }}
    >
      {/* Light gradient overlay for better text readability */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60"
        aria-hidden="true"
      ></div>
      
      {/* Minimal texture overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent"
        aria-hidden="true"
      ></div>
      
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-20 -right-20 w-40 h-40 sm:-top-40 sm:-right-40 sm:w-80 sm:h-80 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:-bottom-40 sm:-left-40 sm:w-80 sm:h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-64 sm:h-64 bg-purple-500/3 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      {/* Main content container */}
      <div className="relative z-10 h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 py-12">
        {/* Modern login card */}
        <div 
          className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10 md:p-12 border border-slate-700/30 transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]"
          role="region"
          aria-labelledby="login-heading"
          aria-describedby="login-description"
          aria-label="PLMun Login Form"
        >
          {/* Clean logo section */}
          <header className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/15 rounded-full blur-xl scale-110"></div>
              <img 
                src={plmunLogo} 
                alt="Pamantasan ng Lungsod ng Muntinlupa Official Logo" 
                className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain drop-shadow-2xl"
                role="img"
                aria-label="PLMUN University Logo"
              />
            </div>
          </header>
          
          {/* Clean welcome section */}
          <section className="text-center mb-10">
            <div className="mb-6">
              <h1 
                id="login-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight"
              >
                Welcome to PLMun
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-red-600 to-red-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-2">
              <p 
                id="login-description"
                className="text-lg sm:text-xl text-slate-200 font-medium leading-relaxed"
              >
                Pamantasan ng Lungsod ng Muntinlupa
              </p>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Student Information Management System
              </p>
            </div>
          </section>
          
          {/* Form section */}
          <section 
            role="form"
            aria-label="User Authentication Form"
            className="mb-8"
          >
            <LoginForm />
          </section>
          
          {/* Clean footer */}
          <footer className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Secure Connection</span>
            </div>
            <div className="border-t border-slate-700 pt-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                © 2024 Pamantasan ng Lungsod ng Muntinlupa. All rights reserved.
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Student Information Management System
              </p>
            </div>
          </footer>
        </div>
      </div>
      
      {/* Accessibility skip link */}
      <a 
        href="#login-heading" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-red-600 text-white px-4 py-2 rounded-xl z-50 shadow-lg hover:bg-red-700 transition-colors"
        aria-label="Skip to main login form"
      >
        Skip to Login Form
      </a>
    </div>
  );
};

export default LoginPage;