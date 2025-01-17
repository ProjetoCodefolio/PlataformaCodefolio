import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ref, set, update, get, child } from 'firebase/database';
import { database } from '../../../../service/firebase';
import { useAuth } from '../../../../context/AuthContext';
import { LinearProgress, Box, Typography } from '@mui/material';

function VideoWatcher({ player, videoId, initialWatchTime, initialPercentageWatched }) {
    const [watchTime, setWatchTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [percentageWatched, setPercentageWatched] = useState(initialPercentageWatched || 0);
    const [lastSavedPercentage, setLastSavedPercentage] = useState(initialPercentageWatched || 0);
    const { currentUser } = useAuth();

    useEffect(() => {
        setPercentageWatched(initialPercentageWatched || 0);
        setLastSavedPercentage(initialPercentageWatched || 0);
        setWatchTime(initialWatchTime);
    }, [initialPercentageWatched]);

    useEffect(() => {
        if (player) {
            setVideoDuration(player.getDuration());

            const interval = setInterval(() => {
                if (player.getPlayerState() === 1) { // vídeo em reprodução
                    const currentTime = player.getCurrentTime();
                    setWatchTime(currentTime); // Atualiza o tempo assistido com base no player
                }
            }, 1000); // Verifica a cada segundo

            return () => clearInterval(interval);
        }
    }, [player]);

    useEffect(() => {
        if (videoDuration > 0) {
            const percentage = ((watchTime / videoDuration) * 100).toFixed(2);
            setPercentageWatched(parseFloat(percentage)); // Define a porcentagem com precisão

            if (parseFloat(percentage) - lastSavedPercentage >= 10) {
                saveWatchTime(videoId, parseFloat(percentage));
                setLastSavedPercentage(parseFloat(percentage) - (parseFloat(percentage) % 10)); // Atualiza a última porcentagem salva
            }
        }
    }, [watchTime, videoDuration]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            event.preventDefault();
            if (percentageWatched > lastSavedPercentage) {
                saveWatchTime(videoId, percentageWatched);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [percentageWatched, lastSavedPercentage, videoId]);

    const saveWatchTime = async (videoId, percentage) => {
        const watchTimeRef = ref(database, 'videoWatchTime');
        const userVideoRef = child(watchTimeRef, `${currentUser.uid}_${videoId}`);
    
        const newWatchTimeData = {
            videoId: videoId,
            userId: currentUser.uid,
            watchedTime: `${Math.floor(watchTime / 60)}min ${Math.round(watchTime % 60)}s`,
            watchedTimeInSeconds: watchTime,
            videoDuration: `${Math.floor(videoDuration / 60)}min ${Math.round(videoDuration % 60)}s`,
            percentageWatched: percentage,
        };
    
        const snapshot = await get(userVideoRef);
        if (snapshot.exists()) {
            await update(userVideoRef, newWatchTimeData);
        } else {
            await set(userVideoRef, newWatchTimeData);
        }
    };

    return (
        <div style={{ marginTop: '10px', textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '70%', margin: '0 auto' }}>
                <LinearProgress
                    variant="determinate"
                    value={percentageWatched}
                    sx={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: '#6A1B9A',
                        },
                    }}
                />
                <Typography
                    variant="body2"
                    sx={{
                        marginLeft: '10px',
                        color: '#555',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {percentageWatched}%
                </Typography>
            </Box>
            <p style={{ margin: '10px 0' }}>
                <strong>Tempo assistido:</strong> {watchTime >= 60 ? `${Math.floor(watchTime / 60)}min ${Math.round(watchTime % 60)}s` : `${Math.round(watchTime)}s`}
            </p>
            <p>
                <strong>Duração do vídeo:</strong> {videoDuration >= 60 ? `${Math.floor(videoDuration / 60)}min ${Math.round(videoDuration % 60)}s` : `${Math.round(videoDuration)}s`}
            </p>
        </div>
    );
}

VideoWatcher.propTypes = {
    player: PropTypes.object,
    videoId: PropTypes.string.isRequired,
    initialWatchTime: PropTypes.number.isRequired,
    initialPercentageWatched: PropTypes.number.isRequired,
};

export default VideoWatcher;

// a ver:

// captura dos eventos de fechar a página pra salvar o tempo assistido -> OK

// pensar numa forma ok de salvar isso no banco de dados -> OK

// tentar ver uma forma do player não poder ser avançado, apenas pausado e reproduzido -> não é uma grande prioridade