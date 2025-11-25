import * as React from 'react';
import { useState, useEffect } from 'react';
import { Collapse, Dropdown } from 'react-bootstrap';
import { FEConstants } from '../../FEConstants';
import { shortenNumber } from '../../utils/Utils';
import { useIsMobile } from '../../hooks/utils/useIsMobile';

interface BreakdownItem {
  name: string;
  icon?: string;
  value: number;
}

interface ExplorerTotalsProps {
  title: string;
  count: number;
  getDifference: (timeframe: string) => number;
  loading?: boolean;
  timeframes?: string[];
  shortenOnMobile?: boolean;
  breakdownData?: BreakdownItem[];
  isUsd?: boolean;
}

export function ExplorerTotals({
  title,
  count,
  getDifference,
  loading = false,
  timeframes = ['24h', '7d', '30d'],
  shortenOnMobile = false,
  breakdownData = [],
  isUsd = false,
}: ExplorerTotalsProps) {
  const [displayTimeframe, setDisplayTimeframe] = useState<string>(timeframes[0]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isMobile = useIsMobile();

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const difference = getDifference(displayTimeframe);

  const formatCount = (value: number) => {
    if (value == null) return '';

    if (shortenOnMobile && isMobile) {
      const shortenedNumber = shortenNumber(value);
      return isUsd ? '$' + shortenedNumber : shortenedNumber;
    }

    return isUsd ? FEConstants.USDollar.format(value) : value.toLocaleString('en-US');
  };

  const formatDifference = (diff: number) => {
    if (diff == null) return null;
    return '+' + formatCount(diff);
  };

  return (
    <div className={`explorer-totals ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="explorer-totals__header">
        <div className="explorer-totals__header__content">
          <div className="explorer-totals__header__content__title">{title}</div>
          <div className={`explorer-totals__header__content__count ${loading ? 'is-loading' : ''}`}>
            <div className="sc-amount">{loading ? '' : formatCount(count)}</div>
            <div className="sc-difference">
              {loading ? (
                ''
              ) : (
                <>
                  {formatDifference(difference)}
                  <Dropdown onSelect={(eventKey) => setDisplayTimeframe(eventKey)}>
                    <Dropdown.Toggle variant="dark" size="sm">
                      {displayTimeframe}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {timeframes.map((timeframe) => (
                        <Dropdown.Item
                          key={timeframe}
                          eventKey={timeframe}
                          active={timeframe === displayTimeframe}
                        >
                          {timeframe}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </>
              )}
            </div>
          </div>
        </div>
        {!loading && (
          <div className="explorer-totals__more cursor-pointer" onClick={toggleExpanded}>
            <i className={`icon icon-caret-down ${isExpanded ? 'is-rotated' : ''}`}></i>
          </div>
        )}
      </div>
      <Collapse in={isExpanded}>
        <div className="explorer-totals__body">
          {breakdownData
            .filter((item) => item.value !== 0)
            .map((item, index) => (
              <div key={index} className="explorer-totals__body__item">
                {item.icon && <img className="sc-image" src={item.icon} alt={item.name} />}
                <div className="sc-name">{item.name}</div>
                <div className="sc-amount">{formatCount(item.value)}</div>
                {/*<div className="sc-difference">+$47,908.10</div>*/}
              </div>
            ))}
        </div>
      </Collapse>
    </div>
  );
}
