import React from 'react';
import { getImage } from './utils';

const Tags = ({ tags }) => {
  return (
    <>
      <h4> Tag(s): </h4>
      {tags && tags.map((tag, index) => (
        <div className="tags-container" key={index}>
          <div className="tag">
            <img src={getImage(tag)} alt={tag} className="icon" />
            <span className="texto">{tag}</span>
          </div>
        </div>
      ))}
    </>
  );
};

export default Tags;