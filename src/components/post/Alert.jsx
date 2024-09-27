import React from 'react';
import { Snackbar, Alert, Typography } from '@mui/material';

export default function MyAlert({ open, onClose, message, severity }) {
    return (
        <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Centraliza o alerta na tela
        >
            <Alert
                onClose={onClose}
                severity={severity}
                sx={{
                    width: '400px'
                }}
            >
                <Typography
                    component="div"
                    variant="h6"
                    sx={{
                        textAlign: 'center',
                        display: 'flex',
                        justifyContent: 'center',
                        justifyItems: 'center'
                    }}>
                    {message}
                </Typography>
            </Alert>
        </Snackbar>
    );
}