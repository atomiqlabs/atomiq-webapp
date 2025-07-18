import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ProgressBar } from "react-bootstrap";
import { getDeltaTextHours } from "../../utils/Utils";
export function SwapExpiryProgressBar(props) {
  const timeRemaining = Math.max(0, props.timeRemaining ?? 0);
  return _jsxs("div", {
    className:
      props.show === false ? "d-none" : "d-flex flex-column mb-3 tab-accent",
    children: [
      props.expired
        ? _jsx("label", { children: props.expiryText ?? "Quote expired!" })
        : _jsxs("label", {
            children: [
              props.quoteAlias ?? "Quote",
              " expires in ",
              getDeltaTextHours(timeRemaining * 1000),
            ],
          }),
      _jsx(ProgressBar, {
        animated: true,
        now: timeRemaining,
        max: props.totalTime,
        min: 0,
      }),
    ],
  });
}
