import Header from "../../components/header";
import SectionOne from "./sectionOne";
import SectionTwo from "./sectionTwo";
import SectionThree from "./sectionThree";
import SectionSix from "./sectionSix";
import * as S from "./styles";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
    html {
      scroll-behavior: smooth;
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
        <SectionSix/>
      </S.Wrapper>
    </>
  );
};

export default HomePage;
