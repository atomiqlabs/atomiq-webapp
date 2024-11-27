import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Col, Row } from "react-bootstrap";
import Icon from "react-icons-kit";
export function StepByStep(props) {
    const size = 12 / props.steps.length;
    return (_jsx("div", { className: "d-flex flex-column mb-3 tab-accent", children: _jsx(Row, { className: "font-small", children: props.steps.map((step, index) => {
                return (_jsxs(Col, { xs: size, className: "d-flex flex-column " + (step.type === "disabled" ? "text-light text-opacity-50" :
                        step.type === "loading" ? "text-light loading-glow" :
                            step.type === "success" ? "text-success" :
                                "text-danger"), children: [_jsx(Icon, { size: 32, icon: step.icon }), step.text] }, index.toString()));
            }) }) }));
}
