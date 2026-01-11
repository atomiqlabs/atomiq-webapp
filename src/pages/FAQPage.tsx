import * as React from 'react';
import { Accordion } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAnchorNavigate } from '../hooks/navigation/useAnchorNavigate';
import { FAQContent } from '../data/FAQContent';

export function FAQPage(props: {}) {
  const { search } = useLocation() as { search: string };
  const params = new URLSearchParams(search);
  const tabOpen = params.get('tabOpen');
  const anchorNavigate = useAnchorNavigate();

  useEffect(() => {
    if (tabOpen != null) {
      setTimeout(() => {
        const element = document.getElementById(tabOpen);
        if (element != null) {
          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementPosition - 100;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [tabOpen]);

  return (
    <div className="container">
      <div className="faqs-page">
        <h1 className="page-title">FAQs</h1>
        <div className="mb-3 border-0">
          <Accordion defaultActiveKey={tabOpen}>
            {FAQContent.map((faq, index) => {
              const number = index + 1;
              const id = String(number);
              const eventKey = String(number);

              return (
                <Accordion.Item eventKey={eventKey} id={id} key={id}>
                  <Accordion.Header>
                    <span className="faq-number">{number}.</span>
                    {faq.question}
                    <i className="faq-arrow icon icon-caret-down"></i>
                  </Accordion.Header>
                  <Accordion.Body>
                    {typeof faq.answer === 'function' ? faq.answer(anchorNavigate) : faq.answer}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
