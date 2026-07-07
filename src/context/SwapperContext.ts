import { createContext } from 'react';
import { ISwap, Swapper } from '@atomiqlabs/sdk';
import EventEmitter from "events";

export const SwapperContext: React.Context<{
  swapper: Swapper<any>;
  initializedSwapper: Swapper<any>;
  loading: boolean;
  loadingError?: any;
  syncing: boolean;
  syncingError?: any;
  retry?: () => void;
  events: EventEmitter;

  stickyAddress?: boolean;
  setStickyAddress?: (value: boolean) => void;
}> = createContext({
  swapper: null,
  initializedSwapper: null,
  loading: false,
  syncing: false,
  events: new EventEmitter()
});
