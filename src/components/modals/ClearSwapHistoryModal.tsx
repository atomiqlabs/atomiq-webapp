import * as React from 'react';
import { GenericModal } from '../common/GenericModal';
import { BaseButton } from '../common/BaseButton';
import ValidatedInput from '../ValidatedInput';
import {useContext} from "react";
import {SwapperContext} from "../../context/SwapperContext";
import {useAsync} from "../../hooks/utils/useAsync";
import {ISwap} from "@atomiqlabs/sdk";

export function ClearSwapHistoryModal(props: {
  opened: boolean;
  close: () => void;
}) {
  const {swapper, events} = useContext(SwapperContext);

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
    events.emit("reloadHistory");
    props.close();
    return swaps.length;
  }, [swapper]);

  return (
    <GenericModal
      visible={props.opened}
      size="sm"
      type="warning"
      icon="Notice"
      onClose={() => props.close()}
      title="Warning"
      enableClose={true}
    >
      <p className="sc-text">
        This will completely clear up your swap history from this browser, some purely off-chain data
        (like lightning network invoices, lnurls) will be completely lost. Only do this if you certainly
        know what you are doing!
      </p>
      <BaseButton variant="danger" className="" onClick={clearSwapHistory}>
        Understood, clear swap history
      </BaseButton>
    </GenericModal>
  );
}
