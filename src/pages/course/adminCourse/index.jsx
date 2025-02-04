import { ref, set, push, get, child } from 'firebase/database';
import { database } from "../../../service/firebase";
import { useLocation } from "react-router-dom";
import { useAuth } from '../../../context/AuthContext';

import React, { useEffect, useState } from "react";

import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Grid,
  MenuItem,
  Select,
  FormHelperText,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import Topbar from "../../../components/topbar/Topbar";
import { video } from 'framer-motion/client';

const CourseForm = () => {

  const [courseVideos, setCourseVideos] = useState([]);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [videos, setVideos] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);

  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoDescription, setVideoDescription] = useState("");

  const [materialName, setMaterialName] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");

  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [minPercentage, setMinPercentage] = useState(0);

  const location = useLocation();
  const { userDetails } = useAuth();

  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");

  async function fetchCourseVideos() {
    const courseVideosRef = ref(database, 'courseVideos');
    const snapshot = await get(courseVideosRef);
    const courseVideos = snapshot.val();

    if (courseVideos) {
      const filteredVideos = Object.entries(courseVideos)
        .filter(([key, video]) => video.courseId === courseId)
        .map(([key, video]) => ({ id: key, ...video }));
      setVideos(filteredVideos);
    }
  }

  async function fetchCourse() {
    const courseRef = ref(database, `courses/${courseId}`);
    const courseSnapshot = await get(courseRef);
    const courseData = courseSnapshot.val();

    if (courseData) {
      setCourseTitle(courseData.title || "");
      setCourseDescription(courseData.description || "");
    }
  }

  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        await fetchCourse();
        await fetchCourseVideos();
      }
    };
    loadCourse();
  }, [courseId]);


  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
  const handleAddVideo = () => {
    const newVideo = {
      id: videos.length + 1,
      title: videoTitle,
      url: videoUrl,
      duration: videoDuration,
      description: videoDescription,
    };
    setVideos((prev) => [...prev, newVideo]);
    setVideoTitle("");
    setVideoUrl("");
    setVideoDuration("");
    setVideoDescription("");
  };

  const handleRemoveVideo = (id) => {
    let response = window.confirm("Deseja realmente deletar este vídeo?")
    if (response) {
      setVideos((prev) => prev.filter((video) => video.id !== id));
    }
  };

  const handleAddMaterial = () => {
    const newMaterial = {
      id: materials.length + 1,
      name: materialName,
      url: materialUrl,
    };
    setMaterials((prev) => [...prev, newMaterial]);
    setMaterialName("");
    setMaterialUrl("");
  };

  const handleRemoveMaterial = (id) => {
    setMaterials((prev) => prev.filter((material) => material.id !== id));
  };

  const handleAddQuizQuestion = () => {
    const newQuestion = {
      id: quizQuestions.length + 1,
      question: quizQuestion,
      options: quizOptions,
      correctOption,
    };
    setQuizQuestions((prev) => [...prev, newQuestion]);
    setQuizQuestion("");
    setQuizOptions(["", ""]);
    setCorrectOption(0);
  };

  const handleRemoveQuizQuestion = (id) => {
    setQuizQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const handleAddQuizOption = () => {
    setQuizOptions((prev) => [...prev, ""]);
  };

  const handleUpdateQuizOption = (index, value) => {
    setQuizOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const saveCourse = async () => {
    const courseData = {
      title: courseTitle,
      description: courseDescription,
      userId: userDetails.userId,
      createdAt: new Date().toLocaleDateString(),
    };

    if (courseId) {
      try {
        const courseRef = ref(database, `courses/${courseId}`);
        await set(courseRef, courseData);

        alert("Curso atualizado com sucesso!");
      } catch (error) {
        console.error("Erro ao atualizar o curso:", error);
        alert("Erro ao atualizar o curso.");
      }
    } else {
      try {
        const courseRef = ref(database, "courses");
        const newCourseRef = push(courseRef);
        await set(newCourseRef, courseData);

        alert("Curso salvo com sucesso!");
      } catch (error) {
        console.error("Erro ao salvar o curso:", error);
        alert("Erro ao salvar o curso.");
      }
    }
  }

  const saveVideos = async () => {
    const courseVideosRef = ref(database, "courseVideos");
    const snapshot = await get(courseVideosRef);
    const existingVideos = snapshot.val() || {};

    const existingVideoIds = new Set(Object.keys(existingVideos));
    const currentVideoIds = new Set(videos.map(video => video.id));

    // Remove videos that are no longer in the state and belong to the current course
    for (const id of existingVideoIds) {
      const video = existingVideos[id];
      if (video.courseId === courseId && !currentVideoIds.has(id)) {
        const videoRef = ref(database, `courseVideos/${id}`);
        await set(videoRef, null);
      }
    }

    // Add or update videos in the state
    videos.forEach(async (video) => {
      const videoData = {
        courseId: courseId,
        title: video.title,
        url: video.url,
        duration: video.duration,
        description: video.description,
      };

      try {
        if (!existingVideoIds.has(video.id)) {
          const newVideoRef = push(courseVideosRef);
          await set(newVideoRef, videoData);
        } else {
          const videoRef = ref(database, `courseVideos/${video.id}`);
          await set(videoRef, videoData);
        }
      } catch (error) {
        console.error("Erro ao salvar os vídeos:", error);
        alert("Erro ao salvar os vídeos.");
      }
    });

    alert("Vídeos salvos com sucesso!");
  };

  const handleSubmit = async () => {
    saveCourse();
    saveVideos();
  };

  return (
    <>
      {" "}
      <Topbar />
      <Box
        sx={{
          p: 4,
          maxWidth: "1200px",
          margin: "0 auto",
          backgroundColor: "#f9f9f9",
          borderRadius: "12px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            mb: 4,
            fontWeight: "bold",
            textAlign: "center",
            color: "#333",
          }}
        >
          Cadastro de Curso
        </Typography>

        <Paper
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <TextField
            label="Título do Curso"
            fullWidth
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            sx={{ mb: 4 }}
            variant="outlined"
            disabled={courseId ? true : false}
          />

          <TextField
            label="Descrição do Curso"
            fullWidth
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            sx={{ mb: 4 }}
            variant="outlined"
            disabled={courseId ? true : false}
          />

          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            centered
            sx={{
              mb: 4,
              "& .MuiTab-root": { fontWeight: "bold" },
            }}
          >
            <Tab label="Vídeos" />
            <Tab label="Materiais Extras" />
            <Tab label="Quiz" />
          </Tabs>

          {selectedTab === 0 && (
            <Box sx={{ mt: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Título do Vídeo"
                    fullWidth
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="URL do Vídeo"
                    fullWidth
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Duração (hh:mm:ss)"
                    fullWidth
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição do Vídeo"
                    fullWidth
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    multiline
                    rows={3}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddVideo}
                sx={{
                  mt: 3,
                  p: 1.5,
                  fontWeight: "bold",
                }}
              >
                Adicionar Vídeo
              </Button>

              <List sx={{ mt: 4 }}>
                {videos.map((video) => (
                  <ListItem
                    key={video.id}
                    sx={{
                      p: 2,
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      mb: 2,
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveVideo(video.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={video.title}
                      secondary={`URL: ${video.url} | Duração: ${video.duration}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {selectedTab === 1 && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField
                    label="Nome do Material"
                    fullWidth
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    label="URL do Material"
                    fullWidth
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ height: "100%" }}
                    onClick={handleAddMaterial}
                  >
                    Adicionar Material
                  </Button>
                </Grid>
              </Grid>

              <List sx={{ mt: 4 }}>
                {materials.map((material) => (
                  <ListItem
                    key={material.id}
                    sx={{
                      p: 2,
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      mb: 2,
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveMaterial(material.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={material.name}
                      secondary={`URL: ${material.url}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {selectedTab === 2 && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Pergunta"
                    fullWidth
                    value={quizQuestion}
                    onChange={(e) => setQuizQuestion(e.target.value)}
                    variant="outlined"
                  />
                </Grid>
                {quizOptions.map((option, index) => (
                  <Grid item xs={6} key={index}>
                    <TextField
                      label={`Opção ${index + 1}`}
                      fullWidth
                      value={option}
                      onChange={(e) =>
                        handleUpdateQuizOption(index, e.target.value)
                      }
                      variant="outlined"
                    />
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleAddQuizOption}
                  >
                    Adicionar Mais Opções
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Opção Correta"
                    type="number"
                    fullWidth
                    value={correctOption}
                    onChange={(e) => setCorrectOption(Number(e.target.value))}
                    variant="outlined"
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                color="primary"
                onClick={handleAddQuizQuestion}
                sx={{
                  mt: 3,
                  p: 1.5,
                  fontWeight: "bold",
                }}
              >
                Adicionar Questão
              </Button>

              <Grid item xs={12} sx={{ mt: 3 }}>
                <InputLabel htmlFor="minPercentage">Nota Mínima (%)</InputLabel>
                <FormControl fullWidth>
                  <Select
                    value={minPercentage}
                    onChange={(e) => setMinPercentage(e.target.value)}
                    inputProps={{ id: 'minPercentage' }}
                  >
                    {[...Array(11)].map((_, index) => {
                      const value = index * 10;
                      return (
                        <MenuItem key={value} value={value}>
                          {value}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  <FormHelperText>
                    Defina a porcentagem mínima necessária para aprovação. Se a porcentagem for igual a 0, o quizz não será obrigatório!
                  </FormHelperText>
                </FormControl>
              </Grid>


              <List sx={{ mt: 4 }}>
                {quizQuestions.map((question) => (
                  <ListItem
                    key={question.id}
                    sx={{
                      p: 2,
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      mb: 2,
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveQuizQuestion(question.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={question.question}
                      secondary={`Opções: ${question.options.join(
                        ", "
                      )} | Correta: ${question.correctOption + 1}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>

        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={handleSubmit}
          sx={{
            p: 1.5,
            fontSize: "1.1rem",
            fontWeight: "bold",
          }}
        >
          Salvar Curso
        </Button>
      </Box>
    </>
  );
};

export default CourseForm;
