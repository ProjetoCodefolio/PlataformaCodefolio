import React, { useState } from "react";
import "./styles.css";
import { Box, Button } from "@mui/material";

export const HomeButtonBar = () => {
    const [active, setActive] = useState('timeline');

    const handleActive = (wtActive) => {
        setActive(wtActive);
    }
    
    //inserir lógica para o que for acontecer em cada botão

    return (
        <Box className="ButtonWrapper">
            <Button id="first"
                className={`BtnSpecs ${active === 'timeline' ? 'active' : ''}`}
                onClick={() => handleActive('timeline')}>Timeline</Button>

            <Button 
                className={`BtnSpecs ${active === 'membros' ? 'active' : ''}`}
                onClick={() => handleActive('membros')}>Membros</Button>

            <Button id="third"
                className={`BtnSpecs ${active === 'fotos' ? 'active' : ''}`}
                onClick={() => handleActive('fotos')}>Fotos</Button>

        </Box>
    );
}