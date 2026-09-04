import { useCallback, useRef } from "react";

// Altura da Topbar (topbar.css: `position: fixed`, `height: 50px`) mais uma
// folga. Sem essa margem o `scrollIntoView` alinha o topo do formulário com o
// topo da janela, que é justamente onde a barra roxa está — o título "Editar
// ..." fica atrás dela e o professor não vê que o formulário trocou de modo.
const OFFSET_DA_TOPBAR = 66;

// A rolagem não pode acontecer no mesmo tick do clique: o handler de edição
// preenche o formulário via setState, e só depois do commit do React o
// container tem a altura final. Rolar antes disso mira na posição errada.
const ESPERA_ATE_O_FORM_RENDERIZAR = 100;

/**
 * Em listas longas, o formulário de edição fica no topo da aba e o botão de
 * editar no meio da lista: sem rolar, clicar em editar não dá sinal nenhum de
 * que alguma coisa aconteceu. Este hook liga as duas pontas.
 *
 * Uso:
 *   const [formRef, scrollToForm] = useScrollToForm();
 *   ...
 *   <Paper ref={formRef}>   // container do formulário
 *   const handleEdit = (item) => { preencheOForm(item); scrollToForm(); };
 *
 * @returns {[React.RefObject, () => void]} ref do container e a função de rolar
 */
export const useScrollToForm = () => {
  const formRef = useRef(null);

  const scrollToForm = useCallback(() => {
    setTimeout(() => {
      const node = formRef.current;
      if (!node) return;
      // Aplicado aqui, e não no `sx` de cada aba, para que o desconto da
      // Topbar não dependa de cada chamador lembrar dele.
      node.style.scrollMarginTop = `${OFFSET_DA_TOPBAR}px`;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, ESPERA_ATE_O_FORM_RENDERIZAR);
  }, []);

  return [formRef, scrollToForm];
};

export default useScrollToForm;
