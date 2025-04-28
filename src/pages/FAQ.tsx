import * as React from "react";
import {Accordion} from "react-bootstrap";
import {useLocation} from "react-router-dom";
import {useEffect} from "react";
import {useAnchorNavigate} from "../utils/hooks/useAnchorNavigate";


export function FAQ(props: {}) {

    const {search} = useLocation() as {search: string};
    const params = new URLSearchParams(search);
    const tabOpen = params.get("tabOpen");
    const anchorNavigate = useAnchorNavigate();

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
                    <Accordion.Item eventKey="0" id="0">
                        <Accordion.Header><span className="faq-number">1</span>What is atomiq.exchange?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                <strong>atomiq.exchange</strong> is a fully trustless cross-chain DEX (decentralized exchange) allowing you to swap between
                                Solana & Starknet assets and Bitcoin (on-chain and on the lightning network). All swaps are done atomically, so you
                                are never exposed to the risk of losing funds.
                            </p>

                            <p>
                                atomiq.exchange was launched in mid June 2023, by a team of blockchain veterans to provide the first fully trustless way
                                to swap between Solana & Bitcoin ecosystems, we've since expanded our support to Starknet in April of 2025.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="2" id="2">
                        <Accordion.Header><span className="faq-number">2</span>How does it work?</Accordion.Header>
                        <Accordion.Body>
                            <h4>Connect your Solana or Starknet wallet and Bitcoin wallet</h4>
                            <p>
                                In order to interact with atomiq.exchange webapp, you need a Solana or Starknet wallet and a Bitcoin wallet. In case you don't have any wallet yet we recommend downloading:
                                <ul>
                                    <li><a target="_blank" href="https://phantom.app/">Phantom wallet</a> - works with both Solana & Bitcoin</li>
                                    <li><a target="_blank" href="https://www.xverse.app/">Xverse wallet</a> - works with Bitcoin only</li>
                                    <li><a target="_blank" href="https://braavos.app/">Braavos wallet</a> - works with Starknet only</li>
                                </ul>
                            </p>
                            <p>
                                Connect your wallets by clicking on "Connect" when prompted.
                            </p>

                            <h4>Paying to a bitcoin/lightning qr code (Scan function)</h4>
                            <p>
                                If you are presented with a Bitcoin/Lightning network QR code and want to initiate a Solana/Starknet -&gt; Bitcoin swap:
                                <ol>
                                    <li>Select the <a href="/scan" onClick={anchorNavigate}>"Scan" function</a> & allow the use of camera by the browser</li>
                                    <li>Scan the QR code</li>
                                    <li>Select the Solana/Starknet asset you want use for the payment payment</li>
                                    <li>You are presented with the quote, summarizing swap amount & fees, click "Pay" to approve</li>
                                    <li>You will be prompted to approve the transaction in your wallet, approve it there</li>
                                    <li>In a few seconds the swap will be executed</li>
                                </ol>
                            </p>

                            <h4>Swapping Solana/Starknet -&gt; Bitcoin (Swap function)</h4>
                            <p>
                                You can seamlessly swap Solana and Starknet assets to Bitcoin (on-chain and lightning):
                                <ol>
                                    <li>Select the <a href="/" onClick={anchorNavigate}>"Swap" function</a></li>
                                    <li>Select the desired input asset - you can click on the arrow to reverse asset selection</li>
                                    <li>Fill in the amount you want to send/receive</li>
                                    <li>Copy in the bitcoin/lightning network address where you want to receive your BTC to the address field</li>
                                    <li>You are presented with the quote, summarizing the swap amount & fees, click "Swap" to approve</li>
                                    <li>You will be prompted to approve the transaction in your wallet, approve it there</li>
                                    <li>In a few seconds the swap will be executed</li>
                                </ol>
                            </p>

                            <h4>Swapping Bitcoin -&gt; Solana/Starknet (Swap function)</h4>
                            <p>
                                Seamlessly swapping Bitcoin (on-chain and lightning) to Solana assets (like SOL and USDC):
                                <ol>
                                    <li>Select the <a href="/" onClick={anchorNavigate}>"Swap" function</a></li>
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
                        <Accordion.Header><span className="faq-number">3</span>Do I have to trust anyone?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                The whole swap is fully trustless and atomic, therefore you are not trusting anyone with the swap funds.
                            </p>

                            <p>
                                This means that your trade counterparty can only take the swap funds once it processes the swap (e.g. pay you out in BTC for Solana/Starknet -&gt; Bitcoin swaps, or pay you out in Solana/Starknet asset for Bitcoin -&gt; Solana/Starknet swaps)
                                - this is ensured by using Submarine swaps and Proof-time locked contracts.
                            </p>

                            <p>
                                In case the counterparty don't cooperate you can claim the full amount back in a short while (5 days for lightning network swaps & 1 day for on-chain swaps) - this is ensured by smart contracts on Solana & Starknet.
                            </p>

                            <p>
                                Additionally all our code is open source and available on github for anyone to see. This includes
                                smart contracts (<a href="https://github.com/atomiqlabs/atomiq-contracts-solana" target="_blank">Solana contracts</a>, <a href="https://github.com/atomiqlabs/atomiq-contracts-starknet" target="_blank">Starknet contracts</a>), <a href="https://github.com/atomiqlabs/atomiq-sdk" target="_blank">SDK</a>, <a href="https://github.com/atomiqlabs/atomiq-lp" target="_blank">swap LP</a> & also <a href="https://github.com/atomiqlabs/atomiq-webapp" target="_blank">this webapp</a>.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="3" id="3">
                        <Accordion.Header><span className="faq-number">4</span>Why should you use atomiq.exchange?</Accordion.Header>
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
                        <Accordion.Header><span className="faq-number">5</span>Where can I learn more?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                We have an extensive documentation about how our whole system works, if you'd like to dive deeper you can check out our <a target="_blank" href="https://docs.atomiq.exchange/">GitBook</a>.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="11" id="11">
                        <Accordion.Header><span className="faq-number">6</span>What is swap for gas?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                For our swaps to work in a fully trustless way the user needs to be able to cover the gas/transaction fees on Solana.
                                This means that new Solana users with 0 SOL balance were unable to use atomiq, even for BTC -&gt; SOL swaps - to solve this we run a trusted <b>swap for gas</b> service, allowing users to swap small amounts of BTC (lightning network) to SOL,
                                allowing them to then trustlessly use atomiq, even when starting with 0 SOL balance.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="5" id="5">
                        <Accordion.Header><span className="faq-number">7</span>Where can I reach you?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                In case you have any questions or issues feel free to write to <a target="_blank" href="https://t.me/atomiq_support">our official telegram support</a>.
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="6" id="6">
                        <Accordion.Header><span className="faq-number">8</span>Are you audited?</Accordion.Header>
                        <Accordion.Body>
                            <p>
                                Our smart contracts were audited by independent security auditors:
                                <ul>
                                    <li>Solana smart contracts - <a target="_blank" href="https://ackeeblockchain.com/">Ackee Blockchain Security a.s.</a>, full audit report is publicly available here (audited under our old SolLightning name): <a target="_blank" href="https://github.com/atomiqlabs/atomiq-readme/blob/main/ackee-blockchain-solana_svm-sollightning-audit.pdf">Ackee Blockchain, SolLightning: Security Audit, 12.1.2024</a></li>
                                    <li>Starknet smart contracts - <a target="_blank" href="https://cairosecurityclan.com/">Cairo Security Clan</a>, full audit report is publicly available here: <a target="_blank" href="https://github.com/atomiqlabs/atomiq-readme/blob/main/csc-starknet_cairo-atomiq-audit.pdf">Cairo Security Clan, Atomiq Exchange: Security Review, 7.4.2025</a></li>
                                </ul>
                            </p>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            </div>
        </div>
    );
}