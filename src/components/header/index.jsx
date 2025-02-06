import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as S from "./styles";
import logo2 from "../../assets/img/logo2.gif";

export const Header = ({ idSecTwo, idSecThree }) => {

    const navigate = useNavigate();

    const handleLogIn = () => {
      navigate('/login');
    }

    const handleSignUp = () => {
        navigate('/sign-up'); // Redireciona para a página de cadastro
      };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Referência para o dropdown

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false);
    }
  };

  useEffect(() => {
    // Adiciona o listener para fechar o dropdown ao clicar fora
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Remove o listener ao desmontar o componente
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <S.Wrapper>
      <S.Logo src={logo2} />
      <S.Options>
        <S.Menu>
          <S.MoreButton onClick={() => setDropdownOpen(!dropdownOpen)}>
            Mais ▼
          </S.MoreButton>
          {dropdownOpen && (
            <S.Dropdown ref={dropdownRef} className={dropdownOpen ? 'show' : ''}>
              <S.DropdownItem href="#about">Sobre</S.DropdownItem>
              <S.DropdownItem href="#articles">Artigos</S.DropdownItem>
              <S.DropdownItem href="#initiatives">Iniciativas</S.DropdownItem>
              <S.DropdownItem href="#platform">Plataforma</S.DropdownItem>
            </S.Dropdown>
          )}
        </S.Menu>
        <S.AuthLinks>
        <S.SignUpButton onClick={handleSignUp}>Cadastrar</S.SignUpButton>
          <S.LogInButton onClick={handleLogIn}>Login</S.LogInButton>
        </S.AuthLinks>
      </S.Options>
    </S.Wrapper>
  );
};
