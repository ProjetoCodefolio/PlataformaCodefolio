import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { database } from "../../../../service/firebase";

export const useStudentData = (courseId, quizId) => {
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    if (courseId) {
      fetchEnrolledStudents();
    } else {
      setLoading(false);
    }
  }, [courseId]);

  const fetchEnrolledStudents = async () => {
    try {
      setLoading(true);

      const studentCoursesRef = ref(database, "studentCourses");
      const studentCoursesSnapshot = await get(studentCoursesRef);

      const usersRef = ref(database, "users");
      const usersSnapshot = await get(usersRef);

      if (!studentCoursesSnapshot.exists() || !usersSnapshot.exists()) {
        setEnrolledStudents([]);
        setLoading(false);
        return;
      }

      const studentCoursesData = studentCoursesSnapshot.val();
      const usersData = usersSnapshot.val();

      const students = [];

      for (const userId in studentCoursesData) {
        if (
          studentCoursesData[userId] &&
          studentCoursesData[userId][courseId]
        ) {
          const userData = usersData[userId] || {};

          let userName = "Usuário Desconhecido";
          if (userData.displayName) {
            userName = userData.displayName;
          } else if (userData.firstName) {
            userName = `${userData.firstName} ${userData.lastName || ""}`;
          } else if (userData.name) {
            userName = userData.name;
          } else if (userData.email) {
            userName = userData.email.split("@")[0];
          }

          const initials = userName
            .split(" ")
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase()
            .substring(0, 2);

          students.push({
            userId,
            name: userName.trim() || `Aluno ${userId.substring(0, 5)}`,
            email: userData.email || "",
            photoURL: userData.photoURL || null,
            initials,
          });
        }
      }

      const sortedStudents = students.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setEnrolledStudents(
        sortedStudents.filter((student) => !student.email.includes("codefolio"))
      );
      setStudentsLoaded(true);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      setEnrolledStudents([]);
      setStudentsLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const sortStudent = (isCustomMode = false) => {
    if (menuOpen) {
      handleCloseMenu();
    }

    const enabledStudents = enrolledStudents.filter(
      (student) => !student.disabled
    );

    if (enabledStudents.length > 0) {
      const randomIndex = Math.floor(Math.random() * enabledStudents.length);
      const selectedStudent = enabledStudents[randomIndex];
      setSelectedStudent(selectedStudent);

      // Passa quizId explicitamente para a função
      updateStudentDrawCount(selectedStudent.userId, isCustomMode);
    } else {
      alert(
        "Não há alunos habilitados para sorteio. Por favor, habilite pelo menos um aluno."
      );
    }
  };

  const updateStudentDrawCount = async (userId, isCustomMode = false) => {
    try {
      // Use quizData?.id do contexto do componente QuizGigi
      if (!courseId || !quizId || !userId) {
        console.error("updateStudentDrawCount: dados faltando", {
          courseId,
          quizId,
          userId,
        });
        return;
      }

      console.log(
        `Registrando sorteio para ${userId} em modo ${
          isCustomMode ? "custom" : "normal"
        }`
      );

      const basePath = isCustomMode ? "customQuizResults" : "liveQuizResults";
      const countRef = ref(
        database,
        `${basePath}/${courseId}/${quizId}/${userId}`
      );

      // Buscar dados atuais
      const snapshot = await get(countRef);
      const currentData = snapshot.exists() ? snapshot.val() : {};

      // Incrementar a contagem de sorteios
      const updatedData = {
        ...currentData,
        timesDraw: (currentData.timesDraw || 0) + 1,
      };

      // Salvar no Firebase
      await set(countRef, updatedData);
      console.log(
        `Contagem atualizada: ${updatedData.timesDraw} para ${userId} em ${basePath}`
      );
    } catch (error) {
      console.error("Erro ao atualizar contagem de sorteios:", error);
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
    setMenuOpen(true);
    setAnchorEl(event.currentTarget);

    setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
    }, 100);
  };

  const handleOutsideClick = (event) => {
    if (!menuOpen) return;

    const menuElement = document.querySelector(".quizgigi-menu-container");
    const isClickInsideMenu = menuElement && menuElement.contains(event.target);
    const isClickOnButton = anchorEl && anchorEl.contains(event.target);

    if (!isClickInsideMenu && !isClickOnButton) {
      handleCloseMenu();
    }
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
    setSearchTerm("");
    setAnchorEl(null);

    document.removeEventListener("mousedown", handleOutsideClick);

    setTimeout(() => {
      const orphanElements = document.querySelectorAll(
        '.MuiPopover-root, .MuiMenu-root, [role="presentation"]'
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

  // Modificar para aceitar isCustomMode como parâmetro
  const handleSelectStudent = (student, isCustomMode = false) => {
    setSelectedStudent(student);
    handleCloseMenu();

    // Agora isCustomMode está disponível como parâmetro
    updateStudentDrawCount(student.userId, isCustomMode);
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
