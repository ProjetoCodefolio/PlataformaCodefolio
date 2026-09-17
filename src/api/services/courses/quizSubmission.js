import { ref, get, set, update } from "firebase/database";
import { database } from "../../config/firebase";
import { normalizeQuizResultId } from "./progressAudit";
import {
  normalizeQuestionList,
  recomputeQuizResult,
  summarizeRecalculation,
} from "./quizRecalculation";
import { gradedQuestions, normalizeGradedFlag } from "./quizGrading";
import { fetchQuizQuestions } from "./quizFetch";
import { ensureQuestionIds } from "./quizQuestions";

/**
 * ==============================
 * FUNÇÕES DE INTERAÇÃO DO ALUNO COM QUIZZES
 * ==============================
 */

/**
 * Valida as respostas do usuário para um quiz
 * @param {Object} userAnswers - Respostas do usuário
 * @param {string} quizId - ID do quiz
 * @param {number} minPercentage - Porcentagem mínima para aprovação
 * @returns {Promise<Object>} - Resultado da validação
 */
export const validateQuizAnswers = async (
  quizId,
  userAnswers,
  minPercentage = 70
) => {
  try {
    // Verificar se quizId é válido
    if (!quizId) {
      throw new Error("quizId é necessário para validar o quiz");
    }

    // Converter quizId para string se não for
    const quizIdStr = String(quizId);

    const quizData = await fetchQuizQuestions(quizIdStr);

    if (
      !quizData ||
      !quizData.questions ||
      !Array.isArray(quizData.questions)
    ) {
      return {
        isPassed: false,
        scorePercentage: 0,
        earnedPoints: 0,
        totalPoints: 0,
      };
    }

    // Só as questões que VALEM NOTA entram na conta: dissertativa é corrigida à
    // mão e questão sem resposta certa (escala Likert) não tem gabarito. Antes
    // daqui passar pelo seam, as dissertativas contavam no total e derrubavam a
    // nota de quem tinha acertado tudo o que dava para acertar.
    const questions = gradedQuestions(quizData.questions);
    const totalPoints = questions.length;
    let earnedPoints = 0;

    // Validar cada resposta
    for (const question of questions) {
      // Garantir que ambos sejam números para comparação
      const userAnswer = Number(userAnswers[question.id]);
      const correctAnswer = Number(question.correctOption);

      // Verificar se a resposta está correta
      if (userAnswer === correctAnswer) {
        earnedPoints++;
      }
    }

    // Sem questão valendo nota (questionário de opinião), responder já é
    // concluir: 100%, como o recálculo também trata. Assim o quiz não trava
    // progresso do curso nem presença.
    const scorePercentage =
      totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 100;

    // Garantir que minPercentage seja um número
    const requiredPercentage = Number(quizData.minPercentage || minPercentage);

    // Determinar aprovação
    const isPassed = scorePercentage >= requiredPercentage;

    return {
      isPassed,
      scorePercentage,
      earnedPoints,
      totalPoints,
      minPercentage: requiredPercentage,
    };
  } catch (error) {
    console.error("Erro ao validar respostas do quiz:", error);
    throw error;
  }
};

/**
 * Marca um quiz como completo.
 *
 * NÃO conta tentativa: `attemptCount` é escrito exclusivamente por
 * `saveQuizResults`, a única função que sabe que houve uma submissão de fato.
 * Semear a contagem aqui fazia com que qualquer caminho que "marcasse
 * conclusão" (inclusive por engano) queimasse uma tentativa do aluno.
 *
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {Object} quizResult - Resultado do quiz
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const markQuizAsCompleted = async (
  userId,
  courseId,
  videoId,
  quizResult
) => {
  try {
    const quizResultRef = ref(
      database,
      `quizResults/${userId}/${courseId}/${videoId}`
    );

    // Check if there's existing data we need to preserve
    const existingSnapshot = await get(quizResultRef);
    let completeData = quizResult;

    if (existingSnapshot.exists()) {
      const existingData = existingSnapshot.val();
      // Only update, don't replace existing fields. A contagem de tentativas
      // gravada por saveQuizResults é preservada como está.
      completeData = {
        ...existingData,
        ...quizResult,
      };
    } else {
      // Sem submissão anterior não há tentativa a registrar: grava só a marca
      // de conclusão, sem inventar attemptCount.
      completeData = {
        ...quizResult,
        lastAttempt: quizResult.completedAt || new Date().toISOString()
      };
    }

    // Update with complete data
    await set(quizResultRef, completeData);

    // Atualizar o progresso do vídeo para mostrar que o quiz foi passado
    const videoProgressRef = ref(
      database,
      `videoProgress/${userId}/${courseId}/${videoId}`
    );
    await update(videoProgressRef, { quizPassed: quizResult.isPassed });

    return true;
  } catch (error) {
    console.error("Erro ao marcar quiz como completo:", error);
    throw error;
  }
};

/**
 * Salva os resultados do quiz
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @param {Object} quizData - Dados do resultado do quiz
 * @param {Object} userAnswers - Respostas do usuário
 * @param {Array} questions - Questões do quiz
 * @returns {Promise<Object>} - Resultado da operação
 */
