import React, { lazy, Suspense } from "react";
import "@fontsource-variable/inter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, CircularProgress } from "@mui/material";
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
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";

// Cada página vira o próprio chunk (code splitting por rota) em vez de tudo
// entrar num único módulo de entrada — antes, abrir qualquer rota dependia do
// grafo de import de TODAS as ~30 páginas (inclusive coisas pesadas como o
// visualizador de PDF do ReportImage) terminar de carregar/compilar primeiro,
// o que no dev server (módulos não empacotados) deixava a tela em branco por
// tempo variável sem nenhum feedback visual.
const Login = lazy(() => import("./app/pages/Login"));
const Dashboard = lazy(() => import("./app/pages/dashboard"));
const ProfileHeader = lazy(() => import("./app/pages/profile"));
const Portifolios = lazy(() => import("./app/pages/portifolios"));
const Projetos = lazy(() => import("./app/pages/projetos"));
const HomePage = lazy(() => import("./app/pages/homePage"));
const Cursos = lazy(() => import("./app/pages/course/adminCourse"));
const GradeAssignmentPage = lazy(() => import("./app/pages/course/adminCourse/GradeAssignment"));
const CourseGrades = lazy(() => import("./app/pages/course/adminCourse/CourseGrades"));
const ListCursos = lazy(() => import("./app/pages/course/list"));
const Classes = lazy(() => import("./app/pages/course/classes"));
const QuestionsPresentation = lazy(() => import("./app/pages/course/QuestionsPresentation"));
const StudentDashboard = lazy(() => import("./app/pages/course/studentDashboard"));
const ManageMyCourses = lazy(() => import("./app/pages/course/ManageMyCourses"));
const AdminPanel = lazy(() => import("$pages/adminPowers/adminPanel"));
const AdminUsers = lazy(() => import("$pages/adminPowers/adminUsers"));
const AdminCourses = lazy(() => import("$pages/adminPowers/adminCourses"));
const AdminReports = lazy(() => import("$pages/adminPowers/adminReports"));
const AdminLlmModels = lazy(() => import("$pages/adminPowers/AdminLlmModels"));
const NotFound = lazy(() => import("$pages/NotFound"));
const ReportImage = lazy(() => import("$pages/reportImage/ReportImage"));
const MyAssessmentsPage = lazy(() => import("./app/pages/course/MyAssessmentsPage"));
const TeacherAssessmentsPage = lazy(() => import("./app/pages/course/TeacherAssessmentsPage"));
const QuizGradesOverview = lazy(() => import("./app/pages/course/adminCourse/QuizGradesOverview"));
const CoursePresence = lazy(() => import("./app/pages/course/adminCourse/CoursePresence"));
const AssignmentSubmissionsDashboard = lazy(() =>
  import("./app/pages/course/adminCourse/AssignmentSubmissionsDashboard")
);

function PageLoader() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <CircularProgress sx={{ color: "#9041c1" }} />
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer />
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
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
