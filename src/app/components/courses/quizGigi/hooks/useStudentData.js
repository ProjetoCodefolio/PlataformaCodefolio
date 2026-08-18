import { useState, useEffect, useRef } from "react";
import {
  fetchEnrolledStudents,
  updateStudentDrawCount,
} from "$api/services/courses/quizGigi";

export const useStudentData = (courseId, quizId) => {
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const popperRef = useRef(null);
  const chooseButtonRef = useRef(null);
  const remainingDrawPoolRef = useRef([]);
  // Último aluno sorteado/selecionado no ciclo atual — usado para evitar que a
  // mesma pessoa saia duas vezes seguidas na virada de um ciclo para o outro.
  const lastDrawnRef = useRef(null);

  const shuffleInPlace = (array) => {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const buildNewDrawPool = (enabledStudents) =>
    shuffleInPlace(enabledStudents.map((s) => s.userId));

  useEffect(() => {
    // O sorteio “sem repetição” é por quiz. Quando muda curso/quiz,
    // reinicia o pool para começar um novo ciclo.
    remainingDrawPoolRef.current = [];
    lastDrawnRef.current = null;
  }, [courseId, quizId]);

  // Efeito para carregar estudantes matriculados
  useEffect(() => {
    const loadEnrolledStudents = async () => {
      if (!courseId || !quizId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Agora usando o serviço em vez de acesso direto ao Firebase
        const students = await fetchEnrolledStudents(courseId);

        // Ordenar por nome
        students.sort((a, b) => a.name.localeCompare(b.name));

        setEnrolledStudents(students);
        setStudentsLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar estudantes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEnrolledStudents();
  }, [courseId, quizId]);

  // Função para sortear um estudante aleatório
  const sortStudent = () => {
    const enabledStudents = enrolledStudents.filter(
      (student) => !student.disabled
    );

    if (enabledStudents.length > 0) {
      const enabledById = new Map(
        enabledStudents.map((student) => [student.userId, student])
      );

      // Mantém um pool embaralhado de alunos restantes. Só repete depois
      // que todos os habilitados forem sorteados ao menos 1x.
      let pool = Array.isArray(remainingDrawPoolRef.current)
        ? remainingDrawPoolRef.current
        : [];

      // Remove do pool alunos que foram desabilitados/removidos.
      pool = pool.filter((userId) => enabledById.has(userId));

      if (pool.length === 0) {
        // Novo ciclo: todos os habilitados voltam ao pool. Para não repetir o
        // último sorteado logo na virada, se ele cair como primeiro e houver
        // mais de um aluno, ele é jogado para o fim.
        pool = buildNewDrawPool(enabledStudents);
        if (
          enabledStudents.length > 1 &&
          lastDrawnRef.current &&
          pool[0] === lastDrawnRef.current
        ) {
          pool.push(pool.shift());
        }
      }

      const nextUserId = pool.shift();
      remainingDrawPoolRef.current = pool;

      const nextStudent =
        (nextUserId && enabledById.get(nextUserId)) || enabledStudents[0];

      lastDrawnRef.current = nextStudent.userId;
      setSelectedStudent(nextStudent);

      // Usa o serviço para atualizar contagem de sorteios
      updateStudentDrawCount(courseId, quizId, nextStudent.userId, false);
    } else {
      alert(
        "Não há alunos habilitados para sorteio. Por favor, habilite pelo menos um aluno."
      );
    }
  };

  // A lista de alunos é um <Popper>, que aparece e some pelo estado `menuOpen`
  // e não deixa nó nenhum para trás quando fechado. As duas funções abaixo
  // faziam, antes de abrir e depois de fechar, um querySelectorAll por
  // '[role="presentation"], .MuiPopover-root, .MuiMenu-root' seguido de
  // removeChild. Isso nunca alcançou o Popper (essas classes são de
  // Menu/Popover/Dialog) e arrancava do DOM overlays que o React ainda
  // considerava seus — qualquer Dialog aberto na tela, como o modal de reporte
  // —, o que quebra a remontagem e derruba a árvore com NotFoundError.
  const handleOpenMenu = (event) => {
    if (menuOpen && anchorEl === event.currentTarget) {
      handleCloseMenu();
      return;
    }

    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setAnchorEl(null);
    setSearchTerm("");
  };

  // Função para selecionar um estudante
  const handleSelectStudent = (student, isCustomMode = false) => {
    setSelectedStudent(student);
    handleCloseMenu();

    // Seleção manual também consome o aluno do pool, mantendo o rodízio justo:
    // ele não será sorteado de novo antes de todos os outros no ciclo atual.
    if (Array.isArray(remainingDrawPoolRef.current)) {
      remainingDrawPoolRef.current = remainingDrawPoolRef.current.filter(
        (userId) => userId !== student.userId
      );
    }
    lastDrawnRef.current = student.userId;

    // Usa o serviço para atualizar contagem de sorteios
    updateStudentDrawCount(courseId, quizId, student.userId, isCustomMode);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleAbleStudent = (student) => {
    if (!student) return;
    setEnrolledStudents((prev) =>
      prev.map((s) =>
        s.userId === student.userId ? { ...s, disabled: !s.disabled } : s
      )
    );
  };

  const filteredStudents = searchTerm
    ? enrolledStudents.filter((student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : enrolledStudents;

  return {
    enrolledStudents,
    selectedStudent,
    setSelectedStudent,
    loading,
    studentsLoaded,
    filteredStudents,
    searchTerm,
    menuOpen,
    anchorEl,
    popperRef,
    chooseButtonRef,
    sortStudent,
    handleOpenMenu,
    handleCloseMenu,
    handleSelectStudent,
    handleSearchChange,
    handleAbleStudent,
    setMenuOpen,
  };
};

export default useStudentData;
