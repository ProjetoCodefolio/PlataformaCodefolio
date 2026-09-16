import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { saveCourse, validateCourseData } from "$api/services/courses/courses";

/**
 * Validação e salvamento do curso. Recebe courseMaterialsRef/courseQuizzesRef
 * por parâmetro (criadas no componente pai via useRef) — nunca cria refs
 * próprias, já que CourseMaterialsTab/CourseQuizzesTab expõem contratos
 * useImperativeHandle consumidos por quem os criou.
 */
export function useCourseSubmit({
  courseId,
  setCourseId,
  userDetails,
  courseMaterialsRef,
  courseQuizzesRef,
  courseTitle,
  courseDescription,
  courseAlias,
  aliasInvalido,
  courseType,
  pinRequired,
  coursePin,
  setCoursePin,
  archived,
  randomPin,
}) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const handleSubmit = useCallback(async () => {
    try {
      if (!userDetails?.userId) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Usar a função da API para validar os dados do curso
      const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
      const validation = await validateCourseData(
        {
          title: courseTitle,
          description: courseDescription,
          alias: courseAlias,
        },
        quizzes,
        courseId
      );

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      // Preparar dados do curso
      const courseData = {
        title: courseTitle,
        description: courseDescription,
        alias: courseAlias,
        userId: userDetails.userId,
        pinEnabled: pinRequired,
        archived: archived,
        type: courseType,
      };

      // Campo em branco com PIN ligado = manter o PIN que já existe. Antes o
      // valor caía para `randomPin`, um PIN que o professor nunca via, e o
      // curso ficava trancado com ele.
      if (pinRequired && coursePin.trim()) {
        courseData.pin = coursePin.trim();
      }

      // Salvar curso usando a função da API
      const result = await saveCourse(courseId, courseData, userDetails.userId, courseAlias);
      const finalCourseId = result.courseId;

      if (finalCourseId !== courseId) {
        setCourseId(finalCourseId);
      }

      // Salvar demais componentes do curso. O conteúdo (vídeos/slides) da aba
      // "Conteúdo" é salvo imediatamente pela própria aba, não neste botão.
      await Promise.all([
        courseMaterialsRef.current?.saveMaterials(finalCourseId),
        courseQuizzesRef.current?.saveQuizzes(finalCourseId),
      ]);

      if (result.isNew) {
        setCoursePin(result.courseData.pin || ""); // Exibe o PIN gerado após salvar
        setShowSuccessModal(true);
      } else {
        setShowUpdateModal(true);
      }

      toast.success(
        `Curso ${result.isNew ? "criado" : "atualizado"} com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      toast.error("Erro ao salvar o curso: " + error.message);
    }
    // NOTA: courseType não está nas dependências (gap pré-existente, mantido
    // como estava — corrigir mudaria o comportamento de quando handleSubmit é
    // recriado, o que está fora do escopo desta refatoração).
  }, [
    courseTitle,
    courseDescription,
    courseAlias,
    userDetails,
    courseId,
    coursePin,
    pinRequired,
    randomPin,
    archived,
    courseMaterialsRef,
    courseQuizzesRef,
    setCourseId,
    setCoursePin,
  ]);

  const isFormValid = useCallback(() => {
    const quizzes = courseQuizzesRef.current?.getQuizzes?.() || [];
    return (
      courseTitle.trim() !== "" &&
      courseDescription.trim() !== "" &&
      !aliasInvalido &&
      !quizzes.some((quiz) => quiz.questions.length === 0)
    );
  }, [courseTitle, courseDescription, aliasInvalido, courseQuizzesRef]);

  return {
    handleSubmit,
    isFormValid,
    showSuccessModal,
    setShowSuccessModal,
    showUpdateModal,
    setShowUpdateModal,
  };
}
