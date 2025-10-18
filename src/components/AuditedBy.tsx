import * as React from 'react';
import { useNavigate } from 'react-router-dom';

export function AuditedBy(props: { chainId?: string }) {
  const navigate = useNavigate();

  return (
    <div className="vetified-by text-light d-flex flex-row align-items-center justify-content-center mb-3">
      <div
        className="cursor-pointer d-flex align-items-center justify-content-center"
        onClick={() => navigate('/faq?tabOpen=6')}
      >
        <div className="icon icon-verified"></div>
        <small>Audited by</small>
        {props.chainId === 'STARKNET' ? (
          <img src="/csc-white-logo.png" style={{ marginTop: '-0.075rem' }} />
        ) : (
          <img src="/ackee_logo.svg" style={{ marginTop: '-0.125rem' }} />
        )}
      </div>
    </div>
  );
}