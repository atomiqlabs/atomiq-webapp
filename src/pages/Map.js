import { jsx as _jsx } from "react/jsx-runtime";
export function Map(props) {
    return (_jsx("iframe", { id: "btcmap", title: "BTC Map", 
        // allowFullScreen={true}
        // allow="geolocation"
        src: "https://btcmap.org/map?lightning", className: "flex-grow-1" }));
}
