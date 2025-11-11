import * as React from 'react';

export function SwapExpiryProgressCircle(props: {
  timeRemaining: number;
  totalTime: number;
  expired?: boolean;
  show?: boolean;
  onRefreshQuote?: () => void;
}) {
  const timeRemaining = Math.max(0, props.timeRemaining ?? 0);
  const progress = props.totalTime > 0 ? (timeRemaining / props.totalTime) * 100 : 0;

  // Circle properties
  const size = 20;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={props.show === false ? 'd-none' : 'd-flex flex-row align-items-center gap-2'}>
      <div className="circular-progress-wrapper">
        {props.expired && props.onRefreshQuote ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              props.onRefreshQuote?.();
            }}
            className="circular-progress__retry"
          >
            Retry Quote
          </div>
        ) : (
          <svg width={size} height={size} className="circular-progress">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={props.expired ? '#ff6c6c' : '#FF2E8C'}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="circular-progress-bar"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
