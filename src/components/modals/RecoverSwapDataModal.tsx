import * as React from 'react';
import { GenericModal } from '../common/GenericModal';
import { BaseButton } from '../common/BaseButton';
import {useContext, useEffect, useMemo} from "react";
import {SwapperContext} from "../../context/SwapperContext";
import {ChainsContext} from "../../context/ChainsContext";
import {Chain} from "../../providers/ChainsProvider";
import { ISwap } from '@atomiqlabs/sdk';
import { useAsync } from '../../hooks/utils/useAsync';
import {Spinner} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {SwapStepAlert} from "../swaps/SwapStepAlert";
import { ic_warning } from 'react-icons-kit/md/ic_warning';

export function RecoverSwapDataModal(props: {
  opened: boolean;
  close: (recovered: boolean) => void;
}) {
  const navigate = useNavigate();
  const {swapper, events} = useContext(SwapperContext);
  const {chains} = useContext(ChainsContext);

  const [recoverPastSwaps, recoverPastSwapsLoading, recoveredPastSwaps, recoverPastSwapsError] = useAsync(async (skip?: boolean) => {
    if(skip) return null;
    const totalSwaps: ISwap[] = [];
    const supportedSmartChains = swapper.getSmartChains();
    for(let chainId in chains) {
      if(!supportedSmartChains.includes(chainId)) continue;
      const chainData: Chain<any> = chains[chainId];
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
    events.emit("reloadHistory");
    return totalSwaps;
  }, [chains, swapper]);

  const swapsRequiringAction: ISwap[] = useMemo(() => {
    if(recoveredPastSwaps==null) return [];
    return recoveredPastSwaps
      .filter(swap => swap.requiresAction());
  }, [recoveredPastSwaps]);

  useEffect(() => {
    if(!props.opened) recoverPastSwaps(true);
  }, [props.opened]);

  return (
    <GenericModal
      visible={props.opened}
      size="sm"
      type="notice"
      onClose={() => props.close(false)}
      title="Recover swap data"
      enableClose={true}
    >
      {recoverPastSwapsError!=null ? (
        <SwapStepAlert
          className="w-100"
          show={!!recoverPastSwapsError}
          type="error"
          icon={ic_warning}
          title="Swap recovery error"
          error={recoverPastSwapsError}
          action={{
            type: 'button',
            text: 'Retry',
            onClick: () => recoverPastSwaps(),
          }}
        />
      ) : recoveredPastSwaps==null ? (
        <>
          <div className="sc-text">
            <p>
              This functionality allows you to recover your swaps from on-chain data, in case you've lost them,
              their state got corrupted or for other reasons. Make sure the <strong>relevant wallet</strong> which
              initiated
              the swaps is <strong>connected to the webapp</strong>. This might take a few minutes as it rescans the
              blockchain!
            </p>
            <p className="text-start">
              Addresses to be re-scanned:
            </p>
            {swapper?.getSmartChains().map(chainId => chains[chainId]).filter(val => val.wallet != null).map((chain: Chain<any>) => (
              <div className="flex flex-row" key={chain.chainId}>
                <div className="swap-steps__address">
                  <div>
                    {chain.chain.name ?? ''}{' '}
                  </div>
                  <div>{`${chain.wallet.address.slice(0, 8)}...${chain.wallet.address.slice(-8)}`}</div>
                </div>
              </div>
            ))}
          </div>

          <BaseButton variant="secondary" className="" onClick={() => recoverPastSwaps()}
                      disabled={recoverPastSwapsLoading}>
            {recoverPastSwapsLoading && <Spinner animation="border" size="sm" className="mr-2"/>}
            {recoverPastSwapsLoading ? "Recovering..." : "Begin recovery"}
          </BaseButton>
        </>
      ) : (
        <>
          <p className="sc-text">
            Successfully recovered {recoveredPastSwaps.length} swaps, of which {swapsRequiringAction.length} swaps
            require
            an action from the user (either refund or claim). Check the swaps in the history page!
          </p>
          <BaseButton variant="secondary" className="" onClick={() => {
            navigate("/history");
            props.close(true);
          }}>
            View swap history
          </BaseButton>
        </>
      )}
    </GenericModal>
  );
}
