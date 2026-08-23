import { useState } from "react";
import { IconButton } from "@mui/material";
import SendIcon from '@mui/icons-material/Send'; // Ícone de envio
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from "$context/AuthContext";
import MyAlert from '../alert/Alert';
import { abrirAlert } from '../../../../utils/postUtils';
import { postComment } from "$api/services/posts/comments";
import '../../post.css';

// A lista de comentários vem pronta do listener único do post (em `Post`), já
// em ordem cronológica; aqui ela é exibida da mais recente para a mais antiga.
export default function AddComment({ postId, comments = [] }) {
  const { currentUser } = useAuth();
  const [comentario, setComentario] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const quantidadeComentarios = comments.length;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      abrirAlert(
        setAlertMessage,
        setAlertSeverity,
        setAlertOpen,
        "Você precisa estar logado para comentar.",
        "error"
      );
      return;
    }

    if (!comentario.trim()) {
      abrirAlert(
        setAlertMessage,
        setAlertSeverity,
        setAlertOpen,
        "O comentário não pode estar vazio.",
        "warning"
      );
      return;
    }

    const success = await postComment(postId, comentario.trim(), currentUser);

    if (success) {
      abrirAlert(
        setAlertMessage,
        setAlertSeverity,
        setAlertOpen,
        "Comentário postado com sucesso!",
        "success"
      );
      setComentario('');
      setShowComments(true);
    } else {
      abrirAlert(
        setAlertMessage,
        setAlertSeverity,
        setAlertOpen,
        "Erro ao postar comentário.",
        "error"
      );
    }
  };

  return (
    <div className="comentarios-container" style={{ width: '98%', margin: '8px auto' }}>
      <div className="comenments-content">
        <form onSubmit={handleSubmit} className="comentarios-form" style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <input
            type="text"
            placeholder="Adicione um comentário..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={1000}
            className="comentarios-input"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              outline: 'none',
              fontSize: '0.9rem',
              '&:focus': {
                borderColor: '#9041c1'
              }
            }}
          />
          <IconButton
            type="submit"
            className="comentarios-button"
            disabled={!comentario.trim()}
            sx={{
              color: !comentario.trim() ? '#ccc' : '#9041c1',
              '&:hover': {
                backgroundColor: !comentario.trim() ? 'transparent' : 'rgba(144, 65, 193, 0.04)'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </form>

        <button
          className="comentarios-toggleButton"
          style={{
            border: '1px solid transparent',
            background: showComments ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
            color: showComments ? '#333' : '#666',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '4px',
            marginTop: '4px',
            marginBottom: '8px',
            transition: 'all 0.2s ease',
            boxShadow: showComments ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transform: showComments ? 'translateY(1px)' : 'none', // 
            borderBottom: showComments ? '2px solid rgba(0, 0, 0, 0.1)' : '2px solid transparent'
          }}
          onClick={() => setShowComments(!showComments)}
        >
          {showComments ? (
            <>
              <span style={{
                fontWeight: '500',
                transform: 'scale(1.02)',
                transition: 'transform 0.2s ease'
              }}>
                Ocultar
              </span>
              <span style={{ color: '#888', marginLeft: '4px' }}>
                ({quantidadeComentarios})
              </span>
              <ArrowDropUpIcon
                sx={{
                  color: '#888',
                  transform: 'translateY(-1px)'
                }}
              />
            </>
          ) : (
            <>
              <span style={{ fontWeight: '500' }}>Ver</span>
              <span style={{ color: '#888', marginLeft: '4px' }}>
                ({quantidadeComentarios})
              </span>
              <ArrowDropDownIcon
                sx={{
                  color: '#888',
                  transform: 'translateY(1px)'
                }}
              />
            </>
          )}
        </button>
      </div>

      {showComments && quantidadeComentarios > 0 ? (
        <ul className="comentarios-commentList" style={{
          listStyle: 'none',
          padding: '8px 0',
          margin: 0
        }}>
          {[...comments].reverse().map((item) => (
            <li key={item.id} className="comentarios-commentItem" style={{
              display: 'flex',
              gap: '12px',
              padding: '8px 0',
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
            }}>
              <img
                src={item.foto}
                alt={item.nome}
                className="comentarios-authorPhoto"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #9041c1'
                }}
              />
              <div className="comentarios-contentContainer" style={{
                flex: 1
              }}>
                <span className="comentarios-authorName" style={{
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  color: '#333',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  {item.nome}
                </span>
                <span className="comentarios-content" style={{
                  fontSize: '0.9rem',
                  color: '#666'
                }}>
                  {item.comentario}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        showComments &&
        <p style={{
          textAlign: 'center',
          color: '#666',
          fontSize: '0.9rem',
          margin: '16px 0'
        }}>
          Não há comentários ainda!
        </p>
      )}

      <MyAlert
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        message={alertMessage}
        severity={alertSeverity}
      />
    </div>
  );
}
