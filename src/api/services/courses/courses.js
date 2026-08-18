import { ref, get, set, push, update } from "firebase/database";
import { database } from "../../config/firebase";
import { recalcCourseProgressFromWatched } from './students';
import { hashPin, encryptPin, decryptPin } from './pin';
import { isAliasAvailable, isAliasFormatValid } from "./alias";

/** PIN de 7 dígitos, o mesmo formato aceito pelo campo do formulário. */
const gerarPinAleatorio = () =>
  Math.floor(1000000 + Math.random() * 9000000).toString();

/**
 * Grava o PIN no objeto do curso e apaga o valor bruto.
 *
 * Os DOIS campos precisam andar juntos: `pinHash` é o que valida a entrada do
 * aluno (mão única) e `encryptedPin` é o que permite ao professor consultar o
 * PIN depois. Gravar só o hash — como a atualização fazia — deixava o curso com
 * um PIN que ninguém mais conseguia ler, e o formulário passava a exibir um
 * texto no lugar dele.
 *
 * @param {Object} courseData - objeto que será persistido (alterado no lugar)
 * @param {string} courseId - id do curso, usado como sal/chave
 * @param {string} rawPin - PIN em texto puro
 */
const aplicarPinAoCurso = (courseData, courseId, rawPin) => {
  courseData.encryptedPin = encryptPin(rawPin, courseId);
  courseData.pinHash = hashPin(rawPin, courseId);
  delete courseData.pin;
};

export const fetchCourses = async (limit) => {
  try {
    const coursesRef = ref(database, "courses");
    const snapshot = await get(coursesRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const coursesArray = Object.entries(data).map(([courseId, course]) => ({
        courseId,
        ...course,
      }));
      
      return limit ? coursesArray.slice(0, limit) : coursesArray;
    }
    return [];
  } catch (error) {
    console.error("Erro ao carregar cursos:", error);
    return [];
  }
};

