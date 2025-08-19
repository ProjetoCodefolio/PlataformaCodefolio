import React from 'react';
import Box from "@mui/material/Box";
import Typography from '@mui/material/Typography';
import { colorConstants, textStyles } from "../../../constants/constantStyles";
import section2img from "$assets/img/section2.svg";
import engSvg from "$assets/img/eng.svg";

const Section2Img = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: { xs: 'column', md: 'row' },
        width: '100%',
        minHeight: '100vh',
        gap: { xs: '20px', md: '40px' },
        padding: { xs: '20px', md: '40px' },
        boxSizing: 'border-box',
      }}
    >

      <Box
        sx={{
          marginRight:'3%',
          backgroundColor: colorConstants.purple.purple750,
          borderRadius: '12px',
          padding: '10px',
          width: { xs: '90%', sm: '70%', md: '35%' },
          display: 'flex',
          justifyContent: 'center',
          height: { xs: '300px', sm: '400px', md: '500px' },
          position: 'relative',
        }}
      >
        <img
          src={section2img}
          alt="Menino Flutuando"
          style={{
            width: '90%',
            objectFit: 'contain',
          }}
        />
      </Box>

   
      <Box
        sx={{
          width: { xs: '90%', sm: '80%', md: '40%' },
          minHeight: { xs: 'auto', md: '500px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingLeft: { xs: '0', md: '20px' },
          textAlign: { xs: 'center', md: 'left' },
          position: 'relative',
        }}
      >

        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Arial Unicode MS, Arial, sans-serif', fontWeight: 'bold', color: '#6A0DAD', marginBottom: '1rem' }}>
            O que é o Codefólio?
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontFamily: 'Arial Unicode MS, Arial, sans-serif',
              color: '#6A0DAD', 
              fontSize: { xs: '1rem', md: '1.2rem' },
              maxWidth: { xs: '100%', md: '600px' }, 
              textAlign: { xs: 'justify', md: 'justify' }, 
            }}
          >
            O projeto de extensão "Codefolio - Construindo Portfólios de Código & Compartilhando Conhecimento de Boas Práticas de Engenharia de Software" da Universidade Federal do Pampa (Unipampa) tem como objetivo auxiliar estudantes e profissionais na criação de portfólios de código, promovendo a disseminação de boas práticas em engenharia de software.
          </Typography>
        </Box>

     
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end', 
            marginTop: { xs: '10px', md: '0' }, 
          }}
        >
          <Box
            component="img"
            src={engSvg}
            alt="Engenharia"
            sx={{
              width: { xs: '80px', md: '110px' }, 
              height: { xs: '80px', md: '110px' }, 
            }}
          />
        </Box>
      </Box> 
    </Box>
  );
};

export default Section2Img;