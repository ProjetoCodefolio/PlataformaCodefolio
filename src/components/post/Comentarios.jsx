import { useState, useEffect } from "react";
import { ref, get, update, onValue } from "firebase/database";
import { IconButton } from "@mui/material";
import SendIcon from '@mui/icons-material/Send'; // Ícone de envio
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from "../../context/AuthContext";
import { database } from "../../service/firebase";
import { getYouTubeID } from "./utils";
import axios from 'axios';
import './post.css'; // Importa o arquivo CSS

const API_KEY = import.meta.env.VITE_API_KEY;

export const fetchYouTubeComments = async (url) => {
  const videoId = getYouTubeID(url);
  if (!videoId) return [];

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
      params: {
        part: 'snippet',
        videoId: videoId,
        maxResults: 20,
        key: API_KEY,
      },
    });

    return response.data.items.map(item => ({
      uidUsuario: item.snippet.topLevelComment.snippet.authorChannelId.value,
      nome: item.snippet.topLevelComment.snippet.authorDisplayName,
      comentario: item.snippet.topLevelComment.snippet.textDisplay,
      data: item.snippet.topLevelComment.snippet.publishedAt,
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export default function Comentarios({ postId, comments, setComments }) {
  const { currentUser } = useAuth();
  const [comentario, setComentario] = useState('');
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const postRef = ref(database, `post/${postId}`);
    onValue(postRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.comentarios) {
        setComments((prevComments) => ({
          ...prevComments,
          [postId]: data.comentarios,
        }));
      } else {
        setComments((prevComments) => ({
          ...prevComments,
          [postId]: [],
        }));
      }
    });
  }, [postId, setComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    postarComentario(postId, comentario);
    setComentario('');
  };

  const postarComentario = async (postId, comentario) => {
    const dataComentario = new Date().toLocaleDateString();
    const novoComentario = {
      uidUsuario: currentUser.uid,
      nome: currentUser.displayName,
      comentario: comentario,
      data: dataComentario
    };

    const postRef = ref(database, `post/${postId}`);

    try {
      const snapshot = await get(postRef);
      const postData = snapshot.val();

      let comentarioPostar = [];
      if (postData && postData.comentarios) {
        comentarioPostar = [...postData.comentarios, novoComentario];
      } else {
        comentarioPostar = [novoComentario];
      }

      await update(postRef, { comentarios: comentarioPostar });
      alert("Comentário postado com sucesso!");
    } catch (error) {
      console.error("Erro ao postar comentário: ", error);
    }
  };

  return (
    <div className="comentarios-container">
      <form onSubmit={handleSubmit} className="comentarios-form">
        <input
          type="text"
          placeholder="Adicione um comentário..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          className="comentarios-input"
        />
        <IconButton type="submit" className="comentarios-button">
          <SendIcon />
        </IconButton>
      </form>

      <button className="comentarios-toggleButton" onClick={() => setShowComments(!showComments)}>
        {showComments ? (
          <> Ocultar Comentários <ArrowDropUpIcon /> </>
        ) : (
          <> Mostrar Comentários <ArrowDropDownIcon /> </>
        )}
      </button>

      {showComments && comments[postId] && comments[postId].length > 0 ? (
        <ul className="comentarios-commentList">
          {comments[postId].map((comentario, index) => (
            <li key={index} className="comentarios-commentItem">
              <span className="comentarios-authorName">{comentario.nome}</span> - {comentario.comentario}
            </li>
          )).reverse()}
        </ul>
      ) : (
        showComments && <p>Não há comentários ainda!</p>
      )}
    </div>
  );
}