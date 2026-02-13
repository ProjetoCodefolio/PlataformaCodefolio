import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { gradeOpenEndedAnswer } from '$api/services/courses/quizzes';
import { ref, get } from 'firebase/database';
import { database } from '$api/config/firebase';
import { toast } from 'react-toastify';

const OpenEndedAnswers = ({ open, onClose, courseId, quizId, question }) => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [grade, setGrade] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (open && courseId && quizId && question) {
      loadAnswers();
    }
  }, [open, courseId, quizId, question]);

  const loadAnswers = async () => {
    try {
      setLoading(true);
      console.log('📥 Carregando respostas abertas:', { courseId, quizId, questionId: question.id });
      
      // Buscar dos lugares corretos: liveQuizResults e customQuizResults
      const liveQuizResultsRef = ref(database, `liveQuizResults/${courseId}/${quizId}`);
      const customQuizResultsRef = ref(database, `customQuizResults/${courseId}/${quizId}`);
      
      const [liveSnapshot, customSnapshot] = await Promise.all([
        get(liveQuizResultsRef),
        get(customQuizResultsRef)
      ]);
      
      const liveResults = liveSnapshot.exists() ? liveSnapshot.val() : {};
      const customResults = customSnapshot.exists() ? customSnapshot.val() : {};
      
      console.log('📦 Live Quiz Results:', liveResults);
      console.log('📦 Custom Quiz Results:', customResults);
      
      // Combinar todos os resultados
      const allResults = { ...liveResults, ...customResults };
      const answersArray = [];
      
      // Para cada usuário, verificar se tem resposta para esta questão
      for (const [userId, userData] of Object.entries(allResults)) {
        if (userData.detailedAnswers && userData.detailedAnswers[question.id]) {
          const answerData = userData.detailedAnswers[question.id];
          
          // Verificar se é uma questão aberta
          if (answerData.questionType === 'open-ended') {
            try {
              // Buscar informações do usuário
              const userRef = ref(database, `users/${userId}`);
              const userSnapshot = await get(userRef);
              const userInfo = userSnapshot.val();
              
              answersArray.push({
                userId,
                answer: answerData.answer || answerData.userAnswer || '',
                submittedAt: userData.submittedAt || userData.completedAt || new Date().toISOString(),
                grade: answerData.grade || null,
                feedback: answerData.feedback || null,
                userName: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : 'Usuário Desconhecido',
                userEmail: userInfo?.email || null,
                userPhoto: userInfo?.photoURL || null,
              });
            } catch (error) {
              console.error(`Erro ao buscar dados do usuário ${userId}:`, error);
            }
          }
        }
      }
      
      console.log(`✅ ${answersArray.length} resposta(s) encontrada(s) para esta questão`);
      console.log('👥 Respostas com dados dos usuários:', answersArray);
      setAnswers(answersArray);
    } catch (error) {
      console.error('❌ Erro ao carregar respostas:', error);
      toast.error('Erro ao carregar respostas');
      setAnswers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmit = async () => {
    if (!selectedAnswer) return;

    try {
      await gradeOpenEndedAnswer(
        courseId,
        quizId,
        question.id,
        selectedAnswer.userId,
        grade,
        feedback
      );

      toast.success('Resposta avaliada com sucesso!');
      setSelectedAnswer(null);
      setGrade(0);
      setFeedback('');
      loadAnswers();
    } catch (error) {
      console.error('Erro ao avaliar resposta:', error);
      toast.error('Erro ao salvar avaliação');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '70vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Respostas da Questão Aberta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {question?.question}
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>Importante:</strong> Questões abertas não afetam a nota final do quiz ou do curso. 
              A avaliação serve apenas como feedback para o aluno.
            </Typography>
          </Alert>
        </Box>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{ 
            color: '#666',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, flexDirection: 'column', gap: 2 }}>
            <CircularProgress sx={{ color: '#9041c1' }} />
            <Typography variant="body2" color="text.secondary">
              Carregando respostas...
            </Typography>
          </Box>
        ) : answers.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma resposta recebida ainda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              As respostas dos alunos aparecerão aqui assim que forem enviadas.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {answers.map((answer, index) => (
              <React.Fragment key={answer.userId}>
                <ListItem
                  sx={{
                    p: 3,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#f5f5f5' },
                    backgroundColor: selectedAnswer?.userId === answer.userId ? '#e8f4f8' : 'transparent',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                  onClick={() => {
                    setSelectedAnswer(answer);
                    setGrade(answer.grade || 0);
                    setFeedback(answer.feedback || '');
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    <Avatar 
                      src={answer.userPhoto} 
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        bgcolor: '#9041c1',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                      }}
                    >
                      {(answer.userName || answer.userId).substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {answer.userName || `Aluno ${answer.userId.substring(0, 8)}`}
                      </Typography>
                      {answer.userEmail && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {answer.userEmail}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Enviado em: {new Date(answer.submittedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                    {answer.graded ? (
                      <Chip
                        label={`Nota: ${answer.grade}/100`}
                        color="success"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        label="Não avaliado"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: '#fafafa',
                      borderRadius: 1,
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block', mb: 1 }}>
                      Resposta:
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.6,
                      }}
                    >
                      {answer.answer || '(Sem resposta)'}
                    </Typography>
                  </Box>

                  {answer.feedback && (
                    <Box sx={{ mt: 2, p: 2, backgroundColor: '#e8f8f5', borderRadius: 1, border: '1px solid #4caf50' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: '#2e7d32' }}>
                        💬 Feedback do Professor:
                      </Typography>
                      <Typography variant="body2">{answer.feedback}</Typography>
                      {answer.gradedAt && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Avaliado em: {new Date(answer.gradedAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      )}
                    </Box>
                  )}
                </ListItem>
                {index < answers.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>

      {selectedAnswer && (
        <DialogActions
          sx={{
            flexDirection: 'column',
            alignItems: 'stretch',
            borderTop: '1px solid #e0e0e0',
            p: 3,
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Avaliar Resposta
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2">Nota (não afeta o curso):</Typography>
            <TextField
              type="number"
              value={grade}
              onChange={(e) => setGrade(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              size="small"
              InputProps={{
                inputProps: { min: 0, max: 100 },
              }}
              sx={{ 
                width: '100px',
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#9041c1',
                  },
                },
              }}
            />
            <Typography variant="body2">/100</Typography>
          </Box>

          <TextField
            label="Feedback para o aluno"
            multiline
            rows={3}
            fullWidth
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Escreva um comentário sobre a resposta..."
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#9041c1',
                },
              },
            }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              onClick={() => {
                setSelectedAnswer(null);
                setGrade(0);
                setFeedback('');
              }}
              sx={{ color: '#666' }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleGradeSubmit}
              sx={{
                backgroundColor: '#9041c1',
                '&:hover': { backgroundColor: '#7d37a7' },
              }}
            >
              Salvar Avaliação
            </Button>
          </Box>
        </DialogActions>
      )}

      {!selectedAnswer && (
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={onClose}
            sx={{
              color: '#9041c1',
              '&:hover': { backgroundColor: 'rgba(144, 65, 193, 0.04)' },
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default OpenEndedAnswers;
