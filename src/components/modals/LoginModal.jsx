import React from 'react';
import { Box, Typography, Modal, Button } from "@mui/material";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../../service/firebase";
import { ref, get, set } from "firebase/database";
import { database } from "../../service/firebase";

const LoginModal = ({ open, onClose, modalRef }) => {
  
    const checkIfEmailExists = async (email) => {
      const usersRef = ref(database, "users");
      const emailQuery = query(usersRef, orderByChild("email"), equalTo(email));
      const snapshot = await get(emailQuery);
      return snapshot.exists();
    };
  
    const saveUserToDatabase = async (user) => {
      const userRef = ref(database, `users/${user.uid}`);
      await set(userRef, {
        firstName: user.displayName?.split(" ")[0] || "",
        lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
        email: user.email,
        photoURL: user.photoURL || "",
        gitURL: "",
        linkedinURL: "",
        instagramURL: "",
        facebookURL: "",
        youtubeURL: "",
      });
    };
  
    const handleGoogleSignIn = async () => {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const emailExists = await checkIfEmailExists(user.email);
        if (!emailExists) {
          await saveUserToDatabase(user);
        }
        navigate("/dashboard");
        handleClose();
        handleMobileMenuClose();
      } catch (error) {
        console.log(error);
      }
    };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        ref={modalRef}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 500 },
          bgcolor: "#fff",
          borderRadius: "20px",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          background: "linear-gradient(135deg, #9041c1 0%, #7d37a7 100%)",
          color: "#fff",
          animation: "zoomIn 0.5s ease-in-out",
          "@keyframes zoomIn": {
            "0%": { transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 },
            "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          },
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Faça login para prosseguir com o curso!
        </Typography>
        <Box sx={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={handleGoogleSignIn}
            sx={{
              backgroundColor: "#fff",
              color: "#9041c1",
              borderRadius: "16px",
              "&:hover": { backgroundColor: "#f5f5fa", color: "#7d37a7" },
              textTransform: "none",
              fontWeight: 600,
              px: 4,
              py: 1.5,
              minWidth: 180,
            }}
          >
            Fazer Login
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default LoginModal;