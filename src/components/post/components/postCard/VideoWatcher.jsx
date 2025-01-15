// versão que conta o tempo assistido através do tempo atual do vídeo

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { LinearProgress, Box, Typography } from '@mui/material';

function VideoWatcher({ player }) {
    const [watchTime, setWatchTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [percentageWatched, setPercentageWatched] = useState(0);

    useEffect(() => {
        if (player) {
            setVideoDuration(player.getDuration());

            const interval = setInterval(() => {
                if (player.getPlayerState() === 1) { // 1 = vídeo em reprodução
                    const currentTime = player.getCurrentTime(); // Obtém o tempo atual do vídeo
                    setWatchTime(currentTime); // Atualiza o tempo assistido com base no player
                }
            }, 1000); // Verifica a cada segundo

            return () => clearInterval(interval);
        }
    }, [player]);

    useEffect(() => {
        if (videoDuration > 0) {
            const percentage = (watchTime / videoDuration) * 100;
            setPercentageWatched(percentage.toFixed(2)); // Define a porcentagem com precisão
        }
    }, [watchTime, videoDuration]);

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
};

export default VideoWatcher;


// a ver:

// captura dos eventos de fechar a página pra salvar o tempo assistido

// pensar numa forma ok de salvar isso no banco de dados

// tentar ver uma forma do player não poder ser avançado, apenas pausado e reproduzido -> não é uma grande prioridade