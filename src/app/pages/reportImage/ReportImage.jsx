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
          if (!data?.imageUrl) setError("Sem imagem");
        } else {
          setError("Não encontrado");
        }
      } catch (e) {
        setError("Erro");
      } finally {
        setLoading(false);
      }
    };
    fetchImage();
  }, [reportId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
    } catch {
      const t = document.createElement("textarea");
      t.value = imageUrl;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>⏳</div>;
  if (error) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>❌ {error}</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, gap: 16 }}>
      <img src={imageUrl} alt="Imagem" style={{ maxWidth: "95vw", maxHeight: "80vh", borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }} />
      <button onClick={handleCopy} style={{ background: copied ? "#4caf50" : "#9041c1", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        {copied ? "✅" : "📋"} {copied ? "Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}

export default ReportImage;
