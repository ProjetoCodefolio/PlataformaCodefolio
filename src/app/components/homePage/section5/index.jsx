import React from 'react';
import styled from 'styled-components';
import Box from "@mui/material/Box";
import Typography from '@mui/material/Typography';
import quatroTelas from "$assets/img/4telas.svg";
import Carousel from 'react-material-ui-carousel';
import { Card, CardContent, CardActionArea } from '@mui/material';


const artigos = [
  {
    key: 1,
    titulo: "Como começar com React.js em 2024",
    autor: "João Silva",
    link: "/artigos/react-iniciantes"
  },
  {
    key: 2,
    titulo: "Melhores práticas em TypeScript",
    autor: "Maria Santos",
    link: "/artigos/typescript-praticas"
  },
  {
    key: 3,
    titulo: "Node.js: Construindo APIs RESTful",
    autor: "Pedro Oliveira",
    link: "/artigos/nodejs-apis"
  },
  {
    key: 4,
    titulo: "Docker para Desenvolvedores Web",
    autor: "Ana Costa",
    link: "/artigos/docker-web"
  },
  {
    key: 5,
    titulo: "Como começar com React.js em 2024",
    autor: "João Silva",
    link: "/artigos/react-iniciantes"
  },
  {
    key: 6,
    titulo: "Como começar com React.js em 2024",
    autor: "João Silva",
    link: "/artigos/react-iniciantes"
  },
];


const Section5 = () => {
  // Adicionar hook para detectar tamanho da tela
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 600);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderCarouselItems = () => {
    if (isMobile) {
      // Lógica para exibir um card por vez em telas pequenas
      return artigos.map((artigo) => (
        <Box
          key={artigo.key}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <Card
            sx={{
              width: '100%',
              maxWidth: 300,
              height: 250,
              backgroundColor: '#7d2ead',
              transition: 'transform 0.3s',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
          >
            <CardActionArea
              href={artigo.link}
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '20px'
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontFamily: 'Arial Unicode MS, Arial, sans-serif',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}
                >
                  {artigo.titulo}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'white',
                    fontFamily: 'Arial Unicode MS, Arial, sans-serif',
                    textAlign: 'center',
                    marginTop: 'auto'
                  }}
                >
                  {artigo.autor}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      ));
    }

    // Manter a lógica existente para telas maiores
    return Array.from({ length: Math.ceil(artigos.length / 3) }, (_, index) => (
      <Box
        key={index}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          padding: '20px'
        }}
      >
        {artigos.slice(index * 3, index * 3 + 3).map((artigo) => (
          <Card
            key={artigo.key}
            sx={{
              width: 300,
              height: 250,
              backgroundColor: '#5e1d83',
              transition: 'transform 0.3s',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
          >
            <CardActionArea
              href={artigo.link}
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '20px'
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontFamily: 'Arial Unicode MS, Arial, sans-serif',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}
                >
                  {artigo.titulo}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'white',
                    fontFamily: 'Arial Unicode MS, Arial, sans-serif',
                    textAlign: 'center',
                    marginTop: 'auto'
                  }}
                >
                  {artigo.autor}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    ));
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'center', md: 'flex-start' },
          justifyContent: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          width: '100%',
          minHeight: { xs: 'auto', md: '50vh' },
          gap: { xs: '20px', md: '40px' },
          padding: { xs: '0 0 0 0', md: '50px 0 0 0' },
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
            alignItems: 'flex-start',
            height: 'auto',
            position: 'relative',
          }}
        >
          <img
            src={quatroTelas}
            alt="Quatro telas"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>

        <Box
          sx={{
            width: { xs: '90%', sm: '80%', md: '40%' },
            minHeight: { xs: 'auto', md: '630px' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingLeft: { xs: '0', md: '0' },
            textAlign: { xs: 'center', md: 'left' },
            position: 'relative',
            paddingTop: { xs: '20px', md: '0' },
          }}
        >
          <Box sx={{ paddingTop: { xs: '0', md: '90px' } }} >
            <Typography variant="h4" sx={{ fontFamily: 'Arial Unicode MS, Arial, sans-serif', fontWeight: 'bold', color: '#6A0DAD', marginBottom: '1rem' }}>
              ARTIGOS
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Arial Unicode MS, Arial, sans-serif',
                color: '#6A0DAD',
                fontSize: { xs: '1rem', md: '1.2rem' },
                maxWidth: { xs: '100%', md: '500px' },
                textAlign: { xs: 'justify', md: 'justify' },
              }}
            >
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          width: '100%',
          height: '100px',
          backgroundColor: '#6A0DAD',
          marginTop: { xs: '40px', md: '0px' },
          minHeight: '46vh',
          padding: '40px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Carousel
          animation="slide"
          navButtonsAlwaysVisible
          autoPlay={false}
          navButtonsProps={{
            style: {
              padding: isMobile ? '4px' : '8px',
              margin: isMobile ? '0 -2 px' : '0',
              transform: isMobile ? 'scale(0.8)' : 'scale(1)',
              backgroundColor: '#5e1d83',
              borderRadius: '50%',
              width: isMobile ? '28px' : '40px',
              height: isMobile ? '30px' : '40px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }
          }}
          sx={{
            width: '90%',
            maxWidth: '1200px',
            height: '100%'
          }}
        >
          {renderCarouselItems()}
        </Carousel>
      </Box>
    </>
  );
};

export default Section5;
