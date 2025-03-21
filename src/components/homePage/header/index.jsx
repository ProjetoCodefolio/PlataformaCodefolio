import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as S from "./styles";
import logo2 from "../../../assets/img/logo2.gif";
import hamburgerIcon from "../../../assets/img/hamburger-icon.svg";
import { useAuth } from "../../../context/AuthContext";
import { handleGoogleSignIn, getFirebaseErrorMessage } from "../../../utils/authUtils";

const Header = () => {
    const [error, setError] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const { userDetails } = useAuth();

    const handleLogin = () => {
        handleGoogleSignIn(navigate, null, (error) => {
            const message = getFirebaseErrorMessage(error);
            setError(message);
        });
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const scrollToSection = (sectionId, offset = -50) => {
        const section = document.getElementById(sectionId);
        if (section) {
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = section.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition + offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <S.HeaderWrapper>
            <S.LogoContainer>
                <S.Logo src={logo2} alt="Logo" onClick={() => scrollToSection('sectionOne')} />
            </S.LogoContainer>

            <S.NavContainer>
                {isMobile ? (
                    <S.MobileMenu ref={dropdownRef}>
                        <S.MenuButton onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <img src={hamburgerIcon} alt="Menu" style={{ width: "50px", height: "50px" }} />
                        </S.MenuButton>
                        {dropdownOpen && (
                            <S.MobileDropdown>
                                <S.MenuItem onClick={() => scrollToSection('sectionTwo')}>Sobre</S.MenuItem>
                                <S.MenuItem onClick={() => scrollToSection('initiatives')}>Iniciativas</S.MenuItem>
                                <S.MenuItem onClick={() => scrollToSection('articles')}>Artigos</S.MenuItem>
                                <S.MenuItem onClick={() => scrollToSection('platform')}>Plataforma</S.MenuItem>


                                {userDetails ? (
                                    <S.DropdownLogInButton onClick={() => navigate('/dashboard')}>
                                        Voltar
                                    </S.DropdownLogInButton>
                                ) : (
                                    <S.DropdownLogInButton onClick={handleLogin}>
                                        Entrar
                                    </S.DropdownLogInButton>
                                )}
                            </S.MobileDropdown>
                        )}
                    </S.MobileMenu>
                ) : (
                    <>
                        <S.DesktopMenu>
                            <S.MenuItem onClick={() => scrollToSection('sectionTwo')}>Sobre</S.MenuItem>
                            <S.MenuItem onClick={() => scrollToSection('initiatives', -400)}>Iniciativas</S.MenuItem>
                            <S.MenuItem onClick={() => scrollToSection('articles')}>Artigos</S.MenuItem>
                            <S.MenuItem onClick={() => scrollToSection('platform')}>Plataforma</S.MenuItem>
                        </S.DesktopMenu>
                        <S.AuthLinks>

                            {userDetails ? (
                                <S.LogInButton onClick={() => navigate('/dashboard')}>
                                    Voltar
                                </S.LogInButton>
                            ) : (
                                <S.LogInButton onClick={handleLogin}>
                                    Entrar
                                </S.LogInButton>
                            )}
                        </S.AuthLinks>
                    </>
                )}
            </S.NavContainer>
        </S.HeaderWrapper>
    );
};

export default Header;