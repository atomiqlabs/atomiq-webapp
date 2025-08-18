import { Button } from 'react-bootstrap';
import { useContext } from 'react';
import { ChainDataContext } from './context/ChainDataContext';
import { ChainWalletData } from './ChainDataProvider';
import { BaseButton } from '../components/BaseButton';

export function ButtonWithWallet(props: {
  chainId: string;
  requiredWalletAddress?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'smaller' | 'small' | 'large' | 'lg' | 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'info';
  children?: (JSX.Element | string) | (JSX.Element | string)[];
  className?: string;
}) {
  const chainData = useContext(ChainDataContext);
  const requestedChain: ChainWalletData<any> = chainData[props.chainId];
  const isWalletConnected = requestedChain?.wallet != null;
  const isCorrectWalletConnected =
    props.requiredWalletAddress == null ||
    requestedChain?.wallet?.address === props.requiredWalletAddress;

  return (
    <BaseButton
      onClick={() => {
        if (requestedChain != null && !isWalletConnected) {
          requestedChain.connect();
        } else {
          props.onClick();
        }
      }}
      disabled={(isWalletConnected && !isCorrectWalletConnected) || props.disabled}
      size={props.size}
      variant="primary"
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
