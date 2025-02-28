import React, { useState } from "react";
import "./home.css";
import Topbar from "../components/topbar/Topbar";
import { Box } from "@mui/material";
import Post from "../components/post/Post";
import Members from "../pages/members";
import FotosPage from "./fotos";

export default function Home({ showCreatePost }) {
  const [view, setView] = useState("timeline");
  const [selectedButton, setSelectedButton] = useState(0);
  const [searchTerm, setSearchTerm] = useState(""); 

  const handleTimelineClick = () => {
    setView("timeline");
    setSelectedButton(0); 
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
    setSearchTerm(term); 
  };

  return (
    <Box className={showCreatePost ? "halfVisualHome" : "fullVisualHome"}>
      <Topbar onSearch={handleSearch} /> 
      <Box className="homeContainer">
        <Box className="feed">
          <Box className="feedWrapper">
            {view === "timeline" && <Post searchTerm={searchTerm} />} 
            {view === "members" && <Members />}
            {view === "fotos" && <FotosPage />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}