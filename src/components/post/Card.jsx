import React, { useState } from "react";
import { Card, CardContent, Avatar, TextField, Button, Stack, InputAdornment } from "@mui/material";
import { Search } from "@mui/icons-material";
import { PhotoCamera, Share, Article } from '@mui/icons-material';
import codefolioImage from "../../assets/img/codefolio.jpg";
import CreatePostModal from "./CreatePost"; // Importar o novo modal
import MyAlert from './Alert'; // Importar o componente de alerta
import "./post.css";

const MyCard = ({ userPhoto, setIsPostCreated }) => {
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');

    const handleOpenMediaModal = () => {
        setIsMediaModalOpen(true);
    };

    const handleCloseMediaModal = () => {
        setIsMediaModalOpen(false);
    };

    const abrirAlert = (message, severity) => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setAlertOpen(true);
    };

    return (
        <Card
            key={1}
            sx={{
                width: "100%",
                maxWidth: { xs: "100%", sm: "600px", md: "1000px" },
                mx: "auto",
                boxShadow: 1,
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: "white"
            }}
        >
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                    {/* Placeholder para a foto */}
                    <Avatar
                        src={userPhoto}
                        alt="User Avatar"
                        sx={{ width: 48, height: 48 }}
                    />

                    {/* Campo de publicação */}
                    <TextField
                        className="postInputField"
                        variant="outlined"
                        placeholder="Comece uma publicação"
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search className="searchIcon" />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: "20px" }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'black',  // Cor da borda
                                },
                                '&:hover fieldset': {
                                    borderColor: 'black',  // Cor da borda ao passar o mouse
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'black',  // Cor da borda quando focado
                                },
                            },
                        }}
                    />
                </Stack>

                {/* Botões desabilitados */}
                <Stack direction="row" spacing={2} mt={2}>
                    <Button
                        variant="outlined"
                        startIcon={<PhotoCamera />}
                        sx={{
                            borderColor: "black",
                            color: "black",
                            '&:hover': {
                                color: "#6A1B9A",
                                borderColor: "#6A1B9A",
                                backgroundColor: 'transparent',  // Remove o efeito de hover
                            },
                        }}
                        onClick={handleOpenMediaModal} // Vincular o botão para abrir o modal
                    >
                        Mídia
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Share />}
                        sx={{
                            color: "black",
                            '&:hover': {
                                backgroundColor: 'transparent',  // Remove o efeito de hover
                            },
                        }}
                        disabled
                    >
                        Compartilhar experiência
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Article />}
                        sx={{
                            color: "black",
                            '&:hover': {
                                backgroundColor: 'transparent',  // Remove o efeito de hover
                            },
                        }}
                        disabled
                    >
                        Escrever artigo
                    </Button>
                </Stack>
            </CardContent>

            {/* Adicionar o novo modal */}
            <CreatePostModal
                open={isMediaModalOpen}
                onClose={handleCloseMediaModal}
                onPostCreated={() => {abrirAlert("Post criado com sucesso!", "success"); setIsPostCreated(true);}}
                abrirAlert={abrirAlert}
                modalTitle="Adicionar post de mídia"
            />

            {/* Adicionar o componente de alerta */}
            <MyAlert
                open={alertOpen}
                onClose={() => setAlertOpen(false)}
                message={alertMessage}
                severity={alertSeverity}
            />
        </Card>
    );
}

export default MyCard;