
import {isSCToken, Token} from '@atomiqlabs/sdk';
import {TokenIcons, TokenIconsChainSpecific} from "../../utils/TokenIcons";

function getTokenIconUrl(tokenOrTicker: string | Token) {
  if(typeof(tokenOrTicker)==="string") return TokenIcons[tokenOrTicker];
  if(!isSCToken(tokenOrTicker)) return TokenIcons[tokenOrTicker.ticker];
  return TokenIconsChainSpecific[tokenOrTicker.chainId]?.[tokenOrTicker.ticker] ?? TokenIcons[tokenOrTicker.ticker];
}

function getTokenTicker(tokenOrTicker: string | Token) {
  return typeof(tokenOrTicker)==="string" ? tokenOrTicker : tokenOrTicker.ticker;
}

export function TokenIcon(props: {
  tokenOrTicker: string | Token;
  className?: string;
  style?: any;
  alt?: string;
}) {
  return (
    <img
      src={getTokenIconUrl(props.tokenOrTicker)}
      alt={props.alt ?? getTokenTicker(props.tokenOrTicker)}
      className={props.className}
      style={props.style}
    />
  );
}
