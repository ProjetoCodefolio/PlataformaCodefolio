import Header from "../../components/header";
  console.log("Header importado:", Header);
  import SectionOne from "./sectionOne";
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
        </S.Wrapper>
      </>
    );
  };

  export default HomePage;
