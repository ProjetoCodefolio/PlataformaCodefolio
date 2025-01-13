import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Share } from '@mui/icons-material';
import MyAlert from '../alert/Alert';
import { abrirAlert } from '../../utils';
import { useIsMobileHook } from '../../../useIsMobileHook';


const MyShare = ({ post }) => {

    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');
    const postLink = post.link;

    const compartilhar = () => {
        // abrirAlert(setAlertMessage, setAlertSeverity, setAlertOpen, postLink, "success");

        // quero adicionar o link ao clipboard do usuário
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
            <Button
                variant="outlined"
                startIcon={<Share style={{ height: '30px', width: '30px' }}/>}
                onClick={() => compartilhar()}
                className='share-button'
                style={{
                    width: isMobile ? '100px' : '200px',
                }}
            >
                {isMobile ? '' : 'Compartilhar'}
            </Button>

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