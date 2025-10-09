import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import UsersPage from './pages/UsersPage'
import ClassesPage from './pages/ClassesPage'
import ReportsPage from './pages/ReportsPage'
import AssignmentPage from './pages/AssignmentPage'
import SubmissionsViewPage from './pages/SubmissionsViewPage'
import SchedulePage from './pages/SchedulePage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import { SystemStatusProvider } from './contexts/SystemStatusContext'
import { UserProvider } from './contexts/UserContext'
import './App.css'

function App() {
  return (
    <UserProvider>
      <SystemStatusProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute requiredRole="admin"><ClassesPage /></ProtectedRoute>} />
            <Route path="/admin/schedules" element={<ProtectedRoute requiredRole="admin"><SchedulePage /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><ReportsPage /></ProtectedRoute>} />
            <Route path="/teacher/dashboard" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute requiredRole="teacher"><AssignmentPage /></ProtectedRoute>} />
            <Route path="/teacher/assignments/:assignmentId/submissions" element={<ProtectedRoute requiredRole="teacher"><SubmissionsViewPage /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute requiredRole="teacher"><ClassesPage /></ProtectedRoute>} />
            <Route path="/teacher/schedule" element={<ProtectedRoute requiredRole="teacher"><SchedulePage /></ProtectedRoute>} />
            <Route path="/teacher/reports" element={<ProtectedRoute requiredRole="teacher"><ReportsPage /></ProtectedRoute>} />
            <Route path="/student/dashboard" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute requiredRole="student"><AssignmentPage /></ProtectedRoute>} />
            <Route path="/student/schedule" element={<ProtectedRoute requiredRole="student"><SchedulePage /></ProtectedRoute>} />
            <Route path="/student/grades" element={<ProtectedRoute requiredRole="student"><SubmissionsViewPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </SystemStatusProvider>
    </UserProvider>
  )
}

export default App
