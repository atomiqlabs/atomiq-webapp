import * as React from 'react';
import { useNavigate } from 'react-router-dom';

//TODO: Deprecated, no need to have separate component for this, just define
// a mapping between chainId and auditor logos in FEConstants & move this
// directly to SwapNew
export function AuditedBy(props: { chainId?: string }) {
  const navigate = useNavigate();

  return (
    <div className="vetified-by text-light d-flex flex-row align-items-center justify-content-center mb-5">
      <div
        className="cursor-pointer d-flex align-items-center justify-content-center"
        onClick={() => navigate('/faq?tabOpen=6')}
      >
        <div className="icon icon-verified"></div>
        <span className="vetified-by__text">Audited by</span>
        {props.chainId !== 'SOLANA' ? (
          <img src="/csc-white-logo.png" style={{ marginTop: '-0.075rem' }} />
        ) : (
          <img src="/ackee_logo.svg" style={{ marginTop: '-0.125rem' }} />
        )}
      </div>
    </div>
  );
}
