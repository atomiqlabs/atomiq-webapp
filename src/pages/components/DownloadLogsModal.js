import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, CloseButton, Modal } from "react-bootstrap";
import Icon from "react-icons-kit";
import { info } from 'react-icons-kit/fa/info';
import { useCallback, useState } from "react";
const logMessages = [];
function serializeLogMessageChunk(chunk) {
    if (typeof (chunk) === "object") {
        //Errors
        if (chunk.stack != null) {
            return "" + chunk + ": " + chunk.stack;
        }
        try {
            return JSON.stringify(chunk, null, 2);
        }
        catch { }
    }
    if (chunk != null)
        return chunk.toString();
    return "" + chunk;
}
//Setup log interceptor
let cLog = console.log;
console.log = (...data) => {
    logMessages.push(`[LOG]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    cLog(...data);
};
let eLog = console.error;
console.error = (...data) => {
    logMessages.push(`[ERROR]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    eLog(...data);
};
let wLog = console.warn;
console.warn = (...data) => {
    logMessages.push(`[WARN]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    wLog(...data);
};
let iLog = console.info;
console.info = (...data) => {
    logMessages.push(`[INFO]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    iLog(...data);
};
let dLog = console.debug;
console.debug = (...data) => {
    logMessages.push(`[DEBUG]{${new Date().toISOString()}} ${data.map(serializeLogMessageChunk).join(" ")}`);
    dLog(...data);
};
function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
export function DownloadLogsModal(props) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };
    const download = useCallback(() => {
        downloadTextFile(`atomiq-log-${new Date().toISOString()}.txt`, logMessages.join("\n"));
    }, []);
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: !!openAppModalOpened, onHide: () => setOpenAppModalOpened(false), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: [_jsx(Icon, { icon: info, className: "d-flex align-items-center me-2" }), " Download logs", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => setOpenAppModalOpened(false) })] }) }), _jsx(Modal.Body, { children: _jsx("p", { children: "This function allows you, to obtain logs of the current webapp session. This is helpful when debugging issues (you might get asked to send this data by atomiq's support account)." }) }), _jsx(Modal.Footer, { className: "border-0 d-flex", children: _jsx(Button, { variant: "primary", className: "flex-grow-1", onClick: download, children: "Download" }) })] }));
}