export const checkStudentCourseEnrollment = async (userId, courseId) => {
  try {
    const courseStudentsRef = ref(database, `studentCourses/${userId}/${courseId}`);
    const snapshot = await get(courseStudentsRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Erro ao verificar se o estudante está inscrito no curso:", error);
    return false;
  }
};

export const fetchTeacherCourses = async (userId) => {
  if (!userId) return null;
  
  try {
    const coursesTeacherRef = ref(database, `users/${userId}/coursesTeacher`);
    const snapshot = await get(coursesTeacherRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar cursos do professor:", error);
    return null;
  }
};

/**
 * Carrega todos os cursos e os categoriza por status (disponível, em progresso, concluído)
 * @param {string} userId - ID do usuário ou null se não estiver logado
 * @returns {Promise<{availableCourses, inProgressCourses, completedCourses}>}
 */
export const loadCategorizedCourses = async (userId) => {
  try {
    // Buscar todos os cursos
    const coursesRef = ref(database, "courses");
    const snapshot = await get(coursesRef);
    if (!snapshot.exists()) return { availableCourses: [], inProgressCourses: [], completedCourses: [] };

    const coursesData = snapshot.val();
    const coursesArray = Object.entries(coursesData)
      .map(([courseId, course]) => ({
        courseId,
        ...course,
      }))
      // Cursos arquivados só aparecem para o owner, na aba "Gerenciar Meus Cursos".
      // Em qualquer catálogo/listagem geral eles ficam ocultos.
      .filter((course) => !course.archived);

    // Se o usuário estiver logado, buscar o progresso dos cursos do usuário
    if (userId) {
      return await loadUserCourses(userId, coursesArray);
    } else {
      // Caso contrário, carregar progresso da sessão para usuários não logados
      return await loadAnonymousCourses(coursesArray);
    }
  } catch (error) {
    console.error("Erro ao carregar cursos:", error);
    return { availableCourses: [], inProgressCourses: [], completedCourses: [] };
  }
};

/**
 * Carrega os cursos para um usuário logado
 * @param {string} userId - ID do usuário
 * @param {Array} coursesArray - Array de cursos
 * @returns {Promise<{availableCourses, inProgressCourses, completedCourses}>}
 */
const loadUserCourses = async (userId, coursesArray) => {
  try {
    const studentCoursesRef = ref(database, `studentCourses/${userId}`);
    const studentSnapshot = await get(studentCoursesRef);
    const studentCourses = studentSnapshot.val() || {};

    const enrichedCourses = coursesArray.map((course) => {
      const studentCourse = studentCourses[course.courseId] || {};
      return {
        ...course,
        progress: studentCourse.progress !== undefined ? studentCourse.progress : 0,
        accessed: studentCourse.progress !== undefined,
        status: studentCourse.status || "available",
      };
    });

    const available = enrichedCourses.filter((course) => !course.accessed);
    const inProgress = enrichedCourses.filter((course) => course.accessed && course.status === "in_progress");
    const completed = enrichedCourses.filter((course) => course.status === "completed");

    return { 
      availableCourses: available,
      inProgressCourses: inProgress,
      completedCourses: completed
    };
  } catch (error) {
    console.error("Erro ao carregar cursos do usuário:", error);
    return { availableCourses: [], inProgressCourses: [], completedCourses: [] };
  }
};

/**
 * Carrega os cursos para um usuário anônimo
 * @param {Array} coursesArray - Array de cursos
 * @returns {Promise<{availableCourses, inProgressCourses, completedCourses}>}
 */
const loadAnonymousCourses = async (coursesArray) => {
  try {
    const storedProgress = sessionStorage.getItem("videoProgress");
    let localProgress = {};

    if (storedProgress) {
      const progressArray = JSON.parse(storedProgress);
      localProgress = progressArray.reduce((acc, video) => {
        const courseId = video.courseId;
        if (!acc[courseId]) {
          acc[courseId] = { totalVideos: 0, completedVideos: 0 };
        }
        acc[courseId].totalVideos += 1;
        if (video.watched && (!video.quizId || video.quizPassed)) {
          acc[courseId].completedVideos += 1;
        }
        return acc;
      }, {});
    }

    const enrichedCourses = await Promise.all(
      coursesArray.map(async (course) => {
        const courseVideosRef = ref(database, `courseVideos/${course.courseId}`);
        const courseContentRef = ref(database, `courseContent/${course.courseId}`);
        const [videoSnapshot, contentSnapshot] = await Promise.all([
          get(courseVideosRef),
          get(courseContentRef),
        ]);
        const videosData = videoSnapshot.val() || {};
        // Vídeos da nova collection unificada também contam no total
        // (slides ficam fora do denominador, como no formato legado).
        const contentData = contentSnapshot.val() || {};
        const contentVideosCount = Object.values(contentData).filter(
          (item) => item && typeof item === "object" && item.category !== "slide"
        ).length;
        const totalVideos = Object.keys(videosData).length + contentVideosCount;
        const progressData = localProgress[course.courseId] || { totalVideos: 0, completedVideos: 0 };
        const effectiveTotal = Math.max(totalVideos, progressData.totalVideos);
        const progress = effectiveTotal > 0 ? (progressData.completedVideos / effectiveTotal) * 100 : 0;

        return {
          ...course,
          progress,
          accessed: progressData.totalVideos > 0,
        };
      })
    );

    const available = enrichedCourses.filter((course) => !course.accessed);
    const inProgress = enrichedCourses.filter((course) => course.accessed && course.progress < 100);
    const completed = enrichedCourses.filter((course) => course.progress === 100);

    return { 
      availableCourses: available,
      inProgressCourses: inProgress,
      completedCourses: completed
    };
  } catch (error) {
    console.error("Erro ao carregar cursos para usuário anônimo:", error);
    return { availableCourses: [], inProgressCourses: [], completedCourses: [] };
  }
};

/**
 * Filtra cursos por termo de pesquisa
 * @param {Array} courses - Array de cursos a serem filtrados
 * @param {string} searchTerm - Termo de pesquisa
 * @returns {Array} Cursos filtrados
 */
export const filterCoursesBySearchTerm = (courses, searchTerm) => {
  const term = searchTerm.toLowerCase();
  return courses.filter(
    (course) =>
      course.title.toLowerCase().includes(term) ||
      (course.description && course.description.toLowerCase().includes(term))
  );
};

/**
 * Busca os cursos criados por um usuário específico
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} - Array de cursos
 */
export const fetchUserCreatedCourses = async (userId) => {
  try {
    if (!userId) {
      return [];
    }

    const coursesRef = ref(database, "courses");
    const snapshot = await get(coursesRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const coursesData = Object.entries(data)
        .map(([courseId, course]) => ({
          courseId,
          ...course,
        }))
        .filter((course) => course.userId === userId);

      return coursesData;
    } 
    
    return [];
  } catch (error) {
    console.error("Erro ao carregar cursos do usuário:", error);
    throw error;
  }
};

/**
 * Deleta um curso e todas as suas referências
 * @param {string} courseId - ID do curso a ser deletado
 * @returns {Promise<{success: boolean, message: string}>} - Resultado da operação
 */
export const deleteCourse = async (courseId) => {
  try {
    if (!courseId) {
      return { success: false, message: "ID do curso não fornecido" };
    }

    // O Realtime Database não tem deleção em cascata nativa: precisamos remover
    // manualmente o curso e TODOS os nós que o referenciam. Montamos um único
    // objeto `updates` e aplicamos com um update() para que a remoção seja atômica.
    const updates = {};

    // Conteúdo do curso (nós chaveados por courseId)
    updates[`courses/${courseId}`] = null;
    updates[`courseVideos/${courseId}`] = null;
    updates[`courseContent/${courseId}`] = null;
    updates[`courseQuizzes/${courseId}`] = null;
    updates[`courseSlides/${courseId}`] = null;
    updates[`courseMaterials/${courseId}`] = null;
    updates[`courseAssessments/${courseId}`] = null;
    updates[`courseAdvancedSettings/${courseId}`] = null;
    updates[`courseAttendanceSettings/${courseId}`] = null;

    // Trabalhos: enunciados, grupos e entregas dos alunos
    updates[`courseAssignments/${courseId}`] = null;
    updates[`assignmentGroups/${courseId}`] = null;
    updates[`assignmentSubmissions/${courseId}`] = null;

    // Resultados de quizzes (nós chaveados por courseId)
    updates[`customQuizResults/${courseId}`] = null;
    updates[`liveQuizResults/${courseId}`] = null;
    updates[`openEndedAnswers/${courseId}`] = null;
    updates[`quizGigi/${courseId}`] = null;

    // Alias reverso (courseAliases é chaveado pelo alias, não pelo courseId).
    // Varremos o nó procurando QUALQUER chave que aponte para este curso, em
    // vez de confiar só no campo `alias` do curso: mapeamentos órfãos deixados
    // por versões anteriores não têm correspondência no campo e sobreviveriam
    // à exclusão, mantendo /cursos/{apelido} apontando para um curso que não
    // existe mais.
    const aliasesSnapshot = await get(ref(database, "courseAliases"));
    const aliasesData = aliasesSnapshot.val();
    if (aliasesData) {
      Object.entries(aliasesData).forEach(([aliasKey, aliasData]) => {
        if (aliasData && aliasData.courseId === courseId) {
          updates[`courseAliases/${aliasKey}`] = null;
        }
      });
    }

    // Dados por usuário: matrículas, progresso, resultados e flag de professor.
    // Esses nós são chaveados por userId, então precisamos varrê-los procurando
    // entradas deste curso.
    const [
      studentCoursesSnap,
      videoProgressSnap,
      quizResultsSnap,
      usersSnap,
      notificationPrefsSnap,
      notificationsSnap,
      reportsSnap,
    ] = await Promise.all([
      get(ref(database, "studentCourses")),
      get(ref(database, "videoProgress")),
      get(ref(database, "quizResults")),
      get(ref(database, "users")),
      get(ref(database, "notificationPrefs")),
      get(ref(database, "notifications")),
      get(ref(database, "reports")),
    ]);

    const addPerUserCourse = (snapshot, buildPath) => {
      const data = snapshot.val();
      if (!data) return;
      Object.keys(data).forEach((userId) => {
        if (data[userId] && data[userId][courseId] !== undefined) {
          updates[buildPath(userId)] = null;
        }
      });
    };

    addPerUserCourse(studentCoursesSnap, (u) => `studentCourses/${u}/${courseId}`);
    addPerUserCourse(videoProgressSnap, (u) => `videoProgress/${u}/${courseId}`);
    addPerUserCourse(quizResultsSnap, (u) => `quizResults/${u}/${courseId}`);
    addPerUserCourse(
      notificationPrefsSnap,
      (u) => `notificationPrefs/${u}/${courseId}`
    );

    // Notificações e reportes não são chaveados por curso: guardam o courseId
    // como campo, então precisam ser filtrados pelo conteúdo.
    const addPorCampoCourseId = (snapshot, buildPath) => {
      const data = snapshot.val();
      if (!data) return;
      Object.entries(data).forEach(([chavePai, filhos]) => {
        if (!filhos || typeof filhos !== "object") return;
        Object.entries(filhos).forEach(([chaveFilho, item]) => {
          if (item && item.courseId === courseId) {
            updates[buildPath(chavePai, chaveFilho)] = null;
          }
        });
      });
    };

    // notifications/{userId}/{notificationId}
    addPorCampoCourseId(notificationsSnap, (u, id) => `notifications/${u}/${id}`);

    // reports/{reportId} — um nível só, então embrulhamos para reusar a varredura
    const reportsData = reportsSnap.val();
    if (reportsData) {
      Object.entries(reportsData).forEach(([reportId, report]) => {
        if (report && report.courseId === courseId) {
          updates[`reports/${reportId}`] = null;
        }
      });
    }

    // Flag de professor: users/{userId}/coursesTeacher/{courseId}
    const usersData = usersSnap.val();
    if (usersData) {
      Object.keys(usersData).forEach((userId) => {
        const coursesTeacher = usersData[userId]?.coursesTeacher;
        if (coursesTeacher && coursesTeacher[courseId] !== undefined) {
          updates[`users/${userId}/coursesTeacher/${courseId}`] = null;
        }
      });
    }

    // Remove tudo de uma vez (atômico)
    await update(ref(database), updates);

    return { success: true, message: "Curso deletado com sucesso" };
  } catch (error) {
    console.error("Erro ao deletar curso:", error);
    return { success: false, message: "Erro ao deletar o curso: " + error.message };
  }
};

/**
 * Arquiva ou desarquiva um curso.
 * Um curso arquivado deixa de aparecer em catálogos/listagens e o acesso direto
 * (link/alias) é bloqueado para quem não é o owner. Ele continua visível apenas
 * para o owner, na aba "Gerenciar Meus Cursos".
 * @param {string} courseId - ID do curso
 * @param {boolean} archived - true para arquivar, false para desarquivar
 * @returns {Promise<{success: boolean, archived?: boolean, message: string}>}
 */
export const setCourseArchived = async (courseId, archived) => {
  try {
    if (!courseId) {
      return { success: false, message: "ID do curso não fornecido" };
    }

    await update(ref(database, `courses/${courseId}`), {
      archived: !!archived,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      archived: !!archived,
      message: archived
        ? "Curso arquivado com sucesso"
        : "Curso desarquivado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao arquivar/desarquivar curso:", error);
    return {
      success: false,
      message: "Erro ao atualizar o curso: " + error.message,
    };
  }
};

export const updateAllUsersCourseProgress = async (courseId, videos) => {
  try {
    // Obter todos os usuários que estão matriculados no curso
    const studentCoursesRef = ref(database, `studentCourses`);
    const snapshot = await get(studentCoursesRef);
    
    if (!snapshot.exists()) return;
    
    const studentCourses = snapshot.val();
    const totalVideos = videos.length;
    
    for (const userId in studentCourses) {
      if (studentCourses[userId][courseId]) {
        await recalcCourseProgressFromWatched(userId, courseId, videos, totalVideos);
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar progresso do curso:", error);
    throw error;
  }
};

/**
 * Busca detalhes de um curso específico
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object|null>} - Dados do curso ou null se não encontrado
 */
export const fetchCourseDetails = async (courseId) => {
  try {
    if (!courseId) return null;
    
    const courseRef = ref(database, `courses/${courseId}`);
    const courseSnapshot = await get(courseRef);
    
    if (courseSnapshot.exists()) {
      const courseData = courseSnapshot.val();
      
      // PIN para exibição ao professor. Só é recuperável quando existe a versão
      // criptografada; cursos antigos guardam apenas o hash, que é de mão única.
      // `pinKnown` diz ao formulário qual é o caso — antes devolvíamos aqui o
      // texto "[PIN configurado]" no lugar do PIN, e esse texto voltava no
      // salvamento e virava o PIN real do curso.
      courseData.pinKnown = false;
      if (courseData.pinEnabled && courseData.encryptedPin) {
        const pinDecifrado = decryptPin(courseData.encryptedPin, courseId);
        if (pinDecifrado && pinDecifrado !== "[PIN inválido]") {
          courseData.pin = pinDecifrado;
          courseData.pinKnown = true;
        }
      }
      
      return courseData;
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar detalhes do curso:", error);
    throw error;
  }
};

/**
 * Cria um novo curso
 * @param {Object} courseData - Dados do curso a ser criado
 * @param {string} userId - ID do usuário criador do curso
 * @returns {Promise<{courseId: string, courseData: Object}>} - ID do curso criado e dados
 */
export const createCourse = async (courseData, userId, courseAlias = null) => {
  try {
    // Validação básica
    if (!userId || !courseData.title || !courseData.description) {
      throw new Error("Dados insuficientes para criar o curso");
    }
    
    const courseRef = ref(database, "courses");
    const newCourseRef = push(courseRef);
    
    // Importante: obter a key ANTES de salvar o curso
    const courseKey = newCourseRef.key;
    
    const finalCourseData = {
      ...courseData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Processar o PIN, mas NUNCA salvar o valor bruto
    if (finalCourseData.pinEnabled) {
      const rawPin = finalCourseData.pin || gerarPinAleatorio();

      aplicarPinAoCurso(finalCourseData, courseKey, rawPin);

      // Salvar no banco
      await set(newCourseRef, finalCourseData);
      
      // Adicionar o PIN original no objeto retornado
      finalCourseData.pin = rawPin;
    } else {
      // Salvar o curso normalmente
      await set(newCourseRef, finalCourseData);
    }

    // O apelido pode chegar pelo parâmetro ou dentro dos dados do curso — o
    // formulário manda nos dois lugares. Aceitar os dois evita um curso salvo
    // com `alias` no registro e sem o mapeamento correspondente.
    const aliasFinal = String(courseAlias || finalCourseData.alias || "").trim();
    if (aliasFinal && isAliasFormatValid(aliasFinal)) {
      await set(ref(database, `courseAliases/${aliasFinal}`), {
        courseId: courseKey,
      });
    }

    return { 
      courseId: courseKey,
      courseData: finalCourseData // Contém o PIN original para o admin
    };
  } catch (error) {
    console.error("Erro ao criar curso:", error);
    throw error;
  }
};

/**
 * Atualiza um curso existente
 * @param {string} courseId - ID do curso a ser atualizado
 * @param {Object} courseData - Novos dados do curso
 * @returns {Promise<{success: boolean, courseData: Object}>} - Status da operação
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso é obrigatório para atualização");
    }
    
    // Obter dados atuais do curso para preservar o userId original
    const courseRef = ref(database, `courses/${courseId}`);
    const currentCourseSnapshot = await get(courseRef);
    
    if (!currentCourseSnapshot.exists()) {
      throw new Error("Curso não encontrado");
    }
    
    const currentCourse = currentCourseSnapshot.val();
    
    // Criar uma cópia do objeto para não modificar o original
    const updatedData = {
      ...courseData,
      updatedAt: new Date().toISOString(),
      userId: currentCourse.userId // Preservar o userId original (owner) - nunca pode mudar
    };
    
    // PIN. O formulário só manda `pin` quando o professor realmente digitou um
    // valor novo; campo vazio com PIN ligado significa "mantenha o que já
    // existe". Gravar aqui só o hash (como era feito) deixava o curso com um
    // PIN que ninguém mais conseguia consultar, porque a versão criptografada
    // continuava sendo a antiga.
    if ("pinEnabled" in courseData) {
      if (updatedData.pinEnabled) {
        if (updatedData.pin) {
          aplicarPinAoCurso(updatedData, courseId, updatedData.pin);
        } else {
          delete updatedData.pin;
        }
      } else {
        // Curso reaberto: não deixa a credencial antiga para trás, senão
        // religar o PIN mais tarde ressuscitaria um valor que o professor já
        // não conhece.
        delete updatedData.pin;
        updatedData.pinHash = null;
        updatedData.encryptedPin = null;
      }
    }
    
    // Apelido. `courseAliases` é um índice reverso chaveado PELO apelido, então
    // trocá-lo é apagar uma chave e criar outra. Duas coisas mudaram aqui:
    //
    //  - limpar o campo agora REMOVE o mapeamento. Antes o bloco todo estava
    //    sob `if (courseData.alias)`: apagar o apelido deixava o curso com
    //    alias vazio mas /cursos/{antigo} continuava resolvendo, e como a
    //    exclusão do curso se guia pelo campo (vazio), o mapeamento ficava no
    //    banco para sempre, apontando para um curso que não existe mais;
    //  - a troca vai junto com o curso num único update de múltiplos caminhos,
    //    em vez de remove() e set() soltos, que podiam falhar no meio e deixar
    //    o curso sem apelido nenhum.
    const updates = {};
    Object.entries(updatedData).forEach(([campo, valor]) => {
      updates[`courses/${courseId}/${campo}`] = valor === undefined ? null : valor;
    });

    if ("alias" in courseData) {
      const aliasAtual = currentCourse.alias;
      const novoAlias = String(courseData.alias || "").trim();

      updates[`courses/${courseId}/alias`] = novoAlias || null;

      if (aliasAtual && aliasAtual !== novoAlias && isAliasFormatValid(aliasAtual)) {
        updates[`courseAliases/${aliasAtual}`] = null;
      }
      if (novoAlias && isAliasFormatValid(novoAlias)) {
        // A chave já é o apelido; guardar só o courseId evita que os dois
        // campos divirjam (a criação gravava um formato, a atualização outro).
        updates[`courseAliases/${novoAlias}`] = { courseId };
      }
    }

    await update(ref(database), updates);
    
    return { 
      success: true,
      courseData: updatedData
    };
  } catch (error) {
    console.error("Erro ao atualizar curso:", error);
    throw error;
  }
};

/**
 * Salva um curso (cria novo ou atualiza existente)
 * @param {string|null} courseId - ID do curso (null para criar novo)
 * @param {Object} courseData - Dados do curso
 * @param {string} userId - ID do usuário
 * @returns {Promise<{courseId: string, isNew: boolean, courseData: Object}>} - Resultado da operação
 */
export const saveCourse = async (courseId, courseData, userId, courseAlias = null) => {
  try {
    if (courseId) {
      // Atualizar curso existente
      const result = await updateCourse(courseId, courseData);
      return { 
        courseId, 
        isNew: false, 
        courseData: result.courseData
      };
    } else {
      // Criar novo curso
      const result = await createCourse(courseData, userId, courseAlias);
      return { 
        courseId: result.courseId, 
        isNew: true, 
        courseData: result.courseData
      };
    }
  } catch (error) {
    console.error("Erro ao salvar curso:", error);
    throw error;
  }
};

/**
 * Valida se um curso pode ser salvo
 * @param {Object} courseData - Dados do curso
 * @param {Array} quizzes - Lista de quizzes
 * @param {string|null} courseId - ID do curso atual (opcional, para atualização)
 * @returns {Promise<{isValid: boolean, error: string|null}>} - Resultado da validação
 */
export const validateCourseData = async (courseData, quizzes, courseId = null) => {
  try {
    if (!courseData.title?.trim() || !courseData.description?.trim()) {
      return {
        isValid: false,
        error: "Preencha todos os campos obrigatórios"
      };
    }

    if(courseData.alias) {
      if (!/^[a-zA-Z0-9_-]+$/.test(courseData.alias)) {
        return {
          isValid: false,
          error: "O alias só pode conter letras, números, hífens e underscores"
        };
      }
    }

    // Verificar se o alias já existe para outro curso
    if (courseData.alias) {
      const aliasIsValid = await isAliasAvailable(courseData.alias, courseId);
      if (!aliasIsValid) {
        return {
          isValid: false,
          error: "Este alias já está em uso por outro curso"
        };
      }
    }
    
    // Verificar se há quizzes sem questões
    if (quizzes && quizzes.some((quiz) => quiz.questions.length === 0)) {
      return {
        isValid: false,
        error: "Não é possível salvar um curso com quizzes sem questões"
      };
    }
    
    return { isValid: true, error: null };
  } catch (error) {
    console.error("Erro ao validar dados do curso:", error);
    return { isValid: false, error: error.message };
  }
};