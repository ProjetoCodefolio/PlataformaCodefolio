import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as S from "./styles";
import logo2 from "../../assets/img/logo2.gif";

const Header = ({ idSecTwo, idSecThree }) => {
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

    return (
        <S.HeaderWrapper>
            <S.LogoContainer>
                <S.Logo src={logo2} alt="Logo" />
            </S.LogoContainer>
            
            <S.NavContainer>
                {isMobile ? (
                    <S.MobileMenu ref={dropdownRef}>
                        <S.MenuButton onClick={() => setDropdownOpen(!dropdownOpen)}>
                            Menu ▼
                        </S.MenuButton>
                        {dropdownOpen && (
                            <S.MobileDropdown>
                                <S.MenuItem href="#about">Sobre</S.MenuItem>
                                <S.MenuItem href="#articles">Artigos</S.MenuItem>
                                <S.MenuItem href="#initiatives">Iniciativas</S.MenuItem>
                                <S.MenuItem href="#platform">Plataforma</S.MenuItem>
                                <S.MenuItem as="button" onClick={() => navigate('/sign-up')}>Cadastrar</S.MenuItem>
                                <S.MenuItem as="button" onClick={() => navigate('/login')}>Login</S.MenuItem>
                            </S.MobileDropdown>
                        )}
                    </S.MobileMenu>
                ) : (
                    <>
                        <S.DesktopMenu>
                            <S.MoreButton onClick={() => setDropdownOpen(!dropdownOpen)}>
                                Mais ▼
                            </S.MoreButton>
                            {dropdownOpen && (
                                <S.Dropdown ref={dropdownRef}>
                                    <S.DropdownItem href="#about">Sobre</S.DropdownItem>
                                    <S.DropdownItem href="#articles">Artigos</S.DropdownItem>
                                    <S.DropdownItem href="#initiatives">Iniciativas</S.DropdownItem>
                                    <S.DropdownItem href="#platform">Plataforma</S.DropdownItem>
                                </S.Dropdown>
                            )}
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
