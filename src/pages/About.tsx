import * as React from "react";
import {Card, Col, Row} from "react-bootstrap";
import {useAnchorNavigate} from "../utils/useAnchorNavigate";

export function About(props: {}) {

    const navigateHref = useAnchorNavigate();

    return (
        <div className="flex-fill text-white container mt-5 text-start">
            <h1 className="section-title">About us</h1>
            <Card className="px-3 pt-3 bg-dark bg-opacity-25 mb-3 border-0">
                <h3>Trustless cross-chain solution</h3>
                <p>
                    <strong>atomiq.exchange</strong> (formerly SolLightning) is a fully trustless cross-chain DEX (decentralized exchange) allowing you to swap between
                    Solana assets (SOL and USDC) and Bitcoin (on-chain and on the lightning network). All swaps are done atomically, so you
                    are never exposed to the risk of losing funds.
                </p>
                <p>
                    We envision a future free from centralized exchanges, where you are always in control of your funds!
                </p>
            </Card>
            <h1 className="section-title mt-5">Advantages</h1>
            <Row>
                <Col xs={12} lg={4} className="pb-3">
                    <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                        <h3>Fully open-source</h3>
                        <p>
                            <strong>atomiq.exchange</strong> is being build on the principles of OSS and is fully open source (even including this very webapp)! You can review all our code on <a target="_blank" href="https://github.com/adambor/SolLightning-readme">github</a>.
                        </p>
                    </Card>
                </Col>
                <Col xs={12} lg={4} className="pb-3">
                    <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                        <h3>Secure</h3>
                        <p>
                            <strong>atomiq.exchange</strong> is secured by Bitcoin light client (leveraging bitcoin's proof-of-work) & atomic swaps.
                            Our smart contracts are <a onClick={navigateHref} href="/faq?tabOpen=6">fully audited by Ackee Blockchain</a> and are immutably deployed on Solana (with no upgrade authority).
                        </p>
                    </Card>
                </Col>
                <Col xs={12} lg={4} className="pb-3">
                    <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                        <h3>Lightning fast</h3>
                        <p>
                            With Solana & Bitcoin lightning network supported, you can use <strong>atomiq.exchange</strong> to swap between Solana assets (SOL or USDC) and native bitcoin in seconds! Say goodbye to slow bitcoin on-chain transfers.
                        </p>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}