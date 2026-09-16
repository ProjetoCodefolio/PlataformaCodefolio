import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { COURSE_TYPES, isDiscipline } from "$api/services/courses/courseType";
import { ALIAS_PERMITIDO } from "$api/services/courses/alias";

/**
 * Campos editáveis do cadastro do curso, carregados de fetchCourseDetails
 * quando courseId já existe (edição) e vazios/padrão na criação.
 *
 * closedAt (data de encerramento da disciplina) mora aqui porque vem do
 * mesmo fetchCourseDetails, embora quem o USA seja useDisciplineLifecycle —
 * ele é passado para lá por parâmetro, e não duplicado numa segunda busca.
 */
export function useCourseFormFields({ courseId }) {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseAlias, setCourseAlias] = useState("");
  const [pinRequired, setPinRequired] = useState(false);
  const [coursePin, setCoursePin] = useState("");
  const [showPin, setShowPin] = useState(false);
  // Calculado uma única vez e nunca alterado depois — é só o valor sugerido
  // ao ligar o PIN pela primeira vez.
  const [randomPin] = useState(
    Math.floor(1000000 + Math.random() * 9000000).toString()
  );
  // Curso com PIN salvo cujo valor não é recuperável (cursos antigos guardam
  // só o hash). O campo aparece vazio: em branco mantém o PIN atual, digitar
  // substitui.
  const [pinNaoRecuperavel, setPinNaoRecuperavel] = useState(false);
  const [archived, setArchived] = useState(false);
  const [courseType, setCourseType] = useState(COURSE_TYPES.CURSO);
  // Data de encerramento da disciplina. `null` é o que significa "em andamento".
  const [closedAt, setClosedAt] = useState(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        try {
          const courseData = await fetchCourseDetails(courseId);

          if (courseData) {
            setCourseTitle(courseData.title || "");
            setCourseDescription(courseData.description || "");
            setCourseAlias(courseData.alias || "");
            setPinRequired(!!courseData.pinEnabled);
            setArchived(!!courseData.archived);
            setCourseType(
              isDiscipline(courseData) ? COURSE_TYPES.DISCIPLINA : COURSE_TYPES.CURSO
            );
            setClosedAt(courseData.closedAt || null);

            if (courseData.pinEnabled) {
              setCoursePin(courseData.pinKnown ? courseData.pin : "");
              setPinNaoRecuperavel(!courseData.pinKnown);
            } else {
              setCoursePin("");
              setPinNaoRecuperavel(false);
            }
          }
        } catch (error) {
          console.error("Erro ao carregar curso:", error);
          toast.error("Erro ao carregar dados do curso");
        }
      }
    };

    loadCourse();
  }, [courseId]);

  // Mesmo formato exigido por validateCourseData no salvamento — aqui só para
  // o professor ver o erro enquanto digita, em vez de descobrir ao salvar.
  const aliasInvalido = courseAlias !== "" && !ALIAS_PERMITIDO.test(courseAlias);

  return {
    courseTitle,
    setCourseTitle,
    courseDescription,
    setCourseDescription,
    courseAlias,
    setCourseAlias,
    aliasInvalido,
    pinRequired,
    setPinRequired,
    coursePin,
    setCoursePin,
    showPin,
    setShowPin,
    randomPin,
    pinNaoRecuperavel,
    archived,
    setArchived,
    courseType,
    setCourseType,
    closedAt,
    setClosedAt,
  };
}
