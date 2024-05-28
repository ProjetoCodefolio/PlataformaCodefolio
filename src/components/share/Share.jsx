import React from "react";
import "./share.css";
import PermMediaIcon from "@mui/icons-material/PermMedia";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import VideoCameraBackIcon from "@mui/icons-material/VideoCameraBack";
import { Box } from "@mui/material";

export default function Share({ changeState }) {
  return (
    <Box className="share">
      <Box className="shareWrapper">
        <Box className="shareTop">
          <img
            className="shareProfileImage"
            src={"/assets/person/1.jpeg"}
            alt=""
          />
          <Box className="shareInputCont"></Box>
          <input
            placeholder="What's on your mind,Bhabishya?"
            onClick={changeState}
            className="shareInput"
          />
        </Box>
        <hr className="shareHr" />
        <Box className="shareButtom">
          <Box className="shareOptions">
            <Box className="shareOption">
              <PermMediaIcon htmlColor="green" className="shareIcon" />
              <span className="shareOptionLongText">Photo/video</span>
              <span className="shareOptionText">Gallery</span>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
