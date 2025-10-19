import Icon from 'react-icons-kit';
import * as React from 'react';
import classNames from 'classnames';

export type SingleStep = {
  icon: any;
  text: string;
  type: 'disabled' | 'loading' | 'success' | 'failed';
  amount?: string;
  address?: string;
};

export type WalletData = {
  icon: string;
  chainIcon?: string;
  amount: string;
  dollarValue?: string;
  address?: string;
};

export function StepByStep(props: {
  steps: SingleStep[];
  sourceWallet?: WalletData;
  destinationWallet?: WalletData;
}) {
  return (
    <div className="swap-steps">
      <div className="swap-steps__data">
        <div className="swap-steps__data__arrow icon icon-arrow-right"></div>
        <div className="swap-steps__data__in">
          {props.sourceWallet && (
            <div className="swap-steps-wallet">
              <div className="swap-steps-wallet__icon">
                <img
                  src={props.sourceWallet.icon}
                  alt="Source"
                  className="swap-steps-wallet__icon__img"
                />
                {props.sourceWallet.chainIcon && (
                  <img
                    src={props.sourceWallet.chainIcon}
                    alt="Chain"
                    className="swap-steps-wallet__icon__currency"
                  />
                )}
              </div>
              <div className="swap-steps-wallet__ammounts">
                <div className="swap-steps-wallet__ammounts__original">
                  {props.sourceWallet.amount}
                </div>
                {props.sourceWallet.dollarValue && (
                  <div className="swap-steps-wallet__ammounts__dolars">
                    {props.sourceWallet.dollarValue}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="swap-steps__data__out">
          {props.destinationWallet && (
            <div className="swap-steps-wallet">
              <div className="swap-steps-wallet__icon">
                <img
                  src={props.destinationWallet.icon}
                  alt="Destination"
                  className="swap-steps-wallet__icon__img"
                />
                {props.destinationWallet.chainIcon && (
                  <img
                    src={props.destinationWallet.chainIcon}
                    alt="Chain"
                    className="swap-steps-wallet__icon__currency"
                  />
                )}
              </div>
              <div className="swap-steps-wallet__ammounts">
                <div className="swap-steps-wallet__ammounts__original">
                  {props.destinationWallet.amount}
                </div>
                {props.destinationWallet.dollarValue && (
                  <div className="swap-steps-wallet__ammounts__dolars">
                    {props.destinationWallet.dollarValue}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {props.destinationWallet.address && (
        <div className="swap-steps__address">
          <div>Destination Bitcoin Wallet Address:</div>
          <div>
            {props.destinationWallet.address.slice(0, 5)}...
            {props.destinationWallet.address.slice(-5)}
          </div>
        </div>
      )}
      <div className="swap-steps__indicator">
        {props.steps.map((step, index) => {
          return (
            <React.Fragment key={index.toString()}>
              <div
                className={classNames('swap-steps__indicator__step', {
                  'text-light text-opacity-50': step.type === 'disabled',
                  'text-light loading-glow': step.type === 'loading',
                })}
              >
                <div
                  className={classNames('swap-steps__indicator__icon', {
                    'is-failed': step.type === 'failed',
                    'is-success': step.type === 'success',
                  })}
                >
                  <Icon size={20} icon={step.icon} />
                </div>
                <div className="swap-steps__indicator__text">{step.text}</div>
                {/*{step.amount && <div className="mt-1 font-weight-bold">{step.amount}</div>}*/}
                {/*{step.address && (*/}
                {/*  <div className="mt-1 text-truncate" style={{ fontSize: '0.75rem' }}>*/}
                {/*    {step.address}*/}
                {/*  </div>*/}
                {/*)}*/}
              </div>
              {index < props.steps.length - 1 && (
                <div
                  className={classNames('swap-steps__dots', {
                    'is-loading loading-glow': step.type === 'loading',
                    'is-success': step.type === 'success',
                  })}
                >
                  {[...Array(8)].map((_, dotIndex) => (
                    <div key={dotIndex} className="swap-steps__dot"></div>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
