import React from 'react';
import Box from "@mui/material/Box";
import Typography from '@mui/material/Typography';
import { colorConstants } from "../../../constants/constantStyles";
import youtubeFrame from "../../../assets/img/youtubeframe.svg";
import youtubeIcon from "../../../assets/img/icons8-youtube-100.svg";
import instagramIcon from "../../../assets/img/icons8-instagram-100.svg";
import linkedinIcon from "../../../assets/img/icons8-linkedin-100.svg";
import seta from "../../../assets/img/seta.gif";

const socialMediaLinks = {
  youtube: {
    title: "YouTube",
    link: "https://www.youtube.com/@projetocodefolio",
    image: youtubeIcon
  },
  instagram: {
    title: "Instagram", 
    link: "https://www.instagram.com/projetocodefolio/?hl=pt-br",
    image: instagramIcon
  },
  linkedin: {
    title: "LinkedIn",
    link: "",
    image: linkedinIcon
  }
};


const SocialMediaIcons = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: '20px',
        marginTop: '20px',
        paddingLeft: { xs: '0', md: '0' }
      }}
    >
      {Object.entries(socialMediaLinks).map(([key, media]) => (
        <Box
          key={key}
          component="a"
          href={media.link}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex-start',
            flexDirection: 'column',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <Box
            component="img"
            src={media.image}
            alt={media.title}
            sx={{
              width: '40px',
              height: '40px',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.1)'
              }
            }}
          />
        </Box>
      ))}
    </Box>
  );
};



const Section6 = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: { xs: 'column', md: 'row' },
        width: '100%',
        minHeight: { xs: 'auto', md: '100vh' },
        gap: { xs: '0', md: '40px' },
        padding: { xs: '0', md: '0' },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          marginRight: { xs: '0', md: '2%' },
          marginLeft: { xs: '0', md: '4%' },
          borderRadius: '12px',
          padding: { xs: '0', md: '10px' },
          width: { xs: '90%', sm: '90%', md: '45%' },
          display: 'flex',
          justifyContent: 'center',
          height: { xs: '300px', sm: '400px', md: '550px' },
          position: 'relative',
        }}
      >
        <img
          src={youtubeFrame}
          alt="YouTube Frame"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
        <Box
          component="img"
          src={seta}
          alt="Seta indicativa"
          sx={{
            position: 'absolute',
            bottom: { xs: '60px', md: '100px' },
            right: { xs: '40px', md: '60px' },
            width: { xs: '150px', md: '210px' },
            height: 'auto',
            zIndex: 1
          }}
        />
      </Box>

      <Box
        sx={{
          width: { xs: '90%', sm: '80%', md: '40%' },
          minHeight: { xs: 'auto', md: '700px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          paddingLeft: { xs: '0', md: '0' },
          textAlign: { xs: 'center', md: 'left' },
          position: 'relative',
          paddingTop: { xs: '0', md: '200px' },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Arial Unicode MS, Arial, sans-serif', fontWeight: 'bold', color: '#7d2ead', marginBottom: '1rem' }}>
            Codefólio
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontFamily: 'Arial Unicode MS, Arial, sans-serif',
              color: '#5A1996', 
              fontSize: { xs: '1rem', md: '1.2rem' },
              maxWidth: { xs: '100%', md: '500px' }, 
              textAlign: { xs: 'justify', md: 'justify' }, 
            }}
          >
           O Codefólio é um canal educacional focado em tecnologia e desenvolvimento de software. Com conteúdos práticos e acessíveis, simplifica temas complexos, tornando-os fáceis de entender. Ideal para iniciantes e profissionais que buscam aprimorar suas habilidades, o canal oferece materiais de qualidade que ajudam você a se manter atualizado com as melhores práticas do mercado. Aprenda de forma direta, dinâmica e eficiente, elevando seu conhecimento para o próximo nível.
          </Typography>
        </Box>
        <SocialMediaIcons />  
      </Box>
    </Box>
  );
};

export default Section6;