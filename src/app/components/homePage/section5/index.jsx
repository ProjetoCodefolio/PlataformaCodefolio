import React from 'react';
import styled from 'styled-components';
import Box from "@mui/material/Box";
import Typography from '@mui/material/Typography';
import quatroTelas from "$assets/img/4telas.svg";
// import Carousel from 'react-material-ui-carousel';
import { Card, CardContent, CardActionArea } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';


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

  const renderSlides = () => {
    if (isMobile) {
      return artigos.map((artigo) => (
        <SwiperSlide key={artigo.key}>
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Card
              sx={{
                width: { xs: '100%', md: 320 },
                maxWidth: 320,
                height: 250,
                backgroundColor: '#5e1d83',
                borderRadius: '8px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                transition: 'transform 0.3s',
                '&:hover': { transform: 'translateY(-6px)' }
              }}
            >
              <CardActionArea href={artigo.link} sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
                  <Typography variant="h6" sx={{ color: 'white', fontFamily: 'Arial Unicode MS, Arial, sans-serif', fontWeight: 'bold', textAlign: 'center' }}>
                    {artigo.titulo}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', fontFamily: 'Arial Unicode MS, Arial, sans-serif', textAlign: 'center', marginTop: 'auto' }}>
                    {artigo.autor}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        </SwiperSlide>
      ));
    }

    // Agrupar 3 por slide em telas maiores
    const groups = Array.from({ length: Math.ceil(artigos.length / 3) }, (_, index) => artigos.slice(index * 3, index * 3 + 3));

    return groups.map((group, index) => (
      <SwiperSlide key={`group-${index}`}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '20px 0' }}>
          {group.map((artigo) => (
            <Card key={artigo.key} sx={{ width: { xs: '100%', md: 320 }, maxWidth: 320, height: 250, backgroundColor: '#5e1d83', borderRadius: '8px', boxShadow: '0 6px 18px rgba(0,0,0,0.25)', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-6px)' } }}>
              <CardActionArea href={artigo.link} sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
                  <Typography variant="h6" sx={{ color: 'white', fontFamily: 'Arial Unicode MS, Arial, sans-serif', fontWeight: 'bold', textAlign: 'center' }}>
                    {artigo.titulo}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', fontFamily: 'Arial Unicode MS, Arial, sans-serif', textAlign: 'center', marginTop: 'auto' }}>
                    {artigo.autor}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </SwiperSlide>
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

        <Box
          sx={{
            width: '100%',
            minHeight: '46vh',
            padding: '40px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#6A0DAD',
            position: 'relative',
            '& .swiper-button-next, & .swiper-button-prev': {
              backgroundColor: '#5e1d83',
              borderRadius: '50%',
              color: '#fff',
              width: isMobile ? '12px' : '24px',
              height: isMobile ? '12px' : '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              zIndex: 20,
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
            },
            '& .swiper-button-prev': { left: '0px' },
            '& .swiper-button-next': { right: '0px' },
            '& .swiper-button-next:after, & .swiper-button-prev:after': {
              fontSize: isMobile ? '14px' : '20px',
              color: '#fff',
            },
            '& .swiper-button-disabled': { opacity: 0.4 },
            '& .swiper-pagination': {
              position: 'absolute',
              bottom: '-1%',
              left: 0,
              right: 0,
              textAlign: 'center',
              zIndex: 20,
            },
            '& .swiper-pagination-bullet': {
              width: '10px',
              height: '10px',
              background: '#cfcfcf',
              opacity: 1,
              margin: '0 6px',
              display: 'inline-block',
              borderRadius: '50%',
            },
            '& .swiper-pagination-bullet-active': {
              background: '#394439ff',
            },
          }}
        >
          <Swiper
            modules={[Navigation, Pagination]}
            navigation
            pagination={{ clickable: true }}
            spaceBetween={20}
            slidesPerView={1}
            slidesPerGroup={1}
            style={{
              width: '90%',
              maxWidth: '1200px',
              padding: '20px 0',
            }}
            keyboard={{ enabled: true }}
            allowTouchMove
          >
            {renderSlides()}
          </Swiper>
        </Box>

      </Box>
    </>
  );
};

export default Section5;
