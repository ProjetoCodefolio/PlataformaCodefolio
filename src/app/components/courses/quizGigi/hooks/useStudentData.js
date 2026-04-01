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
        pool = buildNewDrawPool(enabledStudents);
      }

      const nextUserId = pool.shift();
      remainingDrawPoolRef.current = pool;

      const nextStudent =
        (nextUserId && enabledById.get(nextUserId)) || enabledStudents[0];

      setSelectedStudent(nextStudent);

      // Usa o serviço para atualizar contagem de sorteios
      updateStudentDrawCount(courseId, quizId, nextStudent.userId, false);
    } else {
      alert(
        "Não há alunos habilitados para sorteio. Por favor, habilite pelo menos um aluno."
      );
    }
  };

  const handleOpenMenu = (event) => {
    if (menuOpen && anchorEl === event.currentTarget) {
      handleCloseMenu();
      return;
    }

    const cleanupOldMenus = () => {
      const oldMenus = document.querySelectorAll(
        '[role="presentation"], .MuiPopover-root, .MuiMenu-root'
      );
      oldMenus.forEach((menu) => {
        try {
          menu.parentNode?.removeChild(menu);
        } catch (e) {
          // Silenciar erros
        }
      });
    };

    cleanupOldMenus();
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setAnchorEl(null);
    setSearchTerm("");

    // Cleanup para remover elementos órfãos
    setTimeout(() => {
      const orphanElements = document.querySelectorAll(
        ".MuiPopover-root:not(.MuiModal-open), .MuiMenu-root:not(.MuiModal-open)"
      );
      orphanElements.forEach((elem) => {
        try {
          elem.parentNode?.removeChild(elem);
        } catch (e) {
          // Silenciar erros
        }
      });
    }, 100);
  };

  // Função para selecionar um estudante
  const handleSelectStudent = (student, isCustomMode = false) => {
    setSelectedStudent(student);
    handleCloseMenu();

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
