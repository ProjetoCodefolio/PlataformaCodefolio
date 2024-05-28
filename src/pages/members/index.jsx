import "../home.css";
import { useEffect, useState } from "react";
import { database } from "../../service/firebase";
import {
  ref,
  query,
  orderByKey,
  limitToFirst,
  startAt,
  get,
} from "firebase/database";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Box,
} from "@mui/material";
import Topbar from "../../components/topbar/Topbar";
import ProfileHeader from "../../components/profileHeader/ProfileHeader";

const MembersPage = () => {
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchMembers = async () => {
    setLoading(true);
    const membersQuery = ref(database, "members");

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

  console.log(members);

  return (
    <>
      <Box sx={{ marginTop: "78px" }}>
        <Topbar />
        <Box className="homeContainer">
          <ProfileHeader />
        </Box>
        <Grid container spacing={3}>
          {members.map((member) => (
            <Grid item xs={12} sm={6} md={4} key={member.id}>
              <Card>
                <CardContent>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <Avatar
                      src={member.photoURL}
                      alt={member.name}
                      sx={{ width: 100, height: 100 }}
                    />
                    <Typography variant="h6" gutterBottom>
                      {member.name}
                    </Typography>
                    <a
                      href={member.githubURL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {member.githubURL || "URL do GitHub não fornecido"}
                    </a>
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
              onClick={() => fetchMembers(lastKey)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Ver Mais"}
            </Button>
          </Box>
        )}


        <Typography variant="h4" gutterBottom>
          <strong>Membros</strong> <br />
          <strong>Membros</strong> <br />
          <strong>Membros</strong> <br />
        </Typography>
      </Box>
    </>
  );
};

export default MembersPage;
