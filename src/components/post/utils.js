import { ref, get } from 'firebase/database';
import { database } from '../../service/firebase';
import iconAulas from "../../assets/img/aula.png";
import iconReforco from "../../assets/img/reforco.png";
import iconRevisao from "../../assets/img/revisao.png";
import iconTutoriais from "../../assets/img/tutorial.png";
import axios from 'axios';

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
      foto: item.snippet.topLevelComment.snippet.authorProfileImageUrl, // Adicionando a URL da foto do autor
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const fetchPosts = async (member, searchTerm, filteredVideos, currentPage, postsPerPage) => {
  const postsData = await fetchPostsData();
  if (!postsData) {
    return { paginatedPosts: [], lastPage: 1 };
  }

  const postsList = transformPostsData(postsData);
  const filteredPosts = filterPosts(postsList, searchTerm, filteredVideos, member);
  const paginatedPosts = paginatePosts(filteredPosts, currentPage, postsPerPage);
  const lastPage = calculateLastPage(filteredPosts, postsPerPage);

  return { paginatedPosts, lastPage };
};

const fetchPostsData = async () => {
  const postsQuery = ref(database, "post");
  const snapshot = await get(postsQuery);
  return snapshot.val();
};

const transformPostsData = (postsData) => {
  return Object.keys(postsData).map((key) => ({
    id: key,
    ...postsData[key],
  })).reverse();
};

const filterPosts = (postsList, searchTerm, filteredVideos, member) => {
  let filteredPosts = postsList.filter(post =>
    post.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredVideos && Array.isArray(filteredVideos) && filteredVideos.length > 0) {
    filteredPosts = filteredVideos;
  }

  if (member) {
    filteredPosts = filteredPosts.filter(post => post.uidUser === member);
  }

  return filteredPosts;
};

const paginatePosts = (filteredPosts, currentPage, postsPerPage) => {
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  return filteredPosts.slice(startIndex, endIndex);
};

const calculateLastPage = (filteredPosts, postsPerPage) => {
  return Math.ceil(filteredPosts.length / postsPerPage);
};

export function getYouTubeID(url) {
  var ID = '';
  url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  if (url[2] !== undefined) {
    ID = url[2].split(/[^0-9a-z_\-]/i);
    ID = ID[0];
  } else {
    ID = url;
  }
  return ID;
}

export function getImage(tag) {
  let image = "";
  switch (tag) {
    case "Aulas":
      image = iconAulas;
      break;
    case "Reforço":
      image = iconReforco;
      break;
    case "Revisão":
      image = iconRevisao;
      break;
    case "Tutoriais":
      image = iconTutoriais;
      break;
    default:
      image = "";
  }

  return image;
}

export function abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, message, severity) {
  setAlertMessage(message);
  setAlertSeverity(severity);
  setAlertOpen(true);
};