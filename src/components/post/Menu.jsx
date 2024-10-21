import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function PostMenu({ post, onEdit, onDelete }) {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <div className="card-post-toolbar">
            <div className="dropdown">
                <IconButton onClick={handleClick}>
                    <MoreVertIcon />
                </IconButton>
                <Menu
                    id="simple-menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                >
                    <MenuItem onClick={() => { handleClose(); onEdit(post); }}>
                        <ListItemIcon>
                            <EditIcon fontSize="medium" />
                        </ListItemIcon>
                        <ListItemText primary="Editar Post" secondary="Atualizar informações do Post" />
                    </MenuItem>

                    <MenuItem onClick={() => { handleClose(); onDelete(post.id); }}>
                        <ListItemIcon>
                            <DeleteIcon fontSize="medium" />
                        </ListItemIcon>
                        <ListItemText primary="Deletar" secondary="Remover esse post da Timeline" />
                    </MenuItem>
                </Menu>
            </div>
        </div>
    );
}

export default PostMenu;