import { useState } from 'react';
import * as S from './styles';
import { Avatar, TextField, InputAdornment, Button } from "@mui/material";
import { Search } from "@mui/icons-material";
import { PhotoCamera, Share, Article } from '@mui/icons-material';
import CreatePostModal from "../../CreatePost";
import MyAlert from '../../Alert';

export const MyCards = ({ userPhoto, setIsPostCreated }) => {
    const [isMediaModalOpen, setIsEditModalOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');

    const openAlert = (message, severity) => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setAlertOpen(true);
    }

    return(
        <S.Wrapper>
            <S.Line>
                <Avatar
                    src={userPhoto}
                    alt='User Avatar'
                    sx={{width: 48, height: 48}}
                />

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
            </S.Line>
            <S.Line style={{justifyContent: 'flex-start'}}>
                <Button
                    variant="outlined"
                    startIcon={<PhotoCamera />}
                    sx={{
                        borderColor: "black",
                        color: "black",
                        '&:hover': {
                            color: "#6A1B9A",
                            borderColor: "#6A1B9A",
                            backgroundColor: 'transparent',
                        },
                    }}
                    onClick={() => setIsEditModalOpen(true)}
                >
                    Mídia
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<Share />}
                    sx={{
                        color: "black",
                        '&:hover': {
                            backgroundColor: 'transparent',
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
                            backgroundColor: 'transparent',
                        },
                    }}
                    disabled
                >
                    Escrever artigo
                </Button>
            </S.Line>
            <CreatePostModal
                open={isMediaModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onPostCreated={() => {openAlert("Post criado com sucesso!", "success"); setIsPostCreated(true);}}
                abrirAlert={openAlert}
                modalTitle="Adicionar post de mídia"
            />

            <MyAlert
                open={alertOpen}
                onClose={() => setAlertOpen(false)}
                message={alertMessage}
                severity={alertSeverity}
            />
        </S.Wrapper>
    );
}