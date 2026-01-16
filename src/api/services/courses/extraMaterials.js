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