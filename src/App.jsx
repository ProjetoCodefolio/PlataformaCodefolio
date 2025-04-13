import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getDatabase, ref, get } from "firebase/database";
import Login from "./pages/Login";
import Dashboard from "./pages/dashboard";
import ProfileHeader from "./pages/profile";
import MembersPage from "./pages/members";
import Portifolios from "./pages/portifolios";
import Projetos from "./pages/projetos";
import HomePage from "./pages/homePage";
import Cursos from "./pages/course/adminCourse";
import ListCursos from "./pages/course/list";
import Classes from "./pages/course/classes";
import StudentDashboard from "./pages/course/studentDashboard";
import ManageMyCourses from "./pages/course/ManageMyCourses";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
                <CourseManagerRoute>
                  <Cursos />
                </CourseManagerRoute>
              }
            />

            <Route
              path="/studentDashboard"
              element={
                <AdminRoute>
                  <StudentDashboard />
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

  // if (!currentUser) {
  //   return <Navigate to="/login" state={{ from: location }} />;
  // }

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

// Nova rota que gerencia permissões para a página de cursos
function CourseManagerRoute({ children }) {
  const { currentUser, userDetails } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const courseId = searchParams.get("courseId");

  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUser) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Caso 1: Usuário é admin - acesso total
      if (userDetails?.role === "admin") {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Caso 2: Não é admin mas tem courseId na URL - verificar se é professor deste curso
      if (courseId) {
        try {
          const db = getDatabase();
          const teacherRef = ref(db, `users/${currentUser.uid}/coursesTeacher/${courseId}`);
          const snapshot = await get(teacherRef);

          // Se o usuário é professor deste curso específico
          if (snapshot.exists() && snapshot.val() === true) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
        } catch (error) {
          console.error("Erro ao verificar permissão:", error);
          setHasAccess(false);
        }
      }
      // Caso 3: Não é admin e não tem courseId (tentando criar curso) - acesso negado
      else {
        setHasAccess(false);
      }

      setLoading(false);
    };

    checkAccess();
  }, [currentUser, userDetails, courseId]);

  // Mostrar indicador de carregamento enquanto verifica permissões
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Verificando permissões...</div>
      </div>
    );
  }

  // Redirecionar se não tiver acesso
  if (!hasAccess) {
    if (!currentUser) {
      return <Navigate to="/login" state={{ from: location }} />;
    }
    return <Navigate to="/manage-courses" state={{ from: location }} />;
  }

  // Permitir acesso se tiver permissão
  return children;
}

export default App;