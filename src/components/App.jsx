import React from "react";
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
import Dashboard2 from "../pages/Dashboard";
import Dashboard from "../pages/dashboard";
import VerifyEmail from "../pages/VerifyEmail";
import ForgotPassword from "../pages/ForgotPassword";
import ProfileHeader from "../pages/profile";
import MembersPage from "../pages/members";
import FotosPage from "../pages/fotos";
import MembroPage from "../pages/membro";
import Portifolios from "../pages/portifolios";
import Projetos from "../pages/projetos";
import InitialPage from "../pages/InitialPage";
import InitiativesPage from "../pages/InitiativesPage";
import HomePage from "../pages/homePage";
import Cursos from "../pages/course/adminCourse";
import ListCursos from "../pages/course/list";
import Classes from "../pages/course/classes";
import ManageMyCourses from "../pages/course/ManageMyCourses";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


function App() {
  return (
    <>
      <ToastContainer />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/iniciativas" element={<InitiativesPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/dashboard1"
              element={
                <PrivateRoute>
                  <Dashboard2 />
                </PrivateRoute>
              }
            />
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
                  <MembroPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/portifolios"
              element={
                <PrivateRoute>
                  <Portifolios />
                </PrivateRoute>
              }
            />
            <Route
              path="/projetos"
              element={
                <PrivateRoute>
                  <Projetos />
                </PrivateRoute>
              }
            />
            <Route
              path="/adm-cursos"
              element={
                <AdminRoute>
                  <Cursos />
                </AdminRoute>
              }
            />
            <Route
              path="/listcurso"
              element={
                <PrivateRoute>
                  <ListCursos />
                </PrivateRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <PrivateRoute>
                  <Classes />
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-courses"
              element={
                <PrivateRoute>
                  <ManageMyCourses />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </>
  );
}

// Protege rotas privadas, exigindo autenticação
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return children;
}

// Protege rotas de administrador, exigindo autenticação e permissão de admin
function AdminRoute({ children }) {
  const { currentUser, userDetails } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  if (userDetails?.role !== "admin") {
    return <Navigate to="/dashboard" state={{ from: location }} />;
  }

  return children;
}

export default App;
