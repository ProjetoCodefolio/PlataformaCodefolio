import React from 'react'
import './Section4.css' // Adicione um arquivo CSS para estilização
import equipeCodefolio1 from '../../../assets/img/equipecodefolio1.svg'
import equipeCodefolio2 from '../../../assets/img/equipecodefolio2.svg'
import equipeCodefolio3 from '../../../assets/img/equipecodefolio3.svg'

const Section4 = () => {
  return (
    <div className="section4">
      <div className="row row1">
        <div className="column">
          <img src={equipeCodefolio1} alt="Equipe Codefolio 1" />
        </div>
        <div className="column">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar facilisis justo mollis, auctor consequat urna.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar facilisis justo mollis, auctor consequat urna.</p>
        </div>
      </div>
      <div className="row row2">
        <div className="column">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar facilisis justo mollis, auctor consequat urna.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar facilisis justo mollis, auctor consequat urna.</p>
        </div>
        <div className="column">
          <img src={equipeCodefolio2} alt="Equipe Codefolio 2" />
        </div>
      </div>
      <div className="row row3">
        <div className="column">
          <img src={equipeCodefolio3} alt="Equipe Codefolio 3" />
        </div>
        <div className="column">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar facilisis justo mollis, auctor consequat urna.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar facilisis justo mollis, auctor consequat urna.</p>
        </div>
      </div>
    </div>
  )
}

export default Section4