import { useState } from "react";
import "./topbar.css";
import Box from "@mui/material/Box";
import { Search, Person, Home, Work, Assignment } from "@mui/icons-material";
import { Link } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import LoginIcon from '@mui/icons-material/Login';
import Logout from "@mui/icons-material/Logout";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import VideoSettingsIcon from "@mui/icons-material/VideoSettings";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Settings from "@mui/icons-material/Settings";
import Help from "@mui/icons-material/Help";
import { auth } from "../../service/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import logo from "../../assets/img/codefolio.png";

export default function Topbar({ onSearch }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); 
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const { userDetails } = useAuth();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleAdmCursoClick = () => {
    navigate("/manage-courses");
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    onSearch(event.target.value); 
  };

  const getFirebaseErrorMessage = (error) => {
    let erroTipo = error.code ? error.code : error;
    switch (erroTipo) {
      case "INVALID_LOGIN_CREDENTIALS":
        return "As credenciais de login são inválidas.";
      case "auth/invalid-email":
        return "O email fornecido é inválido.";
      case "auth/user-disabled":
        return "Este usuário foi desativado.";
      case "auth/user-not-found":
        return "Nenhum usuário encontrado com este email.";
      case "auth/wrong-password":
        return "A senha está incorreta.";
      case "auth/invalid-credential":
        return "Credencial inválida.";
      default:
        return "Ocorreu um erro desconhecido. Tente novamente.";
    }
  };

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
      } catch (error) {
        const message = getFirebaseErrorMessage(error);
        setError(message);
      }
    };

  return (
    <Box className="topbarContainer">
      <div className="content">
        <Box className="topbarLeft">
          <Link to="/" style={{ textDecoration: "none" }}>
            <img src={logo} alt="CodeFolio Logo" />
          </Link>
          <Box className="searchbar">
            <Search className="searchIcon" />
            <input
              placeholder="Pesquisar"
              className="searchInput"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </Box>
        </Box>

        <Box className="topbarRight">
          <Box className="topbarIcons">
            <Link to="/dashboard" style={{ textDecoration: "none" }}>
              <Box className="topbarIconCont">
                <Home />
                <span className="topbarIconText">Home</span>
              </Box>
            </Link>
            <Link to="/listcurso" style={{ textDecoration: "none" }}>
              <Box className="topbarIconCont">
                <SmartDisplayIcon />
                <span className="topbarIconText">Cursos</span>
              </Box>
            </Link>
          </Box>
          <Tooltip title="Account settings">
            <IconButton onClick={handleClick} size="small" sx={{ ml: 2 }}>
              <Avatar
                src={userDetails?.photoURL || "default-avatar-url.jpg"}
                alt="Profile Picture"
                className="topbarImg"
              />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                "& .MuiAvatar-root": {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {!userDetails ? (
              <MenuItem onClick={handleGoogleSignIn}>
                <ListItemIcon>
                  <LoginIcon fontSize="small" />
                </ListItemIcon>
                Entrar
              </MenuItem>
            ):(
              <>
              <MenuItem>
                {userDetails?.firstName} {userDetails?.lastName}
              </MenuItem>

              <Divider />
              {userDetails?.role === "admin" && ( 
                <MenuItem onClick={handleAdmCursoClick}>
                  <ListItemIcon>
                    <VideoSettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Gerenciamento de Cursos
                </MenuItem>
              )}
              <MenuItem onClick={handleProfileClick}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Perfil
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Configurações e privacidade
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <Help fontSize="small" />
                </ListItemIcon>
                Ajuda e suporte
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" onClick={() => handleLogout()} />
                </ListItemIcon>
                Sair
              </MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </div>
    </Box>
  );
}
