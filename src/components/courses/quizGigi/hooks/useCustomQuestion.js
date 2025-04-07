import { useState, useEffect } from "react";
import { ref, get, set, serverTimestamp } from "firebase/database";
import { database } from "../../../../service/firebase";

export const useCustomQuestion = (courseId, quizId, selectedStudent) => {
  const [customResults, setCustomResults] = useState({
    correctAnswers: {},
    wrongAnswers: {}
  });
  const [correctFeedback, setCorrectFeedback] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

  // Carregar resultados de perguntas personalizadas ao iniciar
  useEffect(() => {
    if (courseId && quizId) {
      const customResultsRef = ref(database, `quizGigi/courses/${courseId}/quizzes/${quizId}/customResults`);
      
      get(customResultsRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setCustomResults({
            correctAnswers: data.correctAnswers || {},
            wrongAnswers: data.wrongAnswers || {}
          });
        }
      }).catch(error => {
        console.error("Erro ao carregar resultados personalizados:", error);
      });
    }
  }, [courseId, quizId]);

  const handleCustomCorrectAnswer = async (onSuccess) => {
    if (!selectedStudent || buttonsDisabled) return;

    setButtonsDisabled(true);
    setCorrectFeedback(true);
    
    try {
      const newAnswerId = Date.now().toString();
      const newPath = `quizGigi/courses/${courseId}/quizzes/${quizId}/customResults/correctAnswers/${selectedStudent.userId}/${newAnswerId}`;
      const answerRef = ref(database, newPath);
      
      const answerData = {
        timestamp: serverTimestamp(),
        studentName: selectedStudent.name,
        photoURL: selectedStudent.photoURL || null,
        userId: selectedStudent.userId,
        isCorrect: true,
        id: newAnswerId
      };
      
      await set(answerRef, answerData);
      
      setCustomResults(prev => {
        const newState = JSON.parse(JSON.stringify(prev));
        
        if (!newState.correctAnswers) {
          newState.correctAnswers = {};
        }
        
        if (!newState.correctAnswers[selectedStudent.userId]) {
          newState.correctAnswers[selectedStudent.userId] = {};
        }
        
        newState.correctAnswers[selectedStudent.userId][newAnswerId] = {
          ...answerData,
          timestamp: Date.now()
        };
        
        return newState;
      });
      
      setTimeout(() => {
        setCorrectFeedback(false);
        setButtonsDisabled(false);
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      }, 2000);
      
    } catch (error) {
      setCorrectFeedback(false);
      setButtonsDisabled(false);
      console.error("Erro ao registrar resposta personalizada:", error);
    }
  };

  const handleCustomIncorrectAnswer = async (onSuccess) => {
    if (!selectedStudent || buttonsDisabled) return;

    setButtonsDisabled(true);
    setIncorrectFeedback(true);
    
    try {
      const path = `quizGigi/courses/${courseId}/quizzes/${quizId}/customResults/wrongAnswers/${selectedStudent.userId}`;
      const answerRef = ref(database, path);
      
      const answerData = {
        timestamp: serverTimestamp(),
        studentName: selectedStudent.name,
        photoURL: selectedStudent.photoURL || null,
        userId: selectedStudent.userId,
        isCorrect: false
      };
      
      await set(answerRef, answerData);
      
      setCustomResults(prev => ({
        ...prev,
        wrongAnswers: {
          ...prev.wrongAnswers,
          [selectedStudent.userId]: {
            ...answerData,
            timestamp: Date.now()
          }
        }
      }));
      
      setTimeout(() => {
        setIncorrectFeedback(false);
        setButtonsDisabled(false);
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      }, 500);
      
    } catch (error) {
      setIncorrectFeedback(false);
      setButtonsDisabled(false);
      console.error("Erro ao registrar resposta personalizada:", error);
    }
  };

  const processCustomResults = (correctAnswers) => {
    if (!correctAnswers) return [];
    
    const studentCorrectMap = {};
    
    Object.entries(correctAnswers).forEach(([userId, answers]) => {
      if (typeof answers === "object" && !Array.isArray(answers)) {
        Object.values(answers).forEach((answer) => {
          if (!studentCorrectMap[userId]) {
            studentCorrectMap[userId] = {
              studentName: answer.studentName,
              photoURL: answer.photoURL,
              userId: userId,
              count: 0,
            };
          }
          studentCorrectMap[userId].count++;
        });
      } else {
        const answer = answers;
        if (!studentCorrectMap[userId]) {
          studentCorrectMap[userId] = {
            studentName: answer.studentName,
            photoURL: answer.photoURL,
            userId: userId,
            count: 0,
          };
        }
        studentCorrectMap[userId].count++;
      }
    });
  
    return Object.values(studentCorrectMap);
  };

  return {
    customResults,
    correctFeedback,
    incorrectFeedback,
    buttonsDisabled,
    handleCustomCorrectAnswer,
    handleCustomIncorrectAnswer,
    processCustomResults
  };
};

export default useCustomQuestion;