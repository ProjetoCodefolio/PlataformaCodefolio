import React from "react";
import "@fontsource-variable/inter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useParams,
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
import CourseGrades from "./app/pages/course/adminCourse/CourseGrades";
import ListCursos from "./app/pages/course/list";
import Classes from "./app/pages/course/classes";
import QuestionsPresentation from "./app/pages/course/QuestionsPresentation";
import StudentDashboard from "./app/pages/course/studentDashboard";
import ManageMyCourses from "./app/pages/course/ManageMyCourses";
import AdminPanel from "$pages/adminPowers/adminPanel";
import AdminUsers from "$pages/adminPowers/adminUsers";
import AdminCourses from "$pages/adminPowers/adminCourses";
import AdminReports from "$pages/adminPowers/adminReports";
import AdminLlmModels from "$pages/adminPowers/AdminLlmModels";
import NotFound from "$pages/NotFound";
import ReportImage from "$pages/reportImage/ReportImage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import MyAssessmentsPage from "./app/pages/course/MyAssessmentsPage";
import TeacherAssessmentsPage from "./app/pages/course/TeacherAssessmentsPage";
import QuizGradesOverview from "./app/pages/course/adminCourse/QuizGradesOverview";
import CoursePresence from "./app/pages/course/adminCourse/CoursePresence";
import AssignmentSubmissionsDashboard from "./app/pages/course/adminCourse/AssignmentSubmissionsDashboard";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<HomePage />} />
            {/* Rota pública para visualizar imagem de reporte */}
            <Route path="/reporte-imagem/:reportId" element={<ReportImage />} />

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

            {/* Rota específica para professores gerenciarem avaliações */}
            <Route
              path="/teacher-assessments"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <TeacherAssessmentsPage />
                  </TeacherRoute>
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
              path="/cursos"
              element={
                <ListCursos />
              }
            />

            <Route
              path="/cursos/:alias"
              element={
                <CourseAliasRoute />
              }
            />

            {/* Link para registrar dúvida: abre a sala com o modal já aberto.
                Serve para o professor divulgar um endereço curto (e o `?videoId=`
                opcional já deixa o conteúdo certo selecionado). */}
            <Route
              path="/cursos/:alias/questions"
              element={
                <CourseAliasRoute openQuestions />
              }
            />

            <Route
              path="/classes"
              element={
                <Classes />
              }
            />

            <Route
              path="/classes/questions"
              element={
                <Classes openQuestions />
              }
            />

            {/* Tela única de apresentação das dúvidas em aula. O ícone "?" do
                player e o botão "Apresentar" da aba Dúvidas apontam para cá — o
                professor também pode projetar o endereço direto. */}
            <Route
              path="/cursos/:alias/questions/apresentar"
              element={
                <PrivateRoute>
                  <QuestionsPresentationAliasRoute />
                </PrivateRoute>
              }
            />

            <Route
              path="/classes/questions/apresentar"
              element={
                <PrivateRoute>
                  <QuestionsPresentation />
                </PrivateRoute>
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
              path="/course/grades"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <CourseGrades />
                  </TeacherRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/course/assignment-submissions"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <AssignmentSubmissionsDashboard />
                  </TeacherRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/quiz-grades-overview"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <QuizGradesOverview />
                  </TeacherRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/course/presenca"
              element={
                <PrivateRoute>
                  <TeacherRoute>
                    <CoursePresence />
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

            <Route
              path="/admin-reports"
              element={
                <PrivateRoute>
                  <AdminRoute>
                    <AdminReports />
                  </AdminRoute>
                </PrivateRoute>
              }
            />

            <Route
              path="/admin-llm-models"
              element={
                <PrivateRoute>
                  <AdminRoute>
                    <AdminLlmModels />
                  </AdminRoute>
                </PrivateRoute>
              }
            />

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
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

function CourseAliasRoute({ openQuestions = false }) {
  const { alias } = useParams();

  return <Classes alias={alias} openQuestions={openQuestions} />;
}

function QuestionsPresentationAliasRoute() {
  const { alias } = useParams();

  return <QuestionsPresentation alias={alias} />;
}

// Protege rotas de professor, exigindo autenticação e permissão de teacher.
//
// A decisão de permissão ficava em funções soltas (teacherPermissions /
// adminPermissions) que chamavam useLocation e useAuth. Como eram invocadas
// DEPOIS do `return` de usuário não autenticado, a quantidade de hooks mudava
// de um render para o outro: ao sair da conta dentro de uma rota protegida, o
// React derrubava a árvore com "Rendered fewer hooks than expected".
function TeacherRoute({ children }) {
  const { currentUser, userDetails } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  // Permite acesso se o usuário for admin, teacher ou tiver cursos em coursesTeacher
  const isAdmin = userDetails?.role === "admin";
  const isTeacher =
    userDetails?.role === "teacher" || Object.keys(userDetails?.coursesTeacher || {}).length > 0;

  if (!isTeacher && !isAdmin) {
    return <Navigate to="/dashboard" state={{ from: location }} />;
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
