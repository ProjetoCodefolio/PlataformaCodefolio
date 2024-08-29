import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_KEY = import.meta.env.VITE_API_KEY;

const LikesYouTube = ({ videoId }) => {
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    if (!videoId) return;

    axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'statistics',
        id: videoId,
        key: API_KEY,
      },
    })
    .then(response => {
      console.log('Likes:', response.data.items[0].statistics.likeCount);
      setLikes(response.data.items[0].statistics.likeCount);
    })
    .catch(error => {
      console.error('Error fetching likes:', error);
    });
  }, [videoId]);

  return (
    <div>
      <h4>Likes: {likes}</h4>
    </div>
  );
};

export default LikesYouTube;