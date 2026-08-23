import { toast } from "react-toastify";
import { database } from "../../config/firebase";
import { ref, get, set, push, remove } from "firebase/database";

/**
 * Busca materiais extras de um curso específico
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de materiais
 */
export const fetchCourseMaterials = async (courseId) => {
  try {
    if (!courseId) {
      return [];
    }

    const materialsRef = ref(database, `courseMaterials/${courseId}`);
    const snapshot = await get(materialsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const courseMaterials = snapshot.val();
    const materialsArray = Object.entries(courseMaterials).map(([key, material]) => ({
      id: key,
      name: material.name || "Material sem nome",
      url: material.url || "",
      courseId: material.courseId,
    }));

    return materialsArray;
  } catch (error) {
    console.error("Erro ao buscar materiais extras:", error);
    throw error;
  }
};

/**
 * Adiciona um novo material ao curso
 * @param {string} courseId - ID do curso
 * @param {Object} materialData - Dados do material
 * @returns {Promise<Object>} - Material adicionado com ID
 */
export const addCourseMaterial = async (courseId, materialData) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso é necessário");
    }

    if (!materialData.name?.trim() || !materialData.url?.trim()) {
      throw new Error("Nome e URL do material são obrigatórios");
    }

    const material = {
      name: materialData.name.trim(),
      url: materialData.url.trim(),
      courseId: courseId
    };

    const courseMaterialsRef = ref(database, `courseMaterials/${courseId}`);
    const newMaterialRef = push(courseMaterialsRef);
    await set(newMaterialRef, material);

    return { ...material, id: newMaterialRef.key };
  } catch (error) {
    console.error("Erro ao adicionar material:", error);
    throw error;
  }
};

/**
 * Atualiza um material do curso
 * @param {string} courseId - ID do curso
 * @param {string} materialId - ID do material
 * @param {Object} materialData - Dados atualizados do material
 * @returns {Promise<Object>} - Material atualizado
 */
export const updateCourseMaterial = async (courseId, materialId, materialData) => {
  try {
    if (!courseId || !materialId) {
      throw new Error("ID do curso e do material são necessários");
    }

    if (!materialData.name?.trim() || !materialData.url?.trim()) {
      throw new Error("Nome e URL do material são obrigatórios");
    }
    const materialRef = ref(database, `courseMaterials/${courseId}/${materialId}`);
    const updatedMaterial = {
      courseId: courseId,
      name: materialData.name.trim(),
      url: materialData.url.trim()
    };
    await set(materialRef, updatedMaterial);
    toast.success("Material atualizado com sucesso!");
    return { ...updatedMaterial, id: materialId };
  } catch (error) {
    console.error("Erro ao atualizar material:", error);
    toast.error("Erro ao atualizar material: " + error.message);
    throw error;
  }
};

/**
 * Remove um material do curso
 * @param {string} courseId - ID do curso
 * @param {string} materialId - ID do material
 * @returns {Promise<boolean>} - Verdadeiro se a remoção for bem-sucedida
 */
export const deleteCourseMaterial = async (courseId, materialId) => {
  try {
    if (!courseId || !materialId) {
      throw new Error("ID do curso e do material são necessários");
    }

    const materialRef = ref(database, `courseMaterials/${courseId}/${materialId}`);
    await remove(materialRef);

    return true;
  } catch (error) {
    console.error("Erro ao excluir material:", error);
    toast.error("Erro ao excluir material: " + error.message);
    throw error;
  }
};

/**
 * Salva todos os materiais de um curso
 * @param {string} courseId - ID do curso
 * @param {Array} materials - Lista de materiais a serem salvos
 * @returns {Promise<boolean>} - Verdadeiro se a operação for bem-sucedida
 */
