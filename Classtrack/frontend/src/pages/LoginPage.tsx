import React from "react";
import LoginForm from "../components/LoginForm";
import loginBg from "../assets/images/PLMUNBG.jpg";
import plmunLogo from "../assets/images/PLMUNlogo.png";

const LoginPage: React.FC = () => {
  return (
    <div
      className="relative flex items-center justify-center min-h-screen w-full overflow-hidden"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-900/70"
        aria-hidden="true"
      ></div>

      {/* Subtle Animated Lights */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-64 sm:h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-64 sm:h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 py-8 sm:px-6 md:px-8">
        <div
          className="w-full max-w-sm sm:max-w-md bg-slate-800/85 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-700/30 transition-all duration-300 hover:shadow-2xl"
          role="region"
          aria-labelledby="login-heading"
          aria-describedby="login-description"
        >
          {/* Logo */}
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

          {/* Title */}
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

          {/* Form */}
          <section
            role="form"
            aria-label="User Authentication Form"
            className="mb-6"
          >
            <LoginForm />
          </section>

          {/* Footer */}
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

      {/* Skip link (Accessibility) */}
      <a
        href="#login-heading"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-red-600 text-white px-4 py-2 rounded-xl z-50 shadow-lg hover:bg-red-700 transition-colors"
      >
        Skip to Login Form
      </a>
    </div>
  );
};

export default LoginPage;