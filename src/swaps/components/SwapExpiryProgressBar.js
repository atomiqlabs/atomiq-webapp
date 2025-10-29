import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function SwapExpiryProgressBar(props) {
    const timeRemaining = Math.max(0, props.timeRemaining ?? 0);
    const progress = props.totalTime > 0 ? (timeRemaining / props.totalTime) * 100 : 0;
    const type = props.type ?? 'circle';
    // Format time remaining (timeRemaining is in seconds)
    const formatTime = (seconds) => {
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
    // Circle properties
    const size = 20;
    const strokeWidth = 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    if (type === 'bar') {
        return (_jsx("div", { className: props.show === false ? 'd-none' : 'progress-bar-wrapper', children: props.expired && props.expiryText ? (_jsx("div", { className: "progress-bar__expired-text", children: props.expiryText })) : (_jsxs(_Fragment, { children: [props.quoteAlias && (_jsxs("div", { className: "progress-bar__text", children: [props.quoteAlias, " expires in ", formatTime(timeRemaining)] })), _jsx("div", { className: "progress-bar__container", children: _jsx("div", { className: "progress-bar__fill", style: {
                                width: `${progress}%`,
                                backgroundColor: props.expired ? '#ff6c6c' : '#FF2E8C',
                            } }) })] })) }));
    }
    return (_jsx("div", { className: props.show === false ? 'd-none' : 'd-flex flex-row align-items-center gap-2', children: _jsx("div", { className: "circular-progress-wrapper", children: props.expired && props.onRefreshQuote ? (_jsx("div", { onClick: (e) => {
                    e.stopPropagation();
                    props.onRefreshQuote?.();
                }, className: "circular-progress__retry", children: "Retry Quote" })) : (_jsxs("svg", { width: size, height: size, className: "circular-progress", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "rgba(255, 255, 255, 0.1)", strokeWidth: strokeWidth }), _jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: props.expired ? '#ff6c6c' : '#FF2E8C', strokeWidth: strokeWidth, strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round", transform: `rotate(-90 ${size / 2} ${size / 2})`, className: "circular-progress-bar" })] })) }) }));
}
