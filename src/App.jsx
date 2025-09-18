import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./app/context/AuthContext";
import Login from "./app/pages/Login";
import Dashboard from "./app/pages/dashboard";
import ProfileHeader from "./app/pages/profile";
// import MembersPage from "./app/pages/members";
import Portifolios from "./app/pages/portifolios";
import Projetos from "./app/pages/projetos";
import HomePage from "./app/pages/homePage";
import Cursos from "./app/pages/course/adminCourse";
import GradeAssignmentPage from "./app/pages/course/adminCourse/GradeAssignment";
import ListCursos from "./app/pages/course/list";
import Classes from "./app/pages/course/classes";
import StudentDashboard from "./app/pages/course/studentDashboard";
import ManageMyCourses from "./app/pages/course/ManageMyCourses";
import AdminPanel from "$pages/adminPowers/adminPanel";
import AdminUsers from "$pages/adminPowers/adminUsers";
import AdminCourses from "$pages/adminPowers/adminCourses";
import NotFound from "$pages/NotFound";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import MyAssessmentsPage from "./app/pages/course/MyAssessmentsPage"; // <-- adicionado

function App() {
  return (
    <>
      <ToastContainer />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<HomePage />} />

            <Route
              path="/dashboard"
              element={
                // <PrivateRoute>
                <Dashboard />
                // </PrivateRoute>
              }
            />

            {/* Rota para Minhas Avaliações (usuário logado) */}
            <Route
              path="/minhas-avaliacoes"
              element={
                <PrivateRoute>
                  <MyAssessmentsPage />
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
            {/*
            <Route
              path="/members"
              element={
                <PrivateRoute>
                  <MembersPage />
                </PrivateRoute>
              }
            />
            */}

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
                <PrivateRoute>
                  <TeacherRoute>
                    <Cursos />
                  </TeacherRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/studentDashboard"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <StudentDashboard />
                  </TeacherRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/listcurso"
              element={
                // <PrivateRoute >
                <ListCursos />
                // </PrivateRoute >
              }
            />

            <Route
              path="/classes"
              element={
                // <PrivateRoute >
                <Classes />
                // </PrivateRoute >
              }
            />

            <Route
              path="/course/grade-assignment"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <GradeAssignmentPage />
                  </TeacherRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/manage-courses"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <ManageMyCourses />
                  </TeacherRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin-panel"
              element={
                <PrivateRoute>
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin-users"
              element={
                <PrivateRoute>
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin-courses"
              element={
                <PrivateRoute>
                  <AdminRoute>
                    <AdminCourses />
                  </AdminRoute>
                </PrivateRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
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

// Protege rotas de professor, exigindo autenticação e permissão de teacher
function TeacherRoute({ children }) {
  const { currentUser, userDetails } = useAuth();
  const location = useLocation();

  console.log("UserDetails:", userDetails)

  // Verifica se o usuário é admin ou teacher, ou se possui cursos no objeto coursesTeacher
  const isAdmin = userDetails?.role === "admin";
  const isTeacher =
    userDetails?.role === "teacher" || Object.keys(userDetails?.coursesTeacher || {}).length > 0;

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  // Permite acesso se o usuário for admin, teacher ou tiver cursos em coursesTeacher
  return teacherPermissions(children, isAdmin, isTeacher);
}

// Protege rotas de administrador, exigindo autenticação e permissão de admin
function AdminRoute({ children }) {
  const { currentUser, userDetails } = useAuth();
  const location = useLocation();

  const isAdmin = userDetails?.role === "admin";

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return adminPermissions(children, isAdmin);
}

const teacherPermissions = (children, isAdmin, isTeacher) => {
  const location = useLocation();

  if (!isTeacher && !isAdmin) {
    return <Navigate to="/dashboard" state={{ from: location }} />;
  }

  return children;
};

const adminPermissions = (children, isAdmin) => {
  const { currentUser, userDetails } = useAuth();
  const location = useLocation();

  if (!isAdmin) {
    return <Navigate to="/dashboard" state={{ from: location }} />;
  }

  return children;
};

export default App;
