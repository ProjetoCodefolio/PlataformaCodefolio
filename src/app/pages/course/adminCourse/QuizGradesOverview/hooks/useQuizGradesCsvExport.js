import { toast } from "react-toastify";
import { exportQuizGradesToCSV } from "$api/services/courses/quizAggregation";
import { downloadCsv } from "../../grades/downloadCsv";

// BOM (byte order mark): sem ele o Excel abre o CSV com acentos corrompidos,
// por não reconhecer a codificação UTF-8 automaticamente.
const UTF8_BOM = "\ufeff";

/**
 * Exporta as notas agregadas de quizzes para CSV.
 */
export function useQuizGradesCsvExport({ courseId, data }) {
  const handleExportCSV = () => {
    if (!data) return;

    try {
      const csv = exportQuizGradesToCSV(
        data.students,
        data.quizzes,
        data.videoNames || {},
        data.slideNames || {}
      );
      downloadCsv(
        `notas_quizzes_${courseId}_${new Date().toISOString().split("T")[0]}.csv`,
        UTF8_BOM + csv
      );
      toast.success("Arquivo CSV exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro ao exportar arquivo");
    }
  };

  return { handleExportCSV };
}
