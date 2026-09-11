import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Loader from "$components/common/Loader";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TextField,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SortIcon from "@mui/icons-material/Sort";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useAuth } from "$context/AuthContext";
import Topbar from "$components/topbar/Topbar";
import { canAssignGrades } from "$api/utils/permissions";
import { useQuizDashboardData } from "./hooks/useQuizDashboardData";
import { useQuizRecalculation } from "./hooks/useQuizRecalculation";
import { useDashboardSorting } from "./hooks/useDashboardSorting";
import QuizResultsTable from "./QuizResultsTable";
import EngagementQuizTable from "./EngagementQuizTable";

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const quizId = params.get("quizId");
  const { userDetails } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const {
    quiz,
    courseData,
    videoData,
    studentResults,
    liveQuizResults,
    customQuizResults,
    loading,
    refreshing,
    reload,
  } = useQuizDashboardData(quizId);

  // Só o dono do curso (ou admin) recalcula — é o que as regras do banco
  // permitem escrever em quizResults de outro usuário.
  const canRecalculate = canAssignGrades(userDetails, courseData?.userId, courseData?.courseId);

  const {
    recalcState,
    recalcPreview,
    handleOpenRecalculate,
    handleConfirmRecalculate,
    handleCloseRecalculate,
  } = useQuizRecalculation({
    courseId: courseData?.courseId,
    quizId,
    userId: userDetails?.userId,
    onRecalculated: () => reload({ silent: true }),
  });

  const {
    sortType,
    sortField,
    sortOrder,
    searchTerm,
    setSearchTerm,
    handleSortChange,
    handleSort,
    sortedResults,
  } = useDashboardSorting({ studentResults, liveQuizResults, customQuizResults });

  // Definir o fundo da página
  useEffect(() => {
    document.body.style.backgroundColor = "#f9f9f9";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  const handleGoBack = () => {
    navigate(`/adm-cursos?courseId=${courseData?.courseId}&tab=2`);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleExpandStudent = (studentId) => {
    setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
  };

  // Renderização durante carregamento
  if (loading) {
    return (
      <>
        <Topbar hideSearch={true} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 64px)",
            flexDirection: "column",
            gap: 2,
            backgroundColor: "#f9f9f9",
          }}
        >
          <Loader />
          <Typography variant="h6">Carregando dados do quiz...</Typography>
        </Box>
      </>
    );
  }

  // Renderização quando não encontrar o quiz
  if (!quiz || !courseData) {
    return (
      <>
        <Topbar hideSearch={true} />
        <Box
          sx={{
            p: 3,
            maxWidth: 1200,
            margin: "0 auto",
            mt: 5,
            textAlign: "center",
            backgroundColor: "#f9f9f9",
          }}
        >
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h5" color="error">
              Quiz não encontrado
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Não foi possível encontrar dados para o quiz especificado.
            </Typography>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="contained"
              onClick={handleGoBack}
              sx={{
                mt: 3,
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
              }}
            >
              Voltar
            </Button>
          </Paper>
        </Box>
      </>
    );
  }

  // Renderização principal
  return (
    <>
      <Topbar hideSearch={true} />
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          maxWidth: 1200,
          margin: "0 auto",
          mt: { xs: 2, sm: 5 },
          backgroundColor: "#f9f9f9",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {/* Cabeçalho */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <IconButton onClick={handleGoBack} sx={{ mr: 1, color: "#9041c1" }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }
              }}
            >
              Dashboard de Estudantes
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      mb: 1,
                      color: "#9041c1",
                      fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                    }}
                  >
                    Informações do Curso
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>Curso:</strong> {courseData.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>Descrição:</strong>{" "}
                    {courseData.description || "Sem descrição"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      mb: 1,
                      color: "#9041c1",
                      fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                    }}
                  >
                    Informações do Quiz
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>{videoData?.isSlide ? "Slide:" : "Vídeo:"}</strong>{" "}
                    {videoData?.title || (videoData?.isSlide ? "Slide não encontrado" : "Video não encontrado")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>Nota Mínima:</strong> {quiz.minPercentage || 0}%
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    <strong>Total de Questões:</strong>{" "}
                    {quiz.questions?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Conteúdo principal */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          {/* Abas */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              mb: 3,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="secondary"
              textColor="secondary"
              sx={{
                ".MuiTabs-indicator": {
                  backgroundColor: "#9041c1",
                },
                ".MuiTab-root.Mui-selected": {
                  color: "#9041c1",
                  fontWeight: "bold",
                },
              }}
            >
              <Tab label="Quiz" />
              <Tab label="Live Quiz" />
              <Tab label="Custom Quiz" />
            </Tabs>
          </Box>

          {/* Filtros e ordenação */}
          <Box
            sx={{
              mb: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: "space-between",
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 2, sm: 0 },
                mb: 2,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  color: "#333",
                  fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' }
                }}
              >
                Resultados dos Estudantes
              </Typography>

              {/* No mobile empilha: o Select ao lado pede minWidth 100%, e numa
                  linha só ele espremia o botão — que, com whiteSpace nowrap,
                  deixava o texto vazar para fora da borda. */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {activeTab === 0 && canRecalculate && studentResults.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={
                      recalcState === "previewing" ? (
                        <Loader size={16} />
                      ) : (
                        <AutorenewIcon />
                      )
                    }
                    onClick={handleOpenRecalculate}
                    disabled={recalcState !== "idle" || refreshing}
                    sx={{
                      whiteSpace: "nowrap",
                      textTransform: "none",
                      width: { xs: "100%", sm: "auto" },
                      borderColor: "#9041c1",
                      color: "#9041c1",
                      "&:hover": {
                        borderColor: "#7d37a7",
                        backgroundColor: "rgba(144, 65, 193, 0.06)",
                      },
                    }}
                  >
                    Recalcular notas
                  </Button>
                )}
                <SortIcon sx={{ color: "#9041c1", display: { xs: 'none', sm: 'block' } }} />
                <FormControl
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: { xs: '100%', sm: 200 } }}
                >
                  <InputLabel id="sort-select-label">Ordenar por</InputLabel>
                  <Select
                    labelId="sort-select-label"
                    id="sort-select"
                    value={sortType}
                    onChange={handleSortChange}
                    label="Ordenar por"
                    sx={{
                      borderRadius: 2,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#9041c1",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#7d37a7",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#9041c1",
                      },
                    }}
                  >
                    <MenuItem value="name">Nome (A-Z)</MenuItem>
                    <MenuItem value="score-high">Nota (Maior-Menor)</MenuItem>
                    <MenuItem value="score-low">Nota (Menor-Maior)</MenuItem>
                    <MenuItem value="date-recent">
                      Data (Recente-Antiga)
                    </MenuItem>
                    <MenuItem value="date-old">Data (Antiga-Recente)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Buscar estudante por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": { borderColor: "#9041c1" },
                  "&:hover fieldset": { borderColor: "#7d37a7" },
                  "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                },
              }}
            />
          </Box>

          {/* Tabela de Quiz Regular */}
          {activeTab === 0 && (
            <QuizResultsTable
              quiz={quiz}
              sortedResults={sortedResults}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              liveQuizResults={liveQuizResults}
              customQuizResults={customQuizResults}
              expandedStudentId={expandedStudentId}
              onExpandStudent={handleExpandStudent}
            />
          )}

          {/* Tabela de Live Quiz */}
          {activeTab === 1 && (
            <EngagementQuizTable
              variant="live"
              resultsMap={liveQuizResults}
              liveQuizResults={liveQuizResults}
              customQuizResults={customQuizResults}
              sortedResults={sortedResults}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              emptyMessage="Nenhum estudante participou de Live Quiz ainda"
            />
          )}

          {/* Tabela de Custom Quiz */}
          {activeTab === 2 && (
            <EngagementQuizTable
              variant="custom"
              resultsMap={customQuizResults}
              liveQuizResults={liveQuizResults}
              customQuizResults={customQuizResults}
              sortedResults={sortedResults}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              emptyMessage="Nenhum estudante participou de Custom Quiz ainda"
            />
          )}
        </Paper>

        {/* Confirmação do recálculo, com a prévia do que muda */}
        <Dialog
          open={recalcState === "confirming" || recalcState === "applying"}
          onClose={handleCloseRecalculate}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>
            Recalcular as notas deste quiz?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              As respostas já enviadas por{" "}
              <strong>{recalcPreview?.processed || 0} aluno(s)</strong> serão
              reavaliadas contra as{" "}
              <strong>
                {recalcPreview?.multipleChoiceQuestions || 0} questão(ões) de
                múltipla escolha
              </strong>{" "}
              atuais e a nota mínima de{" "}
              <strong>{recalcPreview?.minPercentage || 0}%</strong>.
            </Typography>

            <Box component="ul" sx={{ pl: 2.5, mt: 1.5, mb: 1.5 }}>
              <Typography component="li" variant="body2">
                <strong>{recalcPreview?.updated || 0}</strong> aluno(s) mudam de nota
              </Typography>
              <Typography component="li" variant="body2">
                <strong>{recalcPreview?.promoted || 0}</strong> passam a ser aprovados
              </Typography>
              {(recalcPreview?.keptPassed || 0) > 0 && (
                <Typography component="li" variant="body2">
                  <strong>{recalcPreview.keptPassed}</strong> ficam com a nota
                  abaixo do mínimo, mas mantêm a aprovação (não perdem acesso ao
                  conteúdo já liberado)
                </Typography>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Tentativas usadas, datas de envio e as respostas do aluno não são
              alteradas.
            </Typography>

            {(recalcPreview?.ambiguousAnswers || 0) > 0 && (
              <Typography
                variant="caption"
                sx={{ display: "block", mt: 1, color: "#b26a00" }}
              >
                ⚠ {recalcPreview.ambiguousAnswers} resposta(s) não puderam ser
                reconhecidas com certeza (alternativa editada): foi mantida a
                alternativa pela posição original. Confira
                {recalcPreview.studentsWithAmbiguity?.length > 0
                  ? `: ${recalcPreview.studentsWithAmbiguity.join(", ")}`
                  : "."}
              </Typography>
            )}

            {(recalcPreview?.orphanAnswers || 0) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {recalcPreview.orphanAnswers} resposta(s) se referem a questões
                removidas do quiz: ficam registradas, mas não contam mais na nota.
              </Typography>
            )}

            {(recalcPreview?.unansweredQuestions || 0) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {recalcPreview.unansweredQuestions} questão(ões) sem resposta
                (acrescentadas depois da tentativa) contam como erro.
              </Typography>
            )}

            {(recalcPreview?.skipped || 0) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {recalcPreview.skipped} resultado(s) antigos, sem respostas
                gravadas, ficam de fora do recálculo.
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              O percentual de progresso no curso de cada aluno é reconciliado no
              próximo acesso dele ao curso.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseRecalculate}
              disabled={recalcState === "applying"}
              sx={{ color: "#666", textTransform: "none" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmRecalculate}
              disabled={recalcState === "applying"}
              sx={{ bgcolor: "#9041c1", textTransform: "none" }}
            >
              {recalcState === "applying" ? "Recalculando..." : "Recalcular"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default StudentDashboard;
