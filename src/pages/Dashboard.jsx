// export default Dashboard;
import "./home.css";
import Feed from "../components/feed/Feed";
import Topbar from "../components/topbar/Topbar";
import { Box } from "@mui/material";

export default function Home({ showCreatePost, changeState }) {
  return (
    <>
      <Box className={showCreatePost ? "halfVisualHome" : "fullVisualHome"}>
        <Topbar />

        <Box className="homeContainer">
          <Feed changeState={changeState} />
        </Box>
      </Box>
    </>
  );
}
