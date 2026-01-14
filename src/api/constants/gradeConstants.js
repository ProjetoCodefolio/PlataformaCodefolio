/**
 * Constantes para o sistema de notas
 */

// Nota mínima para aprovação
export const MINIMUM_PASSING_GRADE = 6;

// Nota máxima
export const MAXIMUM_GRADE = 10;

// Limites de status
export const GRADE_STATUS = {
  PENDING: 'pending',      // Tem notas faltando
  APPROVED: 'approved',    // Todas as notas e nota final >= MINIMUM_PASSING_GRADE
  FAILED: 'failed',        // Todas as notas e nota final < MINIMUM_PASSING_GRADE
};

// Cores para visualização
export const GRADE_COLORS = {
  EXCELLENT: '#2e7d32',    // >= 9
  GOOD: '#558b2f',         // >= 7
  FAIR: '#f57c00',         // >= 6
  POOR: '#c62828',         // < 6
  PENDING: '#757575',      // Sem nota
};

// Cores para diferencial (acima/abaixo da média)
export const GRADE_DIFFERENTIAL_COLORS = {
  ABOVE_AVERAGE: '#4caf50',    // Acima de 6
  BELOW_AVERAGE: '#f44336',    // Abaixo de 6
  EQUAL_AVERAGE: '#ff9800',    // Exatamente 6
};