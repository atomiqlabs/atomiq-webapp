import * as React from 'react';
import { useState, useEffect } from 'react';
import { Collapse, Dropdown } from 'react-bootstrap';

interface ExplorerTotalsProps {
  title: string;
  count: number | string | null | undefined;
  getDifference: (timeframe: string) => number | string | null | undefined;
  loading?: boolean;
  timeframes?: string[];
  shortenOnMobile?: boolean;
}

export function ExplorerTotals({
  title,
  count,
  getDifference,
  loading = false,
  timeframes = ['24h', '7d', '30d'],
  shortenOnMobile = false,
}: ExplorerTotalsProps) {
  const [displayTimeframe, setDisplayTimeframe] = useState<string>(timeframes[0]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const difference = getDifference(displayTimeframe);

  const shortenNumber = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (absValue >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (absValue >= 1_000) {
      return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return value.toString();
  };

  const formatCount = (value: number | string | null | undefined) => {
    if (value == null) return '';

    if (typeof value === 'string') {
      if (shortenOnMobile && isMobile && value.startsWith('$')) {
        const numericValue = parseFloat(value.replace(/[$,]/g, ''));
        if (!isNaN(numericValue)) {
          return '$' + shortenNumber(numericValue);
        }
      }
      return value;
    }

    if (shortenOnMobile && isMobile) {
      return shortenNumber(value);
    }

    return value.toLocaleString('en-US');
  };

  const formatDifference = (diff: number | string | null | undefined) => {
    if (diff == null) return null;

    if (typeof diff === 'string') {
      if (shortenOnMobile && isMobile && diff.startsWith('$')) {
        const numericValue = parseFloat(diff.replace(/[$,]/g, ''));
        if (!isNaN(numericValue)) {
          return '+$' + shortenNumber(numericValue);
        }
      }
      return `+${diff}`;
    }

    if (shortenOnMobile && isMobile) {
      return '+' + shortenNumber(diff);
    }

    return `+${diff.toLocaleString('en-US')}`;
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
        <div className="explorer-totals__more cursor-pointer" onClick={toggleExpanded}>
          <i className={`icon icon-caret-down ${isExpanded ? 'is-rotated' : ''}`}></i>
        </div>
      </div>
      <Collapse in={isExpanded}>
        <div className="explorer-totals__body">Body content will go here</div>
      </Collapse>
    </div>
  );
}