export const saveAllCourseMaterials = async (courseId, materials) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso não disponível");
    }

    // Buscar materiais existentes
    const courseMaterialsRef = ref(database, `courseMaterials/${courseId}`);
    const snapshot = await get(courseMaterialsRef);
    const existingMaterials = snapshot.val() || {};

    // Criar conjuntos para facilitar a comparação
    const existingMaterialIds = new Set(Object.keys(existingMaterials));
    const currentMaterialIds = new Set(
      materials.map((material) => material.id).filter((id) => id)
    );

    // Remover materiais que não estão mais na lista
    for (const id of existingMaterialIds) {
      if (!currentMaterialIds.has(id)) {
        await remove(ref(database, `courseMaterials/${courseId}/${id}`));
      }
    }

    // Adicionar ou atualizar materiais
    for (const material of materials) {
      const materialData = {
        courseId: courseId,
        name: material.name,
        url: material.url,
      };

      if (material.id && existingMaterialIds.has(material.id)) {
        // Atualizar material existente
        await set(
          ref(database, `courseMaterials/${courseId}/${material.id}`),
          materialData
        );
      } else {
        // Adicionar novo material
        const newMaterialRef = push(courseMaterialsRef);
        await set(newMaterialRef, materialData);
        material.id = newMaterialRef.key;
      }
    }

    return true;
  } catch (error) {
    console.error("Erro ao salvar materiais:", error);
    toast.error("Erro ao salvar materiais: " + error.message);
    throw error;
  }
};

/**
 * Importa materiais de OUTRO curso para este.
 *
 * A cópia é literal (nome e URL), com chave nova e `courseId` do destino: o
 * material do curso de origem continua intocado, e os dois passam a existir de
 * forma independente — editar um não mexe no outro.
 *
 * @param {string} sourceCourseId - curso de origem
 * @param {string} targetCourseId - curso de destino
 * @param {Array<string>} materialIds - ids dos materiais a importar
 * @returns {Promise<Array>} - materiais criados no destino (com id novo)
 */
export const importMaterialsFromCourse = async (
  sourceCourseId,
  targetCourseId,
  materialIds
) => {
  try {
    if (!sourceCourseId || !targetCourseId) {
      throw new Error("Curso de origem e de destino são necessários");
    }
    if (sourceCourseId === targetCourseId) {
      throw new Error("O curso de origem não pode ser o próprio curso");
    }
    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      throw new Error("Selecione ao menos um material para importar");
    }

    const sourceSnapshot = await get(ref(database, `courseMaterials/${sourceCourseId}`));
    const sourceMaterials = sourceSnapshot.val() || {};

    const targetRef = ref(database, `courseMaterials/${targetCourseId}`);
    const importados = [];

    for (const materialId of materialIds) {
      const material = sourceMaterials[materialId];
      if (!material) continue;

      const novo = {
        courseId: targetCourseId,
        name: (material.name || "Material sem nome").trim(),
        url: (material.url || "").trim(),
      };
      if (!novo.url) continue;

      const novoRef = push(targetRef);
      await set(novoRef, novo);
      importados.push({ ...novo, id: novoRef.key });
    }

    if (importados.length === 0) {
      throw new Error("Nenhum material válido foi encontrado para importar");
    }

    return importados;
  } catch (error) {
    console.error("Erro ao importar materiais:", error);
    throw error;
  }
};

/**
 * Marca quais materiais da origem já existem no destino, comparando pela URL —
 * é o que distingue "o mesmo material" de "outro material com nome parecido".
 * @param {Array} sourceMaterials - materiais da origem (fetchCourseMaterials)
 * @param {Array} targetMaterials - materiais do destino
 * @returns {Array} - origem, com `alreadyImported` em cada item
 */
export const markAlreadyImportedMaterials = (sourceMaterials, targetMaterials) => {
  const urlsNoDestino = new Set(
    (targetMaterials || []).map((m) => (m?.url || "").trim().toLowerCase()).filter(Boolean)
  );

  return (sourceMaterials || []).map((material) => ({
    ...material,
    alreadyImported: urlsNoDestino.has((material?.url || "").trim().toLowerCase()),
  }));
};
