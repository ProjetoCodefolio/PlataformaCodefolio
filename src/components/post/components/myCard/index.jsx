import { useState } from 'react';
import * as S from './styles';
import { Avatar, TextField, InputAdornment, Button } from "@mui/material";
import { Search } from "@mui/icons-material";
import { PhotoCamera, Share, Article } from '@mui/icons-material';
import CreatePostModal from "../createPost/CreatePost";
import MyAlert from '../alert/Alert';
import { useIsMobileHook } from '../../../useIsMobileHook';

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

    const isMobile = useIsMobileHook();

    return(
        <S.Wrapper>
            {/* <S.Line>
                <Avatar
                    src={userPhoto}
                    alt='User Avatar'
                    sx={{
                        width: 48,
                        height: 48
                    }}
                />

                <TextField
                    className="postInputField"
                    variant="outlined"
                    placeholder="Comece uma publicação"
                    fullWidth={!isMobile}
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
            </S.Line> */}
            <S.Line style={{justifyContent: isMobile ? 'center' : 'space-around'}}>
                <div 
                    onClick={() => setIsEditModalOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        gap: '4px',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        width: 'fit-content',
                        border: '1px solid transparent',
                        boxShadow: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:active': {
                            transform: 'scale(0.98)'
                        }
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(144, 65, 193, 0.08)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(144, 65, 193, 0.2)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.98)';
                        e.currentTarget.style.backgroundColor = 'rgba(144, 65, 193, 0.12)';
                    }}
                    onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = 'rgba(144, 65, 193, 0.08)';
                    }}
                >
                    <PhotoCamera 
                        sx={{
                            width: '24px',
                            height: '24px',
                            color: '#666',
                            transition: 'color 0.2s ease'
                        }}
                    />
                    {!isMobile && (
                        <span style={{ 
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            color: '#666',
                            transition: 'color 0.2s ease'
                        }}>
                            Mídia
                        </span>
                    )}
                </div>

                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        gap: '4px',
                        borderRadius: '8px',
                        color: '#999', 
                        width: 'fit-content'
                    }}
                >
                    <Share 
                        sx={{
                            width: '24px',
                            height: '24px',
                            color: '#999'
                        }}
                    />
                    {!isMobile && (
                        <span style={{ 
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            color: '#999'
                        }}>
                            Compartilhar experiência
                        </span>
                    )}
                </div>

                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        gap: '4px',
                        borderRadius: '8px',
                        color: '#999',
                        width: 'fit-content'
                    }}
                >
                    <Article 
                        sx={{
                            width: '24px',
                            height: '24px',
                            color: '#999'
                        }}
                    />
                    {!isMobile && (
                        <span style={{ 
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            color: '#999'
                        }}>
                            Escrever artigo
                        </span>
                    )}
                </div>
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