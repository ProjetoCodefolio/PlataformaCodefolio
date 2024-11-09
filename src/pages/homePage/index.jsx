import { Header } from "../../components/header";
import { SectionOne } from "./sectionOne";
import { SectionThree } from "./sectionThree";
import { SectionTwo } from "./sectionTwo";
import * as S from "./styles";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  html {
    scroll-behavior: smooth;
  }
`

const HomePage = () => {

  return (
    <>
      <GlobalStyle />
      <Header idSecTwo={'#sec2'} idSecThree={'#sec3'} />
      <S.Wrapper>
        <SectionOne />
        <SectionTwo />
        <SectionThree />
      </S.Wrapper>
    </>
  );
}

export default HomePage;