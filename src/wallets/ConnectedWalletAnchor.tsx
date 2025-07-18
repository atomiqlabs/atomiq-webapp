import { Button, Dropdown } from "react-bootstrap";
import * as React from "react";
import { ic_brightness_1 } from "react-icons-kit/md/ic_brightness_1";
import Icon from "react-icons-kit";
import { Token } from "@atomiqlabs/sdk";
import { ic_power_outline } from "react-icons-kit/md/ic_power_outline";
import { useChainForCurrency } from "./hooks/useChainForCurrency";

const ConnectedWallet = React.forwardRef<any, any>(
  ({ name, icon, onClick, noText }, ref) => (
    <div
      className={"d-flex flex-row align-items-center cursor-pointer"}
      onClick={onClick}
    >
      <Icon
        className="text-success d-flex align-items-center me-1"
        icon={ic_brightness_1}
        size={12}
      />
      <img width={16} height={16} src={icon} className="me-1" />
      {!noText ? name : ""}
    </div>
  ),
);

export function ConnectedWalletAnchor(props: {
  className?: string;
  noText?: boolean;
  currency: Token;
}) {
  const { wallet, connect, disconnect, changeWallet, chain } =
    useChainForCurrency(props.currency);

  if (wallet == null && connect == null) return <></>;

  return (
    <>
      {wallet == null ? (
        <Button
          variant="outline-light"
          style={{ marginBottom: "2px" }}
          className="py-0 px-1"
          onClick={() => connect()}
        >
          <small
            className="font-smallest d-flex"
            style={{ marginBottom: "-2px" }}
          >
            <Icon
              icon={ic_power_outline}
              size={16}
              style={{ marginTop: "-3px" }}
            />
            <span>{chain.name} wallet</span>
          </small>
        </Button>
      ) : (
        <Dropdown align={{ md: "start" }}>
          <Dropdown.Toggle
            as={ConnectedWallet}
            id="dropdown-custom-components"
            className={props.className}
            name={wallet.name}
            icon={wallet.icon}
            noText={props.noText}
          >
            Custom toggle
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item eventKey="1" onClick={disconnect}>
              Disconnect
            </Dropdown.Item>
            {changeWallet != null ? (
              <Dropdown.Item
                eventKey="2"
                onClick={() => {
                  changeWallet();
                }}
              >
                Change wallet
              </Dropdown.Item>
            ) : (
              ""
            )}
          </Dropdown.Menu>
        </Dropdown>
      )}
    </>
  );
}
