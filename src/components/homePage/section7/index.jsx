import React, { useState } from 'react';
import styles from './styles.module.css';

const Section7 = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: "Lorem ipsum dolor sit amet, consectetur adipiscing elit?",
      answer: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
    },
    {
      question: "Duis aute irure dolor in reprehenderit?", 
      answer: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem."
    },
    {
      question: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur?",
      answer: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore."
    },
    {
      question: "Quis autem vel eum iure reprehenderit qui in ea?",
      answer: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi."
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <h2 className={styles.title}>
            <span className={styles.icon}>✦</span> FAQs
          </h2>
          
          <div className={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <button 
                  className={styles.faqButton}
                  onClick={() => toggleFaq(index)}
                >
                  <span 
                    style={{transition: 'color 0.3s ease'}} 
                    className={`${styles.faqQuestion} ${openFaq === index ? styles.faqQuestionOpen : ''}`}
                  >
                    {faq.question}
                  </span>
                  <span className={styles.toggleIcon}>
                    {openFaq === index ? '−' : '+'}
                  </span>
                </button>
                {openFaq === index && (
                  <div className={styles.faqAnswer}>
                    <span className={styles.faqAnswerText}>
                      {faq.answer}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section7;