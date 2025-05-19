import {Col, Row} from "react-bootstrap";
import Icon from "react-icons-kit";
import * as React from "react";

export type SingleStep = {
    icon: any,
    text: string,
    type: "disabled" | "loading" | "success" | "failed"
};

export function StepByStep(props: {
    steps: SingleStep[]
}) {
    const size = 12 / props.steps.length;

    return (
        <div className="d-flex flex-column mb-3 tab-accent">
            <Row className="font-small">
                {props.steps.map((step, index) => {
                    return (
                        <Col xs={size} className={"d-flex flex-column "+(
                            step.type==="disabled" ? "text-light text-opacity-50" :
                            step.type==="loading" ? "text-light loading-glow" :
                            step.type==="success" ? "text-success" :
                                "text-danger"
                        )} key={index.toString()}>
                            <Icon size={32} icon={step.icon}/>
                            {step.text}
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
}
