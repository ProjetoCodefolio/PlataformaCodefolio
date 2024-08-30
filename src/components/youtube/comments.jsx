import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_KEY = import.meta.env.VITE_API_KEY;

const ComentariosYouTube = ({ videoId }) => {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [maxResults, setMaxResults] = useState(5);

  useEffect(() => {
    if (!videoId || !showComments) return;

    axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
      params: {
        part: 'snippet',
        videoId: videoId,
        maxResults: maxResults,
        key: API_KEY,
      },
    })
    .then(response => {
      console.log('Comments:', response.data.items);
      setComments(response.data.items);
    })
    .catch(error => {
      console.error('Error fetching comments:', error);
    });
  }, [videoId, showComments, maxResults]);

  const handleLoadComments = () => {
    setShowComments(true);
  };

  return (
    <div>
      <button onClick={handleLoadComments} style={{ marginRight: '8px' }}>Carregar Comentários</button>
      <select
        value={maxResults} 
        onChange={(e) => setMaxResults(e.target.value)}
      >
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="15">15</option>
        <option value="20">20</option>
      </select>
      {showComments && (
        <ul>
          {comments.map((comment, index) => (
            <li key={index}>
              <p><strong>{comment.snippet.topLevelComment.snippet.authorDisplayName}</strong></p>
              <p>{comment.snippet.topLevelComment.snippet.textDisplay}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ComentariosYouTube;