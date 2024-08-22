import React from 'react';
import { useNavigate } from 'react-router-dom';

function MembroLink({ user, texto }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/membro', { state: { uidUser: user } });
  };

  return (
    <a style={{cursor: 'pointer'}} onClick={handleClick} >
      {texto}
    </a>
  );
}

export default MembroLink;
