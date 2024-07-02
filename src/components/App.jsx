import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import Dashboard from "../pages/Dashboard";
import VerifyEmail from "../pages/VerifyEmail";
import ForgotPassword from "../pages/ForgotPassword";
import ProfileHeader from "../pages/profile";
import MembersPage from "../pages/members";
import FotosPage from "../pages/fotos";
import MembroPage from "../pages/membro";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
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

          <Route
            path="/membro"
            element={
              <PrivateRoute>
                <MembroPage nome={"matheus"}/>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// function PrivateRoute({ children }) {
//   const { currentUser } = useAuth();

//   if (currentUser) {
//     return children;
//   } else {
//     return <Navigate to="/login" />;
//   }
// }

import React from 'react';


const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useAuth();

  if (!isAuthenticated) {
    // Redireciona para a página de login, mas preserva a localização atual para um possível redirecionamento de volta
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se autenticado, renderiza os filhos e repassa todas as props
  return React.cloneElement(children, { ...children.props, location });
};

export default App;
