import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Typography } from '@mui/material';
import './initialPage.css';
import codefolio from '../assets/img/codefolio.png';

export default function InitialPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('');
  const [headerBackground, setHeaderBackground] = useState(false);

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

    const handleScroll = () => {
      if (window.scrollY > 0) {
        setHeaderBackground(true);
      } else {
        setHeaderBackground(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      sections.forEach(section => {
        observer.unobserve(section);
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const cards = [
    {
      title: 'Modelos Interpretaveis com Inteligência Artificial Explicável' +
        '(XAI) na Detecção de Intrusões em Redes Intra-Veiculares' +
        'Controller Area Network (CAN)',
      author: 'Felipe Dresch; Felipe Scherer'
    },
    {
      title: 'Codefólio: Construção de Portfólios e Compartilhamento de Conhecimentos através da Extensão Universitária',
      author: 'Felipe Dresch; Felipe Scherer, Nicolas Faria, Estefano Soares, Camilla Borchhardt, Silvio Quincozes, Williamson Silva',
    },
    {
      title: 'Artigo 3',
      author: 'Felipe Dresch; Felipe Scherer',
    },
    {
      title: 'Artigo 4',
      author: 'Felipe Dresch; Felipe Scherer',
    },
    {
      title: 'Artigo 5',
      author: 'Felipe Dresch; Felipe Scherer',
    }
  ];

  return (
    <>
      <div className='container'>
        <div className={`header ${headerBackground ? 'header-background' : ''}`}>
          <img className='header-logo' src={codefolio} alt="Logo Codefólio" />
          <div className='header-links'>
            <p className={`paragrapher header-content ${activeSection === 'iniciativas' ? 'active' : ''}`} onClick={handleIniciativasClick}> Iniciativas</p>
            <p className={`paragrapher header-content ${activeSection === 'artigos' ? 'active' : ''}`} onClick={handleArtigosClick}> Artigos</p>
          </div>
        </div>
        <div id='initial' className='content-pages'>
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
          <div className='btn-container'>
            <Button className='btn' onClick={handleClick} > Entrar </Button>
          </div>
        </div>

        {/* aqui começa a parte de iniciativas */}
        <div id='iniciativas' className='content-pages section'>
          <h1 className='paragrapher'>Nossas Iniciativas</h1>
          <div className="card-container">
            <div id='card-iniciativas' className="card" key={0}>
              <p className='paragrapher'>
                O projeto Codefólio busca conectar a universidade e a comunidade através de ações educativas e colaborativas.
                <br />
                Ele se estrutura em três frentes:
                <br />

                <ul>
                  <li>Uma plataforma digital para agregação de conteúdos produzidos por estudantes;</li>
                  <li>Um programa de tutoria que promove a mentoria de alunos mais experientes aos iniciantes;</li>
                  <li>Realização de workshops voltados para a comunidade</li>
                </ul>

                A iniciativa tem se mostrado eficaz na prática, com destaque para o uso de vídeos didáticos voltados à formação de professores do ensino básico.
                <br />
                Apesar do projeto ainda estar em desenvolvimento, seu objetivo futuro é ampliar o alcance junto aos docentes.
                <br />
                O Codefólio é um exemplo de extensão universitária bem-sucedida, promovendo a troca de saberes e fortalecendo laços entre a comunidade interna e externa.
              </p>
            </div>
          </div>
        </div>

        {/* aqui começa a parte de artigos */}
        <div id='artigos' className='content-pages section'>
          <div className="card-container">
            {cards.map((card, index) => (
              <div className="card" key={index}>
                <h4>{card.title}</h4>
                {/* <p className='description'>{card.description}</p> */}
                <p className='author'>Autor(es): {card.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}