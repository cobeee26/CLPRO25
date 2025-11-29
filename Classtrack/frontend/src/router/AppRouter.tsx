import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import TeacherDashboard from '../pages/TeacherDashboard';
import StudentDashboard from '../pages/StudentDashboard';
import SubmissionAssignment from '../pages/StudentAssignmentPage';
import SubmissionViewTeacher from '../pages/TeacherAssignmentPage';
import UsersPage from '../pages/UsersPage';
import ClassesPage from '../pages/ClassesPage';
import StudentClassesPage from '../pages/StudentClassesPage';
import ReportsPage from '../pages/ReportsPage';
import AssignmentPage from '../pages/AssignmentPage';
import SubmissionsViewPage from '../pages/SubmissionsViewPage';
import SchedulePage from '../pages/SchedulePage';
import ProfilePage from '../pages/ProfilePage';
import ProtectedRoute from '../components/ProtectedRoute';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/classes"
        element={
          <ProtectedRoute requiredRole="admin">
            <ClassesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedules"
        element={
          <ProtectedRoute requiredRole="admin">
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute requiredRole="admin">
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/assignments"
        element={
          <ProtectedRoute requiredRole="teacher">
            <AssignmentPage />
          </ProtectedRoute>
        }
      />
      {/* NEW: Teacher Assignment Management Page */}
      <Route
        path="/teacher/assignments/:assignmentId"
        element={
          <ProtectedRoute requiredRole="teacher">
            <SubmissionViewTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/assignments/:assignmentId/submissions"
        element={
          <ProtectedRoute requiredRole="teacher">
            <SubmissionsViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes"
        element={
          <ProtectedRoute requiredRole="teacher">
            <ClassesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/schedule"
        element={
          <ProtectedRoute requiredRole="teacher">
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/reports"
        element={
          <ProtectedRoute requiredRole="teacher">
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/classes"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentClassesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/assignments"
        element={
          <ProtectedRoute requiredRole="student">
            <AssignmentPage />
          </ProtectedRoute>
        }
      />
      {/* NEW: Student Assignment Submission Page */}
      <Route
        path="/student/assignments/:assignmentId"
        element={
          <ProtectedRoute requiredRole="student">
            <SubmissionAssignment />
          </ProtectedRoute>
        }
      />
      {/* NEW: Student Assignment Submit Page (Alias for consistency) */}
      <Route
        path="/student/assignments/:assignmentId/submit"
        element={
          <ProtectedRoute requiredRole="student">
            <SubmissionAssignment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/schedule"
        element={
          <ProtectedRoute requiredRole="student">
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/grades"
        element={
          <ProtectedRoute requiredRole="student">
            <SubmissionsViewPage />
          </ProtectedRoute>
        }
      />

      {/* Shared Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all route for 404 */}
      <Route path="*" element={<div>Page Not Found</div>} />
    </Routes>
  );
};

export default AppRouter;