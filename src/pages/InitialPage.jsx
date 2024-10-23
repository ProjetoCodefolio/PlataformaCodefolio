import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Typography } from '@mui/material';
import './initialPage.css';
import codefolio from '../assets/img/codefolio.png';

export default function InitialPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('');

  const handleClick = () => {
    navigate('/login');
  }

  const handleIniciativasClick = () => {
    document.getElementById('iniciativas').scrollIntoView({ behavior: 'smooth' });
  }

  const handleArtigosClick = () => {
    document.getElementById('artigos').scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
      let isAnySectionVisible = false;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
          isAnySectionVisible = true;
        }
      });
      if (!isAnySectionVisible) {
        setActiveSection('');
      }
    }, options);

    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
      observer.observe(section);
    });

    return () => {
      sections.forEach(section => {
        observer.unobserve(section);
      });
    };
  }, []);

  const cards = [
    {
      title: 'Artigo 1Artigo 1Artigo 1Artigo 1',
      description: 'Construção de Portfólios e Compartilhamento de Conhecimentos através da Extensão Universitária',
    },
    {
      title: 'Artigo 1',
      description: 'Construção de Portfólios e Compartilhamento de Conhecimentos através da Extensão Universitária',
    },
    {
      title: 'Artigo 1',
      description: 'Construção de Portfólios e Compartilhamento de Conhecimentos através da Extensão Universitária',
    }
  ];

  return (
    <>
      <div className='container'>
        <div className='header'>
          <img className='header-logo' src={codefolio} alt="Logo Codefólio" />
          <div className='header-links'>
            <p className={`paragrapher header-content ${activeSection === 'iniciativas' ? 'active' : ''}`} onClick={handleIniciativasClick}> Iniciativas</p>
            <p className={`paragrapher header-content ${activeSection === 'artigos' ? 'active' : ''}`} onClick={handleArtigosClick}> Artigos</p>
          </div>
        </div>
        <div className='content-pages'>
          <p className='paragrapher'>
            Construindo Conhecimento
            <br />
            Documentando Competências
            <br />
            Disseminando Aprendizado.
          </p>
          <p className='complementar-text'>
            Acesse o Codefólio e faça parte dessa jornada!
          </p>
        </div>
        <div className='btn-container'>
          <Button className='btn' onClick={handleClick} > Entrar </Button>
        </div>

        {/* aqui começa a parte de iniciativas */}
        <div id='iniciativas' className='content-pages section'>
          <h1 className='paragrapher'>Nossas Iniciativas</h1>
          <p className='paragrapher'>
            Acima de tudo, é fundamental ressaltar que a
            <br />
            competitividade nas transações comerciais
            <br />
            causa impacto indireto na reavaliação dos
            <br />
            procedimentos normalmente adotados.
          </p>
        </div>

        {/* aqui começa a parte de artigos */}
        <div id='artigos' className='content-pages section'>
          <div className="card-container">
            {cards.map((card, index) => (
              <div className="card" key={index}>
                <h4>{card.title}</h4>
                <p className='class'>{card.description}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}