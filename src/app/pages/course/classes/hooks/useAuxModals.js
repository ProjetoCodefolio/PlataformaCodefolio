import { useEffect, useRef, useState } from "react";

/**
 * Modais de login e conclusão de curso: compartilham o mesmo `modalRef` e o
 * mesmo efeito de medição de dimensões (usado para posicionar o conteúdo do
 * modal). Quem abre cada um vem de lugares diferentes (login vem de
 * dúvidas/porta do quiz; conclusão vem do carregamento de conteúdo) — por
 * isso o hook fica "burro", só estado + medição.
 */
export function useAuxModals() {
  const [showLogInModal, setShowLogInModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const modalRef = useRef(null);
  const [modalDimensions, setModalDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (showCompletionModal && modalRef.current) {
      const { offsetWidth, offsetHeight } = modalRef.current;
      setModalDimensions({ width: offsetWidth, height: offsetHeight });
    }

    if (showLogInModal && modalRef.current) {
      const { offsetWidth, offsetHeight } = modalRef.current;
      setModalDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, [showCompletionModal, showLogInModal]);

  return {
    showLogInModal,
    setShowLogInModal,
    showCompletionModal,
    setShowCompletionModal,
    modalRef,
    modalDimensions,
  };
}
