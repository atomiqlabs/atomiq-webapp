import * as React from 'react';
import classNames from 'classnames';

//TODO: Only used for LightningQR, which is also deprecated
interface WalletAddressPreviewProps {
  address: string;
  chainName?: string;
  numberName?: string;
  className?: string;
  onCopy?: () => void;
  showIndicator?: boolean;
}

//TODO: Only used for LightningQR, which is also deprecated
export function WalletAddressPreview(props: WalletAddressPreviewProps) {
  const {
    address,
    chainName,
    className,
    onCopy,
    showIndicator = true,
    numberName = 'wallet address',
  } = props;

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
        <div className="wallet-address-preview__title">
          {chainName} {numberName}
        </div>
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
