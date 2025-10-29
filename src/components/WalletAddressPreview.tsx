import * as React from 'react';
import classNames from 'classnames';

interface WalletAddressPreviewProps {
  address: string;
  chainName?: string;
  className?: string;
  onCopy?: () => void;
  showIndicator?: boolean;
}

export function WalletAddressPreview(props: WalletAddressPreviewProps) {
  const { address, chainName, className, onCopy, showIndicator = true } = props;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    if (onCopy) {
      onCopy();
    }
  };

  const componentClassName = classNames('wallet-address-preview', className);

  return (
    <div className={componentClassName}>
      <div className="wallet-address-preview__content">
        <div className="wallet-address-preview__title">{chainName} wallet address</div>
        <div className="wallet-address-preview__address">
          <div className="sc-text">{address}</div>
          {showIndicator && <div className="wallet-address-preview__indicator"></div>}
        </div>
      </div>
      <div className="wallet-address-preview__action" onClick={handleCopy}>
        <div className="icon icon-copy"></div>
      </div>
    </div>
  );
}
