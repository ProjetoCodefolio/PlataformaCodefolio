import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { canRunCourse } from "$api/utils/permissions";
import {
  fetchCourseDetails,
  checkStudentCourseEnrollment,
} from "$api/services/courses/courses";

/**
 * Controle de acesso à sala de aula (fonte única de verdade). Decide se o
 * aluno pode entrar, independentemente de como chegou (link/alias direto,
 * ?courseId= ou telas de listagem). Regras:
 *   - Curso aberto (sem pinEnabled): acesso livre, sem controle.
 *   - Curso fechado: dono/admin e alunos JÁ matriculados entram direto;
 *     integrantes novos precisam informar o PIN (PinAccessModal).
 * A verificação roda ANTES do carregamento do conteúdo, para que o progresso
 * (que cria o vínculo em studentCourses) nunca seja gravado sem liberação.
 */
export function useCourseAccess({ courseId, userDetails, navigate }) {
  const [accessChecking, setAccessChecking] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  // Evita que o onClose do PinAccessModal (chamado também após um envio válido)
  // redirecione o aluno recém-liberado para fora da sala.
  const accessGrantedRef = useRef(false);

  useEffect(() => {
    if (!courseId) return;

    let cancelled = false;

    const resolveAccess = async () => {
      setAccessChecking(true);
      accessGrantedRef.current = false;
      try {
        const course = await fetchCourseDetails(courseId);
        if (cancelled) return;

        const grant = () => {
          accessGrantedRef.current = true;
          setAccessGranted(true);
          setShowPinModal(false);
        };

        // Curso aberto: nenhum controle de acesso.
        if (!course?.pinEnabled) {
          grant();
          return;
        }

        // Dono, admin ou professor da turma nunca precisam do PIN.
        if (canRunCourse(userDetails, course?.userId, courseId)) {
          grant();
          return;
        }

        // Já ingressou antes: acessa normalmente, sem pedir o PIN de novo.
        let alreadyEnrolled = false;
        if (userDetails?.userId) {
          alreadyEnrolled = await checkStudentCourseEnrollment(
            userDetails.userId,
            courseId
          );
        }
        if (cancelled) return;

        if (alreadyEnrolled) {
          grant();
          return;
        }

        // Integrante novo em curso fechado: exige o PIN.
        setAccessGranted(false);
        setShowPinModal(true);
      } catch (error) {
        console.error("Erro ao verificar acesso ao curso:", error);
        // Em caso de falha na verificação, não libera o acesso.
        setAccessGranted(false);
        setShowPinModal(false);
        toast.error("Não foi possível verificar o acesso ao curso.");
      } finally {
        if (!cancelled) setAccessChecking(false);
      }
    };

    resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [courseId, userDetails?.userId, userDetails?.role]);

  // PIN validado com sucesso: libera a sala. O vínculo em studentCourses é
  // criado naturalmente ao gravar o progresso no carregamento do conteúdo, então
  // em acessos futuros o aluno cai na regra "já matriculado" e não vê mais o PIN.
  const handlePinAccessGranted = () => {
    accessGrantedRef.current = true;
    setShowPinModal(false);
    setAccessGranted(true);
  };

  // Modal fechado. Se foi por um PIN válido, o acesso já foi liberado; caso
  // contrário (backdrop/ESC sem PIN), o aluno não entra e volta para a lista.
  const handlePinModalClose = () => {
    setShowPinModal(false);
    if (!accessGrantedRef.current) {
      navigate("/cursos");
    }
  };

  return {
    accessChecking,
    accessGranted,
    showPinModal,
    handlePinAccessGranted,
    handlePinModalClose,
  };
}
