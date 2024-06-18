import React, { useState } from 'react';
import axios from 'axios';

const ComentarYouTube = ({ videoId }) => {
  const [comment, setComment] = useState('');

  const handleCommentSubmit = async () => {
    if (!comment) return;

    // Get the OAuth 2.0 access token
    const token = getAccessToken();

    const body = {
      snippet: {
        videoId: videoId,
        topLevelComment: {
          snippet: {
            textOriginal: comment
          }
        }
      }
    };

    axios.post('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', body, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        console.log('Comment posted:', response.data);
        setComment('');
      })
      .catch(error => {
        console.error('Error posting comment:', error);
      });
  };

  return (
    <div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
      <button onClick={handleCommentSubmit}>Post Comment</button>
    </div>
  );
};

export default ComentarYouTube;