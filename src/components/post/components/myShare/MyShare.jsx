import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Share } from '@mui/icons-material';
import MyAlert from '../alert/Alert';
import { abrirAlert } from '../../../../utils/postUtils';
import { useIsMobileHook } from '../../../useIsMobileHook';


const MyShare = ({ post }) => {

    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');
    const postLink = post.link;

    const compartilhar = () => {
      
        const el = document.createElement('textarea');
        el.value = postLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, "Link copiado para a área de transferência", "success");


    };

    const isMobile = useIsMobileHook(700);

    return (
        <div>
            <div 
                onClick={() => compartilhar()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    gap: '4px',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s',
                    width: 'fit-content'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(144, 65, 193, 0.04)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <Share 
                    sx={{
                        fontFamily: 'Arial, sans-serif',
                        width: '24px',
                        height: '24px',
                        color: '#666'
                    }}
                />
                {!isMobile && (
                    <span style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: '#666'
                    }}>
                        Compartilhar
                    </span>
                )}
            </div>

            <MyAlert
                open={alertOpen}
                onClose={() => setAlertOpen(false)}
                message={alertMessage}
                severity={alertSeverity}
            />
        </div>
    )
}

export default MyShare;