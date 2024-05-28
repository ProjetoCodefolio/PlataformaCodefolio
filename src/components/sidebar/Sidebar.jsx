import "./sidebar.css";
import { RssFeed, Chat, Group, HelpOutline, Event } from "@mui/icons-material";
import { Users } from "../../dummyData";
import CloseFriend from "../closeFriend/CloseFriend";
import ExpandCircleDownRoundedIcon from "@mui/icons-material/ExpandCircleDownRounded";
import StorefrontIcon from "@mui/icons-material/Storefront";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  //to hide/show certain elements
  const [showHidden, setShowHidden] = useState();
  const logoutToggle = (showHidden) => {
    setShowHidden(!showHidden);
  };

  //to ask user if they really want to logout
  const [logout, setLogout] = useState(false);

  const confirmLogout = () => {
    setLogout(window.confirm("Are You Sure, You want to Logout?"));
  };

  //for selecting mode and doing its function
  const [mode, setMode] = useState("day");
  const getSelectedMode = (e) => {
    setMode(e.target.value);
  };

  return (
    <div className="sidebar">
      <div className="sidebarWrapper">
        <ul className="sidebarList">
          <li className="sidebarListItem">
            <RssFeed className="sidebarIcon" style={{ color: "skyblue" }} />
            <span className="sidebarListItemText">Feed</span>
          </li>
          <li className="sidebarListItem">
            <Group className="sidebarIcon" style={{ color: "skyblue" }} />
            <span className="sidebarListItemText">Friends</span>
          </li>
          <li className="sidebarListItem">
            <Chat className="sidebarIcon" style={{ color: "skyblue" }} />
            <span className="sidebarListItemText">Messenger</span>
          </li>
          <li className="sidebarListItem">
            <VideoLibraryIcon
              className="sidebarIcon"
              style={{ color: "skyblue" }}
            />
            <span className="sidebarListItemText">Videos</span>
          </li>
          <li className="sidebarListItem">
            <StorefrontIcon
              className="sidebarIcon"
              style={{ color: "skyblue" }}
            />
            <span className="sidebarListItemText">Marketplace</span>
          </li>
          <li className="sidebarListItem">
            <HelpOutline className="sidebarIcon" style={{ color: "skyblue" }} />
            <span className="sidebarListItemText">Questions</span>
          </li>
          <li className="sidebarListItem">
            <Event className="sidebarIcon" style={{ color: "skyblue" }} />
            <span className="sidebarListItemText">Events</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
