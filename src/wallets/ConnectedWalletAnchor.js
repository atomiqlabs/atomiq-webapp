import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { Button, Dropdown } from "react-bootstrap";
import * as React from "react";
import { ic_brightness_1 } from "react-icons-kit/md/ic_brightness_1";
import Icon from "react-icons-kit";
import { ic_power_outline } from "react-icons-kit/md/ic_power_outline";
import { useChainForCurrency } from "./hooks/useChainForCurrency";
const ConnectedWallet = React.forwardRef(
  ({ name, icon, onClick, noText }, ref) =>
    _jsxs("div", {
      className: "d-flex flex-row align-items-center cursor-pointer",
      onClick: onClick,
      children: [
        _jsx(Icon, {
          className: "text-success d-flex align-items-center me-1",
          icon: ic_brightness_1,
          size: 12,
        }),
        _jsx("img", { width: 16, height: 16, src: icon, className: "me-1" }),
        !noText ? name : "",
      ],
    }),
);
export function ConnectedWalletAnchor(props) {
  const { wallet, connect, disconnect, changeWallet, chain } =
    useChainForCurrency(props.currency);
  if (wallet == null && connect == null) return _jsx(_Fragment, {});
  return _jsx(_Fragment, {
    children:
      wallet == null
        ? _jsx(Button, {
            variant: "outline-light",
            style: { marginBottom: "2px" },
            className: "py-0 px-1",
            onClick: () => connect(),
            children: _jsxs("small", {
              className: "font-smallest d-flex",
              style: { marginBottom: "-2px" },
              children: [
                _jsx(Icon, {
                  icon: ic_power_outline,
                  size: 16,
                  style: { marginTop: "-3px" },
                }),
                _jsxs("span", { children: [chain.name, " wallet"] }),
              ],
            }),
          })
        : _jsxs(Dropdown, {
            align: { md: "start" },
            children: [
              _jsx(Dropdown.Toggle, {
                as: ConnectedWallet,
                id: "dropdown-custom-components",
                className: props.className,
                name: wallet.name,
                icon: wallet.icon,
                noText: props.noText,
                children: "Custom toggle",
              }),
              _jsxs(Dropdown.Menu, {
                children: [
                  _jsx(Dropdown.Item, {
                    eventKey: "1",
                    onClick: disconnect,
                    children: "Disconnect",
                  }),
                  changeWallet != null
                    ? _jsx(Dropdown.Item, {
                        eventKey: "2",
                        onClick: () => {
                          changeWallet();
                        },
                        children: "Change wallet",
                      })
                    : "",
                ],
              }),
            ],
          }),
  });
}
