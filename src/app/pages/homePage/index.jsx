import Header from "$components/homePage/header";
import SectionOne from "./sectionOne";
import SectionTwo from "./sectionTwo";
import SectionThree from "./sectionThree";
import SectionFive from "./sectionFive";
import SectionSix from "./sectionSix";
import SectionSeven from "./sectionSeven";
import * as S from "./styles";
import SectionFour from "./sectionFour";

// scroll-behavior, margin/padding zerados e overflow-x agora vêm do CssBaseline
// e do tema global (src/theme.js). Este bloco definia `body { font-family: Arial }`,
// que vazava para o app inteiro depois de uma visita a /about.

const HomePage = () => {
  return (
    <>
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
