import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as S from "./styles";
import logo2 from "../../assets/img/logo2.gif";
import hamburgerIcon from "../../assets/img/hamburger-icon.svg"; 

const Header = () => {
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const dropdownRef = useRef(null);

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


    const scrollToSectionTwo = () => {
        const sectionTwo = document.getElementById('sectionTwo');
        if (sectionTwo) {
            sectionTwo.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <S.HeaderWrapper>
            <S.LogoContainer>
                <S.Logo src={logo2} alt="Logo" />
            </S.LogoContainer>

            <S.NavContainer>
                {isMobile ? (
                    <S.MobileMenu ref={dropdownRef}>
                        <S.MenuButton onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <img src={hamburgerIcon} alt="Menu" style={{ width: "50px", height: "50px" }} />
                        </S.MenuButton>
                        {dropdownOpen && (
                            <S.MobileDropdown>
                                <S.MenuItem onClick={scrollToSectionTwo}>Sobre</S.MenuItem>
                                <S.MenuItem href="#initiatives">Iniciativas</S.MenuItem>
                                <S.MenuItem href="#articles">Artigos</S.MenuItem>
                                <S.MenuItem href="#platform">Plataforma</S.MenuItem>
                                <S.DropdownSignUpButton onClick={() => navigate('/sign-up')}>
                                    Cadastrar
                                </S.DropdownSignUpButton>
                                <S.DropdownLogInButton onClick={() => navigate('/login')}>
                                    Login
                                </S.DropdownLogInButton>
                            </S.MobileDropdown>
                        )}
                    </S.MobileMenu>
                ) : (
                    <>
                        <S.DesktopMenu>
                            <S.MenuItem onClick={scrollToSectionTwo}>Sobre</S.MenuItem>
                            <S.MenuItem href="#initiatives">Iniciativas</S.MenuItem>
                            <S.MenuItem href="#articles">Artigos</S.MenuItem>
                            <S.MenuItem href="#platform">Plataforma</S.MenuItem>
                        </S.DesktopMenu>
                        <S.AuthLinks>
                            <S.SignUpButton onClick={() => navigate('/sign-up')}>
                                Cadastrar
                            </S.SignUpButton>
                            <S.LogInButton onClick={() => navigate('/login')}>
                                Login
                            </S.LogInButton>
                        </S.AuthLinks>
                    </>
                )}
            </S.NavContainer>
        </S.HeaderWrapper>
    );
};

export default Header;