import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Accordion } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAnchorNavigate } from '../hooks/navigation/useAnchorNavigate';
import { FAQContent } from '../data/FAQContent';
export function FAQPage(props) {
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const tabOpen = params.get('tabOpen');
    const anchorNavigate = useAnchorNavigate();
    useEffect(() => {
        if (tabOpen != null) {
            const element = document.getElementById(tabOpen);
            if (element != null)
                element.scrollIntoView();
        }
    }, [tabOpen]);
    return (_jsx("div", { className: "container", children: _jsxs("div", { className: "faqs-page", children: [_jsx("h1", { className: "page-title", children: "FAQs" }), _jsx("div", { className: "mb-3 border-0", children: _jsx(Accordion, { defaultActiveKey: tabOpen, children: FAQContent.map((faq, index) => {
                            const id = String(index);
                            const eventKey = String(index);
                            const number = index + 1;
                            return (_jsxs(Accordion.Item, { eventKey: eventKey, id: id, children: [_jsxs(Accordion.Header, { children: [_jsxs("span", { className: "faq-number", children: [number, "."] }), faq.question, _jsx("i", { className: "faq-arrow icon icon-caret-down" })] }), _jsx(Accordion.Body, { children: typeof faq.answer === 'function' ? faq.answer(anchorNavigate) : faq.answer })] }, id));
                        }) }) })] }) }));
}
