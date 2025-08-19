import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

export default function MyConfirm({ open, onClose, onConfirm, title, message }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{ 
        '& .MuiDialog-paper': { 
          bottom: '35%',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        } 
      }}
    >
      <DialogTitle sx={{ 
        color: '#333',
        fontWeight: 'bold',
        fontSize: '1.1rem'
      }}>
        {title}
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText sx={{ color: '#666' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      
      <DialogActions sx={{ padding: '16px' }}>
        <Button 
          onClick={onClose} 
          sx={{ 
            color: '#666',
            '&:hover': {
              backgroundColor: 'rgba(144, 65, 193, 0.08)'
            }
          }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained"
          sx={{ 
            bgcolor: '#dc3545',
            color: 'white',
            fontWeight: 'bold',
            '&:hover': {
              bgcolor: '#c82333'
            }
          }}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};