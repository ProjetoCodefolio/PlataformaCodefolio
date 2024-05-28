import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import { ref, get } from "firebase/database";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Box,
  IconButton,
} from "@mui/material";
import {
  GitHub,
  LinkedIn,
  Instagram,
  Facebook,
  YouTube,
} from "@mui/icons-material";
import Topbar from "../../components/topbar/Topbar";

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchMembers = async () => {
    setLoading(true);
    const membersQuery = ref(database, "users");

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
    <>
      <Topbar />
      <Box>
        <Grid container spacing={3}>
          {members.map((member) => (
            <Grid item xs={12} sm={6} md={4} key={member.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Avatar
                      src={member.photoURL}
                      alt={member.firstName}
                      sx={{ width: 100, height: 100, marginRight: 2 }}
                    />
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {member.firstName} {member.lastName}
                      </Typography>
                      <Box display="flex" alignItems="center" mt={1}>
                        {member.gitURL && (
                          <IconButton
                            href={member.gitURL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <GitHub />
                          </IconButton>
                        )}
                        {member.linkedinURL && (
                          <IconButton
                            href={member.linkedinURL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <LinkedIn />
                          </IconButton>
                        )}
                        {member.instagramURL && (
                          <IconButton
                            href={member.instagramURL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Instagram />
                          </IconButton>
                        )}
                        {member.facebookURL && (
                          <IconButton
                            href={member.facebookURL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Facebook />
                          </IconButton>
                        )}
                        {member.youtubeURL && (
                          <IconButton
                            href={member.youtubeURL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <YouTube />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {hasMore && (
          <Box mt={3} display="flex" justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              onClick={fetchMembers}
              disabled={loading}
            >
              {loading ? "Loading..." : "Ver Mais"}
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
};

export default MembersPage;
