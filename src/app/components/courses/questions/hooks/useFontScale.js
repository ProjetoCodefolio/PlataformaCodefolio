import { useCallback, useEffect, useState } from "react";

// Ajuste manual da fonte, POR CIMA do tamanho automático: o automático acerta a
// proporção entre dúvidas, mas não sabe o tamanho da sala nem a distância do
// projetor. Por isso o botão multiplica o valor calculado (em vez de fixar um
// tamanho) — assim uma dúvida longa continua menor que uma curta em qualquer
// ajuste, e nenhuma delas estoura a área de leitura.
export const ESCALA_MINIMA = 0.6;
export const ESCALA_MAXIMA = 2.4;
export const PASSO_DA_ESCALA = 0.02;
const CHAVE_DA_ESCALA = "codefolio:duvidas:escalaDaFonte";

const arredondarEscala = (valor) => Math.round(valor * 100) / 100;

const limitarEscala = (valor) =>
  arredondarEscala(Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, valor)));

const persistirEscala = (valor) => {
  try {
    window.localStorage.setItem(CHAVE_DA_ESCALA, String(valor));
  } catch {
    // Sem armazenamento o ajuste continua valendo nesta sessão.
  }
};

/**
 * A escala escolhida fica no localStorage: o professor a ajusta uma vez para a
 * sala dele e ela sobrevive ao recarregar a página e à aula seguinte — ninguém
 * quer reconfigurar a projeção toda vez que abre a tela.
 */
const lerEscalaSalva = () => {
  try {
    const salva = Number(window.localStorage.getItem(CHAVE_DA_ESCALA));
    if (!Number.isFinite(salva) || salva <= 0) return 1;
    return arredondarEscala(Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, salva)));
  } catch {
    // Navegador com armazenamento bloqueado: segue no tamanho automático.
    return 1;
  }
};

/**
 * Escala manual da fonte da dúvida em cartaz, persistida no localStorage.
 * `escalaTexto` é o buffer do campo de porcentagem: só sincroniza com
 * `fontScale` quando ela muda por outro caminho (+/-, teclado), para o
 * professor poder apagar e reescrever sem o valor ser sobrescrito no meio da
 * digitação.
 */
export function useFontScale() {
  const [fontScale, setFontScale] = useState(lerEscalaSalva);

  const ajustarEscala = useCallback((delta) => {
    setFontScale((atual) => {
      const proxima = limitarEscala(atual + delta);
      persistirEscala(proxima);
      return proxima;
    });
  }, []);

  // Aplica um valor DIGITADO pelo professor (campo de porcentagem), em vez de
  // um passo relativo ao atual — por isso não usa a forma funcional de
  // `setFontScale` como o +/-.
  const definirEscala = useCallback((valor) => {
    if (!Number.isFinite(valor)) return;
    const proxima = limitarEscala(valor);
    persistirEscala(proxima);
    setFontScale(proxima);
  }, []);

  const [escalaTexto, setEscalaTexto] = useState(() => String(Math.round(fontScale * 100)));
  useEffect(() => {
    setEscalaTexto(String(Math.round(fontScale * 100)));
  }, [fontScale]);

  return {
    fontScale,
    escalaTexto,
    setEscalaTexto,
    ajustarEscala,
    definirEscala,
  };
}
