import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Discover from './pages/Discover';
import QueueStatus from './pages/QueueStatus';
import OwnerLayout from './pages/owner/OwnerLayout';
import OwnerQueue from './pages/owner/OwnerQueue';
import OwnerAnalytics from './pages/owner/OwnerAnalytics';
import OwnerFeedback from './pages/owner/OwnerFeedback';
import OwnerSettings from './pages/owner/OwnerSettings';
import JoinQueue from './pages/JoinQueue';
import BusinessDetail from './pages/BusinessDetail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join/:businessId" element={<JoinQueue />} />
          
          <Route path="/discover" element={<Navigate to="/discover/all" replace />} />
          <Route 
            path="/discover/:category" 
            element={
              <PrivateRoute>
                <Discover />
              </PrivateRoute>
            } 
          />

          <Route 
            path="/business/:id" 
            element={
              <PrivateRoute>
                <BusinessDetail />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/queue-status/:businessId" 
            element={
              <PrivateRoute>
                <QueueStatus />
              </PrivateRoute>
            } 
          />

          {/* Backward compatibility redirect */}
          <Route path="/owner-dashboard" element={<Navigate to="/owner/dashboard/queue" replace />} />
          
          {/* Owner Nested Dashboard Routes */}
          <Route 
            path="/owner/dashboard" 
            element={
              <PrivateRoute>
                <OwnerLayout />
              </PrivateRoute>
            } 
          >
            <Route index element={<Navigate to="/owner/dashboard/queue" replace />} />
            <Route path="queue" element={<OwnerQueue />} />
            <Route path="analytics" element={<OwnerAnalytics />} />
            <Route path="feedback" element={<OwnerFeedback />} />
            <Route path="settings" element={<OwnerSettings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
