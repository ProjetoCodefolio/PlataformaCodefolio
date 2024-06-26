// src/pages/Home.js
import React, { useState } from "react";
import "./home.css";
import Topbar from "../components/topbar/Topbar";
import { Box } from "@mui/material";
import Post from "../components/post/Post";
import ProfileHeader from "../components/profileHeader/ProfileHeader";
import Members from "../pages/members";
import Share from "../components/share/Share";

export default function Home({ showCreatePost }) {
  const [view, setView] = useState("timeline");

  const handleTimelineClick = () => {
    setView("timeline");
  };

  const handleMembersClick = () => {
    setView("members");
  };

  return (
    <Box className={showCreatePost ? "halfVisualHome" : "fullVisualHome"}>
      <Topbar />
      <Box className="homeContainer">
        <Box className="feed">
          <Box className="feedWrapper">
            <ProfileHeader
              onTimelineClick={handleTimelineClick}
              onMembersClick={handleMembersClick}
            />

            {view === "timeline" ? <Post /> : <Members />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
