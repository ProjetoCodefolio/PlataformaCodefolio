import {
  ref as firebaseRef,
  set,
  push,
  get,
  remove,
  update,
} from "firebase/database";
import { database } from "../../../service/firebase";
import { useAuth } from "../../../context/AuthContext";
import { useLocation } from "react-router-dom";
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  Box,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Grid,
  Modal,
  Typography,
  FormControlLabel,
  Switch,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { toast } from "react-toastify";
import { hasVideoQuizzes } from "../../../utils/courseUtils";
import { updateAllUsersCourseProgress } from "../../../service/courses";

const CourseVideosTab = forwardRef((props, ref) => {
  const [videos, setVideos] = useState([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [requiresPrevious, setRequiresPrevious] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [videoToEdit, setVideoToEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lastAction, setLastAction] = useState(null); // Add this new state
  const [videoUrlError, setVideoUrlError] = useState(""); // Adicionar novo estado para controlar erro de URL

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { currentUser } = useAuth();
  const courseId = params.get("courseId");

  const videosTabRef = useRef(null);

  async function fetchCourseVideos() {
    const courseVideosRef = firebaseRef(database, `courseVideos/${courseId}`);
    const snapshot = await get(courseVideosRef);
    const courseVideos = snapshot.val();

    if (courseVideos) {
      const filteredVideos = await Promise.all(
        Object.entries(courseVideos).map(async ([key, video]) => {
          const hasQuizzes = await hasVideoQuizzes(courseId, key);
          return {
            id: key,
            ...video,
            requiresPrevious:
              video.requiresPrevious !== undefined
                ? video.requiresPrevious
                : true,
            hasQuizzes: hasQuizzes.length > 0,
          };
        })
      );
      setVideos(filteredVideos);
    }
  }

  // Função para validar URL do YouTube
  const isValidYouTubeUrl = (url) => {
    try {
      const validUrl = new URL(url);

      // Verifica se é do domínio youtube.com ou youtu.be
      const isYouTubeDomain =
        validUrl.hostname === "youtube.com" ||
        validUrl.hostname === "www.youtube.com" ||
        validUrl.hostname === "youtu.be" ||
        validUrl.hostname === "www.youtu.be";

      // Para youtube.com, verificar se tem o parâmetro v
      if (
        validUrl.hostname === "youtube.com" ||
        validUrl.hostname === "www.youtube.com"
      ) {
        const videoId = validUrl.searchParams.get("v");
        return isYouTubeDomain && !!videoId;
      }

      // Para youtu.be, verificar se tem caminho na URL (formato: youtu.be/{ID})
      if (
        validUrl.hostname === "youtu.be" ||
        validUrl.hostname === "www.youtu.be"
      ) {
        return isYouTubeDomain && validUrl.pathname.length > 1;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  // Modificar a função handleAddVideo
  const handleAddVideo = async () => {
    if (!videoTitle.trim() || !videoUrl.trim()) {
      toast.error("Título e URL são obrigatórios");
      return;
    }

    // Validação da URL do YouTube
    if (!isValidYouTubeUrl(videoUrl)) {
      toast.error("Por favor, insira uma URL válida de vídeo do YouTube");
      return;
    }

    try {
      const courseVideosRef = firebaseRef(database, `courseVideos/${courseId}`);
      const newVideoRef = push(courseVideosRef);

      const videoData = {
        title: videoTitle.trim(),
        url: videoUrl.trim(),
        description: String(videoDescription || ""),
        order: videos.length,
        requiresPrevious,
      };

      await set(newVideoRef, videoData);

      const updatedVideos = [...videos, { ...videoData, id: newVideoRef.key }];
      setVideos(updatedVideos);
      setVideoTitle("");
      setVideoUrl("");
      setVideoDescription("");
      setRequiresPrevious(true);
      setShowSuccessModal(true);
      setLastAction("add");

      // Atualizar progresso do curso para todos os usuários
      await updateAllUsersCourseProgress(courseId, updatedVideos);
    } catch (error) {
      console.error("Erro ao adicionar vídeo:", error);
      toast.error("Erro ao adicionar vídeo");
    }
  };

  const handleEditVideo = (video) => {
    setIsEditing(true);
    setVideoToEdit(video.id);
    setVideoTitle(video.title);
    setVideoUrl(video.url);
    setVideoDescription(video.description || "");
    setRequiresPrevious(video.requiresPrevious);
  };

  // Modificar a função handleEditVideoSubmit
  const handleEditVideoSubmit = async () => {
    if (!videoTitle.trim() || !videoUrl.trim()) {
      toast.error("Título e URL são obrigatórios");
      return;
    }

    // Validação da URL do YouTube
    if (!isValidYouTubeUrl(videoUrl)) {
      toast.error("Por favor, insira uma URL válida de vídeo do YouTube");
      return;
    }

    try {
      const videoData = {
        title: videoTitle.trim(),
        url: videoUrl.trim(),
        description: String(videoDescription || ""),
        requiresPrevious,
      };

      const videoRef = firebaseRef(
        database,
        `courseVideos/${courseId}/${videoToEdit}`
      );
      await update(videoRef, {
        title: videoTitle.trim(),
        url: videoUrl.trim(),
        description: String(videoDescription || ""),
        requiresPrevious,
      });

      const updatedVideos = videos.map((video) =>
        video.id === videoToEdit ? { ...video, ...videoData } : video
      );
      setVideos(updatedVideos);
      setVideoTitle("");
      setVideoUrl("");
      setVideoDescription("");
      setRequiresPrevious(true);
      setIsEditing(false);
      setShowSuccessModal(true);
      setLastAction("edit");
    } catch (error) {
      console.error("Erro ao editar vídeo:", error);
      toast.error("Erro ao editar vídeo");
    }
  };

  const handleVideo = () => {
    if (isEditing) {
      handleEditVideoSubmit();
    } else {
      handleAddVideo();
    }
  };

  const handleRemoveVideo = (id) => {
    const video = videos.find((v) => v.id === id);
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  const confirmRemoveVideo = async () => {
    if (videoToDelete && videoToDelete.id) {
      try {
        // Verificar se o vídeo possui quizzes
        const courseQuizzes = await hasVideoQuizzes(courseId, videoToDelete.id);

        if (courseQuizzes.length > 0) {
          toast.error(
            "Não é possível deletar o vídeo pois existe um quiz associado a ele."
          );
          setShowDeleteModal(false);
          setVideoToDelete(null);
          return;
        }

        // deletar video da tabela de courseVideos
        const videoRef = firebaseRef(
          database,
          `courseVideos/${courseId}/${videoToDelete.id}`
        );
        await remove(videoRef);
        setVideos((prev) =>
          prev.filter((video) => video.id !== videoToDelete.id)
        );

        // deletar vídeo da tabela de videoProgress
        const videoProgressRef = firebaseRef(
          database,
          `videoProgress/${currentUser.uid}/${courseId}/${videoToDelete.id}`
        );
        await remove(videoProgressRef);

        // atualizar progresso do curso para todos os usuários
        const updatedVideos = videos.filter(
          (video) => video.id !== videoToDelete.id
        );
        await updateAllUsersCourseProgress(courseId, updatedVideos);

        toast.success("Vídeo deletado com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir vídeo:", error);
        toast.error("Erro ao excluir vídeo");
      }
    }
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

  // Adicionar uma função para validar em tempo real
  const handleVideoUrlChange = (e) => {
    const value = e.target.value;
    setVideoUrl(value);

    if (value.trim()) {
      if (!isValidYouTubeUrl(value)) {
        setVideoUrlError(
          "URL inválida. Insira uma URL válida do YouTube (ex: https://youtube.com/watch?v=ID ou https://youtu.be/ID)"
        );
      } else {
        setVideoUrlError("");
      }
    } else {
      setVideoUrlError("");
    }
  };

  useImperativeHandle(ref, () => ({
    async saveVideos(newCourseId = null) {
      try {
        const targetCourseId = newCourseId || courseId;
        if (!targetCourseId) throw new Error("ID do curso não disponível");

        // Verificar se todos os vídeos têm URLs válidas
        const invalidVideos = videos.filter(
          (video) => !isValidYouTubeUrl(video.url)
        );
        if (invalidVideos.length > 0) {
          // Construir mensagem de erro com títulos dos vídeos inválidos
          const invalidVideoTitles = invalidVideos
            .map((v) => `"${v.title}"`)
            .join(", ");
          throw new Error(
            `O curso contém vídeos com URLs inválidas: ${invalidVideoTitles}`
          );
        }

        const courseVideosRef = firebaseRef(
          database,
          `courseVideos/${targetCourseId}`
        );
        const snapshot = await get(courseVideosRef);
        const existingVideos = snapshot.val() || {};

        const existingVideoIds = new Set(Object.keys(existingVideos));
        const currentVideoIds = new Set(
          videos.map((video) => video.id).filter((id) => id)
        );

        for (const id of existingVideoIds) {
          if (!currentVideoIds.has(id)) {
            await remove(
              firebaseRef(database, `courseVideos/${targetCourseId}/${id}`)
            );
          }
        }

        for (const [index, video] of videos.entries()) {
          const videoData = {
            title: video.title,
            url: video.url,
            description: video.description || "",
            order: index,
            requiresPrevious: video.requiresPrevious,
          };

          if (video.id && existingVideoIds.has(video.id)) {
            await set(
              firebaseRef(
                database,
                `courseVideos/${targetCourseId}/${video.id}`
              ),
              videoData
            );
          } else {
            const newVideoRef = push(courseVideosRef);
            await set(newVideoRef, videoData);
            video.id = newVideoRef.key;
          }
        }
        return true;
      } catch (error) {
        console.error("Erro ao salvar vídeos:", error);
        throw error;
      }
    },
    async validateVideos() {
      // Verificar se todos os vídeos têm URLs válidas
      const invalidVideos = videos.filter(
        (video) => !isValidYouTubeUrl(video.url)
      );
      if (invalidVideos.length > 0) {
        // Construir mensagem de erro com títulos dos vídeos inválidos
        const invalidVideoTitles = invalidVideos
          .map((v) => `"${v.title}"`)
          .join(", ");
        throw new Error(
          `O curso contém vídeos com URLs inválidas: ${invalidVideoTitles}`
        );
      }
      return true;
    },
  }));

  useEffect(() => {
    if (courseId) {
      fetchCourseVideos();
    }
  }, [courseId]);

  return (
    <Box sx={{ mt: 4 }} ref={videosTabRef}>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#333" }}
      >
        {isEditing ? "Editar Vídeo" : "Adicionar Vídeo"}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            label="Título do Vídeo"
            fullWidth
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
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
              },
            }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="URL do Vídeo"
            fullWidth
            value={videoUrl}
            onChange={handleVideoUrlChange}
            error={!!videoUrlError}
            helperText={videoUrlError}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: videoUrlError ? "#d32f2f" : "#666",
                },
                "&:hover fieldset": {
                  borderColor: videoUrlError ? "#d32f2f" : "#9041c1",
                },
                "&.Mui-focused fieldset": {
                  borderColor: videoUrlError ? "#d32f2f" : "#9041c1",
                },
              },
              "& .MuiInputLabel-root": {
                color: videoUrlError ? "#d32f2f" : "#666",
                "&.Mui-focused": {
                  color: videoUrlError ? "#d32f2f" : "#9041c1",
                },
              },
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Descrição do Vídeo"
            fullWidth
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
            multiline
            rows={3}
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
              },
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={requiresPrevious}
                onChange={(e) => setRequiresPrevious(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase": {
                    color: "grey", // Cor quando desmarcado
                    "&.Mui-checked": {
                      color: "#9041c1", // Cor quando marcado
                    },
                    "&.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#9041c1", // Cor da trilha quando marcado
                    },
                  },
                  "& .MuiSwitch-track": {
                    backgroundColor: "#666", // Cor da trilha quando desmarcado
                  },
                }}
              />
            }
            label="Exige completar vídeos anteriores"
            sx={{ color: "#666" }}
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        onClick={handleVideo}
        sx={{
          mt: 3,
          p: 1.5,
          fontWeight: "bold",
          backgroundColor: "#9041c1",
          "&:hover": { backgroundColor: "#7d37a7" },
        }}
      >
        {isEditing ? "Editar Vídeo" : "Adicionar Vídeo"}
      </Button>

      {isEditing && (
        <Button
          variant="outlined"
          onClick={() => {
            setVideoTitle("");
            setVideoUrl("");
            setVideoDescription("");
            setRequiresPrevious(true);
            setIsEditing(false);
          }}
          sx={{
            mt: 3,
            ml: 2,
            p: 1.5,
            fontWeight: "bold",
            color: "#9041c1",
            borderColor: "#9041c1",
            "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.04)" },
          }}
        >
          Cancelar
        </Button>
      )}

      <Typography
        variant="h6"
        sx={{ mt: 4, mb: 2, fontWeight: "bold", color: "#333" }}
      >
        Vídeos do Curso
      </Typography>

      <List sx={{ mt: 4 }}>
        {videos.map((video) => (
          <ListItem
            key={video.id}
            sx={{
              p: 2,
              border: "1px solid #ddd",
              borderRadius: "8px",
              mb: 2,
              backgroundColor: "white",
              "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.04)" },
            }}
            secondaryAction={
              <>
                <IconButton
                  onClick={() => {
                    handleEditVideo(video);
                    // Scroll to form area with a better approach
                    const headerOffset = 150; // Estimated header height + some margin
                    const formElement = videosTabRef.current;

                    if (formElement) {
                      const formPosition =
                        formElement.getBoundingClientRect().top;
                      const offsetPosition =
                        formPosition + window.pageYOffset - headerOffset;

                      window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth",
                      });
                    }
                  }}
                  sx={{ color: "#9041c1" }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveVideo(video.id)}
                  sx={{ color: "#d32f2f" }}
                >
                  <DeleteIcon />
                </IconButton>
              </>
            }
          >
            <ListItemText
              primary={video.title}
              secondary={
                <Typography component="span" sx={{ color: "#666" }}>
                  {`Exige anteriores: ${
                    video.requiresPrevious ? "Sim" : "Não"
                  }`}{" "}
                  <br />
                  {`Existe Quiz: ${video.hasQuizzes ? "Sim" : "Não"}`}
                </Typography>
              }
              primaryTypographyProps={{
                sx: { fontWeight: 500, color: "#333" },
              }}
            />
          </ListItem>
        ))}
      </List>

      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        aria-labelledby="success-modal-title"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            textAlign: "center",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: 60, color: "#4caf50", mb: 2 }}
          />
          <Typography id="success-modal-title" variant="h6" sx={{ mb: 2 }}>
            {`Vídeo ${
              lastAction === "edit" ? "editado" : "adicionado"
            } com sucesso!`}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowSuccessModal(false)}
            sx={{
              backgroundColor: "#9041c1",
              "&:hover": { backgroundColor: "#7d37a7" },
            }}
          >
            OK
          </Button>
        </Box>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        aria-labelledby="delete-modal-title"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography id="delete-modal-title" variant="h6" sx={{ mb: 2 }}>
            Tem certeza que deseja excluir "{videoToDelete?.title}"?
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={confirmRemoveVideo}
            >
              Sim, Excluir
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
});

export default CourseVideosTab;
