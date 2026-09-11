import { useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * Upload de PDF por drag-and-drop ou seleção manual, com validação de tipo.
 */
export function usePdfUpload() {
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelected = (file) => {
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError("");
    } else {
      setPdfFile(null);
      setError("Por favor, selecione um arquivo PDF válido.");
      toast.error("Formato de arquivo inválido. Selecione um PDF.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelected(file);
  };

  const resetFile = () => setPdfFile(null);

  return {
    pdfFile,
    error,
    setError,
    fileInputRef,
    handleDragOver,
    handleDrop,
    handleFileChange,
    resetFile,
  };
}
