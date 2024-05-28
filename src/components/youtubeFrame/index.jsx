import { Box } from "@mui/material";

const MemberPost = ({ member }) => {
  return (
    <Box className="postCenter">
      <span className="postText">{member.name}</span>

      <iframe
        className="postVideo"
        width="560"
        height="315"
        src={member.link}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </Box>
  );
};

export default MemberPost;
