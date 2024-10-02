import * as React from "react";
import {Card, Col, Row} from "react-bootstrap";

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