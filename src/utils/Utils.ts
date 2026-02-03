export function getDeltaTextHours(delta: number): string {
  let deltaSeconds = Math.floor(delta / 1000);
  if (deltaSeconds < 60) {
    return deltaSeconds + ' ' + (deltaSeconds === 1 ? 'second' : 'seconds');
  }
  let deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaSeconds < 60 * 60) {
    deltaSeconds -= deltaMinutes * 60;
    return (
      deltaMinutes +
      ' ' +
      (deltaMinutes === 1 ? 'minute' : 'minutes') +
      ' & ' +
      deltaSeconds +
      ' ' +
      (deltaSeconds === 1 ? 'second' : 'seconds')
    );
  }
  if (deltaSeconds < 60 * 60 * 24) {
    const deltaHours = Math.floor(deltaMinutes / 60);
    deltaMinutes -= deltaHours * 60;
    return (
      deltaHours +
      ' ' +
      (deltaHours === 1 ? 'hour' : 'hours') +
      ' & ' +
      deltaMinutes +
      ' ' +
      (deltaMinutes === 1 ? 'minute' : 'minutes')
    );
  }
}

export function getDeltaText(delta: number, shorten: boolean = false): string {
  const deltaSeconds = Math.floor(delta / 1000);
  if (deltaSeconds < 60) {
    return shorten
      ? deltaSeconds + ' sec'
      : deltaSeconds + ' ' + (deltaSeconds === 1 ? 'second' : 'seconds');
  }
  if (deltaSeconds < 60 * 60) {
    const deltaMinutes = Math.floor(deltaSeconds / 60);
    return shorten
      ? deltaMinutes + ' min'
      : deltaMinutes + ' ' + (deltaMinutes === 1 ? 'minute' : 'minutes');
  }
  if (deltaSeconds < 60 * 60 * 24) {
    const deltaHours = Math.floor(deltaSeconds / (60 * 60));
    return shorten
      ? deltaHours + ' hour'
      : deltaHours + ' ' + (deltaHours === 1 ? 'hour' : 'hours');
  }
  if (deltaSeconds < 60 * 60 * 24 * 30) {
    const deltaDays = Math.floor(deltaSeconds / (60 * 60 * 24));
    return shorten ? deltaDays + ' d' : deltaDays + ' ' + (deltaDays === 1 ? 'day' : 'days');
  }
  if (deltaSeconds < 60 * 60 * 24 * 30 * 12) {
    const deltaMonths = Math.floor(deltaSeconds / (60 * 60 * 24 * 30));
    return shorten
      ? deltaMonths + ' month'
      : deltaMonths + ' ' + (deltaMonths === 1 ? 'month' : 'months');
  }
  const deltaYears = Math.floor(deltaSeconds / (60 * 60 * 24 * 30 * 12));
  return shorten ? deltaYears + ' y' : deltaYears + ' ' + (deltaYears === 1 ? 'year' : 'years');
}

export function getTimeDeltaText(timestamp: number, forward?: boolean): string {
  const delta = forward ? timestamp - Date.now() : Date.now() - timestamp;
  const deltaSeconds = Math.floor(delta / 1000);
  if (deltaSeconds < 60) {
    return deltaSeconds + ' ' + (deltaSeconds === 1 ? 'second' : 'seconds');
  }
  if (deltaSeconds < 60 * 60) {
    const deltaMinutes = Math.floor(deltaSeconds / 60);
    return deltaMinutes + ' ' + (deltaMinutes === 1 ? 'minute' : 'minutes');
  }
  if (deltaSeconds < 60 * 60 * 24) {
    const deltaHours = Math.floor(deltaSeconds / (60 * 60));
    return deltaHours + ' ' + (deltaHours === 1 ? 'hour' : 'hours');
  }
  if (deltaSeconds < 60 * 60 * 24 * 30) {
    const deltaDays = Math.floor(deltaSeconds / (60 * 60 * 24));
    return deltaDays + ' ' + (deltaDays === 1 ? 'day' : 'days');
  }
  if (deltaSeconds < 60 * 60 * 24 * 30 * 12) {
    const deltaMonths = Math.floor(deltaSeconds / (60 * 60 * 24 * 30));
    return deltaMonths + ' ' + (deltaMonths === 1 ? 'month' : 'months');
  }
  const deltaYears = Math.floor(deltaSeconds / (60 * 60 * 24 * 30 * 12));
  return deltaYears + ' ' + (deltaYears === 1 ? 'year' : 'years');
}

export function elementInViewport(el): boolean {
  let top = el.offsetTop;
  let left = el.offsetLeft;
  const width = el.offsetWidth;
  const height = el.offsetHeight;

  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return (
    top >= window.pageYOffset &&
    left >= window.pageXOffset &&
    top + height <= window.pageYOffset + window.innerHeight &&
    left + width <= window.pageXOffset + window.innerWidth
  );
}

export function capitalizeFirstLetter(txt: string) {
  if (txt == null) return null;
  return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
}

export function timeoutPromise(timeoutMillis: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, timeoutMillis)
    if(abortSignal!=null) abortSignal.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new Error("Aborted"));
    })
  });
}

export function truncateAddress(address: string, startChars: number = 5, endChars: number = 5): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

export function truncateAmount(amountStr: string, maxCharacters: number = 10): string {
  if(amountStr.length<=maxCharacters) return amountStr;
  const decimalSeparatorPoint = amountStr.indexOf(".");
  if(decimalSeparatorPoint>=maxCharacters-1) {
    const fullIntegerValue = amountStr.split(".")[0];
    return fullIntegerValue;
  } else {
    return amountStr.substring(0, maxCharacters);
  }
}

export function shortenNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(2).replace(/\.0$/, '') + 'B';
  }
  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toFixed(2).replace(/\.0$/, '') + 'M';
  }
  if (absValue >= 1_000) {
    return (value / 1_000).toFixed(2).replace(/\.0$/, '') + 'K';
  }
  return value.toString();
}

export async function tryWithRetries<T>(func: () => Promise<T>, retryPolicy?: {
  maxRetries?: number, delay?: number, exponential?: boolean
}, errorAllowed?: (e: any) => boolean, abortSignal?: AbortSignal): Promise<T> {
  retryPolicy = retryPolicy || {};
  retryPolicy.maxRetries = retryPolicy.maxRetries || 5;
  retryPolicy.delay = retryPolicy.delay || 500;
  retryPolicy.exponential =  retryPolicy.exponential==null ? true : retryPolicy.exponential;

  let err = null;

  for(let i=0;i<retryPolicy.maxRetries;i++) {
    try {
      const resp: T = await func();
      return resp;
    } catch (e) {
      if(errorAllowed!=null && errorAllowed(e)) throw e;
      err = e;
      console.error("tryWithRetries(): error on try number: "+i, e);
    }
    if(abortSignal!=null && abortSignal.aborted) throw new Error("Aborted");
    if(i!==retryPolicy.maxRetries-1) {
      await timeoutPromise(
        retryPolicy.exponential ? retryPolicy.delay*Math.pow(2, i) : retryPolicy.delay,
        abortSignal
      );
    }
  }

  throw err;
}