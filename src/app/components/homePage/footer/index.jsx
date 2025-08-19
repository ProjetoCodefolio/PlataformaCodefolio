import React from 'react';
import styles from './styles.module.css';
import logo from '$assets/img/logo2.gif';
const CODEFOLIO_TEXT = '<Codefólio />';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.mainLogo}>
        <span className={styles.codefolio}>{CODEFOLIO_TEXT}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.column}>
          <p>Lorem Ipsum</p>
          <p>is simply dummy text</p>
          <p>typesetting industry.</p>
          <p>Lorem Ipsum</p>
        </div>

        <div className={styles.column}>
          <p>Lorem Ipsum</p>
          <p>is simply dummy text</p>
          <p>typesetting industry.</p>
          <p>Lorem Ipsum</p>
        </div>

        <div className={styles.column}>
          <p>Lorem Ipsum</p>
          <p>is simply dummy text</p>
          <p>typesetting industry.</p>
          <p>Lorem Ipsum</p>
        </div>

        <div className={styles.column}>
          <p>Lorem Ipsum</p>
          <p>is simply dummy text</p>
          <p>typesetting industry.</p>
          <p>Lorem Ipsum</p>
        </div>
        
      </div>

      <div className={styles.bottomBar}>
        <p>© 2025 Codefólio Todos os direitos reservados.</p>
        <img src={logo} alt="Codefólio Logo" className={styles.logo} />
      </div>
    </footer>
  );
};

export default Footer;