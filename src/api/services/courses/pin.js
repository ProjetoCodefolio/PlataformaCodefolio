import crypto from 'crypto-js';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';

/**
 * Criptografa o PIN do curso para armazenamento seguro
 * Esta é uma função bidirecional que permite descriptografia
 * @param {string} pin - O PIN a ser criptografado
 * @param {string} courseId - ID do curso (usado como chave)
 * @returns {string} - PIN criptografado
 */
export const encryptPin = (pin, courseId) => {
  // Usar uma chave de criptografia baseada no courseId + uma chave secreta
  const secretKey = courseId + import.meta.env.VITE_PIN_SECRET_KEY;
  return crypto.AES.encrypt(pin, secretKey).toString();
};

/**
 * Descriptografa o PIN criptografado
 * @param {string} encryptedPin - PIN criptografado
 * @param {string} courseId - ID do curso (usado como chave)
 * @returns {string} - PIN original
 */
export const decryptPin = (encryptedPin, courseId) => {
  try {
    const secretKey = courseId + import.meta.env.VITE_PIN_SECRET_KEY;
    const bytes = crypto.AES.decrypt(encryptedPin, secretKey);
    return bytes.toString(crypto.enc.Utf8);
  } catch (error) {
    console.error("Erro ao descriptografar PIN:", error);
    return "[PIN inválido]";
  }
};

/**
 * Hashes a course PIN for secure storage
 * @param {string} pin - The raw PIN to hash
 * @param {string} salt - Optional salt to add (defaults to courseId)
 * @returns {string} - Hashed PIN
 */
export const hashPin = (pin, salt = 'codefolio') => {
  // Create a salted hash using SHA-256
  return crypto.SHA256(pin + salt).toString();
};

/**
 * Verifies if a PIN matches the stored hash
 * @param {string} enteredPin - PIN entered by user
 * @param {string} storedHash - Hashed PIN from database
 * @param {string} salt - Optional salt (should match the one used for hashing)
 * @returns {boolean} - True if PIN is valid
 */
export const verifyPin = (enteredPin, storedHash, salt = 'codefolio') => {
  const hashedEnteredPin = hashPin(enteredPin, salt);
  return hashedEnteredPin === storedHash;
};

export const validateCoursePin = async (courseId, enteredPin) => {
  try {
    const courseRef = ref(database, `courses/${courseId}`);
    const snapshot = await get(courseRef);

    if (!snapshot.exists()) {
      throw new Error("Curso não encontrado");
    }

    const courseData = snapshot.val();

    // Se o curso não tem proteção por PIN ou não há hash armazenado, a validação falha
    if (!courseData.pinEnabled || (!courseData.pin && !courseData.pinHash)) {
      return false;
    }

    // Se o atributo "pin" bruto estiver presente, comparar diretamente com ele
    if (courseData.pin) {
      return enteredPin === courseData.pin;
    }

    // Caso contrário, verificar o PIN informado contra o hash armazenado
    return verifyPin(enteredPin, courseData.pinHash, courseId);
  } catch (error) {
    console.error(`Erro ao validar PIN do curso ${courseId}:`, error);
    throw new Error("Não foi possível validar o PIN do curso.");
  }
};