// src/components/Post.js
import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get } from "firebase/database";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Box, Card, CardContent, Typography } from "@mui/material";
import YouTube from "react-youtube";
import "./post.css";

export default function Post() {
  const [like, setLike] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const likeHandler = () => {
    if (isLiked === false) {
      setLike(like + 1);
      setIsLiked(true);
    } else {
      setLike(like - 1);
      setIsLiked(false);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    const membersQuery = ref(database, "post");

    const snapshot = await get(membersQuery);
    const membersData = snapshot.val();
    if (membersData) {
      const membersList = Object.keys(membersData).map((key) => ({
        id: key,
        ...membersData[key],
      }));

      setMembers(membersList);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <Box>
      {loading ? (
        <span>Loading...</span>
      ) : (
        members.map((member) => (
          <Card
            key={member.id}
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", sm: "800px", md: "1200px" },
              mx: "auto",
              boxShadow: 1,
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: "white",
              mb: 2,
            }}
          >
            <CardContent>
              <Box className="postTop">
                <Box className="postTopLeft">
                  <img
                    className="postProfileImage"
                    src={member.photoURL}
                    alt={member.name}
                  />
                  <Typography className="postUsername">
                    {member.name}
                  </Typography>
                  <Typography className="postDate">
                    {new Date().toLocaleDateString()}
                  </Typography>
                </Box>

                <Box className="postTopRight">
                  <MoreVertIcon style={{ cursor: "pointer" }} />
                </Box>
              </Box>

              <Box className="postCenter">
                <Typography className="postText">{member.name}</Typography>
                {member.link ? (
                  <YouTube videoId={member.link} />
                ) : (
                  <img
                    className="postImage"
                    src={member.link}
                    alt={member.name}
                  />
                )}
              </Box>
              <Box className="postBottom">
                <Box className="postBottomLeft">
                  <Box style={{ display: "flex" }}>
                    <Box className="likeIconCont">
                      <img
                        className="likeIcon"
                        onClick={likeHandler}
                        src={"../assets/like.png"}
                        alt=""
                      />
                    </Box>
                    <Box className="likeIconCont">
                      <img
                        className="likeIcon"
                        onClick={likeHandler}
                        src={"../assets/heart.png"}
                        alt=""
                      />
                    </Box>
                  </Box>
                  <Typography className="postLikeCounter">
                    {like} people like it
                  </Typography>
                </Box>
                <Box className="postBottomRight">
                  <Typography className="postCommentText">comments</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}
