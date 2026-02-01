import { useContext } from 'react';
import { ChainsContext } from '../../context/ChainsContext';
import { Chain } from '../../providers/ChainsProvider';
import { BaseButton, BaseButtonVariantProps } from '../common/BaseButton';
import {useWallet} from "../../hooks/wallets/useWallet";

export function ButtonWithWallet(props: {
  chainId: string;
  requiredWalletAddress?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'smaller' | 'small' | 'large' | 'lg' | 'sm' | 'md';
  variant?: BaseButtonVariantProps;
  children?: (JSX.Element | string) | (JSX.Element | string)[];
  className?: string;
}) {
  const chainData = useContext(ChainsContext);
  const requestedChainWallet = useWallet(props.chainId);
  const isWalletConnected = requestedChainWallet != null;
  const isCorrectWalletConnected =
    props.requiredWalletAddress == null ||
    requestedChainWallet?.address === props.requiredWalletAddress;

  return (
    <BaseButton
      onClick={() => {
        if (!isWalletConnected) {
          chainData.connectWallet(props.chainId);
        } else {
          props.onClick();
        }
      }}
      disabled={(isWalletConnected && !isCorrectWalletConnected) || props.disabled}
      size={props.size}
      variant={props.variant || 'primary'}
      className={props.className}
    >
      {!isWalletConnected
        ? 'Connect ' +
          props.chainId.charAt(0) +
          props.chainId.substring(1).toLowerCase() +
          ' wallet'
        : !isCorrectWalletConnected
          ? 'Invalid wallet connected'
          : props.children}
    </BaseButton>
  );
}
