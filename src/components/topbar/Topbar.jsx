import { useState } from "react";
import "./topbar.css";
import Box from "@mui/material/Box";
import { Search, Home, Menu as MenuIcon, SmartDisplay } from "@mui/icons-material";
import { Link } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import LoginIcon from '@mui/icons-material/Login';
import Logout from "@mui/icons-material/Logout";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import VideoSettingsIcon from "@mui/icons-material/VideoSettings";
import Person from "@mui/icons-material/Person";
import Settings from "@mui/icons-material/Settings";
import Help from "@mui/icons-material/Help";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/img/codefolio.png";
import { handleGoogleSignIn, handleSignOut } from "../../utils/authUtils";

export default function Topbar({ onSearch, hideSearch = false }) { // Adicionada prop hideSearch com valor padrão false
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const open = Boolean(anchorEl);
  const mobileMenuOpen = Boolean(mobileMenuAnchorEl);
  const navigate = useNavigate();
  const { userDetails } = useAuth();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuClick = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  const handleLogin = () => {
    handleGoogleSignIn(null);
    handleClose();
    handleMobileMenuClose();
  };

  const handleLogout = async () => {
    handleSignOut(navigate);
    handleClose();
    handleMobileMenuClose();
  };

  const handleLearnMore = async () => {
    navigate("/about");
    handleClose();
    handleMobileMenuClose();
  };

  const handleProfileClick = () => {
    navigate("/profile");
    handleClose();
    handleMobileMenuClose();
  };

  const handleAdmCursoClick = () => {
    navigate("/manage-courses");
    handleClose();
    handleMobileMenuClose();
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    onSearch(event.target.value);
  };


  return (
    <Box className="topbarContainer">
      <div className="content">
        <Box className="topbarLeft">
          <Link to="/" style={{ textDecoration: "none" }}>
            <img src={logo} alt="CodeFolio Logo" />
          </Link>
          {!hideSearch && ( // Condição para exibir a barra de pesquisa
            <Box className="searchbar">
              <Search className="searchIcon" />
              <input
                placeholder="Pesquisar"
                className="searchInput"
                border="none"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </Box>
          )}
        </Box>

        <Box className="topbarRight">
          <Box className="topbarIcons desktopIcons">
            <Link to="/dashboard" style={{ textDecoration: "none" }}>
              <Box className="topbarIconCont">
                <Home />
                <span className="topbarIconText">Home</span>
              </Box>
            </Link>
            <Link to="/listcurso" style={{ textDecoration: "none" }}>
              <Box className="topbarIconCont">
                <SmartDisplay />
                <span className="topbarIconText">Cursos</span>
              </Box>
            </Link>
          </Box>

          <IconButton
            className="mobileMenuButton"
            onClick={handleMobileMenuClick}
            sx={{ display: { xs: "block", md: "none" }, color: "white" }}
          >
            <MenuIcon />
          </IconButton>

          <Menu
            anchorEl={mobileMenuAnchorEl}
            open={mobileMenuOpen}
            onClose={handleMobileMenuClose}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 4.2,
                ml: 3,
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 38,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            }}
          >
            {userDetails && (
              <MenuItem>
                <Avatar
                  src={userDetails?.photoURL || "default-avatar-url.jpg"}
                  alt="Profile Picture"
                  sx={{ width: 24, height: 24, mr: 1 }}
                />
                {userDetails?.firstName} {userDetails?.lastName}
              </MenuItem>
            )}
            {userDetails && <Divider />}
            <MenuItem onClick={() => navigate("/dashboard")}>
              <ListItemIcon>
                <Home fontSize="small" />
              </ListItemIcon>
              Home
            </MenuItem>
            <MenuItem onClick={() => navigate("/listcurso")}>
              <ListItemIcon>
                <SmartDisplay fontSize="small" />
              </ListItemIcon>
              Cursos
            </MenuItem>
            {userDetails?.role === "admin" && (
              <MenuItem onClick={handleAdmCursoClick}>
                <ListItemIcon>
                  <VideoSettingsIcon fontSize="small" />
                </ListItemIcon>
                Gerenciamento de Cursos
              </MenuItem>
            )}
            {userDetails && (
              <>
                <Divider />
                <MenuItem onClick={handleProfileClick}>
                  <ListItemIcon>
                    <Person fontSize="small" />
                  </ListItemIcon>
                  Perfil
                </MenuItem>
                {/* <MenuItem>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  Configurações e privacidade
                </MenuItem> */}
                <MenuItem onClick={handleLearnMore}>
                  <ListItemIcon>
                    <Help fontSize="small" />
                  </ListItemIcon>
                  Saiba mais
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Sair
                </MenuItem>
              </>
            )}
            {!userDetails && (
              <MenuItem onClick={handleLogin}>
                <ListItemIcon>
                  <LoginIcon fontSize="small" />
                </ListItemIcon>
                Entrar
              </MenuItem>
            )}
          </Menu>

          <Tooltip title="Configurações da Conta">
            <IconButton
              onClick={handleClick}
              size="small"
              sx={{ ml: 2, display: { xs: "none", md: "block" } }}
            >
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
              <MenuItem onClick={handleLogin}>
                <ListItemIcon>
                  <LoginIcon fontSize="small" />
                </ListItemIcon>
                Entrar
              </MenuItem>
            ) : (
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
                {/* <MenuItem>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  Configurações e privacidade
                </MenuItem> */}
                <MenuItem onClick={handleLearnMore}>
                  <ListItemIcon>
                    <Help fontSize="small" />
                  </ListItemIcon>
                  Saiba mais
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
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