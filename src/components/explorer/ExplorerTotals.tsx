import * as React from 'react';
import { useState } from 'react';
import { Badge, Collapse } from 'react-bootstrap';

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
  const [displayTimeframeIndex, setDisplayTimeframeIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const changeTimeframe = () => {
    setDisplayTimeframeIndex((prevState) => (prevState + 1) % timeframes.length);
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const displayTimeframe = timeframes[displayTimeframeIndex];
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
            <div className="sc-difference cursor-pointer" onClick={changeTimeframe}>
              {loading ? (
                '...'
              ) : (
                <>
                  {formatDifference(difference)}
                  <Badge className="font-smallest text-dark" bg="light">
                    {displayTimeframe}
                  </Badge>
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
