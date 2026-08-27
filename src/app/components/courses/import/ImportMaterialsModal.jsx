import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import CourseSourcePicker from "./CourseSourcePicker";
import {
  fetchCourseMaterials,
  importMaterialsFromCourse,
  markAlreadyImportedMaterials,
} from "$api/services/courses/extraMaterials";

/**
 * Importa materiais extras de outro curso para o curso atual.
 *
 * Materiais cuja URL já existe aqui vêm marcados como repetidos e desmarcados:
 * importar de novo criaria uma segunda linha idêntica na lista do aluno.
 */
export default function ImportMaterialsModal({
  open,
  onClose,
  courseId,
  existingMaterials = [],
  onImported,
}) {
  const [sourceCourseId, setSourceCourseId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Reabrir o modal recomeça a escolha do zero.
  useEffect(() => {
    if (!open) {
      setSourceCourseId("");
      setMaterials([]);
      setSelectedIds([]);
    }
  }, [open]);

  useEffect(() => {
    if (!sourceCourseId) {
      setMaterials([]);
      setSelectedIds([]);
      return;
    }

    let cancelled = false;

    const carregar = async () => {
      setLoading(true);
      try {
        const lista = await fetchCourseMaterials(sourceCourseId);
        if (cancelled) return;

        const comMarcacao = markAlreadyImportedMaterials(lista, existingMaterials);
        setMaterials(comMarcacao);
        setSelectedIds(comMarcacao.filter((m) => !m.alreadyImported).map((m) => m.id));
      } catch {
        if (!cancelled) toast.error("Erro ao carregar os materiais do curso de origem");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelled = true;
    };
  }, [sourceCourseId, existingMaterials]);

  const alternar = (materialId) => {
    setSelectedIds((anterior) =>
      anterior.includes(materialId)
        ? anterior.filter((id) => id !== materialId)
        : [...anterior, materialId]
    );
  };

  const todosMarcados = materials.length > 0 && selectedIds.length === materials.length;

  const alternarTodos = () => {
    setSelectedIds(todosMarcados ? [] : materials.map((m) => m.id));
  };

  const importar = async () => {
    setImporting(true);
    try {
      const importados = await importMaterialsFromCourse(
        sourceCourseId,
        courseId,
        selectedIds
      );
      toast.success(
        importados.length === 1
          ? "1 material importado com sucesso!"
          : `${importados.length} materiais importados com sucesso!`
      );
      if (onImported) await onImported();
      onClose();
    } catch (error) {
      toast.error(error.message || "Erro ao importar materiais");
    } finally {
      setImporting(false);
    }
  };

  const repetidos = materials.filter((m) => m.alreadyImported).length;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: "bold", color: "#333", pr: 6 }}>
        Importar materiais de outro curso
      </DialogTitle>
      <IconButton
        aria-label="Fechar"
        onClick={onClose}
        sx={{ position: "absolute", top: 8, right: 8, color: "#666" }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent dividers>
        <CourseSourcePicker
          value={sourceCourseId}
          onChange={setSourceCourseId}
          excludeCourseId={courseId}
          disabled={importing}
        />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} sx={{ color: "#9041c1" }} />
          </Box>
        )}

        {!loading && sourceCourseId && materials.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Esse curso não tem materiais extras cadastrados.
          </Alert>
        )}

        {!loading && materials.length > 0 && (
          <>
            {repetidos > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {repetidos === 1
                  ? "1 material já existe neste curso e veio desmarcado."
                  : `${repetidos} materiais já existem neste curso e vieram desmarcados.`}
              </Alert>
            )}

            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  checked={todosMarcados}
                  indeterminate={selectedIds.length > 0 && !todosMarcados}
                  onChange={alternarTodos}
                  sx={{ color: "#9041c1", "&.Mui-checked": { color: "#9041c1" } }}
                />
              }
              label="Selecionar todos"
            />

            <List dense>
              {materials.map((material) => (
                <ListItem key={material.id} disableGutters>
                  <Checkbox
                    checked={selectedIds.includes(material.id)}
                    onChange={() => alternar(material.id)}
                    sx={{ color: "#9041c1", "&.Mui-checked": { color: "#9041c1" } }}
                  />
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 500 }}>
                        {material.name}
                        {material.alreadyImported && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1, color: "#b26a00" }}
                          >
                            já existe aqui
                          </Typography>
                        )}
                      </Typography>
                    }
                    secondary={
                      <Link
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{ color: "#666", wordBreak: "break-all" }}
                      >
                        {material.url}
                      </Link>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: "#666", textTransform: "none" }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={importar}
          disabled={importing || selectedIds.length === 0}
          sx={{
            backgroundColor: "#9041c1",
            color: "white",
            borderRadius: "8px",
            fontWeight: "bold",
            textTransform: "none",
            "&:hover": { backgroundColor: "#7d37a7" },
          }}
        >
          {importing
            ? "Importando..."
            : `Importar ${selectedIds.length > 0 ? selectedIds.length : ""}`.trim()}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
