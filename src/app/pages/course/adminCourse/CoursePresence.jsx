import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleIcon from "@mui/icons-material/People";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import { toast } from "react-toastify";
import Topbar from "../../../components/topbar/Topbar";
import SearchField from "../../../components/common/SearchField";
import SortableHeader from "../../../components/common/SortableHeader";
import { sortRows, getNextSort } from "../../../utils/tableSort";
import {
  fetchCoursePresenceData,
  saveAttendanceSettings,
} from "../../../../api/services/courses/attendanceData";
import {
  computeCoursePresence,
  exportPresenceToCSV,
  formatWatchedTime,
  formatWatchedDate,
  DEFAULT_PRESENCES_PER_VIDEO,
} from "../../../../api/services/courses/attendance";

const PURPLE = "#9041c1";

export default function CoursePresence() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [presencesPerVideo, setPresencesPerVideo] = useState(DEFAULT_PRESENCES_PER_VIDEO);
  const [savedPerVideo, setSavedPerVideo] = useState(DEFAULT_PRESENCES_PER_VIDEO);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState({ sortField: "name", sortOrder: "asc" });

  useEffect(() => {
    const loadData = async () => {
      if (!courseId) {
        toast.error("ID do curso não fornecido");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { videos: vids, students: studs, settings } =
          await fetchCoursePresenceData(courseId);
        setVideos(vids);
        setStudents(studs);
        setPresencesPerVideo(settings.presencesPerVideo);
        setSavedPerVideo(settings.presencesPerVideo);
      } catch (error) {
        console.error("Erro ao carregar presença:", error);
        toast.error("Erro ao carregar os dados de presença");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [courseId]);

  // O valor efetivo do cálculo: usa o campo se for válido, senão o salvo.
  const effectivePerVideo = useMemo(() => {
    const n = Number(presencesPerVideo);
    return Number.isFinite(n) && n > 0 ? n : savedPerVideo;
  }, [presencesPerVideo, savedPerVideo]);

  const presence = useMemo(
    () => computeCoursePresence(students, videos, { presencesPerVideo: effectivePerVideo }),
    [students, videos, effectivePerVideo]
  );

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = term
      ? presence.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term)
        )
      : presence;
    return sortRows(list, sort.sortField, sort.sortOrder);
  }, [presence, searchTerm, sort]);

  const handleSort = (field) => setSort((prev) => getNextSort(prev, field));

  const stats = useMemo(() => {
    if (presence.length === 0) return { avg: 0, full: 0 };
    const avg =
      presence.reduce((sum, s) => sum + s.presencePercent, 0) / presence.length;
    const full = presence.filter((s) => s.presencePercent >= 100).length;
    return { avg: Math.round(avg * 100) / 100, full };
  }, [presence]);

  const isDirty = Number(presencesPerVideo) !== savedPerVideo;

  const handleSave = useCallback(async () => {
    const n = Number(presencesPerVideo);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Informe um número de presenças por vídeo maior que zero");
      return;
    }
    try {
      setSaving(true);
      await saveAttendanceSettings(courseId, { presencesPerVideo: n });
      setSavedPerVideo(n);
      toast.success("Configuração de presença salva!");
    } catch (error) {
      console.error("Erro ao salvar configuração de presença:", error);
      toast.error(error.message || "Erro ao salvar a configuração");
    } finally {
      setSaving(false);
    }
  }, [courseId, presencesPerVideo]);

  const handleExportCSV = () => {
    try {
      const csv = exportPresenceToCSV(presence, videos, {
        presencesPerVideo: effectivePerVideo,
      });
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `presenca_${courseId}_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV de presença exportado!");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro ao exportar o arquivo");
    }
  };

  const handleBack = () => {
    navigate(`/adm-cursos?courseId=${courseId}&tab=3`);
  };

  if (loading) {
    return (
      <>
        <Topbar hideSearch={true} />
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", mt: 8 }}>
          <CircularProgress sx={{ color: PURPLE }} />
        </Box>
      </>
    );
  }

  return (
    <>
      <Topbar hideSearch={true} />
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          maxWidth: "1400px",
          margin: { xs: "72px auto 0", sm: "80px auto 0" },
        }}
      >
        {/* Cabeçalho */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ color: PURPLE }}>
            Voltar
          </Button>
          <HowToRegIcon sx={{ color: PURPLE }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#333" }}>
            Presença por Vídeos
          </Typography>
        </Box>

        {videos.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: "12px" }}>
            <Typography sx={{ color: "#333" }}>
              Este curso ainda não tem vídeos-aula cadastrados. A presença é
              calculada a partir dos vídeos (slides e vídeos de entrega não contam).
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Configuração + estatísticas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: "12px", height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: "#333", mb: 1 }}>
                      Presenças por vídeo assistido
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <TextField
                        type="number"
                        size="small"
                        value={presencesPerVideo}
                        onChange={(e) => setPresencesPerVideo(e.target.value)}
                        inputProps={{ min: 1, step: 1, style: { width: 90 } }}
                        error={!(Number(presencesPerVideo) > 0)}
                        helperText={
                          !(Number(presencesPerVideo) > 0)
                            ? "Deve ser maior que zero"
                            : `${videos.length} vídeos × ${effectivePerVideo} = ${videos.length * effectivePerVideo} presenças no total`
                        }
                      />
                      <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving || !isDirty || !(Number(presencesPerVideo) > 0)}
                        sx={{ backgroundColor: PURPLE, "&:hover": { backgroundColor: "#7d37a7" } }}
                      >
                        {saving ? "Salvando..." : "Salvar"}
                      </Button>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#333", display: "block", mt: 1 }}>
                      Um vídeo conta como assistido a partir de 90%.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ borderRadius: "12px", height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PeopleIcon sx={{ color: PURPLE }} />
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {presence.length}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#333" }}>
                      Alunos matriculados
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ borderRadius: "12px", height: "100%" }}>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: PURPLE }}>
                      {stats.avg.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#333" }}>
                      Presença média · {stats.full} com 100%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Barra de ações */}
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Box sx={{ flex: 1, minWidth: { xs: "100%", sm: 260 } }}>
                <SearchField
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar estudante por nome ou email..."
                />
              </Box>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
                sx={{ color: PURPLE, borderColor: PURPLE, "&:hover": { borderColor: "#7d37a7" } }}
              >
                Exportar CSV
              </Button>
            </Box>

            {/* Tabela */}
            <TableContainer component={Paper} sx={{ borderRadius: "12px", maxHeight: "70vh" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <SortableHeader
                      label="Aluno"
                      field="name"
                      sortField={sort.sortField}
                      sortOrder={sort.sortOrder}
                      onSort={handleSort}
                      sx={{ position: "sticky", left: 0, zIndex: 3, backgroundColor: "#fff", minWidth: 180 }}
                    />
                    {videos.map((v, i) => (
                      <TableCell key={v.id} align="center" sx={{ fontWeight: 700, minWidth: 64 }}>
                        <Tooltip title={v.title}>
                          <span>{i + 1}</span>
                        </Tooltip>
                      </TableCell>
                    ))}
                    <SortableHeader label="Assistidos" field="watchedCount" align="center" sortField={sort.sortField} sortOrder={sort.sortOrder} onSort={handleSort} sx={{ minWidth: 90 }} />
                    <SortableHeader label="Presenças" field="presences" align="center" sortField={sort.sortField} sortOrder={sort.sortOrder} onSort={handleSort} sx={{ minWidth: 90 }} />
                    <SortableHeader label="Presença" field="presencePercent" align="center" sortField={sort.sortField} sortOrder={sort.sortOrder} onSort={handleSort} sx={{ minWidth: 100 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((student) => {
                    const byId = new Map(student.perVideo.map((p) => [p.id, p]));
                    return (
                      <TableRow key={student.userId} hover>
                        <TableCell sx={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: "#fff" }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {student.name}
                            {student.isTeacher && (
                              <Chip label="prof" size="small" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#333" }}>
                            {student.email}
                          </Typography>
                        </TableCell>
                        {videos.map((v) => {
                          const p = byId.get(v.id);
                          const pct = p ? p.percentageWatched : 0;
                          const watched = p ? p.watched : false;
                          return (
                            <TableCell key={v.id} align="center">
                              <Tooltip
                                title={
                                  <>
                                    {v.title}
                                    <br />
                                    Tempo: {formatWatchedTime(p ? p.watchedTimeInSeconds : 0)}
                                    <br />
                                    {/* "Assistido em" só quando a data foi medida
                                        na travessia dos 90%; do contrário é o
                                        último acesso, que aproxima a conclusão
                                        mas pode ter sido movido por uma revisão. */}
                                    {p && p.dataAssistido
                                      ? `${p.origemData === "medido" ? "Assistido em" : "Último acesso em"} ${formatWatchedDate(p.dataAssistido)}`
                                      : pct > 0
                                        ? "Sem data registrada"
                                        : "Sem registro"}
                                  </>
                                }
                              >
                                <Box
                                  sx={{
                                    display: "inline-block",
                                    minWidth: 40,
                                    px: 0.5,
                                    py: 0.25,
                                    borderRadius: "6px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: watched ? "#1b5e20" : "#333",
                                    backgroundColor: watched ? "#c8e6c9" : "transparent",
                                  }}
                                >
                                  {pct}%
                                </Box>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                        <TableCell align="center">
                          {student.watchedCount}/{student.totalVideos}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {student.presences}/{student.maxPresences}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${student.presencePercent.toFixed(0)}%`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              color: student.presencePercent >= 100 ? "#1b5e20" : "#8a6d00",
                              backgroundColor: student.presencePercent >= 100 ? "#c8e6c9" : "#fff3cd",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={videos.length + 4} align="center" sx={{ color: "#333", py: 3 }}>
                        Nenhum aluno encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" sx={{ color: "#333", display: "block", mt: 1 }}>
              Passe o mouse sobre o número da coluna para ver o título do vídeo, e
              sobre cada célula para ver o tempo e a data. Colunas: % assistido de
              cada vídeo. “Assistido em” é a data medida na conclusão; “último
              acesso em” é uma aproximação, usada nos registros anteriores a esse
              controle.
            </Typography>
          </>
        )}
      </Box>
    </>
  );
}
