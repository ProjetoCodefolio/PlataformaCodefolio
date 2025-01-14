// import React, { useEffect, useState } from 'react';
// import PropTypes from 'prop-types';

// function VideoWatchTracker({ player }) {
//     const [watchTime, setWatchTime] = useState(0);
//     const [videoDuration, setVideoDuration] = useState(0);
//     const [percentageWatched, setPercentageWatched] = useState(0);

//     useEffect(() => {
//         let interval = null;

//         if (player) {
//             // Obtém a duração do vídeo assim que o player está pronto
//             const duration = player.getDuration();
//             setVideoDuration(duration);

//             interval = setInterval(() => {
//                 if (player.getPlayerState() === 1) { // 1 = playing
//                     setWatchTime((prev) => prev + 1);
//                 }
//             }, 1000); // Atualiza a cada segundo
//         }

//         return () => clearInterval(interval);
//     }, [player]);

//     useEffect(() => {
//         if (videoDuration > 0) {
//             const percentage = (watchTime / videoDuration) * 100;
//             setPercentageWatched(percentage.toFixed(2)); // Dois decimais
//         }
//     }, [watchTime, videoDuration]);

//     return (
//         <div style={{ marginTop: '10px', textAlign: 'left' }}>
//             <p>
//                 <strong>Tempo assistido:</strong> {watchTime >= 60 ? `${Math.floor(watchTime / 60)}min ${watchTime % 60}s` : `${watchTime}s`}
//             </p>
//             <p>
//                 <strong>Duração do vídeo:</strong> {videoDuration >= 60 ? `${Math.floor(videoDuration / 60)}min ${Math.round(videoDuration % 60)}s` : `${videoDuration}s`}
//             </p>
//             <p>
//                 <strong>Porcentagem assistida:</strong> {percentageWatched}%
//             </p>
//         </div>
//     );
// }

// VideoWatchTracker.propTypes = {
//     player: PropTypes.object,
// };

// export default VideoWatchTracker;


import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { LinearProgress, Box, Typography } from '@mui/material';

function VideoWatchTracker({ player }) {
    const [watchTime, setWatchTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [percentageWatched, setPercentageWatched] = useState(0);

    useEffect(() => {
        let interval = null;

        if (player) {
            // Obtém a duração do vídeo assim que o player está pronto
            const duration = player.getDuration();
            setVideoDuration(duration);

            interval = setInterval(() => {
                if (player.getPlayerState() === 1) { // 1 = playing
                    setWatchTime((prev) => prev + 1);
                }
            }, 1000); // Atualiza a cada segundo
        }

        return () => clearInterval(interval);
    }, [player]);

    useEffect(() => {
        if (videoDuration > 0) {
            const percentage = (watchTime / videoDuration) * 100;
            setPercentageWatched(percentage.toFixed(2)); // Dois decimais
        }
    }, [watchTime, videoDuration]);

    return (
        <div style={{ marginTop: '10px', textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '70%', margin: '0 auto' }}>
                <LinearProgress
                    variant="determinate"
                    value={percentageWatched}
                    sx={{
                        flex: 1, // Faz a barra ocupar todo o espaço disponível
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: '#3f51b5', // Cor personalizada
                        },
                    }}
                />
                <Typography
                    variant="body2"
                    sx={{
                        marginLeft: '10px',
                        color: '#555',
                        whiteSpace: 'nowrap', // Garante que o texto fique em linha
                    }}
                >
                    {percentageWatched}%
                </Typography>
            </Box>
            <p style={{ margin: '10px 0' }}>
                <strong>Tempo assistido:</strong> {watchTime >= 60 ? `${Math.floor(watchTime / 60)}min ${watchTime % 60}s` : `${watchTime}s`}
            </p>
            <p>
                <strong>Duração do vídeo:</strong> {videoDuration >= 60 ? `${Math.floor(videoDuration / 60)}min ${Math.round(videoDuration % 60)}s` : `${videoDuration}s`}
            </p>
        </div>
    );
}

VideoWatchTracker.propTypes = {
    player: PropTypes.object,
};

export default VideoWatchTracker;
