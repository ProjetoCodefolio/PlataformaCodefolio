import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { useAuth } from "$context/AuthContext";
import { canManageCourse } from "$api/utils/permissions";
import { fetchCourseDetails } from "$api/services/courses/courses";
import { getCourseIdByAlias } from "$api/services/courses/alias";
import {
  observeCourseQuestions,
  setQuestionDiscussed,
  summarizeQuestionsByContent,
} from "$api/services/courses/questions";
import QuestionsPresenter from "$components/courses/questions/QuestionsPresenter";

/**
 * Rota da tela de apresentação das dúvidas em aula.
 *
 * Existe uma única tela de apresentação no sistema, e ela mora aqui: tanto o
 * ícone "?" do cabeçalho do vídeo quanto o botão "Apresentar" da aba Dúvidas
 * navegam para esta rota (em vez de abrirem sobreposições próprias). Assim o
 * professor pode projetar o endereço direto, e a tela é sempre a mesma.
 *
 *   /cursos/{apelido}/questions/apresentar
 *   /classes/questions/apresentar?courseId=...
 *
 * `?videoId=` só define o recorte INICIAL — daí em diante quem manda é o
 * seletor dentro da apresentação.
 *
 * Só o dono do curso e admins entram: a tela lista dúvidas de todos os alunos.
 *
 * AO VIVO: a lista é OBSERVADA (`onValue`), não buscada uma vez. É o ponto da
 * tela — uma dúvida registrada pelo aluno durante a aula entra na projeção
 * sozinha, sem o professor recarregar a página no meio da explicação. Por isso
 * a permissão é resolvida num efeito e a assinatura em outro: a assinatura só
 * começa depois da liberação, e é encerrada ao sair da tela.
 */
const QuestionsPresentation = ({ alias }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { userDetails } = useAuth();

  const [courseId, setCourseId] = useState(params.get("courseId"));
  const [courseTitle, setCourseTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  // Só vira true depois da checagem de permissão: é o que destrava a assinatura.
  const [accessGranted, setAccessGranted] = useState(false);

  const initialContentId = params.get("videoId") || "";

  // Apelido na URL: resolve para o id antes de qualquer leitura do curso.
  useEffect(() => {
    if (!alias) return;

    let cancelado = false;
    const resolver = async () => {
      try {
        const { courseId: idResolvido } = await getCourseIdByAlias(alias);
        if (cancelado) return;
        if (idResolvido) {
          setCourseId(idResolvido);
        } else {
          toast.error("Curso não encontrado para o apelido informado.");
          navigate("/404");
        }
      } catch (error) {
        console.error("Erro ao resolver o apelido do curso:", error);
        navigate("/404");
      }
    };
    resolver();

    return () => {
      cancelado = true;
    };
  }, [alias, navigate]);

  // Permissão e dados do curso. Roda ANTES da assinatura: quem não administra o
  // curso não chega a abrir uma escuta das dúvidas da turma.
  useEffect(() => {
    if (!courseId || !userDetails) return;

    let cancelado = false;
    const verificar = async () => {
      setLoading(true);
      setAccessGranted(false);
      try {
        const curso = await fetchCourseDetails(courseId);
        if (cancelado) return;

        if (!curso) {
          toast.error("Curso não encontrado.");
          navigate("/404");
          return;
        }

        // A tela mostra as dúvidas da turma inteira: quem não administra o
        // curso não entra, nem por link direto.
        if (!canManageCourse(userDetails, curso.userId)) {
          toast.error("Apenas o professor do curso pode abrir esta tela.");
          navigate(`/classes?courseId=${courseId}`);
          return;
        }

        setCourseTitle(curso.title || "Dúvidas da turma");
        setAccessGranted(true);
      } catch (error) {
        console.error("Erro ao carregar o curso:", error);
        toast.error("Não foi possível carregar as dúvidas do curso.");
        setLoading(false);
      }
    };
    verificar();

    return () => {
      cancelado = true;
    };
  }, [courseId, userDetails, navigate]);

  // Assinatura ao vivo das dúvidas. O `onValue` já dispara na primeira leitura,
  // então é ele quem tira a tela do "Carregando" — não há um `fetch` antes.
  useEffect(() => {
    if (!courseId || !accessGranted) return;

    const encerrar = observeCourseQuestions(
      courseId,
      (lista) => {
        setQuestions(lista);
        setLoading(false);
      },
      () => {
        toast.error("A atualização ao vivo das dúvidas foi interrompida.");
        setLoading(false);
      }
    );

    return encerrar;
  }, [courseId, accessGranted]);

  const contentOptions = useMemo(
    () => summarizeQuestionsByContent(questions),
    [questions]
  );

  const handleMarkDiscussed = useCallback(
    async (question) => {
      if (!question?.id) return;
      try {
        // Sem atualização local: o observador recebe a gravação e reemite a
        // lista. Mexer no estado aqui criaria uma segunda fonte de verdade que
        // brigaria com o que vem do banco.
        await setQuestionDiscussed(courseId, question.id, true);
      } catch (error) {
        console.error("Erro ao marcar dúvida como discutida:", error);
        toast.error("Não foi possível marcar a dúvida como discutida.");
      }
    },
    [courseId]
  );

  // Fechar volta para onde o professor estava (sala ou aba Dúvidas). Sem
  // histórico — caso de link colado direto no navegador — cai na sala do curso.
  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(courseId ? `/classes?courseId=${courseId}` : "/cursos");
  }, [navigate, courseId]);

  if (loading || !courseId) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "linear-gradient(135deg, #700cac 0%, #9041c1 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          color: "#fff",
          zIndex: 1399,
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
        <Typography variant="body1">Carregando dúvidas...</Typography>
      </Box>
    );
  }

  return (
    <QuestionsPresenter
      questions={questions}
      contentOptions={contentOptions}
      initialContentId={initialContentId}
      courseTitle={courseTitle}
      onClose={handleClose}
      onMarkDiscussed={handleMarkDiscussed}
    />
  );
};

QuestionsPresentation.propTypes = {
  alias: PropTypes.string,
};

export default QuestionsPresentation;
