import { useState, useEffect } from "react";
import { ref, get, update, onValue } from "firebase/database";
import { Button } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { database } from "../../service/firebase";

export default function Comentarios({ postId, comments, setComments }) {
  const { currentUser } = useAuth();
  const [comentario, setComentario] = useState('');

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
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="comentario"> Poste seu comentário: </label> <br />
        <input type="text"
          id="comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        /> <br />
        <Button type="submit">
          Enviar
        </Button>
      </form>

      <h3> Comentários: </h3>
      {comments[postId] && comments[postId].length > 0 ? (
        comments[postId].map((comentario, index) => (
          <p key={index}> {comentario.nome} - {comentario.comentario}</p>
        )).reverse()
      ) : (
        <p>Não há comentários ainda!</p>
      )}
    </>
  );
}