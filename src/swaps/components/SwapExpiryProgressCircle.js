import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SwapExpiryProgressCircle(props) {
    const timeRemaining = Math.max(0, props.timeRemaining ?? 0);
    const progress = props.totalTime > 0 ? (timeRemaining / props.totalTime) * 100 : 0;
    // Circle properties
    const size = 20;
    const strokeWidth = 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return (_jsx("div", { className: props.show === false ? 'd-none' : 'd-flex flex-row align-items-center gap-2', children: _jsx("div", { className: "circular-progress-wrapper", children: props.expired && props.onRefreshQuote ? (_jsx("div", { onClick: (e) => {
                    e.stopPropagation();
                    props.onRefreshQuote?.();
                }, className: "circular-progress__retry", children: "Retry Quote" })) : (_jsxs("svg", { width: size, height: size, className: "circular-progress", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "rgba(255, 255, 255, 0.1)", strokeWidth: strokeWidth }), _jsx("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: props.expired ? '#ff6c6c' : '#FF2E8C', strokeWidth: strokeWidth, strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round", transform: `rotate(-90 ${size / 2} ${size / 2})`, className: "circular-progress-bar" })] })) }) }));
}
