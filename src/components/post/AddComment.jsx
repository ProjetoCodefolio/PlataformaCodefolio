// import { useState, useEffect } from "react";
// import { ref, get, update, onValue } from "firebase/database";
// import { IconButton, Grid } from "@mui/material";
// import SendIcon from '@mui/icons-material/Send'; // Ícone de envio
// import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
// import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
// import { useAuth } from "../../context/AuthContext";
// import { database } from "../../service/firebase";
// import MyAlert from './Alert';
// import { abrirAlert } from './utils';
// import './post.css';

// export default function AddComment({ postId, comments, setComments }) {
//   const { currentUser } = useAuth();
//   const [comentario, setComentario] = useState('');
//   const [showComments, setShowComments] = useState(false);
//   const [alertOpen, setAlertOpen] = useState(false); // Estado para controlar a visibilidade do alerta
//   const [alertMessage, setAlertMessage] = useState(''); // Estado para a mensagem do alerta
//   const [alertSeverity, setAlertSeverity] = useState('success'); // Estado para a severidade do alerta
//   const quantidadeComentarios = comments[postId] ? comments[postId].length : 0;

//   useEffect(() => {
//     const postRef = ref(database, `post/${postId}`);
//     onValue(postRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data && data.comentarios) {
//         setComments((prevComments) => ({
//           ...prevComments,
//           [postId]: data.comentarios,
//         }));
//       } else {
//         setComments((prevComments) => ({
//           ...prevComments,
//           [postId]: [],
//         }));
//       }
//     });
//   }, [postId, setComments]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     postarComentario(postId, comentario);
//     setComentario('');
//   };

//   const postarComentario = async (postId, comentario) => {
//     const dataComentario = new Date().toLocaleDateString();
//     const novoComentario = {
//       uidUsuario: currentUser.uid,
//       nome: currentUser.displayName,
//       comentario: comentario,
//       data: dataComentario,
//       foto: currentUser.photoURL // Adicionando a URL da foto do autor
//     };

//     const postRef = ref(database, `post/${postId}`);

//     try {
//       const snapshot = await get(postRef);
//       const postData = snapshot.val();

//       let comentarioPostar = [];
//       if (postData && postData.comentarios) {
//         comentarioPostar = [...postData.comentarios, novoComentario];
//       } else {
//         comentarioPostar = [novoComentario];
//       }

//       await update(postRef, { comentarios: comentarioPostar });
//       abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Comentário postado com sucesso!", "success");
//     } catch (error) {
//       console.error("Erro ao postar comentário: ", error);
//       abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Erro ao postar comentário.", "error");
//     }
//   };

//   return (
//     <div className="comentarios-container">

//       <Grid container spacing={2}>
//         <div className="comenments-content">
//           <Grid item xs={8}>
//             <form onSubmit={handleSubmit} className="comentarios-form">
//               <input
//                 type="text"
//                 placeholder="Adicione um comentário..."
//                 value={comentario}
//                 onChange={(e) => setComentario(e.target.value)}
//                 className="comentarios-input"
//               />
//               <IconButton type="submit" className="comentarios-button">
//                 <SendIcon />
//               </IconButton>
//             </form>
//           </Grid>
//           <Grid item xs={4}>
//             <button className="comentarios-toggleButton" onClick={() => setShowComments(!showComments)}>
//               {showComments ? (
//                 <> Ocultar ({quantidadeComentarios}) <ArrowDropUpIcon /> </>
//               ) : (
//                 <> Ver ({quantidadeComentarios}) <ArrowDropDownIcon /> </>
//               )}
//             </button>
//           </Grid>
//         </div>


//         {showComments && comments[postId] && comments[postId].length > 0 ? (
//           <ul className="comentarios-commentList">
//             {comments[postId].map((comentario, index) => (
//               <li key={index} className="comentarios-commentItem">
//                 <img src={comentario.foto} alt={comentario.nome} className="comentarios-authorPhoto" />
//                 <div className="comentarios-contentContainer">
//                   <span className="comentarios-authorName">{comentario.nome}</span>
//                   <span className="comentarios-content">{comentario.comentario}</span>
//                 </div>
//               </li>
//             )).reverse()}
//           </ul>
//         ) : (
//           showComments && <p>Não há comentários ainda!</p>
//         )}

//         <MyAlert
//           open={alertOpen}
//           onClose={() => setAlertOpen(false)}
//           message={alertMessage}
//           severity={alertSeverity}
//         />

//       </Grid>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { ref, get, update, onValue } from "firebase/database";
import { IconButton } from "@mui/material";
import SendIcon from '@mui/icons-material/Send'; // Ícone de envio
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from "../../context/AuthContext";
import { database } from "../../service/firebase";
import MyAlert from './Alert';
import { abrirAlert } from './utils';
import './post.css';

export default function AddComment({ postId, comments, setComments }) {
  const { currentUser } = useAuth();
  const [comentario, setComentario] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false); // Estado para controlar a visibilidade do alerta
  const [alertMessage, setAlertMessage] = useState(''); // Estado para a mensagem do alerta
  const [alertSeverity, setAlertSeverity] = useState('success'); // Estado para a severidade do alerta
  const quantidadeComentarios = comments[postId] ? comments[postId].length : 0;

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
      data: dataComentario,
      foto: currentUser.photoURL // Adicionando a URL da foto do autor
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
      abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Comentário postado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao postar comentário: ", error);
      abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Erro ao postar comentário.", "error");
    }
  };

  return (
    <div className="comentarios-container">
      <div className="comenments-content">
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
            <> Ocultar ({quantidadeComentarios}) <ArrowDropUpIcon /> </>
          ) : (
            <> Ver ({quantidadeComentarios}) <ArrowDropDownIcon /> </>
          )}
        </button>
      </div>

      {showComments && comments[postId] && comments[postId].length > 0 ? (
        <ul className="comentarios-commentList">
          {comments[postId].map((comentario, index) => (
            <li key={index} className="comentarios-commentItem">
              <img src={comentario.foto} alt={comentario.nome} className="comentarios-authorPhoto" />
              <div className="comentarios-contentContainer">
                <span className="comentarios-authorName">{comentario.nome}</span>
                <span className="comentarios-content">{comentario.comentario}</span>
              </div>
            </li>
          )).reverse()}
        </ul>
      ) : (
        showComments && <p>Não há comentários ainda!</p>
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