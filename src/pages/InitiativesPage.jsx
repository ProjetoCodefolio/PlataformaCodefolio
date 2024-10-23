import React from 'react';
import { useNavigate } from 'react-router-dom';
import './initialPage.css';
import codefolio from '../assets/img/codefolio.png';

export default function InitiativesPage() {

    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/');
    }

    return (
            <div className='container'>
                <div className='header'>
                    <img className='header-logo' src={codefolio} alt="Logo Codefólio" />
                    <p className='paragrapher header-content'> Iniciativas  |  Artigos</p>
                </div>
                <div className='content-page'>
                    <h1 className='paragrapher'>Iniciativas do Projeto</h1>
                    <ul className='initiatives-list'>
                        <li className='initiative-item'>Iniciativa 1: Descrição da iniciativa 1</li>
                        <li className='initiative-item'>Iniciativa 2: Descrição da iniciativa 2</li>
                        <li className='initiative-item'>Iniciativa 3: Descrição da iniciativa 3</li>
                        {/* Adicione mais iniciativas conforme necessário */}
                    </ul>
                </div>
                <div className='btn-container'>
                    <button className='btn' onClick={handleClick}>Voltar</button>
                </div>  
            </div>
    )
}