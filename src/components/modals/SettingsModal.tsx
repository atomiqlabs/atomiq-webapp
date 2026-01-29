import * as React from 'react';
import { GenericModal } from '../common/GenericModal';
import { BaseButton } from '../common/BaseButton';
import {useCallback, useState} from "react";
import {OverlayTrigger, Tooltip} from "react-bootstrap";
import Icon from 'react-icons-kit';
import {download} from 'react-icons-kit/icomoon/download';
import {trash} from 'react-icons-kit/fa/trash';
import {spinner11} from 'react-icons-kit/icomoon/spinner11'
import {ClearSwapHistoryModal} from "./ClearSwapHistoryModal";
import {RecoverSwapDataModal} from "./RecoverSwapDataModal";

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

export function SettingsModal(props: {
  opened: boolean;
  close: () => void;
}) {
  const downloadLogs = useCallback(() => {
    downloadTextFile(`atomiq-log-${new Date().toISOString()}.txt`, logMessages.join("\n"));
  }, []);

  const [clearHistoryOpened, setClearHistoryOpened] = useState<boolean>(false);
  const [recoverSwapsOpened, setRecoverSwapsOpened] = useState<boolean>(false);

  return (
    <>
      <ClearSwapHistoryModal opened={clearHistoryOpened} close={() => setClearHistoryOpened(false)}/>
      <RecoverSwapDataModal opened={recoverSwapsOpened} close={(recovered) => {
        setRecoverSwapsOpened(false);
        if(recovered) props.close();
      }}/>
      <GenericModal
          visible={props.opened}
          size="sm"
          type="notice"
          onClose={() => props.close()}
          title="Settings"
          enableClose={true}
      >
        <div className="flex flex-column gap-2 w-100">
          <div className="flex flex-row align-items-center">
            <span className="me-1">Logs</span>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="logs-tooltip">Allows you to download logs of the current webapp
                session. This is helpful when debugging (you might get asked to send this data by atomiq's
                support account).</Tooltip>}
            >
              <div className="w-4 h-4 icon icon-question"></div>
            </OverlayTrigger>
            <BaseButton variant="primary" size="small" className="ms-auto h-6 px-2" onClick={downloadLogs}>
              <Icon size={18} icon={download}/>
            </BaseButton>
          </div>
          <div className="flex flex-row align-items-center">
            <span className="me-1">Clear swap history</span>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="logs-tooltip">Clears up your swap history from this browser.</Tooltip>}
            >
              <div className="w-4 h-4 icon icon-question"></div>
            </OverlayTrigger>
            <BaseButton variant="primary" size="small" className="ms-auto h-6 px-2"
                        onClick={() => setClearHistoryOpened(true)}>
              <Icon size={18} icon={trash}/>
            </BaseButton>
          </div>
          <div className="flex flex-row align-items-center">
            <span className="me-1">Recover swaps</span>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="logs-tooltip">Recovers swaps from on-chain data, might take a while!</Tooltip>}
            >
              <div className="w-4 h-4 icon icon-question"></div>
            </OverlayTrigger>
            <BaseButton variant="primary" size="small" className="ms-auto h-6 px-2"
                        onClick={() => setRecoverSwapsOpened(true)}>
              <Icon size={18} icon={spinner11}/>
            </BaseButton>
          </div>
        </div>
      </GenericModal>
    </>
  );
}
