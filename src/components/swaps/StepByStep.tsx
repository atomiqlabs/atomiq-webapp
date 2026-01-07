import Icon from 'react-icons-kit';
import * as React from 'react';
import classNames from 'classnames';
import { ISwap } from '@atomiqlabs/sdk';
import { TokenIcons } from '../../utils/Tokens';
import { useQuoteAmountsAndAddress } from '../../hooks/swaps/helpers/useQuoteAmountsAndAddress';

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
  chainName?: string;
};

export function StepByStep(props: {
  steps: SingleStep[];
  quote?: ISwap;
  sourceWallet?: any;
  destinationWallet?: any;
}) {
  const { input, output, address } = useQuoteAmountsAndAddress(props.quote);

  return (
    <div className="swap-steps">
      <div className="swap-steps__data">
        <div className="swap-steps__data__arrow icon icon-arrow-right"></div>
        <div className="swap-steps__data__in">
          {input && (
            <div className="swap-steps-wallet">
              <div className="swap-steps-wallet__icon">
                <img
                  src={TokenIcons[input.amount.token.ticker]}
                  alt="Source"
                  className="swap-steps-wallet__icon__img"
                />
                {input.chain.chain.icon && (
                  <img
                    src={input.chain.chain.icon}
                    alt="Chain"
                    className="swap-steps-wallet__icon__currency"
                  />
                )}
              </div>
              <div className="swap-steps-wallet__ammounts">
                <div className="swap-steps-wallet__ammounts__original">
                  {input.amount.toString()}
                </div>
                {input.usdValue && (
                  <div className="swap-steps-wallet__ammounts__dolars">{input.usdValue}</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="swap-steps__data__out">
          {output && (
            <div className="swap-steps-wallet">
              <div className="swap-steps-wallet__icon">
                <img
                  src={TokenIcons[output.amount.token.ticker]}
                  alt="Destination"
                  className="swap-steps-wallet__icon__img"
                />
                {output.chain.chain.icon && (
                  <img
                    src={output.chain.chain.icon}
                    alt="Chain"
                    className="swap-steps-wallet__icon__currency"
                  />
                )}
              </div>
              <div className="swap-steps-wallet__ammounts">
                <div className="swap-steps-wallet__ammounts__original">
                  {output.amount.toString()}
                </div>
                {output.amount.usdValue && (
                  <div className="swap-steps-wallet__ammounts__dolars">{output.usdValue}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {address && output && (
        <div className="swap-steps__address">
          <div>
            Dest<span className="is-desktop">ination</span> {output.chain.chain.name ?? ''}{' '}
            <span className="is-desktop">Wallet</span> Address:
          </div>
          <div>{address.short}</div>
        </div>
      )}
      <div className="swap-steps__indicator">
        {props.steps.map((step, index) => {
          return (
            <React.Fragment key={index.toString()}>
              <div
                className={classNames('swap-steps__indicator__step', {
                  'text-light text-opacity-50': step.type === 'disabled',
                  'text-light': step.type === 'loading',
                })}
              >
                <div
                  className={classNames('swap-steps__indicator__icon', {
                    'is-failed': step.type === 'failed',
                    'is-success': step.type === 'success',
                    'is-loading': step.type === 'loading',
                  })}
                >
                  <Icon size={20} icon={step.icon} />
                </div>
                <div
                  className={classNames('swap-steps__indicator__text', {
                    'loading-glow': step.type === 'loading',
                  })}
                >
                  {step.text}
                </div>
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
                    'is-loading': step.type === 'loading',
                    'is-success': step.type === 'success',
                  })}
                  style={
                    props.steps.length > 2
                      ? index === 0
                        ? {
                            left: `23%`,
                          }
                        : {
                            right: `24%`,
                          }
                      : {}
                  }
                >
                  {[...Array(props.steps.length > 2 ? 5 : 8)].map((_, dotIndex) => (
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
