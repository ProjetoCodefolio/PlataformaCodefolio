import { useNavigate } from "react-router-dom";
import { useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Box, Typography, Tabs, Tab, Button } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DownloadIcon from "@mui/icons-material/Download";
import { toast } from "react-toastify";

import QuizForm from "./QuizForm";
import QuizSettingsModal from "./QuizSettingsModal";
import QuizList from "./QuizList";
import ImportQuizModal from "$components/courses/import/ImportQuizModal";
import OpinionResultsModal from "./OpinionResultsModal";
import { ConfirmationModal, SuccessModal } from "./Modals";
import QuestionEditorPanel from "./QuestionEditorPanel";
import { removeQuiz } from "$api/services/courses/quizCrud";

import { useQuizModals } from "./hooks/useQuizModals";
import { useQuizContentSources } from "./hooks/useQuizContentSources";
import { useQuizCatalog } from "./hooks/useQuizCatalog";
import { useQuizCreationForm } from "./hooks/useQuizCreationForm";
import { useQuestionForm } from "./hooks/useQuestionForm";
import { useQuestionEditor } from "./hooks/useQuestionEditor";

const CourseQuizzesTab = forwardRef(({ courseId, courseTitle = "", videos, slides }, ref) => {
  const navigate = useNavigate();

  // Refs que não pertencem a nenhum hook de domínio específico.
  const questionFormRef = useRef(null);
  const quizzesListEndRef = useRef(null);
  // Âncora do topo da aba, usada para levar o professor de volta ao formulário
  // de criação depois de adicionar um quiz.
  const quizSettingsRef = useRef(null);

  const modals = useQuizModals();
  const catalog = useQuizCatalog(courseId);
  const contentSources = useQuizContentSources(courseId, videos, slides);
  const creationForm = useQuizCreationForm({
    courseId,
    courseTitle,
    videosState: contentSources.videosState,
    slidesState: contentSources.slidesState,
    quizzes: catalog.quizzes,
    slideQuizzes: catalog.slideQuizzes,
    setQuizzes: catalog.setQuizzes,
    setSlideQuizzes: catalog.setSlideQuizzes,
    onQuizAdded: () => modals.setShowAddQuizModal(true),
  });
  const questionForm = useQuestionForm();
  const questionEditor = useQuestionEditor({
    courseId,
    quizzes: catalog.quizzes,
    slideQuizzes: catalog.slideQuizzes,
    setQuizzes: catalog.setQuizzes,
    setSlideQuizzes: catalog.setSlideQuizzes,
    form: questionForm,
  });

  useEffect(() => {
    if (courseId) {
      contentSources.loadVideos(creationForm.newQuizVideoId, creationForm.setNewQuizVideoId);
      contentSources.loadSlides(creationForm.newQuizSlideId, creationForm.setNewQuizSlideId);
      catalog.loadQuizzes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useImperativeHandle(ref, () => ({
    saveQuizzes: catalog.saveQuizzes,
    getQuizzes: catalog.getQuizzes,
  }));

  // Lápis na lista: abre APENAS a configuração do quiz, num modal. Questões não
  // entram aqui — elas ficam no editor do card expandido.
  const handleEditQuiz = modals.setSettingsQuiz;

  const handleRemoveQuiz = (quiz) => {
    modals.setQuizToDelete(quiz);
    modals.setShowDeleteQuizModal(true);
  };

  const confirmRemoveQuiz = async () => {
    if (!modals.quizToDelete) return;

    try {
      await removeQuiz(courseId, modals.quizToDelete.videoId);

      if (modals.quizToDelete.isSlideQuiz) {
        catalog.setSlideQuizzes((prev) =>
          prev.filter((q) => q.videoId !== modals.quizToDelete.videoId)
        );
      } else {
        catalog.setQuizzes((prev) =>
          prev.filter((q) => q.videoId !== modals.quizToDelete.videoId)
        );
      }

      toast.success("Quiz deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir quiz:", error);
      toast.error(error.message || "Erro ao excluir quiz");
    } finally {
      modals.setShowDeleteQuizModal(false);
      modals.setQuizToDelete(null);
    }
  };

  // Função para gerenciar a mudança de aba
  const handleTabChange = (event, newValue) => {
    creationForm.handleTabChanged(newValue);
    // Limpar estado de edição ao mudar de aba
    questionEditor.resetEditingState();
  };

  // Função para navegar para visão geral de notas
  const handleViewQuizGradesOverview = () => {
    navigate(`/quiz-grades-overview?courseId=${courseId}`);
  };

  // Botões extras do cabeçalho do formulário de criação.
  const gradesOverviewButton = (
    <>
      <Button
        variant="outlined"
        startIcon={<TrendingUpIcon />}
        onClick={handleViewQuizGradesOverview}
        sx={{
          borderColor: "#9041c1",
          color: "#9041c1",
          "&:hover": {
            borderColor: "#7a35a3",
            backgroundColor: "#f5f0fa",
          },
        }}
      >
        Visão Geral de Notas
      </Button>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={() => modals.setShowImportQuizModal(true)}
        sx={{
          borderColor: "#9041c1",
          color: "#9041c1",
          "&:hover": {
            borderColor: "#7a35a3",
            backgroundColor: "#f5f0fa",
          },
        }}
      >
        Importar de outro curso
      </Button>
    </>
  );

  // Editor de questões renderizado DENTRO do card do quiz expandido (a lista o
  // chama só para o card em edição). Mantém aqui a composição dos hooks de
  // formulário/edição, em vez de espalhar duas dúzias de props pela QuizList.
  const renderQuestionEditor = () => (
    <QuestionEditorPanel form={questionForm} editor={questionEditor} />
  );

  // Interface modificada com tabs para separar quizzes de vídeos e slides
  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
      ref={quizSettingsRef}
    >
      {/* Tabs para alternar entre quizzes de vídeos e slides */}
      <Tabs
        value={creationForm.activeTab}
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        variant="fullWidth"
      >
        <Tab label="Quizzes de Conteúdo" />
        <Tab label="Quizzes de Slides (legado)" />
      </Tabs>

      {/* Conteúdo da tab de quizzes de vídeos */}
      {creationForm.activeTab === 0 && (
        <>
          {/* Formulário para criar quiz para vídeo */}
          <QuizForm
            videos={contentSources.videosState}
            newQuizVideoId={creationForm.newQuizVideoId}
            setNewQuizVideoId={creationForm.setNewQuizVideoId}
            newQuizMinPercentage={creationForm.newQuizMinPercentage}
            setNewQuizMinPercentage={creationForm.setNewQuizMinPercentage}
            newQuizIsDiagnostic={creationForm.newQuizIsDiagnostic}
            setNewQuizIsDiagnostic={creationForm.setNewQuizIsDiagnostic}
            handleAddQuiz={creationForm.handleAddQuiz}
            newQuizAllowRetry={creationForm.newQuizAllowRetry}
            setNewQuizAllowRetry={creationForm.setNewQuizAllowRetry}
            newQuizMaxAttempts={creationForm.newQuizMaxAttempts}
            setNewQuizMaxAttempts={creationForm.setNewQuizMaxAttempts}
            newQuizOpenDate={creationForm.newQuizOpenDate}
            setNewQuizOpenDate={creationForm.setNewQuizOpenDate}
            newQuizCloseDate={creationForm.newQuizCloseDate}
            setNewQuizCloseDate={creationForm.setNewQuizCloseDate}
            questionFormRef={questionFormRef}
            entityType="conteúdo"
            additionalButtons={gradesOverviewButton}
          />

          {/* Lista de quizzes de vídeos */}
          <QuizList
            quizzes={catalog.quizzes}
            videos={contentSources.videosState}
            expandedQuiz={questionEditor.expandedQuiz}
            setExpandedQuiz={questionEditor.setExpandedQuiz}
            handleEditQuiz={handleEditQuiz}
            handleRemoveQuiz={handleRemoveQuiz}
            questionFormRef={questionFormRef}
            handleEditQuestion={questionEditor.handleEditQuestion}
            handleRemoveQuestion={questionEditor.handleRemoveQuestion}
            quizzesListEndRef={quizzesListEndRef}
            entityType="conteúdo"
            entityItems={contentSources.videosState}
            courseId={courseId}
            onAutoSaveQuestion={questionEditor.handleAutoSaveQuestion}
            onViewOpinionResults={modals.setOpinionQuiz}
            editQuiz={questionEditor.editQuiz}
            onToggleQuestionEditor={questionEditor.handleToggleQuestionEditor}
            renderQuestionEditor={renderQuestionEditor}
            onReorderQuestions={questionEditor.handleReorderQuestions}
          />
        </>
      )}

      {/* Conteúdo da tab de quizzes de slides */}
      {creationForm.activeTab === 1 && (
        <>
          {!contentSources.slidesState || contentSources.slidesState.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum slide no formato legado. Para slides novos, crie o quiz
                na aba "Quizzes de Conteúdo". Eles aparecem no seletor de
                conteúdo.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Mesmo formulário de criação da aba de conteúdo: a aba legada
                  tinha uma cópia manual dos mesmos campos. */}
              <QuizForm
                videos={contentSources.slidesState}
                newQuizVideoId={creationForm.newQuizSlideId}
                setNewQuizVideoId={creationForm.setNewQuizSlideId}
                newQuizMinPercentage={creationForm.newQuizMinPercentage}
                setNewQuizMinPercentage={creationForm.setNewQuizMinPercentage}
                newQuizIsDiagnostic={creationForm.newQuizIsDiagnostic}
                setNewQuizIsDiagnostic={creationForm.setNewQuizIsDiagnostic}
                handleAddQuiz={creationForm.handleAddQuiz}
                newQuizAllowRetry={creationForm.newQuizAllowRetry}
                setNewQuizAllowRetry={creationForm.setNewQuizAllowRetry}
                newQuizMaxAttempts={creationForm.newQuizMaxAttempts}
                setNewQuizMaxAttempts={creationForm.setNewQuizMaxAttempts}
                newQuizOpenDate={creationForm.newQuizOpenDate}
                setNewQuizOpenDate={creationForm.setNewQuizOpenDate}
                newQuizCloseDate={creationForm.newQuizCloseDate}
                setNewQuizCloseDate={creationForm.setNewQuizCloseDate}
                questionFormRef={questionFormRef}
                entityType="slide"
                additionalButtons={gradesOverviewButton}
              />

              {/* Lista de quizzes de slides */}
              <QuizList
                quizzes={catalog.slideQuizzes || []}
                videos={contentSources.slidesState || []}
                expandedQuiz={questionEditor.expandedQuiz}
                setExpandedQuiz={questionEditor.setExpandedQuiz}
                handleEditQuiz={handleEditQuiz}
                handleRemoveQuiz={handleRemoveQuiz}
                questionFormRef={questionFormRef}
                handleEditQuestion={questionEditor.handleEditQuestion}
                handleRemoveQuestion={questionEditor.handleRemoveQuestion}
                quizzesListEndRef={quizzesListEndRef}
                entityType="slide"
                entityItems={contentSources.slidesState || []}
                courseId={courseId}
                onAutoSaveQuestion={questionEditor.handleAutoSaveQuestion}
                onViewOpinionResults={modals.setOpinionQuiz}
                editQuiz={questionEditor.editQuiz}
                onToggleQuestionEditor={questionEditor.handleToggleQuestionEditor}
                renderQuestionEditor={renderQuestionEditor}
                onReorderQuestions={questionEditor.handleReorderQuestions}
              />
            </>
          )}
        </>
      )}

      {/* Modais */}
      <QuizSettingsModal
        open={Boolean(modals.settingsQuiz)}
        onClose={() => modals.setSettingsQuiz(null)}
        courseId={courseId}
        quiz={modals.settingsQuiz}
        contentTitle={
          modals.settingsQuiz?.isSlideQuiz
            ? contentSources.slidesState.find((s) => s.id === modals.settingsQuiz?.slideId)?.title ||
              modals.settingsQuiz?.slideId
            : contentSources.videosState.find((v) => v.id === modals.settingsQuiz?.videoId)?.title ||
              modals.settingsQuiz?.videoId
        }
        onSaved={questionEditor.handleQuizSettingsSaved}
      />

      <OpinionResultsModal
        open={Boolean(modals.opinionQuiz)}
        onClose={() => modals.setOpinionQuiz(null)}
        courseId={courseId}
        quizId={modals.opinionQuiz?.videoId}
        quizTitle={
          modals.opinionQuiz?.isSlideQuiz
            ? contentSources.slidesState.find((s) => s.id === modals.opinionQuiz?.slideId)?.title || ""
            : contentSources.videosState.find((v) => v.id === modals.opinionQuiz?.videoId)?.title || ""
        }
      />

      <ImportQuizModal
        open={modals.showImportQuizModal}
        onClose={() => modals.setShowImportQuizModal(false)}
        courseId={courseId}
        targets={
          creationForm.activeTab === 0
            ? contentSources.videosState
            : // O quiz de slide é chaveado com o prefixo `slide_`; os alvos
              // precisam chegar ao modal já na forma da chave, que é o que o
              // serviço grava e o que a lista de ocupados compara.
              contentSources.slidesState.map((slide) => ({
                id: `slide_${slide.id}`,
                title: slide.title,
              }))
        }
        existingQuizIds={(creationForm.activeTab === 0 ? catalog.quizzes : catalog.slideQuizzes).map(
          (quiz) => quiz.videoId
        )}
        onImported={catalog.loadQuizzes}
      />

      <SuccessModal
        open={modals.showAddQuizModal}
        onClose={() => {
          modals.setShowAddQuizModal(false);
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        }}
        title={`Quiz ${creationForm.activeTab === 0 ? "do conteúdo" : "do slide"
          } adicionado com sucesso!`}
      />

      <ConfirmationModal
        open={modals.showDeleteQuizModal}
        onClose={() => modals.setShowDeleteQuizModal(false)}
        onConfirm={confirmRemoveQuiz}
        title={
          modals.quizToDelete?.isSlideQuiz
            ? `Tem certeza que deseja excluir o quiz do slide "${contentSources.slidesState.find((s) => s.id === modals.quizToDelete?.slideId)?.title ||
            "selecionado"
            }?"`
            : `Tem certeza que deseja excluir o quiz do vídeo "${contentSources.videosState.find((v) => v.id === modals.quizToDelete?.videoId)?.title ||
            "selecionado"
            }?"`
        }
        content="Isso apaga permanentemente todas as respostas e resultados dos alunos para este quiz (incluindo rankings e respostas abertas). Esta ação não pode ser desfeita."
      />

      <ConfirmationModal
        open={questionEditor.showDeleteQuestionModal}
        onClose={() => questionEditor.setShowDeleteQuestionModal(false)}
        onConfirm={questionEditor.confirmRemoveQuestion}
        title={`Tem certeza que deseja excluir a questão "${questionEditor.questionToDelete?.quiz?.questions.find(
          (q) => q.id === questionEditor.questionToDelete?.id
        )?.question || "selecionada"
          }?"`}
      />
    </Box>
  );
});

CourseQuizzesTab.displayName = "CourseQuizzesTab";

export default CourseQuizzesTab;
