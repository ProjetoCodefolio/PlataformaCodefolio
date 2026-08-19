import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Modal,
} from "@mui/material";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { toast } from "react-toastify";
import SearchField from "../../../components/common/SearchField";
import SortableHeader from "../../../components/common/SortableHeader";
import { sortRows, getNextSort } from "../../../utils/tableSort";
import {
  observeCourseQuestions,
  filterCourseQuestions,
  summarizeQuestionsByContent,
  setQuestionDiscussed,
  deleteCourseQuestion,
} from "../../../../api/services/courses/questions";

const PURPLE = "#9041c1";

const formatarData = (iso) => {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Aba "Dúvidas": onde o professor vê QUEM registrou cada dúvida e em qual
 * conteúdo — a única tela em que a autoria aparece (na apresentação em aula as
 * dúvidas são sempre anônimas).
 *
 * Filtro por vídeo e busca por aluno se combinam: a busca é aplicada sobre o
 * recorte do filtro. O botão "Apresentar" leva o filtro de VÍDEO para a tela de
 * apresentação — a busca por aluno fica de fora porque lá as dúvidas são
 * anônimas, e projetar "as dúvidas da Maria" contradiria isso.
 *
 * A tabela é OBSERVADA em tempo real: a dúvida que um aluno registra agora
 * aparece aqui sozinha, sem recarregar a aba.
 */
const CourseQuestionsTab = ({ courseId }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentId, setContentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [sort, setSort] = useState({ sortField: "createdAt", sortOrder: "desc" });
  const [questionToDelete, setQuestionToDelete] = useState(null);

  // Observa o nó das dúvidas: a lista se mantém sozinha enquanto a aba está
  // aberta. Por isso nenhuma ação daqui (marcar/excluir) mexe no estado local —
  // quem reemite a lista é o observador, que é a única fonte de verdade.
  useEffect(() => {
    if (!courseId) {
      setQuestions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const encerrar = observeCourseQuestions(
      courseId,
      (lista) => {
        setQuestions(lista);
        setLoading(false);
      },
      () => {
        toast.error("Erro ao carregar as dúvidas do curso");
        setQuestions([]);
        setLoading(false);
      }
    );

    return encerrar;
  }, [courseId]);

  const contentOptions = useMemo(
    () => summarizeQuestionsByContent(questions),
    [questions]
  );

  const filtered = useMemo(() => {
    const list = filterCourseQuestions(questions, {
      contentId,
      searchTerm,
      onlyPending,
    });
    return sortRows(list, sort.sortField, sort.sortOrder);
  }, [questions, contentId, searchTerm, onlyPending, sort]);

  const handleSort = (field) => setSort((prev) => getNextSort(prev, field));

  const handleToggleDiscussed = async (question) => {
    try {
      await setQuestionDiscussed(courseId, question.id, !question.discussed);
    } catch (error) {
      console.error("Erro ao atualizar a dúvida:", error);
      toast.error("Não foi possível atualizar a dúvida");
    }
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    try {
      await deleteCourseQuestion(courseId, questionToDelete.id);
      toast.success("Dúvida excluída.");
    } catch (error) {
      console.error("Erro ao excluir dúvida:", error);
      toast.error("Não foi possível excluir a dúvida");
    } finally {
      setQuestionToDelete(null);
    }
  };

  // Apresentar abre a tela ÚNICA de apresentação (a mesma do ícone "?" no
  // player), levando o filtro de vídeo atual como recorte inicial.
  const handlePresent = () => {
    navigate(
      `/classes/questions/apresentar?courseId=${courseId}${
        contentId ? `&videoId=${contentId}` : ""
      }`
    );
  };

  const presentedQuestions = useMemo(
    () => filtered.filter((question) => !question.discussed),
    [filtered]
  );

  const pendentes = questions.filter((question) => !question.discussed).length;

  if (!courseId) {
    return (
      <Box sx={{ mt: 4, p: 3, backgroundColor: "#fff", borderRadius: "8px" }}>
        <Typography sx={{ color: "#666" }}>
          Salve o curso primeiro para acompanhar as dúvidas dos alunos.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 4,
        p: { xs: 2, sm: 3 },
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 1, fontWeight: "bold", color: "#333", fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
      >
        Dúvidas dos alunos
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: "#666" }}>
        {questions.length} no total · {pendentes} ainda por discutir. Os alunos
        registram pelo botão de dúvida no player; o nome aparece só aqui — na
        apresentação em aula as dúvidas são anônimas.
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <FormControl sx={{ minWidth: { xs: "100%", sm: 240 } }} size="small">
          <InputLabel id="rotulo-filtro-conteudo">Vídeo</InputLabel>
          <Select
            labelId="rotulo-filtro-conteudo"
            label="Vídeo"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
          >
            <MenuItem value="">Todos os vídeos</MenuItem>
            {contentOptions.map((option) => (
              <MenuItem key={option.contentId} value={option.contentId}>
                {option.contentTitle} ({option.total})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1, minWidth: { xs: "100%", sm: 240 } }}>
          <SearchField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por aluno..."
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: PURPLE },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: PURPLE,
                },
              }}
            />
          }
          label="Só as não discutidas"
          sx={{ "& .MuiFormControlLabel-label": { color: "#666", fontSize: "0.875rem" } }}
        />

        <Tooltip
          title={
            presentedQuestions.length === 0
              ? "Nenhuma dúvida por discutir no recorte atual"
              : "Projeta as dúvidas deste recorte, sem identificar os autores"
          }
        >
          <span>
            <Button
              variant="contained"
              startIcon={<SlideshowIcon />}
              onClick={handlePresent}
              disabled={presentedQuestions.length === 0}
              sx={{
                backgroundColor: PURPLE,
                fontWeight: "bold",
                "&:hover": { backgroundColor: "#7d37a7" },
              }}
            >
              Apresentar ({presentedQuestions.length})
            </Button>
          </span>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: PURPLE }} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: "12px", maxHeight: "70vh" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <SortableHeader
                  label="Data"
                  field="createdAt"
                  sortField={sort.sortField}
                  sortOrder={sort.sortOrder}
                  onSort={handleSort}
                  sx={{ minWidth: 140 }}
                />
                <SortableHeader
                  label="Vídeo"
                  field="contentTitle"
                  sortField={sort.sortField}
                  sortOrder={sort.sortOrder}
                  onSort={handleSort}
                  sx={{ minWidth: 160 }}
                />
                <SortableHeader
                  label="Aluno"
                  field="userName"
                  sortField={sort.sortField}
                  sortOrder={sort.sortOrder}
                  onSort={handleSort}
                  sx={{ minWidth: 160 }}
                />
                <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Dúvida</TableCell>
                <SortableHeader
                  label="Situação"
                  field="discussed"
                  align="center"
                  sortField={sort.sortField}
                  sortOrder={sort.sortOrder}
                  onSort={handleSort}
                  sx={{ minWidth: 120 }}
                />
                <TableCell align="center" sx={{ fontWeight: 700, minWidth: 110 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((question) => (
                <TableRow key={question.id} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "#333" }}>
                      {formatarData(question.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{question.contentTitle}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {question.userName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {question.text}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={question.discussed ? "Discutida" : "Pendente"}
                      size="small"
                      color={question.discussed ? "success" : "default"}
                      variant={question.discussed ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={
                        question.discussed
                          ? "Marcar como pendente"
                          : "Marcar como discutida"
                      }
                    >
                      <IconButton
                        onClick={() => handleToggleDiscussed(question)}
                        sx={{ color: question.discussed ? "#2e7d32" : "#999" }}
                        aria-label="Alternar situação da dúvida"
                      >
                        {question.discussed ? (
                          <CheckCircleIcon fontSize="small" />
                        ) : (
                          <RadioButtonUncheckedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir dúvida">
                      <IconButton
                        onClick={() => setQuestionToDelete(question)}
                        sx={{ color: "#d32f2f" }}
                        aria-label="Excluir dúvida"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#999" }}>
                    {questions.length === 0
                      ? "Nenhuma dúvida registrada neste curso ainda."
                      : "Nenhuma dúvida corresponde aos filtros."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Modal open={!!questionToDelete} onClose={() => setQuestionToDelete(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 420 },
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Excluir esta dúvida?
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            {questionToDelete?.text}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexDirection: { xs: "column", sm: "row" } }}>
            <Button variant="contained" color="error" onClick={confirmDelete}>
              Sim, excluir
            </Button>
            <Button variant="outlined" onClick={() => setQuestionToDelete(null)}>
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

CourseQuestionsTab.propTypes = {
  courseId: PropTypes.string,
};

export default CourseQuestionsTab;
