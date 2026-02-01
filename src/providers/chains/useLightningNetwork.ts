import {useCallback, useEffect, useMemo, useState} from 'react';
import { requestProvider, WebLNProvider } from 'webln';
import { Chain } from '../ChainsProvider';
import {isBtcToken, LNURLWithdraw, Token} from "@atomiqlabs/sdk";
import {truncateAddress} from "../../utils/Utils";
import {useLocation} from "react-router-dom";

const wallets = [{
  name: 'WebLN',
  icon: '/wallets/WebLN.png',
  downloadLink: 'https://www.webln.dev/',
  detect: () => (window as any)?.webln != null,
  connect: () => requestProvider()
}];

export function useLightningNetwork(enabled: boolean): Chain<WebLNProvider> {
  const [wallet, setWallet] = useState<Chain<WebLNProvider>["wallet"]>();

  const connect = useCallback(async (walletName: string, lnurl?: LNURLWithdraw) => {
    const wallet = wallets.find(w => w.name===walletName);
    if(wallet!=null) {
      setWallet({
        name: wallet.name,
        icon: wallet.icon,
        instance: await wallet.connect(),
      });
    } else {
      if(walletName==="LNURL" && lnurl!=null) {
        //Connect LNURL-withdrawal pseudo-wallet
        setWallet({
          name: truncateAddress(lnurl.params.url),
          icon: '/wallets/WebLN.png', //TODO: Use different icon for LNURLs
          getSwapLimits: (input: boolean, token: Token) => {
            if(!input || !isBtcToken(token) || !token.lightning) return null;
            return {
              min: lnurl.min,
              max: lnurl.max
            }
          },
          onlyInput: true,
          instance: {
            _lnurl: lnurl
          }
        });
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
  }, []);

  const { search, pathname } = useLocation();
  const [wasInSwap, setWasInSwap] = useState<boolean>(false);

  useEffect(() => {
    if(wallet==null) return;
    if(wallets.find(val => val.name===wallet.name)!=null) return;
    if(pathname!=="/") {
      disconnect();
      return;
    }
    const params = new URLSearchParams(search);
    const swapId = params.get('swapId');
    console.log("useLightningNetwork(): "+pathname);
    if(swapId!=null) {
      setWasInSwap(true);
    } else {
      if(wasInSwap) disconnect();
      setWasInSwap(false);
    }
  }, [search, wallet, wasInSwap, pathname]);

  return useMemo(
    () => {
      if(!enabled) null;
      const installedWallets = wallets
        .filter(val => val.detect());
      return {
          chain: {
            name: 'Lightning',
            icon: '/icons/chains/LIGHTNING.svg',
          },
          wallet,
          installedWallets: installedWallets
            .map(val => ({...val, isConnected: wallet?.name===val.name})),
          nonInstalledWallets: wallets
            .filter(val => !val.detect()),
          chainId: 'LIGHTNING',
          _connectWallet: connect,
          _disconnect: wallet != null ? disconnect : null,
          hasWallets: installedWallets.length>0,
        }
    },
    [wallet, connect, disconnect]
  );
}
