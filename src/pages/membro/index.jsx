import React from 'react';
import { useLocation } from 'react-router-dom';

function MembroPage() {
    const location = useLocation();
    const nomeMembro = location.state?.userName;

    return <div>Nome do Usuário: {nomeMembro}</div>;
}

export default MembroPage;