import * as React from "react";
import {
    Button,
    CloseButton,
    Modal
} from "react-bootstrap";
import Icon from "react-icons-kit";
import {info} from 'react-icons-kit/fa/info';
import {useCallback, useContext, useState} from "react";
import {useAsync} from "../../utils/hooks/useAsync";
import {ISwap} from "@atomiqlabs/sdk";
import {SwapsContext} from "../../swaps/context/SwapsContext";
import {ErrorAlert} from "../../components/ErrorAlert";

const logMessages: string[] = [];

function serializeLogMessageChunk(chunk: any) {
    if(typeof(chunk)==="object") {
        //Errors
        if(chunk.stack!=null) {
            return ""+chunk+": "+chunk.stack;
        }
        try {
            return JSON.stringify(chunk, null, 2);
        } catch {}
    }
    if(chunk!=null) return chunk.toString();
    return ""+chunk;
}

//Setup log interceptor
let cLog = console.log;
console.log = (...data: any[]) => {
    logMessages.push(`[LOG]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    cLog(...data);
}
let eLog = console.error;
console.error = (...data: any[]) => {
    logMessages.push(`[ERROR]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    eLog(...data);
}
let wLog = console.warn;
console.warn= (...data: any[]) => {
    logMessages.push(`[WARN]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    wLog(...data);
}
let iLog = console.info;
console.info = (...data: any[]) => {
    logMessages.push(`[INFO]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    iLog(...data);
}
let dLog = console.debug;
console.debug = (...data: any[]) => {
    logMessages.push(`[DEBUG]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    dLog(...data);
}

function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

export function DownloadLogsModal(props: {
    openRef: React.MutableRefObject<() => void>
}) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState<boolean>(false);

    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };

    const download = useCallback(() => {
        downloadTextFile(`atomiq-log-${new Date().toISOString()}.txt`, logMessages.join("\n"));
    }, []);

    return (
        <Modal contentClassName="text-white bg-dark" size="sm" centered show={!!openAppModalOpened} onHide={() => setOpenAppModalOpened(false)} dialogClassName="min-width-400px">
            <Modal.Header className="border-0">
                <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                    <Icon icon={info} className="d-flex align-items-center me-2"/> Download logs
                    <CloseButton className="ms-auto" variant="white" onClick={() => setOpenAppModalOpened(false)}/>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>This function allows you, to obtain logs of the current webapp session. This is helpful when debugging issues (you might get asked to send this data by atomiq's support account).</p>
            </Modal.Body>
            <Modal.Footer className="border-0 d-flex">
                <Button variant="primary" className="flex-grow-1" onClick={download}>
                    Download
                </Button>
            </Modal.Footer>
        </Modal>
    )
}