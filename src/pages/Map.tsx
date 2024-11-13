import * as React from "react";

export function Map(props: {}) {

    return (
        <iframe
            id="btcmap"
            title="BTC Map"
            // allowFullScreen={true}
            // allow="geolocation"
            src="https://btcmap.org/map?lightning"
            className="flex-grow-1"
        >
        </iframe>
    );
}