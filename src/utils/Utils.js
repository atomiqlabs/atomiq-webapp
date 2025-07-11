export function getDeltaTextHours(delta) {
    let deltaSeconds = Math.floor(delta / 1000);
    if (deltaSeconds < 60) {
        return deltaSeconds + " " + (deltaSeconds === 1 ? "second" : "seconds");
    }
    let deltaMinutes = Math.floor(deltaSeconds / 60);
    if (deltaSeconds < 60 * 60) {
        deltaSeconds -= deltaMinutes * 60;
        return deltaMinutes + " " + (deltaMinutes === 1 ? "minute" : "minutes") + " & " + deltaSeconds + " " + (deltaSeconds === 1 ? "second" : "seconds");
    }
    if (deltaSeconds < 60 * 60 * 24) {
        const deltaHours = Math.floor(deltaMinutes / 60);
        deltaMinutes -= deltaHours * 60;
        return deltaHours + " " + (deltaHours === 1 ? "hour" : "hours") + " & " + deltaMinutes + " " + (deltaMinutes === 1 ? "minute" : "minutes");
    }
}
export function getDeltaText(delta) {
    const deltaSeconds = Math.floor(delta / 1000);
    if (deltaSeconds < 60) {
        return deltaSeconds + " " + (deltaSeconds === 1 ? "second" : "seconds");
    }
    if (deltaSeconds < 60 * 60) {
        const deltaMinutes = Math.floor(deltaSeconds / (60));
        return deltaMinutes + " " + (deltaMinutes === 1 ? "minute" : "minutes");
    }
    if (deltaSeconds < 60 * 60 * 24) {
        const deltaHours = Math.floor(deltaSeconds / (60 * 60));
        return deltaHours + " " + (deltaHours === 1 ? "hour" : "hours");
    }
    if (deltaSeconds < 60 * 60 * 24 * 30) {
        const deltaDays = Math.floor(deltaSeconds / (60 * 60 * 24));
        return deltaDays + " " + (deltaDays === 1 ? "day" : "days");
    }
    if (deltaSeconds < 60 * 60 * 24 * 30 * 12) {
        const deltaMonths = Math.floor(deltaSeconds / (60 * 60 * 24 * 30));
        return deltaMonths + " " + (deltaMonths === 1 ? "month" : "months");
    }
    const deltaYears = Math.floor(deltaSeconds / (60 * 60 * 24 * 30 * 12));
    return deltaYears + " " + (deltaYears === 1 ? "year" : "years");
}
export function getTimeDeltaText(timestamp, forward) {
    const delta = forward ? timestamp - Date.now() : Date.now() - timestamp;
    const deltaSeconds = Math.floor(delta / 1000);
    if (deltaSeconds < 60) {
        return deltaSeconds + " " + (deltaSeconds === 1 ? "second" : "seconds");
    }
    if (deltaSeconds < 60 * 60) {
        const deltaMinutes = Math.floor(deltaSeconds / (60));
        return deltaMinutes + " " + (deltaMinutes === 1 ? "minute" : "minutes");
    }
    if (deltaSeconds < 60 * 60 * 24) {
        const deltaHours = Math.floor(deltaSeconds / (60 * 60));
        return deltaHours + " " + (deltaHours === 1 ? "hour" : "hours");
    }
    if (deltaSeconds < 60 * 60 * 24 * 30) {
        const deltaDays = Math.floor(deltaSeconds / (60 * 60 * 24));
        return deltaDays + " " + (deltaDays === 1 ? "day" : "days");
    }
    if (deltaSeconds < 60 * 60 * 24 * 30 * 12) {
        const deltaMonths = Math.floor(deltaSeconds / (60 * 60 * 24 * 30));
        return deltaMonths + " " + (deltaMonths === 1 ? "month" : "months");
    }
    const deltaYears = Math.floor(deltaSeconds / (60 * 60 * 24 * 30 * 12));
    return deltaYears + " " + (deltaYears === 1 ? "year" : "years");
}
export function elementInViewport(el) {
    let top = el.offsetTop;
    let left = el.offsetLeft;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    while (el.offsetParent) {
        el = el.offsetParent;
        top += el.offsetTop;
        left += el.offsetLeft;
    }
    return (top >= window.pageYOffset &&
        left >= window.pageXOffset &&
        (top + height) <= (window.pageYOffset + window.innerHeight) &&
        (left + width) <= (window.pageXOffset + window.innerWidth));
}
export function capitalizeFirstLetter(txt) {
    if (txt == null)
        return null;
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
}
export function timeoutPromise(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
