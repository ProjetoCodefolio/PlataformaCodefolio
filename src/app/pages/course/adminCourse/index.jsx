import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "$context/AuthContext";
import {
  fetchCourseDetails,
  saveCourse,
  validateCourseData,
} from "$api/services/courses/courses";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Modal,
  FormControlLabel,
  Switch,
  InputAdornment,
  Tooltip,
  MenuItem,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Topbar from "$components/topbar/Topbar";
import CourseContentTab from "./CourseContentTab";
import CourseMaterialsTab from "./CourseMaterialsTab";
import CourseQuizzesTab from "./courseQuizzesTab/";
import CourseStudentsTab from "./CourseStudentsTab";
import CourseAssessmentsTab from "./CourseAssessmentsTab";
import CourseAssignmentsTab from "./CourseAssignmentsTab";
import CourseQuestionsTab from "./CourseQuestionsTab";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdvancedSettingsModal from "../../../components/courses/AdvancedSettingsModal";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import { checkUserCourseRole } from "$api/services/courses/students";
import { ALIAS_PERMITIDO } from "$api/services/courses/alias";
import {
  COURSE_TYPES,
  isDiscipline,
  isCourseClosed,
  closeDiscipline,
  reopenDiscipline,
} from "$api/services/courses/courseType";

const CourseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  const params = new URLSearchParams(location.search);
  const [courseId, setCourseId] = useState(params.get("courseId"));

  const courseMaterialsRef = useRef();
  const courseQuizzesRef = useRef();
  const courseStudentsRef = useRef();

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseAlias, setCourseAlias] = useState("");
  // Abas: 0 Conteúdo, 1 Materiais Extras, 2 Quiz, 3 Alunos, 4 Avaliações,
  // 5 Trabalhos, 6 Dúvidas (esta só para o dono do curso e admins).
  // Clamp para links antigos que apontavam para índices que não existem mais.
  const [selectedTab, setSelectedTab] = useState(() => {
    const tab = parseInt(params.get("tab")) || 0;
    return tab >= 0 && tab <= 6 ? tab : 0;
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [coursePin, setCoursePin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [randomPin, setRandomPin] = useState(
    Math.floor(1000000 + Math.random() * 9000000).toString()
  );
  // Curso com PIN salvo cujo valor não é recuperável (cursos antigos guardam
  // só o hash). O campo aparece vazio: em branco mantém o PIN atual, digitar
  // substitui.
  const [pinNaoRecuperavel, setPinNaoRecuperavel] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isCurrentUserTeacher, setIsCurrentUserTeacher] = useState(false);
  const [archived, setArchived] = useState(false);
  const [courseType, setCourseType] = useState(COURSE_TYPES.CURSO);
  // Data de encerramento da disciplina. `null` é o que significa "em andamento".
  const [closedAt, setClosedAt] = useState(null);
  const [encerrando, setEncerrando] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        try {
          // Buscar os detalhes do curso
          const courseData = await fetchCourseDetails(courseId);

          if (courseData) {
            setCourseTitle(courseData.title || "");
            setCourseDescription(courseData.description || "");
            setCourseAlias(courseData.alias || "");
            setPinRequired(!!courseData.pinEnabled);
            setArchived(!!courseData.archived);
            setCourseType(
              isDiscipline(courseData) ? COURSE_TYPES.DISCIPLINA : COURSE_TYPES.CURSO
            );
            setClosedAt(courseData.closedAt || null);

            if (courseData.pinEnabled) {
              setCoursePin(courseData.pinKnown ? courseData.pin : "");
              setPinNaoRecuperavel(!courseData.pinKnown);
            } else {
              setCoursePin("");
              setPinNaoRecuperavel(false);
            }
          }
        } catch (error) {
          console.error("Erro ao carregar curso:", error);
          toast.error("Erro ao carregar dados do curso");
        }
      }
    };

    loadCourse();
  }, [courseId]);

  useEffect(() => {
    checkCurrentUserRole();
  }, [courseId, userDetails]);

  useEffect(() => {
    if (courseId && userDetails?.userId) {
      checkCurrentUserRole();
    }
  }, [courseId, userDetails]);

  const checkCurrentUserRole = async () => {
    try {
      if (!userDetails?.userId || !courseId) return;
      
      // Get course details to find the owner
      const courseData = await fetchCourseDetails(courseId);
      if (!courseData || !courseData.userId) return;
      
      // Check if the current user is just a teacher (not the admin)
      const isTeacher = await checkUserCourseRole(
        userDetails.userId, 
        courseId, 
        courseData.userId
      );
      
      setIsCurrentUserTeacher(isTeacher);
    } catch (error) {
      console.error("Erro ao verificar papel do usuário:", error);
      setIsCurrentUserTeacher(false);
    }
  };

  // Encerrar é diferente de arquivar: arquivar tira do catálogo, encerrar leva
  // a turma inteira para "Concluídos". Por isso a confirmação diz o número de
  // alunos afetados.
  const handleEncerrar = async () => {
    setEncerrando(true);
    try {
      const { closedAt: quando, students } = await closeDiscipline(
        courseId,
        userDetails.userId
      );
      setClosedAt(quando);
      toast.success(
        students === 1
          ? "Disciplina encerrada. 1 aluno foi para Concluídos."
          : `Disciplina encerrada. ${students} alunos foram para Concluídos.`
      );
    } catch (error) {
      console.error("Erro ao encerrar a disciplina:", error);
      toast.error("Não foi possível encerrar a disciplina.");
    } finally {
      setEncerrando(false);
    }
  };

  const handleReabrir = async () => {
    setEncerrando(true);
    try {
      const { students } = await reopenDiscipline(courseId);
      setClosedAt(null);
      toast.success(
        students === 1
          ? "Disciplina reaberta. 1 aluno voltou ao status anterior."
          : `Disciplina reaberta. ${students} alunos voltaram ao status anterior.`
      );
    } catch (error) {
      console.error("Erro ao reabrir a disciplina:", error);
      toast.error("Não foi possível reabrir a disciplina.");
    } finally {
      setEncerrando(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSubmit = useCallback(async () => {
    try {
      if (!userDetails?.userId) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Usar a função da API para validar os dados do curso
      const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
      const validation = await validateCourseData(
        {
          title: courseTitle,
          description: courseDescription,
          alias: courseAlias,
        },
        quizzes,
        courseId
      );

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      // Preparar dados do curso
      const courseData = {
        title: courseTitle,
        description: courseDescription,
        alias: courseAlias,
        userId: userDetails.userId,
        pinEnabled: pinRequired,
        archived: archived,
        type: courseType,
      };

      // Campo em branco com PIN ligado = manter o PIN que já existe. Antes o
      // valor caía para `randomPin`, um PIN que o professor nunca via, e o
      // curso ficava trancado com ele.
      if (pinRequired && coursePin.trim()) {
        courseData.pin = coursePin.trim();
      }

      // Salvar curso usando a função da API
      const result = await saveCourse(courseId, courseData, userDetails.userId, courseAlias);
      const finalCourseId = result.courseId;

      if (finalCourseId !== courseId) {
        setCourseId(finalCourseId);
      }

      // Salvar demais componentes do curso. O conteúdo (vídeos/slides) da aba
      // "Conteúdo" é salvo imediatamente pela própria aba, não neste botão.
      await Promise.all([
        courseMaterialsRef.current?.saveMaterials(finalCourseId),
        courseQuizzesRef.current?.saveQuizzes(finalCourseId),
      ]);

      if (result.isNew) {
        setCoursePin(result.courseData.pin || ""); // Exibe o PIN gerado após salvar
        setShowSuccessModal(true);
      } else {
        setShowUpdateModal(true);
      }

      toast.success(
        `Curso ${result.isNew ? "criado" : "atualizado"} com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      toast.error("Erro ao salvar o curso: " + error.message);
    }
  }, [
    courseTitle,
    courseDescription,
    courseAlias,
    userDetails,
    courseId,
    coursePin,
    pinRequired,
    randomPin,
    archived,
  ]);

  // Mesmo formato exigido por validateCourseData no salvamento — aqui só para
  // o professor ver o erro enquanto digita, em vez de descobrir ao salvar.
  const aliasInvalido = courseAlias !== "" && !ALIAS_PERMITIDO.test(courseAlias);

  const isFormValid = useCallback(() => {
    const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
    return (
      courseTitle.trim() !== "" &&
      courseDescription.trim() !== "" &&
      !aliasInvalido &&
      !quizzes.some((quiz) => quiz.questions.length === 0)
    );
  }, [courseTitle, courseDescription, aliasInvalido]);

  // Funções de manipulação de menu
  const handleAdvancedSettingsClick = () => {
    setShowAdvancedSettings(true);
  };

  // O JSX permanece essencialmente o mesmo, apenas com atualizações para refletir
  // o uso das novas funções da API
  return (
    <>
      <ToastContainer />
      <Topbar hideSearch={true} />
      <Box
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: "1200px",
          margin: { xs: "56px auto 0", sm: "64px auto 0" },
          backgroundColor: "#f9f9f9",
          borderRadius: "12px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* O resto do JSX permanece igual */}

        <Paper
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            mb: 4,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Cabeçalho com título e menu de configurações */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: "space-between",
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: 3,
              gap: { xs: 2, sm: 0 }
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, color: "#333", fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Gerenciar Curso
            </Typography>

            {/* Botão de três pontos */}
            <IconButton
              aria-label="configurações avançadas"
              onClick={handleAdvancedSettingsClick}
              sx={{ color: "#9041c1", alignSelf: { xs: 'flex-end', sm: 'center' } }}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Typography
            variant="h5"
            sx={{ mb: 3, fontWeight: "bold", color: "#333", fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            {courseId ? "Gerenciar Curso" : "Criar Novo Curso"}
          </Typography>

          {isCurrentUserTeacher && (
            <Typography
              sx={{
                mb: 3,
                p: 1.5,
                borderRadius: "8px",
                backgroundColor: "#F5F0FA",
                color: "#5B5566",
                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
              }}
            >
              Você é professor desta turma. O conteúdo, os quizzes, os alunos e as
              notas são seus; o cadastro do curso — título, apelido, PIN e
              arquivamento — continua com quem criou o curso.
            </Typography>
          )}

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <TextField
                label="Título do Curso"
                fullWidth
                required
                disabled={isCurrentUserTeacher}
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  },
                  "& .MuiInputBase-input": {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descrição do Curso"
                fullWidth
                required
                disabled={isCurrentUserTeacher}
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                variant="outlined"
                multiline
                rows={3}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  },
                  "& .MuiInputBase-input": {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Tipo"
                fullWidth
                disabled={isCurrentUserTeacher}
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                variant="outlined"
                helperText={
                  courseType === COURSE_TYPES.DISCIPLINA
                    ? "A turma termina quando você encerrar a disciplina."
                    : "Cada aluno conclui no próprio ritmo, ao completar o conteúdo."
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  },
                  "& .MuiInputBase-input": {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              >
                <MenuItem value={COURSE_TYPES.CURSO}>Curso</MenuItem>
                <MenuItem value={COURSE_TYPES.DISCIPLINA}>Disciplina</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Apelido do Curso"
                fullWidth
                disabled={isCurrentUserTeacher}
                value={courseAlias}
                onChange={(e) => setCourseAlias(e.target.value.replace(/\s/g, ''))}
                variant="outlined"
                error={!!aliasInvalido}
                helperText={
                  aliasInvalido
                    ? "O apelido só pode conter letras, números, hífens e underscores."
                    : courseAlias
                    ? `Link direto do curso: ${window.location.origin}/cursos/${courseAlias}`
                    : "Opcional. Cria um link curto para o curso, no lugar do endereço com o id."
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#666" },
                    "&:hover fieldset": { borderColor: "#9041c1" },
                    "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#666",
                    "&.Mui-focused": { color: "#9041c1" },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  },
                  "& .MuiInputBase-input": {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={pinRequired}
                    disabled={isCurrentUserTeacher}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setPinRequired(isChecked);

                      // Ao ligar sem PIN à vista, já preenche o valor que será
                      // salvo — o professor precisa poder ler o PIN antes de
                      // salvar, senão o curso tranca com um número invisível.
                      if (isChecked) {
                        setCoursePin((prevPin) => prevPin || randomPin);
                      }
                    }}
                    sx={{
                      "& .MuiSwitch-switchBase": {
                        color: "grey",
                        "&.Mui-checked": {
                          color: "#9041c1",
                        },
                        "&.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#9041c1",
                        },
                      },
                      "& .MuiSwitch-track": {
                        backgroundColor: "#666",
                      },
                    }}
                  />
                }
                label="Criar PIN para acesso ao curso"
                sx={{ 
                  color: "#666",
                  '& .MuiFormControlLabel-label': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
            </Grid>

            {(pinRequired || courseId) && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="PIN de Acesso"
                  fullWidth
                  variant="outlined"
                  type={showPin ? "text" : "password"}
                  value={coursePin}
                  disabled={!pinRequired || isCurrentUserTeacher}
                  inputProps={{ maxLength: 7 }}
                  onChange={(e) => setCoursePin(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={showPin ? "Ocultar PIN" : "Mostrar PIN"}>
                          <span>
                            <IconButton
                              onClick={() => setShowPin((prev) => !prev)}
                              edge="end"
                              size="small"
                              disabled={!coursePin}
                            >
                              {showPin ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Copiar PIN">
                          <span>
                            <IconButton
                              onClick={() => {
                                if (!coursePin) return;
                                navigator.clipboard
                                  ?.writeText(coursePin)
                                  .then(() =>
                                    toast.success("PIN copiado para a área de transferência!")
                                  )
                                  .catch(() =>
                                    toast.error("Não foi possível copiar o PIN")
                                  );
                              }}
                              edge="end"
                              size="small"
                              disabled={!coursePin}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  helperText={
                    pinNaoRecuperavel && !coursePin
                      ? "Este curso já tem um PIN salvo que não pode ser exibido. Deixe em branco para mantê-lo ou digite um novo para substituí-lo."
                      : "Este é o PIN que os alunos vão informar para entrar no curso."
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "#666" },
                      "&:hover fieldset": { borderColor: "#9041c1" },
                      "&.Mui-focused fieldset": { borderColor: "#9041c1" },
                    },
                    "& .MuiInputLabel-root": {
                      color: "#666",
                      "&.Mui-focused": { color: "#9041c1" },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    },
                    "& .MuiFormHelperText-root": {
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    },
                    "& .MuiInputBase-input": {
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
            )}

            {courseId && courseType === COURSE_TYPES.DISCIPLINA && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: closedAt ? "#9041c1" : "#E7E4EC",
                    backgroundColor: closedAt ? "#F5F0FA" : "transparent",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{ fontWeight: 600, color: "#333", fontSize: { xs: "0.875rem", sm: "1rem" } }}
                    >
                      {closedAt ? "Disciplina encerrada" : "Encerrar a disciplina"}
                    </Typography>
                    <Typography
                      sx={{ color: "#666", fontSize: { xs: "0.8125rem", sm: "0.875rem" } }}
                    >
                      {closedAt
                        ? `Encerrada em ${new Date(closedAt).toLocaleDateString("pt-BR")}. Os alunos matriculados estão em "Concluídos".`
                        : "Marca o semestre como terminado: todos os matriculados vão para \"Concluídos\", tenham assistido tudo ou não. Não tira a turma do catálogo — para isso, arquive."}
                    </Typography>
                  </Box>
                  <Button
                    variant={closedAt ? "outlined" : "contained"}
                    onClick={closedAt ? handleReabrir : handleEncerrar}
                    disabled={encerrando}
                    sx={{
                      flexShrink: 0,
                      ...(closedAt
                        ? { color: "#9041c1", borderColor: "#9041c1", "&:hover": { borderColor: "#7d37a7" } }
                        : { backgroundColor: "#9041c1", "&:hover": { backgroundColor: "#7d37a7" } }),
                      fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                    }}
                  >
                    {encerrando
                      ? "Aguarde..."
                      : closedAt
                      ? "Reabrir disciplina"
                      : "Encerrar disciplina"}
                  </Button>
                </Box>
              </Grid>
            )}

            {courseId && !isCurrentUserTeacher && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={archived}
                      onChange={(e) => setArchived(e.target.checked)}
                      sx={{
                        "& .MuiSwitch-switchBase": {
                          color: "grey",
                          "&.Mui-checked": { color: "#9041c1" },
                          "&.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#9041c1",
                          },
                        },
                        "& .MuiSwitch-track": { backgroundColor: "#666" },
                      }}
                    />
                  }
                  label="Arquivar curso (visível apenas para você, em Gerenciamento de Cursos)"
                  sx={{
                    color: "#666",
                    "& .MuiFormControlLabel-label": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                  }}
                />
              </Grid>
            )}
          </Grid>

          {courseId && (
            <>
              {/* Resto do JSX para as abas e conteúdo de curso permanece igual */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  centered
                  sx={{
                    mb: 4,
                    "& .MuiTab-root": {
                      color: "#666",
                      "&.Mui-selected": { color: "#9041c1" },
                    },
                    "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                  }}
                >
                  <Tab label="Conteúdo" />
                  <Tab label="Materiais Extras" />
                  <Tab label="Quiz" />
                  <Tab label="Alunos" />
                  <Tab label="Avaliações" />
                  <Tab label="Trabalhos" />
                  <Tab label="Dúvidas" />
                </Tabs>
              </Box>

              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{
                    mb: 4,
                    "& .MuiTab-root": {
                      color: "#666",
                      "&.Mui-selected": { color: "#9041c1" },
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    },
                    "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                    "& .MuiTabs-scrollButtons": { color: "#9041c1" },
                  }}
                >
                  <Tab label="Conteúdo" />
                  <Tab label="Materiais Extras" />
                  <Tab label="Quiz" />
                  <Tab label="Alunos" />
                  <Tab label="Avaliações" />
                  <Tab label="Trabalhos" />
                  <Tab label="Dúvidas" />
                </Tabs>
              </Box>

              {selectedTab === 0 && (
                <CourseContentTab courseId={courseId} />
              )}
              {selectedTab === 1 && (
                <CourseMaterialsTab
                  ref={courseMaterialsRef}
                  courseId={courseId}
                />
              )}
              {selectedTab === 2 && (
                <CourseQuizzesTab
                  ref={courseQuizzesRef}
                  courseId={courseId}
                  courseTitle={courseTitle}
                />
              )}
              {selectedTab === 3 && (
                <CourseStudentsTab
                  ref={courseStudentsRef}
                  courseId={courseId}
                />
              )}
              {selectedTab === 4 && (
                <Typography variant="h6" sx={{ color: "#666" }}>
                  <CourseAssessmentsTab />
                </Typography>
              )}
              {selectedTab === 5 && <CourseAssignmentsTab />}
              {selectedTab === 6 && (
                <CourseQuestionsTab courseId={courseId} alias={courseAlias} />
              )}
            </>
          )}
        </Paper>

        {!isCurrentUserTeacher && (
          <Box sx={{ display: "flex", flexDirection: { xs: 'column', sm: 'row' }, justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate("/manage-courses")}
              fullWidth={false}
              sx={{
                color: "#9041c1",
                borderColor: "#9041c1",
                "&:hover": { borderColor: "#7d37a7" },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: '100%', sm: 'auto' }
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid()}
              fullWidth={false}
              sx={{
                backgroundColor: "#9041c1",
                "&:hover": { backgroundColor: "#7d37a7" },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.12)",
                  color: "rgba(0, 0, 0, 0.26)",
                },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: '100%', sm: 'auto' }
              }}
            >
              Salvar Curso
            </Button>
          </Box>
        )}
      </Box>

      {/* Modais permanecem iguais */}
      <Modal open={showSuccessModal} aria-labelledby="success-modal-title">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: '90%', sm: 400 },
            maxWidth: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: { xs: 50, sm: 60 }, color: "#4caf50", mb: 2 }}
          />
          <Typography id="success-modal-title" variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Curso criado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowSuccessModal(false);
              navigate(`/adm-cursos?courseId=${courseId}`);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            OK!
          </Button>
        </Box>
      </Modal>

      <Modal open={showUpdateModal} aria-labelledby="update-modal-title">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: '90%', sm: 400 },
            maxWidth: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: { xs: 50, sm: 60 }, color: "#4caf50", mb: 2 }}
          />
          <Typography id="update-modal-title" variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Curso atualizado com sucesso!
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowUpdateModal(false);
              navigate(`/adm-cursos?courseId=${courseId}`);
            }}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            OK!
          </Button>
        </Box>
      </Modal>

      {/* Modal de configurações avançadas */}
      <AdvancedSettingsModal
        open={showAdvancedSettings}
        onClose={() => setShowAdvancedSettings(false)}
        courseId={courseId}
      />
    </>
  );
};

export default CourseForm;
