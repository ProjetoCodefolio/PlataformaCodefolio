import React from 'react';
import { useNavigate } from 'react-router-dom';
import './initialPage.css';
import codefolio from '../assets/img/codefolio.png';
import botaoLogin from '../assets/img/botao-login.png';

export default function InitialPage() {
  
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/login');
  }

  return (
    <div className='container'>
      <div className='header'>
        <img className='header-logo' src={codefolio} alt="Logo Codefólio" />
        <p className='paragrapher header-content'> Iniciativas  |  Artigos</p>
      </div>
      <div className='content-page'>
        <p className='paragrapher'>
          Construindo conhecimento
          <br />
          Documentando competências
          <br />
          Disseminando Aprendizado.
        </p>
      </div>
      <div className='btn-container'>
         <img className='btn' onClick={handleClick} src={botaoLogin} />
      </div>
    </div>
  )
}