import * as React from 'react';
import { useState } from 'react';
import { Collapse, Dropdown } from 'react-bootstrap';

interface ExplorerTotalsProps {
  title: string;
  count: number | string | null | undefined;
  getDifference: (timeframe: string) => number | string | null | undefined;
  loading?: boolean;
  timeframes?: string[];
}

export function ExplorerTotals({
  title,
  count,
  getDifference,
  loading = false,
  timeframes = ['24h', '7d', '30d'],
}: ExplorerTotalsProps) {
  const [displayTimeframe, setDisplayTimeframe] = useState<string>(timeframes[0]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const difference = getDifference(displayTimeframe);

  const formatDifference = (diff: number | string | null | undefined) => {
    if (diff == null) return null;
    if (typeof diff === 'string') return `+${diff}`;
    return `+${diff}`;
  };

  return (
    <div className={`explorer-totals ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="explorer-totals__header">
        <div className="explorer-totals__header__content">
          <div className="explorer-totals__header__content__title">{title}</div>
          <div className="explorer-totals__header__content__count">
            <div className="sc-amount">{loading ? '...' : count}</div>
            <div className="sc-difference">
              {loading ? (
                '...'
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
