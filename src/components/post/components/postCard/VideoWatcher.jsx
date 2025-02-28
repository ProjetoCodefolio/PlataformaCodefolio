// import React, { useState, useEffect, useRef } from 'react';
// import PropTypes from 'prop-types';
// import { ref, get, set, update, child } from 'firebase/database';
// import { database } from '../../../../service/firebase';
// import { useAuth } from '../../../../context/AuthContext';
// import { LinearProgress, Box, Typography } from '@mui/material';
// import { toast } from 'react-toastify';

// function VideoWatcher({ player, videoId, onMarkAsWatched }) {
//     if (!videoId) {
//         console.error('Erro: videoId está indefinido.');
//         return null;
//     }

//     const [watchTime, setWatchTime] = useState(0);
//     const [videoDuration, setVideoDuration] = useState(0);
//     const [percentageWatched, setPercentageWatched] = useState(0);
//     const [lastSavedTime, setLastSavedTime] = useState(0); // Tempo salvo no Firebase
//     const { currentUser } = useAuth();
//     const progressInterval = useRef(null);
//     const hasNotifiedRef = useRef(false); // Controla notificações

//     const roundNumber = (num) => Math.floor(num);

//     // Busca o progresso salvo no Firebase
//     useEffect(() => {
//         const fetchWatchData = async () => {
//             if (!currentUser) return;
//             const watchTimeRef = ref(database, 'videoWatchTime');
//             const userVideoRef = child(watchTimeRef, `${currentUser.uid}_${videoId}`);
//             try {
//                 const snapshot = await get(userVideoRef);
//                 if (snapshot.exists()) {
//                     const data = snapshot.val();
//                     setPercentageWatched(data.percentageWatched || 0);
//                     setLastSavedTime(data.watchedTimeInSeconds || 0);
//                     setWatchTime(data.watchedTimeInSeconds || 0);
//                     if (player && data.watchedTimeInSeconds) {
//                         player.seekTo(data.watchedTimeInSeconds);
//                     }
//                 }
//             } catch (error) {
//                 console.error('Erro ao buscar progresso:', error);
//             }
//         };
//         fetchWatchData();
//     }, [currentUser, videoId, player]);

//     // Monitora o progresso do vídeo
//     useEffect(() => {
//         if (player) {
//             const duration = roundNumber(player.getDuration());
//             setVideoDuration(duration);

//             progressInterval.current = setInterval(() => {
//                 if (!player.paused) {
//                     const currentTime = roundNumber(player.getCurrentTime());
//                     setWatchTime(currentTime >= duration ? duration : currentTime);
//                 }
//             }, 500);

//             return () => {
//                 if (progressInterval.current) {
//                     clearInterval(progressInterval.current);
//                 }
//             };
//         }
//     }, [player]);

//     // Atualiza o progresso e salva no Firebase
//     useEffect(() => {
//         if (videoDuration > 0) {
//             const calculatedPercentage = Math.min(
//                 100,
//                 parseFloat(((watchTime / videoDuration) * 100).toFixed(1)
//             ));

//             // Atualiza a porcentagem assistida
//             if (calculatedPercentage > percentageWatched) {
//                 setPercentageWatched(calculatedPercentage);
//             }

//             // Notifica quando 90% do vídeo é assistido (apenas uma vez)
//             if (calculatedPercentage >= 90 && !hasNotifiedRef.current) {
//                 hasNotifiedRef.current = true;
//                 onMarkAsWatched();
//                 toast.success("Progresso do vídeo concluído!");
//             }

//             // Salva o progresso no Firebase apenas se o tempo atual for maior que o último salvo
//             if (watchTime > lastSavedTime && (calculatedPercentage - lastSavedTime >= 10 || calculatedPercentage === 100)) {
//                 saveWatchTime(videoId, calculatedPercentage);
//                 setLastSavedTime(watchTime);
//             }
//         }
//     }, [watchTime, videoDuration]);

//     // Salva o progresso no Firebase
//     const saveWatchTime = async (videoId, percentage) => {
//         if (!currentUser?.uid || !videoId) return;
//         const watchTimeRef = ref(database, 'videoWatchTime');
//         const userVideoRef = child(watchTimeRef, `${currentUser.uid}_${videoId}`);

//         const newWatchTimeData = {
//             videoId,
//             userId: currentUser.uid,
//             watchedTime: `${Math.floor(watchTime / 60)}min ${Math.round(watchTime % 60)}s`,
//             watchedTimeInSeconds: watchTime,
//             videoDuration: `${Math.floor(videoDuration / 60)}min ${Math.round(videoDuration % 60)}s`,
//             percentageWatched: percentage,
//             lastUpdated: new Date().toISOString(),
//         };

//         try {
//             const snapshot = await get(userVideoRef);
//             if (snapshot.exists()) {
//                 const existingData = snapshot.val();
//                 if (percentage > existingData.percentageWatched) {
//                     await update(userVideoRef, newWatchTimeData);
//                 }
//             } else {
//                 await set(userVideoRef, newWatchTimeData);
//             }
//         } catch (error) {
//             console.error('Erro ao salvar progresso:', error);
//             toast.error('Erro ao salvar progresso do vídeo.');
//         }
//     };

//     return (
//         <Box sx={{ mt: 2 }}>
//             <LinearProgress
//                 variant="determinate"
//                 value={percentageWatched}
//                 sx={{
//                     height: 8,
//                     borderRadius: 5,
//                     backgroundColor: '#e0e0e0',
//                     '& .MuiLinearProgress-bar': {
//                         backgroundColor: '#9041c1',
//                         borderRadius: 5,
//                     },
//                 }}
//             />
//             <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
//                 Progresso: {Math.floor(percentageWatched)}%
//                 {videoDuration > 0 && ` - ${Math.floor(watchTime)}/${Math.floor(videoDuration)} segundos`}
//             </Typography>
//         </Box>
//     );
// }

// VideoWatcher.propTypes = {
//     player: PropTypes.object,
//     videoId: PropTypes.string.isRequired,
//     onMarkAsWatched: PropTypes.func.isRequired,
// };

// export { VideoWatcher };