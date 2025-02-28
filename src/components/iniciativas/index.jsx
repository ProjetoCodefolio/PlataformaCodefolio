import * as S from './styles';
import React from 'react';
import iniciativas1 from '../../assets/img/iniciativas1.svg';
import iniciativas2 from '../../assets/img/iniciativas2.svg';
import iniciativas3 from '../../assets/img/iniciativas3.svg';

const Iniciativas = () => {
  const items = [
    {
      img: iniciativas1,
      title: 'Plataforma Codefólio',
      description: 'Uma plataforma digital para agregação de conteúdos produzidos por estudantes.'
    },
    {
      img: iniciativas2,
      title: 'Mentoria',
      description: 'Um programa de tutoria que promove a mentoria de alunos mais experientes aos iniciantes.'
    },
    {
      img: iniciativas3,
      title: 'Workshops',
      description: 'Realização de workshops voltados para a comunidade.'
    }
  ];

  return (
    <div style={{ backgroundColor: "#f3f0f0", padding: "20px 0 0", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "1200px", width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", alignItems: "stretch" }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: '100%', maxWidth: '18rem', minHeight: "130px", textAlign: 'center', border: 'none', background: "#f3f0f0", padding: "20px", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: '100%', maxWidth: '270px', height: '250px' }}>
                <img src={item.img} alt={item.title} style={{ width: '75%' }} />
              </div>
              <h5 style={{ color: '#6a1b9a', marginTop: "16px", textAlign: "center", width: "100%" }}>{item.title}</h5>
              <p style={{ color: '#6c757d', textAlign: "center", flexGrow: 1, width: "100%" }}>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Iniciativas;
