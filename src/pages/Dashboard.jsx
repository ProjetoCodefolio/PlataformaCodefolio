import React, { useState, useEffect } from "react";
import "./home.css";
import Topbar from "../components/topbar/Topbar";
import { Box } from "@mui/material";
import Post from "../components/post/Post";
import ProfileHeader from "../components/profileHeader/ProfileHeader";
import Members from "../pages/members";
import Share from "../components/share/Share";
import FotosPage from "./fotos";

export default function Home({ showCreatePost }) {
  const [view, setView] = useState("timeline");
  const [selectedButton, setSelectedButton] = useState(0);
  const [searchTerm, setSearchTerm] = useState(""); // Estado para o termo de pesquisa

  const handleTimelineClick = () => {
    setView("timeline");
    setSelectedButton(0); // A cor de fundo do botão aparece apenas para a página atual.
  };

  const handleMembersClick = () => {
    setView("members");
    setSelectedButton(1);
  };
  
  const handleFotosClick = () => {
    setView("fotos");
    setSelectedButton(2);
  };

  const handleSearch = (term) => {
    setSearchTerm(term); // Atualiza o termo de pesquisa
  };

  return (
    <Box className={showCreatePost ? "halfVisualHome" : "fullVisualHome"}>
      <Topbar onSearch={handleSearch} /> {/* Passa a função de pesquisa para o Topbar */}
      <Box className="homeContainer">
        <Box className="feed">
          <Box className="feedWrapper">
            

            {view === "timeline" && <Post searchTerm={searchTerm} />} {/* Passa o termo de pesquisa para o Post */}
            {view === "members" && <Members />}
            {view === "fotos" && <FotosPage />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}