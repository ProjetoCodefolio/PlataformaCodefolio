import { extrairArrayDeQuestoes } from "./responseParser";
import {
  resolveCorrectOption,
  GABARITO_INDETERMINADO,
} from "../questionApiClient";
import { LIKERT_5_SCALE } from "../quizGrading";

/**
 * Teto de questões por colagem. Acima disso a área de conferência, que
 * renderiza cada questão com edição inline, fica pesada demais para ser útil.
 */
export const MAX_QUESTOES_POR_COLAGEM = 100;

/** Limites de alternativas que o editor de questões já impõe na tela. */
const MIN_ALTERNATIVAS = 2;
const MAX_ALTERNATIVAS = 5;

const ehTextoPreenchido = (valor) =>
  typeof valor === "string" && valor.trim() !== "";

const textoOpcional = (valor) =>
  ehTextoPreenchido(valor) ? valor.trim() : undefined;

const numeroPositivo = (valor) =>
  Number(valor) > 0 ? Number(valor) : undefined;

const aplicarImagem = (destino, origem) => {
  const url = textoOpcional(origem.imageUrl);
  if (!url) return;

  destino.imageUrl = url;
  const largura = numeroPositivo(origem.imageWidth);
  const altura = numeroPositivo(origem.imageHeight);
  if (largura) destino.imageWidth = largura;
  if (altura) destino.imageHeight = altura;
};

const ehAberta = (bruta) =>
  bruta.questionType === "open-ended" || !Array.isArray(bruta.options);

/**
 * Converte uma questão colada no formato interno da plataforma.
 * @param {Object} bruta - Questão como veio no JSON
 * @returns {{questao: Object|null, problemas: string[]}}
 */
const converterQuestao = (bruta) => {
  const problemas = [];

  if (!bruta || typeof bruta !== "object" || Array.isArray(bruta)) {
    return { questao: null, problemas: ["não é um objeto"] };
  }

  if (!ehTextoPreenchido(bruta.question)) {
    problemas.push('campo "question" ausente ou vazio');
  }

  // O `id` que vier na colagem é ignorado de propósito: quem dá o id é a
  // gravação. Aceitá-lo é o caminho para dois quizzes com a mesma questão,
  // que é a versão colada do bug de questão sem id.
  const questao = { question: String(bruta.question || "").trim() };
  aplicarImagem(questao, bruta);

  if (ehAberta(bruta)) {
    questao.questionType = "open-ended";
    const esperada = textoOpcional(bruta.expectedAnswer);
    if (esperada) questao.expectedAnswer = esperada;
    return { questao: problemas.length === 0 ? questao : null, problemas };
  }

  const alternativas = bruta.options;
  if (alternativas.length < MIN_ALTERNATIVAS) {
    problemas.push(
      `"options" tem ${alternativas.length} alternativa(s), o mínimo é ${MIN_ALTERNATIVAS}`
    );
  } else if (alternativas.length > MAX_ALTERNATIVAS) {
    problemas.push(
      `"options" tem ${alternativas.length} alternativas, o máximo é ${MAX_ALTERNATIVAS}`
    );
  }

  if (!alternativas.every(ehTextoPreenchido)) {
    problemas.push("há alternativa vazia em \"options\"");
  }

  questao.questionType = "multiple-choice";
  questao.options = alternativas.map((opt) => String(opt).trim());

  // Pergunta sem resposta certa (enquete, escala Likert): não exige gabarito.
  if (bruta.graded === false) {
    questao.graded = false;
    if (bruta.scale === LIKERT_5_SCALE) questao.scale = LIKERT_5_SCALE;
    else if (bruta.scale != null) problemas.push(`"scale" desconhecida: ${bruta.scale}`);
    return { questao: problemas.length === 0 ? questao : null, problemas };
  }

  const gabarito = resolverGabarito(bruta, questao.options);
  if (gabarito === GABARITO_INDETERMINADO) {
    problemas.push(descreverProblemaDeGabarito(bruta));
  } else {
    questao.correctOption = gabarito;
  }

  return { questao: problemas.length === 0 ? questao : null, problemas };
};

/**
 * Lê o gabarito aceitando `correctOption` (índice) ou `correct_answer` (letra,
 * número ou o texto da alternativa), reusando a resolução da Question API.
 */
const resolverGabarito = (bruta, alternativas) => {
  if (bruta.correctOption != null) {
    const indice = Number(bruta.correctOption);
    const inteiroNoIntervalo =
      Number.isInteger(indice) && indice >= 0 && indice < alternativas.length;
    return inteiroNoIntervalo ? indice : GABARITO_INDETERMINADO;
  }

  return resolveCorrectOption(bruta.correct_answer, alternativas);
};

const descreverProblemaDeGabarito = (bruta) => {
  if (bruta.correctOption != null) {
    return `"correctOption" (${bruta.correctOption}) fora do intervalo das alternativas`;
  }
  if (bruta.correct_answer != null) {
    return `"correct_answer" (${bruta.correct_answer}) não corresponde a nenhuma alternativa`;
  }
  return 'gabarito ausente: informe "correctOption" ou "correct_answer"';
};

/**
 * Interpreta o JSON de questões que o professor colou na tela.
 *
 * Não grava nada: devolve as questões no formato que a área de conferência do
 * gerador já entende, para que a colagem seja uma segunda FONTE da mesma
 * esteira e não um segundo caminho de gravação.
 *
 * Com qualquer questão inválida a importação inteira é barrada, e cada erro
 * diz a posição e o motivo. Importar as válidas e engolir o resto deixa o
 * professor sem saber o que faltou.
 *
 * @param {string} texto - Conteúdo colado pelo professor
 * @returns {{questoes: Object[], erros: string[]}}
 */
export const parseQuestoesColadas = (texto) => {
  if (!ehTextoPreenchido(texto)) {
    return { questoes: [], erros: ["Cole o JSON das questões antes de conferir."] };
  }

  let brutas;
  try {
    brutas = extrairArrayDeQuestoes(texto);
  } catch (error) {
    return {
      questoes: [],
      erros: [
        error?.details?.parseError ||
          error?.message ||
          "Não foi possível interpretar o JSON colado.",
      ],
    };
  }

  if (!Array.isArray(brutas) || brutas.length === 0) {
    return { questoes: [], erros: ["Nenhuma questão encontrada no JSON colado."] };
  }

  if (brutas.length > MAX_QUESTOES_POR_COLAGEM) {
    return {
      questoes: [],
      erros: [
        `A colagem tem ${brutas.length} questões e o limite é ${MAX_QUESTOES_POR_COLAGEM}. Divida em partes.`,
      ],
    };
  }

  const questoes = [];
  const erros = [];

  brutas.forEach((bruta, indice) => {
    const { questao, problemas } = converterQuestao(bruta);
    if (problemas.length > 0) {
      erros.push(`Questão ${indice + 1}: ${problemas.join("; ")}`);
      return;
    }
    questoes.push(questao);
  });

  return erros.length > 0 ? { questoes: [], erros } : { questoes, erros };
};
