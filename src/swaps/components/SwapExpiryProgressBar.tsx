import * as React from 'react';

export function SwapExpiryProgressBar(props: {
  timeRemaining: number;
  totalTime: number;
  expired?: boolean;
  show?: boolean;
  expiryText?: string;
  quoteAlias?: string;
}) {
  const timeRemaining = Math.max(0, props.timeRemaining ?? 0);
  const progress = props.totalTime > 0 ? (timeRemaining / props.totalTime) * 100 : 0;

  // Format time remaining (timeRemaining is in seconds)
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h : ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${totalSeconds}s`;
  };

  return (
    <div className={props.show === false ? 'd-none' : 'progress-bar-wrapper'}>
      {props.expired && props.expiryText ? (
        <div className="progress-bar__expired-text">{props.expiryText}</div>
      ) : (
        <>
          {props.quoteAlias && (
            <div className="progress-bar__text">
              {props.quoteAlias} expires in <strong>{formatTime(timeRemaining)}</strong>
            </div>
          )}
          <div className="progress-bar__container">
            <div
              className="progress-bar__fill"
              style={{
                width: `${progress}%`,
                backgroundColor: props.expired ? '#ff6c6c' : '#EB568C',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
