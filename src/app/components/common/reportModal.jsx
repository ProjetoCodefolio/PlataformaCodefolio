import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Box,
  IconButton,
  Typography,
  Alert,
} from "@mui/material";
import { CloudUpload, Close, Image as ImageIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { sendReport } from "$api/services/courses/report";
import { uploadReportImage, validateImageFile, formatFileSize } from "$api/services/storageService";

const ReportModal = ({
  open,
  onClose,
  reportType,
  itemId,
  courseId,
  userId = "anonymous",
  userName = "Usuário Anônimo",
  currentQuestionIndex,
  questionTitle,
  currentTime,
}) => {
  const [reportName, setReportName] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!validateImageFile(file)) {
      toast.error("Arquivo inválido. Use JPG, PNG, GIF ou WEBP (máx. 2MB)");
      return;
    }

    setSelectedImage(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendReport = async () => {
    if (!reportName.trim()) {
      toast.error("Por favor, dê um nome ao reporte.");
      return;
    }

    if (!reportMessage.trim()) {
      toast.error("Por favor, descreva o problema antes de enviar.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload da imagem primeiro (se houver)
      let imageUrl = null;
      if (selectedImage) {
        try {
          toast.info("📤 Processando imagem...");
          imageUrl = await uploadReportImage(selectedImage);
          toast.success("✅ Imagem processada!");
        } catch (error) {
          toast.error(`Erro ao enviar imagem: ${error.message}`);
          setIsSubmitting(false);
          return;
        }
      }

      const reportData = {
        reportName: reportName.trim(),
        message: reportMessage.trim(),
        type: reportType || "geral",
        itemId: itemId || null,
        courseId: courseId || null,
        userId: userId || "anonymous",
        userName: userName || "Usuário Anônimo",
        userAgent: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        imageUrl: imageUrl, // Adicionar URL da imagem
      };

      // Adicionar dados específicos apenas se existirem
      if (currentQuestionIndex !== undefined && currentQuestionIndex !== null) {
        reportData.currentQuestionIndex = currentQuestionIndex;
      }

      if (questionTitle) {
        reportData.questionTitle = questionTitle;
      }

      if (currentTime !== undefined && currentTime !== null) {
        reportData.currentTime = currentTime;
      }

      const result = await sendReport(reportData);

      if (result.success) {
        toast.success(
          `Reporte #${result.reportId} "${reportName}" enviado com sucesso!`
        );
        handleClose();
      } else {
        toast.error(
          result.message || "Erro ao enviar reporte. Tente novamente."
        );
      }
    } catch (error) {
      console.error("Erro ao enviar reporte:", error);
      toast.error("Erro ao enviar reporte. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReportName("");
      setReportMessage("");
      handleRemoveImage();
      onClose();
    }
  };

  const getReportTypeText = () => {
    switch (reportType) {
      case "video":
        return "vídeo";
      case "quiz":
        return "quiz";
      case "slide":
        return "slide";
      default:
        return "conteúdo";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!isSubmitting ? handleClose : undefined}
      aria-labelledby="report-dialog-title"
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: "#f5f5fa",
          borderRadius: "12px",
        },
      }}
      sx={{
        zIndex: 9999,
        "& .MuiBackdrop-root": {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
    >
      <DialogTitle
        id="report-dialog-title"
        sx={{
          backgroundColor: "#9041c1",
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        Reportar problema no {getReportTypeText()}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <DialogContentText sx={{ mb: 2, color: "#333" }}>
          Preencha os campos abaixo para reportar um problema. Sua contribuição
          nos ajuda a melhorar a plataforma!
        </DialogContentText>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            autoFocus
            label="Nome do Reporte *"
            type="text"
            fullWidth
            variant="outlined"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            disabled={isSubmitting}
            placeholder="Ex: Erro no vídeo da aula 3"
            sx={{
              "& .MuiOutlinedInput-root": {
                "&.Mui-focused fieldset": {
                  borderColor: "#9041c1",
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#9041c1",
              },
            }}
          />

          <TextField
            label="Descrição do Problema *"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={reportMessage}
            onChange={(e) => setReportMessage(e.target.value)}
            disabled={isSubmitting}
            placeholder="Descreva detalhadamente o problema que você encontrou..."
            sx={{
              "& .MuiOutlinedInput-root": {
                "&.Mui-focused fieldset": {
                  borderColor: "#9041c1",
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#9041c1",
              },
            }}
          />

          {/* Campo de Upload de Imagem */}
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: "none" }}
              onChange={handleImageSelect}
              disabled={isSubmitting}
            />
            
            {!imagePreview ? (
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                fullWidth
                sx={{
                  borderColor: "#9041c1",
                  color: "#9041c1",
                  "&:hover": {
                    borderColor: "#7d37a7",
                    backgroundColor: "rgba(144, 65, 193, 0.04)",
                  },
                  py: 1.5,
                }}
              >
                Anexar Print/Imagem (Opcional)
              </Button>
            ) : (
              <Box
                sx={{
                  border: "2px solid #9041c1",
                  borderRadius: "8px",
                  p: 2,
                  position: "relative",
                }}
              >
                <IconButton
                  onClick={handleRemoveImage}
                  disabled={isSubmitting}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "rgba(0, 0, 0, 0.6)",
                    color: "white",
                    "&:hover": {
                      bgcolor: "rgba(0, 0, 0, 0.8)",
                    },
                    zIndex: 1,
                  }}
                  size="small"
                >
                  <Close />
                </IconButton>
                
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <ImageIcon sx={{ color: "#9041c1", fontSize: 40 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {selectedImage?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(selectedImage?.size || 0)}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      maxHeight: "200px",
                      objectFit: "contain",
                      borderRadius: "4px",
                    }}
                  />
                </Box>
              </Box>
            )}
            
            <Alert severity="info" sx={{ mt: 1, fontSize: "0.85rem" }}>
              <strong>Dica:</strong> Tire um print da tela mostrando o erro para nos ajudar a identificar o problema mais rápido! (Máx. 2MB)
            </Alert>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          disabled={isSubmitting}
          sx={{
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.04)",
            },
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSendReport}
          variant="contained"
          disabled={!reportName.trim() || !reportMessage.trim() || isSubmitting}
          startIcon={
            isSubmitting ? <CircularProgress size={20} color="inherit" /> : null
          }
          sx={{
            bgcolor: "#9041c1",
            "&:hover": {
              bgcolor: "#7d37a7",
            },
            "&.Mui-disabled": {
              bgcolor: "rgba(144, 65, 193, 0.5)",
              color: "rgba(255, 255, 255, 0.5)",
            },
          }}
        >
          {isSubmitting ? "Enviando..." : "Enviar Reporte"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportModal;
