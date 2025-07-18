import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, CloseButton, Modal } from "react-bootstrap";
import Icon from "react-icons-kit";
import { info } from "react-icons-kit/fa/info";
import { useState } from "react";
export function LightningHyperlinkModal(props) {
  const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
  props.openRef.current = () => {
    setOpenAppModalOpened(true);
  };
  return _jsxs(Modal, {
    contentClassName: "text-white bg-dark",
    size: "sm",
    centered: true,
    show: openAppModalOpened,
    onHide: () => setOpenAppModalOpened(false),
    dialogClassName: "min-width-400px",
    children: [
      _jsx(Modal.Header, {
        className: "border-0",
        children: _jsxs(Modal.Title, {
          id: "contained-modal-title-vcenter",
          className: "d-flex flex-grow-1",
          children: [
            _jsx(Icon, {
              icon: info,
              className: "d-flex align-items-center me-2",
            }),
            " Important notice",
            _jsx(CloseButton, {
              className: "ms-auto",
              variant: "white",
              onClick: () => setOpenAppModalOpened(false),
            }),
          ],
        }),
      }),
      _jsx(Modal.Body, {
        children: _jsxs("p", {
          children: [
            "Please make sure that you return back to this dApp once you inititated a Lightning Network payment from your wallet app. ",
            _jsx("b", {
              children:
                "The Lightning Network payment will only succeed/confirm once you come back to the dApp and claim the funds on the Solana side!",
            }),
          ],
        }),
      }),
      _jsx(Modal.Footer, {
        className: "border-0 d-flex",
        children: _jsx(Button, {
          variant: "primary",
          className: "flex-grow-1",
          onClick: () => {
            window.location.href = props.hyperlink;
            setOpenAppModalOpened(false);
          },
          children: "Understood, continue",
        }),
      }),
    ],
  });
}
