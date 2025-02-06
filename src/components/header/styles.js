import styled from "styled-components";
import { colorConstants } from "../../constants/constantStyles";

export const HeaderWrapper = styled.header`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: ${colorConstants.whiteBackground};
    position: sticky;
    top: 0;
    z-index: 1000;
    
    @media (min-width: 768px) {
        padding: 1.5rem 3rem;
    }
`;

export const LogoContainer = styled.div`
    flex-shrink: 0;
`;

export const Logo = styled.img`
    width: 100px;
    height: auto;
    
    @media (min-width: 768px) {
        width: 130px;
    }
`;

export const NavContainer = styled.nav`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

export const MobileMenu = styled.div`
    position: relative;
`;

export const MenuButton = styled.button`
    background: none;
    border: none;
    font-size: 1.125rem;
    color: ${colorConstants.purple.purple750};
    padding: 0.5rem;
`;

export const MobileDropdown = styled.div`
    position: absolute;
    right: 0;
    top: 100%;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    z-index: 1000;
`;

export const MenuItem = styled.a`
    display: block;
    padding: 0.75rem 1rem;
    color: ${colorConstants.purple.purple750};
    text-decoration: none;
    font-size: 1rem;
    
    &:hover {
        background: rgba(107, 33, 168, 0.1);
    }
`;

export const DesktopMenu = styled.div`
    position: relative;
    display: none;
    
    @media (min-width: 768px) {
        display: block;
    }
`;

export const MoreButton = styled.button`
    background: none;
    border: none;
    color: ${colorConstants.purple.purple750};
    font-size: 1.125rem;
    padding: 0.5rem;
    cursor: pointer;
`;

export const Dropdown = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    background: ${colorConstants.whiteBackground};
`;

export const DropdownItem = styled.a`
    display: block;
    padding: 0.75rem 1rem;
    color: ${colorConstants.purple.purple750};
    text-decoration: none;
    font-size: 1rem;
    
    &:hover {
        background: rgba(107, 33, 168, 0.1);
    }
`;

export const AuthLinks = styled.div`
    display: none;
    
    @media (min-width: 768px) {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }
`;

export const SignUpButton = styled.button`
    background: none;
    border: none;
    color: ${colorConstants.purple.purple750};
    font-size: 1.125rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    
    &:hover {
        opacity: 0.8;
    }
`;

export const LogInButton = styled.button`
    background: ${colorConstants.purple.purple750};
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s;
    
    &:hover {
        background: ${colorConstants.purple.purple900};
    }
`;
