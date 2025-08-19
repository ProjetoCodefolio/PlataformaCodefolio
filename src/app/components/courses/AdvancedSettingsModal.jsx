import React, { useState, useEffect } from "react";
import {
  Box,
  Modal,
  Typography,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  fetchAdvancedSettings,
  saveAdvancedSettings,
} from "$api/services/courses/advancedSettings";
import { toast } from "react-toastify";

const AdvancedSettingsModal = ({ open, onClose, courseId, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    videos: {
      requirePreviousCompletion: true,
    },
    quiz: {
      allowRetry: true,
      showResultAfterCompletion: true,
    },
  });

  // Carregar configurações quando o modal é aberto
  useEffect(() => {
    if (open && courseId) {
      loadSettings();
    }
  }, [open, courseId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchAdvancedSettings(courseId);
      setSettings(data);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações avançadas");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSwitchChange = (section, key) => (event) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: event.target.checked,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveAdvancedSettings(courseId, settings);

      // Após salvar, notificar o componente pai sobre as novas configurações
      if (typeof onSave === "function") {
        onSave(settings);
      }

      toast.success("Configurações salvas com sucesso");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={!saving ? onClose : undefined}
      aria-labelledby="advanced-settings-title"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: "80%", md: "600px" },
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 2,
          p: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            bgcolor: "#9041c1",
            p: 2,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography id="advanced-settings-title" variant="h6" component="h2">
            Configurações Avançadas
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Estas são as configurações globais que serão aplicadas a todos os
            vídeos, slides e quizzes do curso.
          </Alert>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress color="secondary" />
            </Box>
          ) : (
            <>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  mb: 3,
                  "& .MuiTab-root": { color: "#666" },
                  "& .Mui-selected": { color: "#9041c1" },
                  "& .MuiTabs-indicator": { bgcolor: "#9041c1" },
                }}
              >
                <Tab label="VÍDEOS/SLIDES" />
                {/* Comentado a tab de QUIZ */}
                {/* <Tab label="QUIZ" /> */}
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.videos.requirePreviousCompletion}
                        onChange={handleSwitchChange(
                          "videos",
                          "requirePreviousCompletion"
                        )}
                        color="secondary"
                      />
                    }
                    label="Necessário completar vídeo anterior"
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 3, mt: 0.5 }}
                  >
                    Se desmarcado, o aluno poderá navegar livremente entre os
                    vídeos.
                  </Typography>
                </Box>
              )}

              {/* Comentado toda a parte de Quiz */}
              {/* {activeTab === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.quiz.allowRetry}
                          onChange={handleSwitchChange("quiz", "allowRetry")}
                          color="secondary"
                        />
                      }
                      label="Permitir repetição do quiz"
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 3, mt: 0.5 }}
                    >
                      Se desmarcado, o aluno terá apenas uma tentativa para
                      fazer o quiz.
                    </Typography>
                  </Box>

                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.quiz.showResultAfterCompletion}
                          onChange={handleSwitchChange(
                            "quiz",
                            "showResultAfterCompletion"
                          )}
                          color="secondary"
                        />
                      }
                      label="Exibir resultado após finalizar"
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 3, mt: 0.5 }}
                    >
                      Se desmarcado, o aluno não verá quais questões
                      acertou/errou após concluir o quiz.
                    </Typography>
                  </Box>
                </Box>
              )} */}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                  mt: 4,
                }}
              >
                <Button variant="outlined" onClick={onClose} disabled={saving}>
                  CANCELAR
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  sx={{
                    bgcolor: "#9041c1",
                    "&:hover": { bgcolor: "#7d37a7" },
                  }}
                >
                  {saving ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "SALVAR"
                  )}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default AdvancedSettingsModal;
