import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

export default function MyConfirm ({ open, onClose, onConfirm, title, message }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDialog-paper': { bottom: '35%' } }} // Ajusta a posição do diálogo
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">Cancelar</Button>
        <Button onClick={onConfirm} color="primary">Confirmar</Button>
      </DialogActions>
    </Dialog>
  );
};