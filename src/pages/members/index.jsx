import "../home.css";
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
      <Box sx={{ padding: "20px", backgroundColor: "#f5f5f5" }}>
        <Grid container spacing={3}>
          {members.map((member) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
              <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
                <CardContent>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <Avatar
                      src={member.photoURL}
                      alt={member.firstName}
                      sx={{ width: 80, height: 80, marginBottom: 2 }}
                    />
                    <Typography variant="h6" align="center" gutterBottom>
                      {member.firstName} {member.lastName}
                    </Typography>
                    <Box display="flex" justifyContent="center" mt={1}>
                      {member.gitURL && (
                        <IconButton
                          href={member.gitURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "#333" }}
                        >
                          <GitHub />
                        </IconButton>
                      )}
                      {member.linkedinURL && (
                        <IconButton
                          href={member.linkedinURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "#0077b5" }}
                        >
                          <LinkedIn />
                        </IconButton>
                      )}
                      {member.instagramURL && (
                        <IconButton
                          href={member.instagramURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "#E1306C" }}
                        >
                          <Instagram />
                        </IconButton>
                      )}
                      {member.facebookURL && (
                        <IconButton
                          href={member.facebookURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "#4267B2" }}
                        >
                          <Facebook />
                        </IconButton>
                      )}
                      {member.youtubeURL && (
                        <IconButton
                          href={member.youtubeURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "#FF0000" }}
                        >
                          <YouTube />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
      </Box>
    </>
  );
};

export default MembersPage;
