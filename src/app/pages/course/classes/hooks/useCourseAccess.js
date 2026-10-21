import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { fetchCourseDetails } from "$api/services/courses/courses";
import {
  COURSE_ACCESS,
  decideCourseAccess,
  fetchEnrollment,
  frozenReturnMessage,
  reactivateEnrollment,
  returnPromptMessage,
  returnWithPinMessage,
} from "$api/services/courses/enrollment";

/**
 * Controle de acesso à sala de aula (fonte única de verdade). Decide se o
 * aluno pode entrar, independentemente de como chegou (link/alias direto,
 * ?courseId= ou telas de listagem). A decisão em si é `decideCourseAccess`:
 *   - dono, admin, professor da turma e quem está na turma entram direto;
 *   - curso aberto sem matrícula: entra direto;
 *   - curso fechado sem matrícula: pede o PIN (PinAccessModal);
 *   - matrícula encerrada (saiu ou foi removido): pergunta se quer voltar. No
 *     curso fechado, o PIN vale como a confirmação. Voltar reativa a mesma
 *     matrícula; abrir o curso nunca a reativa sozinho;
 *   - matrícula encerrada em disciplina encerrada: não há volta.
 * A verificação roda ANTES do carregamento do conteúdo, para que o progresso
 * (que cria o vínculo em studentCourses) nunca seja gravado sem liberação.
 */
export function useCourseAccess({ courseId, userDetails, navigate }) {
  const [accessChecking, setAccessChecking] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returning, setReturning] = useState(false);
  // Texto do gate para quem tem matrícula encerrada: a pergunta da volta, o
  // aviso atrás do PIN ou a recusa da disciplina encerrada.
  const [gateMessage, setGateMessage] = useState("");
  const [returnBlocked, setReturnBlocked] = useState(false);
  // Evita que o onClose do PinAccessModal (chamado também após um envio válido)
  // redirecione o aluno recém-liberado para fora da sala.
  const accessGrantedRef = useRef(false);
  // A liberação pelo PIN reativa a matrícula quando ela está encerrada.
  const mustReactivateRef = useRef(false);

  useEffect(() => {
    if (!courseId) return;

    let cancelled = false;

    const resolveAccess = async () => {
      setAccessChecking(true);
      setShowReturnDialog(false);
      setReturnBlocked(false);
      setGateMessage("");
      accessGrantedRef.current = false;
      mustReactivateRef.current = false;
      try {
        const [course, matricula] = await Promise.all([
          fetchCourseDetails(courseId),
          fetchEnrollment(userDetails?.userId, courseId),
        ]);
        if (cancelled) return;

        const acesso = decideCourseAccess({ userDetails, course, courseId, matricula });

        if (acesso.decision === COURSE_ACCESS.GRANT) {
          accessGrantedRef.current = true;
          setAccessGranted(true);
          setShowPinModal(false);
          return;
        }

        setAccessGranted(false);

        if (acesso.decision === COURSE_ACCESS.FROZEN) {
          setReturnBlocked(true);
          setGateMessage(frozenReturnMessage(acesso));
          return;
        }

        if (acesso.decision === COURSE_ACCESS.RETURN && !acesso.needsPin) {
          setGateMessage(returnPromptMessage(acesso));
          setShowReturnDialog(true);
          return;
        }

        if (acesso.decision === COURSE_ACCESS.RETURN) {
          mustReactivateRef.current = true;
          setGateMessage(returnWithPinMessage(acesso));
        }
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
    // Só uid e papel global mudam a decisão; o objeto userDetails inteiro é
    // recriado a cada atualização do contexto e reabriria o gate à toa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userDetails?.userId, userDetails?.role]);

  const reactivateAndGrant = async () => {
    setReturning(true);
    try {
      await reactivateEnrollment({ userId: userDetails?.userId, courseId });
      accessGrantedRef.current = true;
      setShowReturnDialog(false);
      setAccessGranted(true);
      toast.success("Você voltou para a turma.");
    } catch (error) {
      console.error("Erro ao voltar para a turma:", error);
      accessGrantedRef.current = false;
      toast.error(error.message || "Não foi possível voltar para a turma.");
      navigate("/cursos");
    } finally {
      setReturning(false);
    }
  };

  // PIN validado com sucesso: libera a sala. Sem matrícula, o vínculo em
  // studentCourses é criado ao gravar o progresso no carregamento do conteúdo,
  // e em acessos futuros o aluno cai em "está na turma" e não vê mais o PIN.
  // Com matrícula encerrada, o PIN é a confirmação da volta: reativa antes.
  const handlePinAccessGranted = () => {
    // Marca antes de qualquer espera: o modal chama onClose logo depois.
    accessGrantedRef.current = true;
    setShowPinModal(false);
    if (mustReactivateRef.current) {
      reactivateAndGrant();
      return;
    }
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

  const handleReturnConfirm = () => reactivateAndGrant();

  const handleReturnCancel = () => {
    setShowReturnDialog(false);
    navigate("/cursos");
  };

  return {
    accessChecking,
    accessGranted,
    showPinModal,
    handlePinAccessGranted,
    handlePinModalClose,
    showReturnDialog,
    returning,
    gateMessage,
    returnBlocked,
    handleReturnConfirm,
    handleReturnCancel,
  };
}
