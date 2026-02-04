import { database } from '$api/config/firebase';
import { ref, push, set, get, update, remove } from 'firebase/database';
import { toast } from "react-toastify";

export const fetchAllLlmModels = async () => {
    const llmModelsRef = ref(database, 'llmModels');
    const snapshot = await get(llmModelsRef);
    return snapshot.exists() ? snapshot.val() : {};
};

export const fetchLlmModelById = async (modelId) => {
    const modelRef = ref(database, `llmModels/${modelId}`);
    const snapshot = await get(modelRef);
    return snapshot.exists() ? snapshot.val() : null;
}

export const createLlmModel = async (modelData) => {
    try {
        const llmModelsRef = ref(database, 'llmModels');
        const newModelRef = push(llmModelsRef);
        await set(newModelRef, modelData);
        // toast.success("Modelo criado com sucesso!");
        return newModelRef.key;
    } catch (error) {
        // toast.error("Falha ao criar Modelo: " + error.message);
        console.error("Error creating LLM model:", error);
        throw new Error("Falha ao criar Modelo");
    }
}

export const updateLlmModel = async (modelId, updatedData) => {
    try {
        const modelRef = ref(database, `llmModels/${modelId}`);
        await update(modelRef, updatedData);
        // toast.success("Modelo atualizado com sucesso!");
    } catch (error) {
        // toast.error("Falha ao atualizar Modelo: " + error.message);
        console.error("Error updating LLM model:", error);
        throw new Error("Falha ao atualizar Modelo");
    }
};

export const changeStatusLlmModel = async (modelId, currentStatus) => {
    try {
        const modelRef = ref(database, `llmModels/${modelId}`);
        await update(modelRef, { isActive: !currentStatus, updatedAt: new Date().toISOString() });
        // toast.success("Status do modelo atualizado com sucesso!");
    } catch (error) {
        // toast.error("Falha ao atualizar status do Modelo: " + error.message);
        console.error("Error updating status of LLM model:", error);
        throw new Error("Falha ao atualizar status do Modelo");
    }
};