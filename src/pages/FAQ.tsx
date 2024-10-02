import * as React from "react";
import {Accordion, Card} from "react-bootstrap";
import {useLocation} from "react-router-dom";
import {useEffect} from "react";


export function FAQ(props: {}) {

    const {search} = useLocation() as {search: string};
    const params = new URLSearchParams(search);
    const tabOpen = params.get("tabOpen");

    useEffect(() => {
        if(tabOpen!=null) {
            const element = document.getElementById(tabOpen);
            if(element!=null) element.scrollIntoView();
        }
    }, [tabOpen]);

    return (
        <div className="flex-fill text-white container mt-5 text-start">
            <h1 className="section-title">FAQ</h1>
            <div className="mb-3 border-0">
                <Accordion defaultActiveKey={tabOpen}>
                    <Accordion.Item eventKey="10" id="10">
                        <Accordion.Header><span className="faq-number">1</span>Where is SolLightning?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                We've rebranded SolLightning to <strong>atomiq.exchange</strong> as it better represents our product, and doesn't
                                convey false information that we only support bitcoin lightning. The name atomiq refers to atomic swaps, which are our core
                                differentiator and allow us to secure our swaps by cryptography and bitcoin's proof-of-work. This is in stark contrast
                                to cross-chain bridges, which generally use a federation of validators and their security heavily depends on bridge token's price.
                            </p>

                            <p>
                                We will continue providing seamless & trustless swap experience under new name - <strong>atomiq.exchange</strong>!
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="0" id="0">
                        <Accordion.Header><span className="faq-number">2</span>What is atomiq.exchange?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                <strong>atomiq.exchange</strong> is a fully trustless cross-chain DEX (decentralized exchange) allowing you to swap between
                                Solana assets (SOL and USDC) and Bitcoin (on-chain and on the lightning network). All swaps are done atomically, so you
                                are never exposed to the risk of losing funds.
                            </p>

                            <p>
                                atomiq.exchange was launched in mid June 2023, by a team of blockchain veterans to provide the first fully trustless way
                                to swap between Solana & Bitcoin ecosystems.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="2" id="2">
                        <Accordion.Header><span className="faq-number">3</span>How does it work?</Accordion.Header>
                        <Accordion.Body>
                            <h4>Connect your Solana wallet</h4>
                            <p>
                                In order to interact with atomiq.exchange webapp, you need a Solana wallet. In case you don't have a Solana wallet yet we recommend downloading <a target="_blank" href="https://phantom.app/">Phantom wallet</a>, which is best compatible with our webapp.
                            </p>
                            <p>
                                Connect your Solana wallet by clicking on "Connect" when prompted.
                            </p>

                            <h4>Paying to a bitcoin/lightning qr code (Scan function)</h4>
                            <p>
                                If you are presented with a Bitcoin/Lightning network QR code and want to initiate a Solana -&gt; Bitcoin swap:
                                <ol>
                                    <li>Select the <a href="/scan">"Scan" function</a> & allow the use of camera by the browser</li>
                                    <li>Scan the QR code</li>
                                    <li>Select the Solana asset you want use for the payment payment (SOL or USDC)</li>
                                    <li>You are presented with the quote, summarizing swap amount & fees, click "Pay" to approve</li>
                                    <li>You will be prompted to approve the transaction in your wallet, approve it there</li>
                                    <li>In a few seconds the swap will be executed</li>
                                </ol>
                            </p>

                            <h4>Swapping Solana -&gt; Bitcoin (Swap function)</h4>
                            <p>
                                You can seamlessly swap Solana assets (like SOL and USDC) to Bitcoin (on-chain and lightning):
                                <ol>
                                    <li>Select the <a href="/scan">"Swap" function</a></li>
                                    <li>Select the desired input asset (USDC or SOL) - you can click on the arrow to reverse asset selection</li>
                                    <li>Fill in the amount you want to send/receive</li>
                                    <li>Copy in the bitcoin/lightning network address where you want to receive your BTC to the address field</li>
                                    <li>You are presented with the quote, summarizing the swap amount & fees, click "Swap" to approve</li>
                                    <li>You will be prompted to approve the transaction in your wallet, approve it there</li>
                                    <li>In a few seconds the swap will be executed</li>
                                </ol>
                            </p>

                            <h4>Swapping Bitcoin -&gt; Solana (Swap function)</h4>
                            <p>
                                Seamlessly swapping Bitcoin (on-chain and lightning) to Solana assets (like SOL and USDC):
                                <ol>
                                    <li>Select the <a href="/scan">"Swap" function</a></li>
                                    <li>Select the desired input asset (bitcoin on-chain or lightning) and output asset (SOL or USDC) - you can click on the arrow to reverse asset selection</li>
                                    <li>Fill in the amount you want to send/receive</li>
                                    <li>(new solana wallets only) In case you have 0 SOL balance, you will be prompted to use the swap for gas feature first (this for now only accepts bitcoin lightning), so you can then cover the transaction fee for a trustless swap</li>
                                    <li>You are presented with the quote, summarizing the swap amount & fees, click "Swap" to initiate it</li>
                                    <li>(on-chain only) You will be prompted to approve the transaction in your wallet, approve it there</li>
                                    <li>Send a BTC payment from a BTC wallet to generated bitcoin/lightning network address</li>
                                    <li>(lightning only) Approve/Claim the payment once it arrives</li>
                                    <li>(on-chain only) On-chain payment will be automatically claimed for you once it reaches required confirmations</li>
                                </ol>
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="1" id="1">
                        <Accordion.Header><span className="faq-number">4</span>Do I have to trust anyone?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                The whole swap is fully trustless and atomic, therefore you are not trusting anyone with the swap funds.
                            </p>

                            <p>
                                This means that your trade counterparty can only take the swap funds once it processes the swap (e.g. pay you out in BTC for Solana -&gt; Bitcoin swaps, or pay you out in Solana asset for Bitcoin -&gt; Solana swaps)
                                - this is ensured by using Submarine swaps and Proof-time locked contracts.
                            </p>

                            <p>
                                In case the counterparty don't cooperate you can claim the full amount back in a short while (5 days for lightning network swaps & 1 day for on-chain swaps) - this is ensured by smart contract on Solana.
                            </p>

                            <p>
                                Additionally all our code is open source and available on github for anyone to see. This includes
                                smart contracts (<a href="https://github.com/adambor/SolLightning-program" target="_blank">swap contract</a>, <a href="https://github.com/adambor/BTCRelay-Sol" target="_blank">bitcoin light client</a>), <a href="https://github.com/adambor/SolLightning-sdk" target="_blank">SDK</a>, <a href="https://github.com/adambor/SolLightning-Intermediary-TS" target="_blank">swap intermediary</a> & also <a href="https://github.com/adambor/SolLightning-dApp-v2" target="_blank">this webapp</a>.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="3" id="3">
                        <Accordion.Header><span className="faq-number">5</span>Why should you use atomiq.exchange?</Accordion.Header>
                        <Accordion.Body>
                            <h4>
                                1. No counterparty risk
                            </h4>
                            <p>
                                You don't have to trust anyone with your swap, if the counterparty doesn't cooperate the smart contract makes sure you get the funds back.
                                This is in stark contrast to centralized exchanges where you have to fully trust the exchange to not run away with your funds!
                            </p>

                            <h4>
                                2. Hassle free swapping
                            </h4>
                            <p>
                                No need for multiple steps like sending funds to an exchange, waiting for confirmations, making the trade, withdrawing the funds...
                                With us you simply create the swap, send in the money directly from your wallet and receive it directly in your other wallet.
                            </p>

                            <h4>
                                3. Best pricing
                            </h4>
                            <p>
                                Our diverse network of market makers makes sure you always get the best pricing possible for the volume you are swapping!
                            </p>

                            <h4>
                                4. Low fees
                            </h4>
                            <p>
                                A competitive network of market makers is always trying to give you the best possible fee, unlike with AMMs like uniswap,
                                every market maker chooses its own fee creating a dynamic market that makes sure you always get the lowest possible fee on the market.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="4" id="4">
                        <Accordion.Header><span className="faq-number">6</span>Where can I learn more?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                We have an extensive documentation about how our whole system works, if you'd like to dive deeper you can check out our <a target="_blank" href="https://github.com/adambor/SolLightning-readme">github</a>.
                            </p>
                            <p>
                                You can also specifically read about how we handle <a target="_blank" href="https://github.com/adambor/SolLightning-readme/blob/main/sol-submarine-swaps.md">lightning network swaps (submarine swaps)</a> & <a target="_blank" href="https://github.com/adambor/SolLightning-readme/blob/main/sol-onchain-swaps.md">bitcoin on-chain swaps (proof-time locked contracts)</a>
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="11" id="11">
                        <Accordion.Header><span className="faq-number">7</span>What is swap for gas?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                For our swaps to work in a fully trustless way the user needs to be able to cover the gas/transaction fees on Solana.
                                This means that new Solana users with 0 SOL balance were unable to use atomiq, even for BTC -&gt; SOL swaps - to solve this we run a trusted <b>swap for gas</b> service, allowing users to swap small amounts of BTC (lightning network) to SOL,
                                allowing them to then trustlessly use atomiq, even when starting with 0 SOL balance.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="5" id="5">
                        <Accordion.Header><span className="faq-number">8</span>Where can I reach you?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                In case you have any questions or issues feel free to bring them up in our <a target="_blank" href="https://t.me/+_MQNtlBXQ2Q1MGEy">Telegram group</a>
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="6" id="6">
                        <Accordion.Header><span className="faq-number">9</span>Are you audited?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                Our smart contracts were audited by an independent security auditor <a target="_blank" href="https://ackeeblockchain.com/">Ackee Blockchain Security a.s.</a>, which found no exploitable issues in atomiq's (previously SolLightning's) smart contracts, full audit report is publicly available here: <a target="_blank" href="https://github.com/adambor/SolLightning-readme/blob/main/audits/ackee-blockchain-sollightning-report.pdf">Ackee Blockchain, SolLightning: Security Audit, 12.1.2024</a>
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            </div>
        </div>
    );
}