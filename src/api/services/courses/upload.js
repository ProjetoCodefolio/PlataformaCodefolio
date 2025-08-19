// import { database } from '../../config/firebase';
// import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { ref, set, push } from 'firebase/database';
// import { storage } from '../../config/firebase'; // Certifique-se de adicionar essa exportação em firebase.js

// /**
//  * Faz upload de um arquivo para o Firebase Storage
//  */
// export const uploadFile = async (file, path) => {
//   try {
//     const fileRef = storageRef(storage, path);
//     await uploadBytes(fileRef, file);
//     const downloadURL = await getDownloadURL(fileRef);
//     return downloadURL;
//   } catch (error) {
//     console.error("Erro ao fazer upload do arquivo:", error);
//     throw error;
//   }
// };

// /**
//  * Adiciona um material de curso
//  */
// export const addCourseMaterial = async (courseId, materialData) => {
//   try {
//     const courseMaterialsRef = ref(database, `courseMaterials/${courseId}`);
//     const newMaterialRef = push(courseMaterialsRef);
    
//     const material = {
//       name: materialData.name.trim(),
//       url: materialData.url.trim(),
//       courseId
//     };
    
//     await set(newMaterialRef, material);
    
//     return { ...material, id: newMaterialRef.key };
//   } catch (error) {
//     console.error("Erro ao adicionar material:", error);
//     throw error;
//   }
// };

// /**
//  * Adiciona um slide de curso
//  */
// export const addCourseSlide = async (courseId, slideData) => {
//   try {
//     const courseSlidesRef = ref(database, `courseSlides/${courseId}`);
//     const newSlideRef = push(courseSlidesRef);
    
//     const slide = {
//       title: slideData.title.trim(),
//       url: slideData.url.trim(),
//       description: String(slideData.description || ""),
//       videoId: slideData.videoId
//     };
    
//     await set(newSlideRef, slide);
    
//     return { ...slide, id: newSlideRef.key };
//   } catch (error) {
//     console.error("Erro ao adicionar slide:", error);
//     throw error;
//   }
// };