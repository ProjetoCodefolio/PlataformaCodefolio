import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext"; // Usando o contexto de autenticação
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import Dashboard from "../pages/Dashboard";
import VerifyEmail from "../pages/VerifyEmail";
import ForgotPassword from "../pages/ForgotPassword";
import ProfileHeader from "../pages/profile";
import MembersPage from "../pages/members";
import FotosPage from "../pages/fotos";
import MembroPage from "../pages/membro";
import Portifolios from "../pages/portifolios";
import Projetos from '../pages/projetos';
import InitialPage from '../pages/InitialPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<InitialPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfileHeader />
              </PrivateRoute>
            }
          />
          <Route
            path="/members"
            element={
              <PrivateRoute>
                <MembersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/fotos"
            element={
              <PrivateRoute>
                <FotosPage />
              </PrivateRoute>
            }
          />
          <Route path="/membro" element={
            <PrivateRoute>
              <MembroPage />
            </PrivateRoute>
          } />
          <Route
            path='/portifolios'
            element={
              <PrivateRoute>
                <Portifolios />
              </PrivateRoute>
            }
          />
          <Route
            path='/projetos'
            element={
              <PrivateRoute>
                <Projetos />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return children;
}

export default App;
