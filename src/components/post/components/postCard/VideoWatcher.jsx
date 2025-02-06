import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ref, get, set, update, child } from 'firebase/database';
import { database } from '../../../../service/firebase';
import { useAuth } from '../../../../context/AuthContext';
import { LinearProgress, Box, Typography } from '@mui/material';

function VideoWatcher({ player, videoId, onMarkAsWatched }) {
    const [watchTime, setWatchTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [percentageWatched, setPercentageWatched] = useState(0);
    const [lastSavedPercentage, setLastSavedPercentage] = useState(0);
    const { currentUser } = useAuth();

    const roundNumber = (num) => Math.floor(num);

    useEffect(() => {
        const fetchWatchData = async () => {
            const watchTimeRef = ref(database, 'videoWatchTime');
            const userVideoRef = child(watchTimeRef, `${currentUser.uid}_${videoId}`);
            const snapshot = await get(userVideoRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                setPercentageWatched(data.percentageWatched || 0);
                setLastSavedPercentage(data.percentageWatched || 0);
                setWatchTime(data.watchedTimeInSeconds || 0);
            }
        };

        if (currentUser && videoId) {
            fetchWatchData();
        }
    }, [currentUser, videoId]);

    useEffect(() => {
        if (player) {
            const duration = roundNumber(player.getDuration());
            setVideoDuration(duration);

            const interval = setInterval(() => {
                if (!player.paused) {
                    const currentTime = roundNumber(player.getCurrentTime());
                    setWatchTime(currentTime >= duration ? duration : currentTime);
                }
            }, 500);

            return () => clearInterval(interval);
        }
    }, [player]);

    useEffect(() => {
        if (videoDuration > 0) {
            const calculatedPercentage = Math.min(
                100,
                parseFloat(((watchTime / videoDuration) * 100).toFixed(1))
            );

            if (calculatedPercentage > percentageWatched) {
                setPercentageWatched(calculatedPercentage);
            }

            if (calculatedPercentage >= 90 && onMarkAsWatched) {
                onMarkAsWatched();
            }

            if (calculatedPercentage - lastSavedPercentage >= 10 || calculatedPercentage === 100) {
                saveWatchTime(videoId, calculatedPercentage);
                setLastSavedPercentage(calculatedPercentage);
            }
        }
    }, [watchTime, videoDuration]);

    const saveWatchTime = async (videoId, percentage) => {
        const watchTimeRef = ref(database, 'videoWatchTime');
        const userVideoRef = child(watchTimeRef, `${currentUser.uid}_${videoId}`);

        const newWatchTimeData = {
            videoId,
            userId: currentUser.uid,
            watchedTime: `${Math.floor(watchTime / 60)}min ${Math.round(watchTime % 60)}s`,
            watchedTimeInSeconds: watchTime,
            videoDuration: `${Math.floor(videoDuration / 60)}min ${Math.round(videoDuration % 60)}s`,
            percentageWatched: percentage,
        };

        const snapshot = await get(userVideoRef);
        if (snapshot.exists()) {
            const existingData = snapshot.val();
            if (percentage > existingData.percentageWatched) {
                await update(userVideoRef, newWatchTimeData);
            }
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
                <Typography variant="body2" sx={{ marginLeft: '10px', color: '#555' }}>
                    {percentageWatched}%
                </Typography>
            </Box>
            <p><strong>Tempo assistido:</strong> {watchTime}s</p>
            <p><strong>Duração do vídeo:</strong> {videoDuration}s</p>
        </div>
    );
}

VideoWatcher.propTypes = {
    player: PropTypes.object,
    videoId: PropTypes.string.isRequired,
    onMarkAsWatched: PropTypes.func,
};

export default VideoWatcher;
