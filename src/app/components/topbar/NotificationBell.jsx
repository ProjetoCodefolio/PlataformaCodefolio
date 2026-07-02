import React, { useEffect, useState } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  Button,
  ListItemText,
  Tooltip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import {
  listenNotifications,
  markAsRead,
  markAllAsRead,
} from "$api/services/notifications";
import NotificationPrefs from "./NotificationPrefs";

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
};

/**
 * Sino de notificações in-app. Escuta as notificações do usuário em tempo real
 * e permite marcar como lida, ir para o item e ajustar preferências por curso.
 */
export default function NotificationBell({ userId }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    const unsubscribe = listenNotifications(userId, setNotifications);
    return unsubscribe;
  }, [userId]);

  const unread = notifications.filter((n) => !n.read).length;
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleClickNotification = async (n) => {
    if (!n.read) await markAsRead(userId, n.id);
    handleClose();
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    await markAllAsRead(userId);
  };

  if (!userId) return null;

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton onClick={handleOpen} sx={{ color: "white" }}>
          <Badge badgeContent={unread} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 360, maxWidth: "90vw", maxHeight: 480 } }}
      >
        <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>Notificações</Typography>
          <Button
            size="small"
            startIcon={<DoneAllIcon fontSize="small" />}
            onClick={handleMarkAll}
            disabled={unread === 0}
            sx={{ color: "#9041c1", textTransform: "none" }}
          >
            Marcar todas
          </Button>
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma notificação.
            </Typography>
          </Box>
        ) : (
          notifications.slice(0, 30).map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => handleClickNotification(n)}
              sx={{
                whiteSpace: "normal",
                alignItems: "flex-start",
                bgcolor: n.read ? "transparent" : "rgba(144,65,193,0.08)",
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: n.read ? 500 : 700 }}>
                    {n.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="caption" sx={{ color: "#555", display: "block" }}>
                      {n.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#999" }}>
                      {timeAgo(n.createdAt)}
                    </Typography>
                  </>
                }
              />
            </MenuItem>
          ))
        )}

        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            setPrefsOpen(true);
          }}
          sx={{ color: "#9041c1" }}
        >
          <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
          Preferências de notificação
        </MenuItem>
      </Menu>

      <NotificationPrefs open={prefsOpen} onClose={() => setPrefsOpen(false)} userId={userId} />
    </>
  );
}
