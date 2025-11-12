import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function SwapExpiryProgressBar(props) {
    const timeRemaining = Math.max(0, props.timeRemaining ?? 0);
    const progress = props.totalTime > 0 ? (timeRemaining / props.totalTime) * 100 : 0;
    // Format time remaining (timeRemaining is in seconds)
    const formatTime = (_seconds) => {
        const totalSeconds = Math.floor(_seconds);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${hours}h : ${minutes}m`;
        }
        if (minutes > 0) {
            return `${minutes}m : ${seconds}s`;
        }
        return `${totalSeconds}s`;
    };
    return (_jsx("div", { className: props.show === false ? 'd-none' : 'progress-bar-wrapper', children: props.expired && props.expiryText ? (_jsx("div", { className: "progress-bar__expired-text", children: props.expiryText })) : (_jsxs(_Fragment, { children: [props.quoteAlias && (_jsxs("div", { className: "progress-bar__text", children: [props.quoteAlias, " expires in ", _jsx("strong", { children: formatTime(timeRemaining) })] })), _jsx("div", { className: "progress-bar__container", children: _jsx("div", { className: "progress-bar__fill", style: {
                            width: `${progress}%`,
                            backgroundColor: props.expired ? '#ff6c6c' : '#EB568C',
                        } }) })] })) }));
}
