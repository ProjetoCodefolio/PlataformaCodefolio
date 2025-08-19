import Header from "$components/homePage/header";
import SectionOne from "./sectionOne";
import SectionTwo from "./sectionTwo";
import SectionThree from "./sectionThree";
import SectionFive from "./sectionFive";
import SectionSix from "./sectionSix";
import SectionSeven from "./sectionSeven";
import * as S from "./styles";
import { createGlobalStyle } from "styled-components";
import SectionFour from "./sectionFour";

const GlobalStyle = createGlobalStyle`
  html {
    scroll-behavior: smooth;
  }
  body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    overflow-x: hidden; /* Adiciona esta linha para evitar overflow horizontal */
  }
`;

const HomePage = () => {
  return (
    <>
      <GlobalStyle />
      <Header />
      <S.Wrapper>
        <SectionOne />
        <SectionTwo />
        <SectionThree/>
        <SectionFour/>
       <SectionFive/> 
        <SectionSix/>
        <SectionSeven/> 
      </S.Wrapper>
    </>
  );
};

export default HomePage;