export const saveQuizResults = async (
  userId,
  courseId,
  videoId,
  quizData,
  userAnswers,
  questions,
  answersDetails = null,
  quizResultId = null,
  isSlide = false
) => {

  try {
    if (!userId || !courseId || !videoId) {
      throw new Error("IDs obrigatórios não fornecidos");
    }

    const { isPassed, scorePercentage, earnedPoints, totalPoints } = quizData;

    // Obter dados do usuário
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const user = userSnapshot.val();

    if (!user) {
      console.error("Usuário não encontrado:", userId);
      throw new Error("Usuário não encontrado");
    }

    // Verificar se já existe um resultado anterior para este quiz
    const resultId = quizResultId || videoId;

    const quizResultRef = ref(
      database,
      `quizResults/${userId}/${courseId}/${resultId}`
    );
    const existingResultSnapshot = await get(quizResultRef);
    const existingResult = existingResultSnapshot.exists()
      ? existingResultSnapshot.val()
      : null;

    // Calcular número da tentativa
    const attemptCount = existingResult
      ? (existingResult.attemptCount || 1) + 1
      : 1;

    // Usar answersDetails se fornecido, caso contrário criar detailedAnswers
    let detailedAnswers = {};

    // Pergunta sem resposta certa: grava a escolha, e SÓ. Um `correctOption`
    // aqui viraria `Number(undefined)` = NaN, valor que o RTDB recusa — a
    // gravação inteira falharia e o aluno perderia a submissão.
    const escolhaSemGabarito = (question, options, userOption) => ({
      question,
      questionType: 'multiple-choice',
      graded: false,
      userAnswer: Number(userOption),
      userAnswerText: options?.[userOption] ?? "Não respondida",
      options: options || [],
    });

    if (answersDetails && Array.isArray(answersDetails)) {
      // Converter array de answersDetails para objeto indexado por questionId
      answersDetails.forEach((detail) => {
        if (detail.questionType !== 'open-ended' && detail.graded === false) {
          detailedAnswers[detail.questionId] = escolhaSemGabarito(
            detail.question,
            detail.options,
            detail.userOption
          );
          return;
        }

        detailedAnswers[detail.questionId] = {
          question: detail.question,
          questionType: detail.questionType || 'multiple-choice',
          ...(detail.questionType === 'open-ended'
            ? {
                answer: detail.answer,
                userAnswer: detail.answer,
              }
            : {
                userAnswer: Number(detail.userOption),
                correctOption: Number(detail.correctOption),
                userAnswerText: detail.options[detail.userOption] || "Não respondida",
                correctOptionText: detail.options[detail.correctOption],
                options: detail.options,
                isCorrect: detail.isCorrect,
              }
          )
        };
      });
    } else {
      // Fallback: criar detailedAnswers apenas com questões de múltipla escolha
      questions.forEach((q) => {
        const userAnswer = userAnswers[q.id];

        if (!normalizeGradedFlag(q.graded)) {
          detailedAnswers[q.id] = escolhaSemGabarito(q.question, q.options, userAnswer);
          return;
        }

        const isCorrect = Number(userAnswer) === Number(q.correctOption);

        detailedAnswers[q.id] = {
          question: q.question,
          questionType: q.questionType || 'multiple-choice',
          userAnswer: Number(userAnswer),
          correctOption: Number(q.correctOption),
          userAnswerText: q.options[userAnswer] || "Não respondida",
          correctOptionText: q.options[q.correctOption],
          options: q.options,
          isCorrect,
        };
      });
    }

    const currentDate = new Date().toISOString();

    // Criar objeto de resultado completo
    const quizResultData = {
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: user.email,
      scorePercentage,
      correctAnswers: earnedPoints,
      totalQuestions: totalPoints,
      isPassed,
      passed: isPassed,
      minPercentage: quizData.minPercentage || 0,
      submittedAt: currentDate,
      lastAttempt: currentDate,
      attemptCount,
      detailedAnswers,
      // Adicionar campos que podem estar sendo adicionados por outro código
      completedAt: currentDate,
      isSlide: Boolean(isSlide),
      quizId: resultId,
      videoId,
      // Adicionar flag para indicar que estes dados são completos
      isComplete: true,
    };

    // IMPORTANTE: Usar set para substituir completamente quaisquer dados anteriores
    await set(quizResultRef, quizResultData);

    // IMPORTANTE: Configurar um segundo salvamento após um pequeno delay
    // Isso ajuda a evitar que outro código sobrescreva os dados
    setTimeout(async () => {
      try {
        await set(quizResultRef, quizResultData);
      } catch (error) {
        console.error("Erro ao salvar dados novamente:", error);
      }
    }, 1500);

    // Atualizar também o progresso do vídeo
    const videoProgressRef = ref(
      database,
      `videoProgress/${userId}/${courseId}/${videoId}`
    );
    await update(videoProgressRef, {
      quizPassed: isPassed,
      hasQuizData: true, // Flag para indicar que existem dados de quiz
    });

    return { success: true, attemptCount };
  } catch (error) {
    console.error("❌ ERRO AO SALVAR RESULTADOS DO QUIZ:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Devolve UMA tentativa de quiz a um aluno (ação do professor).
 *
 * Só mexe no contador: nota, respostas e aprovação continuam gravadas, então o
 * histórico da tentativa já feita não se perde. Serve para casos legítimos de
 * tentativa perdida (queda de conexão, engano, problema técnico).
 *
 * @param {string} userId - ID do aluno
 * @param {string} courseId - ID do curso
 * @param {string} quizResultKey - chave do resultado (id do conteúdo; slides
 *   legados usam o prefixo `slide_`)
 * @returns {Promise<{success: boolean, attemptCount?: number, error?: string}>}
 */
export const restoreQuizAttempt = async (userId, courseId, quizResultKey) => {
  try {
    if (!userId || !courseId || !quizResultKey) {
      return { success: false, error: "Dados insuficientes." };
    }

    const resultRef = ref(
      database,
      `quizResults/${userId}/${courseId}/${quizResultKey}`
    );
    const snapshot = await get(resultRef);

    if (!snapshot.exists()) {
      return { success: false, error: "Este aluno não tem tentativas registradas neste quiz." };
    }

    const current = Number(snapshot.val()?.attemptCount) || 0;
    if (current <= 0) {
      return { success: false, error: "Não há tentativa a devolver neste quiz." };
    }

    const attemptCount = current - 1;
    await update(resultRef, { attemptCount });

    return { success: true, attemptCount };
  } catch (error) {
    console.error("Erro ao devolver tentativa de quiz:", error);
    return { success: false, error: error.message };
  }
};

/** Alunos processados por vez, para não abrir uma conexão por aluno de uma vez só. */
const RECALC_BATCH_SIZE = 25;

/**
 * Reprocessa as notas JÁ GRAVADAS de um quiz contra as questões ATUAIS.
 *
 * Ação do professor, para depois de corrigir uma ou mais questões: a nota é
 * calculada uma única vez, na submissão, então trocar o gabarito não muda nada
 * para quem já fez. O cálculo em si é puro e vive em `quizRecalculation.js`;
 * aqui só há o I/O.
 *
 * Escreve com `update()` no nó de cada aluno — é o único caminho que as regras
 * do banco liberam para o dono do curso (o nível `$courseId` só aceita escrita
 * quando o dado é removido) e preserva tentativas, datas e campos desconhecidos.
 *
 * ATENÇÃO: `saveQuizResults` regrava o nó inteiro 1,5s depois de uma submissão.
 * Um aluno que submeta exatamente durante o recálculo pode ter o recálculo
 * sobrescrito — o recálculo é idempotente, basta rodar de novo (de preferência
 * fora da janela do quiz).
 *
 * @param {string} courseId - ID do curso
 * @param {string} quizResultKey - chave do quiz/resultado (slides legados usam
 *   o prefixo `slide_`)
 * @param {Object} [opts]
 * @param {string} [opts.actorUserId] - quem disparou (gravado em recalculatedBy)
 * @param {boolean} [opts.dryRun=false] - só simula, para a prévia da confirmação
 * @param {boolean} [opts.keepOrphans=true] - manter respostas de questões removidas
 * @returns {Promise<{success: boolean, error?: string, report?: Object}>}
 */
export const recalculateQuizResults = async (
  courseId,
  quizResultKey,
  opts = {}
) => {
  const { actorUserId = null, dryRun = false, keepOrphans = true } = opts;

  try {
    if (!courseId || !quizResultKey) {
      return { success: false, error: "Dados insuficientes." };
    }

    const quizSnapshot = await get(
      ref(database, `courseQuizzes/${courseId}/${quizResultKey}`)
    );
    if (!quizSnapshot.exists()) {
      return { success: false, error: "Quiz não encontrado." };
    }

    const quiz = quizSnapshot.val();
    // Mesma normalização de id feita na leitura do quiz pelo aluno: o recálculo
    // precisa chegar às mesmas chaves que a tela usou para gravar as respostas.
    const questions = normalizeQuestionList(ensureQuestionIds(quiz.questions));

    // Trava contra o quiz meio-editado: sem questões, recalcular zeraria a nota
    // da turma inteira.
    if (questions.length === 0) {
      return {
        success: false,
        error: "O quiz está sem questões: recalcular zeraria a nota de todos.",
      };
    }

    const minPercentage = Number(quiz.minPercentage) || 0;

    const enrolledSnapshot = await get(ref(database, "studentCourses"));
    const enrolled = enrolledSnapshot.exists() ? enrolledSnapshot.val() : {};
    const userIds = Object.entries(enrolled)
      .filter(([, courses]) => courses && courses[courseId])
      .map(([userId]) => userId);

    const usersSnapshot = await get(ref(database, "users"));
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const perStudent = [];
    const changes = [];
    const errors = [];

    for (let i = 0; i < userIds.length; i += RECALC_BATCH_SIZE) {
      const batch = userIds.slice(i, i + RECALC_BATCH_SIZE);

      await Promise.all(
        batch.map(async (userId) => {
          const resultRef = ref(
            database,
            `quizResults/${userId}/${courseId}/${quizResultKey}`
          );

          try {
            const snapshot = await get(resultRef);
            if (!snapshot.exists()) return; // aluno não fez o quiz

            const current = snapshot.val();
            const recalc = recomputeQuizResult(current, questions, minPercentage, {
              keepOrphans,
            });

            const userData = usersData[userId] || {};
            const name =
              userData.displayName ||
              `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
              current.name ||
              userData.email ||
              userId;

            perStudent.push({ ...recalc, userId, name });

            if (recalc.skipped || !recalc.changed) return;

            changes.push({
              userId,
              name,
              before: recalc.before,
              after: recalc.after,
            });

            if (dryRun) return;

            await update(resultRef, {
              ...recalc.updates,
              recalculatedAt: new Date().toISOString(),
              recalculatedBy: actorUserId,
              // Estado anterior gravado junto: torna a operação auditável e
              // explicável para o aluno que questionar a mudança de nota.
              recalculatedFrom: recalc.before,
            });

            // Espelho usado pela lista de conteúdos. Como `isPassed` nunca é
            // rebaixado, este espelho também não é.
            const progressId = current.videoId || normalizeQuizResultId(quizResultKey);
            await update(
              ref(database, `videoProgress/${userId}/${courseId}/${progressId}`),
              { quizPassed: recalc.updates.isPassed, hasQuizData: true }
            );
          } catch (error) {
            // Falha de um aluno não pode abortar a turma.
            console.error(`Erro ao recalcular quiz de ${userId}:`, error);
            errors.push({ userId, error: error.message });
          }
        })
      );
    }

    // O percentual em studentCourses NÃO é escrito aqui: `updateCourseProgress`
    // é a fonte única e precisa da lista completa de conteúdo já resolvida com o
    // estado do aluno. Ele se reconcilia no próximo acesso do aluno ao curso.
    return {
      success: true,
      report: {
        quizId: quizResultKey,
        dryRun,
        totalQuestions: questions.length,
        multipleChoiceQuestions: questions.filter(
          (q) => q.questionType !== "open-ended"
        ).length,
        minPercentage,
        ...summarizeRecalculation(perStudent),
        changes,
        errors,
      },
    };
  } catch (error) {
    console.error("Erro ao recalcular notas do quiz:", error);
    return { success: false, error: error.message };
  }
};
