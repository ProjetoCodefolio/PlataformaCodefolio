import { Box } from "@mui/material";
import PdfQuizGenerator from "./PdfQuizGenerator";
import QuestionForm from "./QuestionForm";

/**
 * Editor de questões renderizado DENTRO do card do quiz expandido (a lista o
 * invoca só para o card em edição, via `renderQuestionEditor?.(quiz)` — o
 * argumento `quiz` é ignorado aqui de propósito: `QuizList` já garante que só
 * chama esta função quando `editQuiz` corresponde ao card expandido).
 *
 * Mantém aqui todo o estado do formulário, em vez de espalhar duas dúzias de
 * props pela `QuizList`.
 */
const QuestionEditorPanel = ({ form, editor }) => (
  <>
    <PdfQuizGenerator onQuestionsGenerated={editor.handleQuestionsFromPdf} />

    <Box id="question-form" sx={{ scrollMarginTop: "20px" }}>
      <QuestionForm
        editQuiz={editor.editQuiz}
        newQuizQuestion={form.newQuizQuestion}
        setNewQuizQuestion={form.setNewQuizQuestion}
        newQuizOptions={form.newQuizOptions}
        setNewQuizOptions={form.setNewQuizOptions}
        newQuizCorrectOption={form.newQuizCorrectOption}
        setNewQuizCorrectOption={form.setNewQuizCorrectOption}
        newQuizGraded={form.newQuizGraded}
        setNewQuizGraded={form.setNewQuizGraded}
        newQuizScale={form.newQuizScale}
        setNewQuizScale={form.setNewQuizScale}
        newQuestionType={form.newQuestionType}
        setNewQuestionType={form.setNewQuestionType}
        newQuizImageUrl={form.newQuizImageUrl}
        setNewQuizImageUrl={form.setNewQuizImageUrl}
        newQuizImageWidth={form.newQuizImageWidth}
        setNewQuizImageWidth={form.setNewQuizImageWidth}
        newQuizImageHeight={form.newQuizImageHeight}
        setNewQuizImageHeight={form.setNewQuizImageHeight}
        handleBlurSave={editor.handleBlurSave}
        handleKeyDown={editor.handleKeyDown}
        questionRef={editor.questionRef}
        optionsRefs={editor.optionsRefs}
        addOptionButtonRef={editor.addOptionButtonRef}
        saveButtonRef={editor.saveButtonRef}
        cancelButtonRef={editor.cancelButtonRef}
        handleAddQuizOption={form.handleAddQuizOption}
        handleRemoveQuizOption={form.handleRemoveQuizOption}
        editQuestion={editor.editQuestion}
        handleSaveEditQuestion={editor.handleSaveEditQuestion}
        handleAddQuestion={editor.handleAddQuestion}
        setEditQuiz={editor.setEditQuiz}
        setEditQuestion={editor.setEditQuestion}
      />
    </Box>
  </>
);

export default QuestionEditorPanel;
