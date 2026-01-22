/**
 * Converte uma imagem para Base64
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<string>} - String Base64 da imagem
 */
export const convertImageToBase64 = async (file) => {
  try {
    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo inválido. Use JPG, PNG, GIF ou WEBP.');
    }

    // Validar tamanho (máximo 2MB para Base64)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 2MB.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        console.log('✅ Imagem convertida para Base64');
        resolve(reader.result);
      };
      
      reader.onerror = () => {
        console.error('❌ Erro ao converter imagem');
        reject(new Error('Erro ao processar imagem'));
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('❌ Erro ao converter imagem:', error);
    throw error;
  }
};

/**
 * Comprime a imagem e retorna Base64 visando ficar < ~50KB
 * Usa canvas para reduzir dimensões e qualidade.
 * @param {File} file
 * @param {number} targetSizeKB
 * @returns {Promise<string>} data URL Base64
 */
export const compressImageToBase64 = async (file, targetSizeKB = 45) => {
  // Carrega imagem
  const bitmap = await createImageBitmap(file);

  const maxDim = 1280; // limita dimensões para telas comuns
  let width = bitmap.width;
  let height = bitmap.height;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Itera qualidade até atingir tamanho alvo
  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  const toKB = (url) => {
    const base64 = url.split(',')[1] || '';
    try {
      const bytes = atob(base64).length;
      return Math.ceil(bytes / 1024);
    } catch {
      return Math.ceil(base64.length * 0.75 / 1024);
    }
  };

  let sizeKB = toKB(dataUrl);
  while (sizeKB > targetSizeKB && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeKB = toKB(dataUrl);
  }

  console.log(`✅ Imagem comprimida ~${sizeKB}KB (q=${quality.toFixed(2)})`);
  return dataUrl;
};

/**
 * Alias para compatibilidade com código existente
 */
export const uploadReportImage = async (file) => {
  // Tenta comprimir para reduzir o payload do EmailJS
  try {
    return await compressImageToBase64(file, 45);
  } catch (e) {
    // Fallback: retorna Base64 original se compressão falhar
    return await convertImageToBase64(file);
  }
};

/**
 * Valida se o arquivo é uma imagem válida
 * @param {File} file - Arquivo a ser validado
 * @returns {boolean} - True se válido
 */
export const validateImageFile = (file) => {
  if (!file) return false;
  
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return false;
  }
  
  const maxSize = 2 * 1024 * 1024; // 2MB para Base64
  if (file.size > maxSize) {
    return false;
  }
  
  return true;
};

/**
 * Formata o tamanho do arquivo para exibição
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} - Tamanho formatado
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
