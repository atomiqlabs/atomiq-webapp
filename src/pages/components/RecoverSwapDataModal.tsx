import * as React from "react";
import {
    Button,
    CloseButton,
    Modal
} from "react-bootstrap";
import Icon from "react-icons-kit";
import {info} from 'react-icons-kit/fa/info';
import {useContext, useMemo, useState} from "react";
import {useAsync} from "../../utils/hooks/useAsync";
import {ISwap, SwapType, ToBTCLNSwap, ToBTCSwap} from "@atomiqlabs/sdk";
import {SwapsContext} from "../../swaps/context/SwapsContext";
import {ErrorAlert} from "../../components/ErrorAlert";
import {ChainWalletData} from "../../wallets/ChainDataProvider";
import {ChainDataContext} from "../../wallets/context/ChainDataContext";

export function RecoverSwapDataModal(props: {
    openRef: React.MutableRefObject<() => void>,
    onFinished: () => void
}) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState<boolean>(false);
    const {swapper} = useContext(SwapsContext);
    const chains = useContext(ChainDataContext);

    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };

    const [recoverPastSwaps, recoverPastSwapsLoading, recoveredPastSwaps, recoverPastSwapsError] = useAsync(async () => {
        const totalSwaps: ISwap[] = [];
        const supportedSmartChains = swapper.getSmartChains();
        for(let chainId in chains) {
            if(!supportedSmartChains.includes(chainId)) continue;
            const chainData: ChainWalletData<any> = chains[chainId];
            if(chainData?.wallet?.address==null) continue;
            try {
                console.log(`Recovering swaps for ${chainId}, with user's address: ${chainData.wallet.address}`);
                const chainSwaps = await swapper.recoverSwaps(chainId, chainData.wallet.address);
                console.log(`Found ${chainSwaps.length} swaps on ${chainId}`);
                totalSwaps.push(...chainSwaps);
            } catch (e) {
                if(e?.message?.startsWith?.("Historical swap recovery is not supported")) continue;
                throw e;
            }
        }
        props.onFinished();
        return totalSwaps;
    }, [chains, swapper, props.onFinished]);

    const recoveredRefundableSwaps: ToBTCSwap[] = useMemo(() => {
        if(recoveredPastSwaps==null) return [];
        return recoveredPastSwaps
            .filter(swap => swap.getType()===SwapType.TO_BTCLN && (swap as ToBTCLNSwap).isRefundable()) as ToBTCSwap[];
    }, [recoveredPastSwaps]);

    const [refundPastSwaps, refundPastSwapsLoading, refundPastSwapsResult, refundPastSwapsError] = useAsync(async () => {
        let counter = 0;
        for(let swap of recoveredRefundableSwaps) {
            if(!swap.isRefundable()) continue;
            const chainData: ChainWalletData<any> = chains[swap.chainIdentifier];
            if(chainData==null || chainData.wallet==null) continue;
            await swap.refund(chainData.wallet.instance);
            counter++;
        }
        return counter;
    }, [chains, swapper, recoveredRefundableSwaps]);

    return (
        <Modal contentClassName="text-white bg-dark" size="sm" centered show={!!openAppModalOpened} onHide={() => setOpenAppModalOpened(false)} dialogClassName="min-width-400px">
            <Modal.Header className="border-0">
                <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                    <Icon icon={info} className="d-flex align-items-center me-2"/> Recover swap data
                    <CloseButton className="ms-auto" variant="white" onClick={() => setOpenAppModalOpened(false)}/>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {recoveredPastSwaps!=null ? (
                    <>
                        <p>Successfully recovered {recoveredPastSwaps.length} swaps!</p>
                        {recoveredRefundableSwaps?.length>0
                            ? <p>Found {recoveredRefundableSwaps.length} refundable swaps, you can refund them all by clicking the refund button below!</p>
                            : ""}
                    </>
                ) : recoverPastSwapsLoading ? (
                    <p>Rescanning chains for swap data...</p>
                ) : (
                    <p>This functionality allows you to recover your swaps from on-chain data, in case you've lost them,
                        their state got corrupted or for other reasons. Make sure the relevant wallet which initiated
                        the swaps is connected to the webapp. This might take a few minutes as it rescans the
                        blockchain!</p>
                )}
                {refundPastSwapsResult!=null ? (
                    <p>Succesfully refunded {refundPastSwapsResult} swaps!</p>
                ) : ""}
                {recoverPastSwapsError != null ? (
                    <ErrorAlert title="Error recovering swaps!" error={recoverPastSwapsError}/>
                ) : ""}
                {refundPastSwapsError != null ? (
                    <ErrorAlert title="Error refunding swaps!" error={refundPastSwapsError}/>
                ) : ""}
            </Modal.Body>
            <Modal.Footer className="border-0 d-flex">
                {recoveredRefundableSwaps?.length>0 ? (
                    <Button variant="primary" className="flex-grow-1" disabled={refundPastSwapsLoading} onClick={refundPastSwaps}>
                        Refund
                    </Button>
                ) : recoveredPastSwaps!=null ? (
                    <Button variant="secondary" className="flex-grow-1" onClick={() => setOpenAppModalOpened(false)}>
                        Exit
                    </Button>
                ) : (
                    <Button variant="primary" className="flex-grow-1" disabled={recoverPastSwapsLoading}
                            onClick={recoverPastSwaps}>
                        Begin recovery
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    )
}