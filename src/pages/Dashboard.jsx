// src/pages/Home.js
import React, { useState } from "react";
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

  return (
    <Box className={showCreatePost ? "halfVisualHome" : "fullVisualHome"}>
      <Topbar />
      <Box className="homeContainer">
        <Box className="feed">
          <Box className="feedWrapper">
            <ProfileHeader
              selectedButton={selectedButton}
              onTimelineClick={handleTimelineClick}
              onMembersClick={handleMembersClick}
              onFotosClick={handleFotosClick}
            />

            {view === "timeline" && <Post />}
            {view === "members" && <Members />}
            {view === "fotos" && <FotosPage />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
