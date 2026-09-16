import { useEffect, useRef, useState } from "react";
import { checkStudentCourseEnrollment } from "$api/services/courses/courses";
import { enrollStudentInCourse } from "$api/services/courses/students";

/**
 * Modal de registro de dúvida do aluno. Também cobre o link externo
 * (/cursos/{apelido}/questions ou /classes/questions): abre o modal assim
 * que a sala estiver liberada e com o conteúdo carregado, e MATRICULA o
 * aluno no curso — quem chega por este link não passou pelo catálogo, e o
 * professor divulga o endereço esperando que responder a ele já coloque o
 * aluno na turma.
 *
 * Deslogado, quem chega por este link não consegue nem enviar a dúvida (o
 * formulário exige autoria) nem ser matriculado — então o passo aqui é pedir
 * login (via `onRequireLogin`), não abrir o formulário. Sem
 * `userDetails.userId` o efeito volta a rodar sozinho a cada nova checagem
 * de autenticação, e assim que o aluno loga (por popup, sem sair da página)
 * ele cai direto no formulário — sem precisar clicar no link de novo.
 *
 * A matrícula só é gravada se ainda não existir: `enrollStudentInCourse`
 * sobrescreve o registro com progresso 0, o que zeraria o progresso de um
 * aluno que já vinha assistindo ao curso.
 */
export function useStudentQuestions({
  openQuestions,
  accessGranted,
  loadingVideos,
  videosLength,
  userDetails,
  courseId,
  courseTitle,
  onRequireLogin,
}) {
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  // O link externo (/questions) abre o modal uma única vez: sem isto, fechá-lo
  // sem sair da rota faria a tela reabrir sozinha a cada render.
  const questionsLinkHandledRef = useRef(false);

  useEffect(() => {
    if (!openQuestions || questionsLinkHandledRef.current) return;
    if (!accessGranted || loadingVideos || videosLength === 0) return;

    if (!userDetails?.userId) {
      onRequireLogin();
      return;
    }

    questionsLinkHandledRef.current = true;
    setShowQuestionModal(true);

    const matricular = async () => {
      if (!userDetails?.userId || !courseId) return;
      try {
        const jaMatriculado = await checkStudentCourseEnrollment(
          userDetails.userId,
          courseId
        );
        if (jaMatriculado) return;
        await enrollStudentInCourse(userDetails.userId, courseId, {
          title: courseTitle,
        });
      } catch (error) {
        // A matrícula é acessório do link: se falhar, o aluno ainda registra a
        // dúvida (e o vínculo acaba sendo criado pelo progresso do curso).
        console.error("Erro ao matricular o aluno pelo link de dúvidas:", error);
      }
    };
    matricular();
  }, [
    openQuestions,
    accessGranted,
    loadingVideos,
    videosLength,
    userDetails?.userId,
    courseId,
    courseTitle,
  ]);

  return { showQuestionModal, setShowQuestionModal };
}
