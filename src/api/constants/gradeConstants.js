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

// Cores para visualização. A nota só tem duas leituras — aprovado ou reprovado
// —, então a cor acompanha exatamente o mesmo corte usado no status.
export const GRADE_COLORS = {
  APPROVED: '#4caf50',     // >= MINIMUM_PASSING_GRADE
  FAILED: '#f44336',       // < MINIMUM_PASSING_GRADE
  PENDING: '#9e9e9e',      // Sem nota
};