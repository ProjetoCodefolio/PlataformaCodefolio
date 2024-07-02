import React, { useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

function PostMenu({ post, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <MoreVertIcon style={{ cursor: "pointer" }} onClick={handleClick} />
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => { handleClose(); onEdit(post)(); }}>Editar</MenuItem>
        <MenuItem onClick={() => { handleClose(); onDelete(post.id)(); }}>Deletar</MenuItem>
      </Menu>
    </div>
  );
}

export default PostMenu;