import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "$api/config/firebase";

function ReportImage() {
  const { reportId } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const snap = await get(ref(database, `reports/${reportId}`));
        if (snap.exists()) {
          const data = snap.val();
          setImageUrl(data?.imageUrl || "");
          if (!data?.imageUrl) {
            setError("Este reporte não contém imagem.");
          }
        } else {
          setError("Reporte não encontrado.");
        }
      } catch (e) {
        console.error("Erro ao buscar reporte:", e);
        setError("Erro ao carregar a imagem do reporte.");
      } finally {
        setLoading(false);
      }
    };
    fetchImage();
  }, [reportId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = imageUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a2e" }}>
        <p style={{ color: "#fff", fontSize: "18px" }}>⏳ Carregando imagem…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a2e" }}>
        <p style={{ color: "#ff6b6b", fontSize: "18px" }}>❌ {error}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh", 
      background: "#1a1a2e",
      padding: "20px",
      gap: "24px"
    }}>
      {/* Título */}
      <h1 style={{ color: "#fff", margin: 0, fontSize: "20px" }}>
        📸 Imagem do Reporte <span style={{ color: "#9041c1" }}>{reportId}</span>
      </h1>

      {/* Botão Copiar Link Base64 */}
      <button
        onClick={handleCopyLink}
        style={{
          background: copied ? "#4caf50" : "#9041c1",
          color: "#fff",
          border: "none",
          padding: "16px 32px",
          borderRadius: "8px",
          fontSize: "18px",
          fontWeight: "bold",
          cursor: "pointer",
          transition: "all 0.3s",
          boxShadow: "0 4px 12px rgba(144, 65, 193, 0.4)"
        }}
      >
        {copied ? "✅ Link Base64 copiado!" : "📋 Copiar link Base64 da imagem"}
      </button>

      {copied && (
        <p style={{ color: "#4caf50", margin: 0, fontSize: "14px" }}>
          Cole o link em qualquer lugar para usar a imagem!
        </p>
      )}

      {/* Imagem */}
      <img
        src={imageUrl}
        alt={`Imagem do ${reportId}`}
        style={{ 
          maxWidth: "90vw", 
          maxHeight: "60vh", 
          objectFit: "contain", 
          borderRadius: 8, 
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          border: "2px solid #333"
        }}
      />
    </div>
  );
}

export default ReportImage;
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "$api/config/firebase";
import { Box, CircularProgress, Typography, Container, Paper, Alert } from "@mui/material";
import { ErrorOutline, CheckCircle } from "@mui/icons-material";

const ReportImage = () => {
  const { reportId } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const reportRef = ref(database, `reports/${reportId}`);
        const snapshot = await get(reportRef);

        if (!snapshot.exists()) {
          setError("Reporte não encontrado");
          return;
        }

        const reportData = snapshot.val();
        
        if (!reportData.imageUrl) {
          setError("Este reporte não possui imagem anexada");
          return;
        }

        setReport(reportData);
      } catch (err) {
        console.error("Erro ao buscar reporte:", err);
        setError("Erro ao carregar imagem");
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: "center" }}>
        <CircularProgress size={60} sx={{ color: "#9041c1" }} />
        <Typography variant="h6" sx={{ mt: 2, color: "#666" }}>
          Carregando imagem...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error" icon={<ErrorOutline />}>
          <Typography variant="h6">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, pb: 2, borderBottom: "2px solid #9041c1" }}>
          <Typography variant="h4" sx={{ color: "#9041c1", fontWeight: "bold", mb: 1 }}>
            📸 Imagem do Reporte #{report?.reportNumber}
          </Typography>
          <Typography variant="h6" sx={{ color: "#666" }}>
            {report?.reportName}
          </Typography>
        </Box>

        {/* Info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: "#f5f5fa", borderRadius: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>📝 Descrição:</strong> {report?.message}
          </Typography>
          <Typography variant="body2" sx={{ color: "#666" }}>
            <strong>👤 Reportado por:</strong> {report?.userName} ({report?.userEmail})
          </Typography>
          <Typography variant="body2" sx={{ color: "#666" }}>
            <strong>📅 Data:</strong> {new Date(report?.readableDate).toLocaleString('pt-BR')}
          </Typography>
          {report?.courseTitle && (
            <Typography variant="body2" sx={{ color: "#666" }}>
              <strong>📚 Curso:</strong> {report?.courseTitle}
            </Typography>
          )}
        </Box>

        {/* Imagem */}
        <Box sx={{ textAlign: "center" }}>
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
            Esta imagem foi anexada ao reporte para demonstrar o problema encontrado
          </Alert>
          
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              display: "inline-block",
              maxWidth: "100%",
              bgcolor: "#fafafa"
            }}
          >
            <img
              src={report?.imageUrl}
              alt={`Print do reporte ${report?.reportNumber}`}
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
          </Paper>

          <Typography variant="caption" sx={{ display: "block", mt: 2, color: "#999" }}>
            Clique com o botão direito e escolha "Salvar imagem" para baixar
          </Typography>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid #e0e0e0", textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#666" }}>
            Plataforma Codefolio - Sistema de Reportes
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ReportImage;
