import { useState } from "react";
import "./topbar.css";
import Box from "@mui/material/Box";
import { Search, Person, Notifications } from "@mui/icons-material";
import { Link } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import Help from "@mui/icons-material/Help";
import { signOut } from "firebase/auth";
import { auth } from "../../service/firebase";
import { useNavigate } from "react-router-dom";
import { Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";

export default function Topbar() {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const { userDetails } = useAuth();

  console.log(userDetails);

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

  return (
    <>
      <Box className="topbarContainer">
        <Box
          className="topbarLeft"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <Link to="/" style={{ textDecoration: "none" }}>
            <img
              src="assets/img/codefolio.jpg"
              alt="CodeFolio Logo"
              style={{
                height: "40px",
                borderRadius: "50%",
                marginLeft: "10px",
              }}
            />
          </Link>

          <Typography sx={{ marginLeft: "10px" }}>CodeFólio</Typography>
        </Box>

        <Box className="topbarCenter">
          <Box className="topbarCenterIcon">
            <Box className="searchbar">
              <Search className="searchIcon" />
              <input placeholder="Pesquisar" className="searchInput" />
            </Box>
          </Box>
        </Box>
        <Box className="topbarRight">
          <Box className="topbarIcons">
            <Box className="topbarIconItem">
              <Box className="topbarIconCont">
                <Notifications
                  style={{
                    color: "black",
                    borderRadius: "50%",
                    fontSize: "21px",
                  }}
                />
              </Box>
              <span className="topbarIconBadge">1</span>
            </Box>
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
            <MenuItem>
              {userDetails?.firstName} {userDetails?.lastName}
            </MenuItem>

            <Divider />
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
          </Menu>
        </Box>
      </Box>
    </>
  );
}
