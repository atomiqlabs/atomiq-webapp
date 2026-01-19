import * as React from "react";
import {
    Button,
    CloseButton,
    Modal
} from "react-bootstrap";
import Icon from "react-icons-kit";
import {info} from 'react-icons-kit/fa/info';
import {useContext, useState} from "react";
import {useAsync} from "../../utils/hooks/useAsync";
import {ISwap} from "@atomiqlabs/sdk";
import {SwapsContext} from "../../swaps/context/SwapsContext";
import {ErrorAlert} from "../../components/ErrorAlert";

export function ClearSwapHistoryModal(props: {
    openRef: React.MutableRefObject<() => void>,
    onFinished: () => void
}) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState<boolean>(false);
    const {swapper} = useContext(SwapsContext);

    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };

    const [clearSwapHistory, clearSwapHistoryLoading, clearSwapHistoryResult, clearSwapHistoryError] = useAsync(async () => {
        const swaps = await swapper.getAllSwaps();
        const swapsByChain: {[chainId: string]: ISwap[]} = {};
        swaps.forEach(swap => {
            (swapsByChain[swap.chainIdentifier] ??= []).push(swap);
        });
        for(let chainId in swapsByChain) {
            const chainSwaps = swapsByChain[chainId];
            await swapper.chains[chainId].unifiedSwapStorage.removeAll(chainSwaps);
        }
        props.onFinished();
        return swaps.length;
    }, [swapper]);

    return (
        <Modal contentClassName="text-white bg-dark" size="sm" centered show={!!openAppModalOpened} onHide={() => setOpenAppModalOpened(false)} dialogClassName="min-width-400px">
            <Modal.Header className="border-0">
                <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                    <Icon icon={info} className="d-flex align-items-center me-2"/> Clear swap history
                    <CloseButton className="ms-auto" variant="white" onClick={() => setOpenAppModalOpened(false)}/>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {clearSwapHistoryResult!=null ? (
                    <p>Successfully removed {clearSwapHistoryResult} swaps!</p>
                ) : (
                    <p>This will completely clear up your swap history from this browser, some purely off-chain data
                        (like lightning network invoices, lnurls) will be completely lost. Only do this if you certainly
                        know what you are doing!</p>
                )}
                {clearSwapHistoryError!=null ? (
                    <ErrorAlert title="Error clearing swap history!" error={clearSwapHistoryError}/>
                ) : ""}
            </Modal.Body>
            <Modal.Footer className="border-0 d-flex">
                {clearSwapHistoryResult ? (
                    <Button variant="secondary" className="flex-grow-1" disabled={clearSwapHistoryLoading}
                            onClick={() => setOpenAppModalOpened(false)}>
                        Exit
                    </Button>
                ) : (
                    <Button variant="primary" className="flex-grow-1" disabled={clearSwapHistoryLoading}
                            onClick={clearSwapHistory}>
                        Understood, clear swap history
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    )
}