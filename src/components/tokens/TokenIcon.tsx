import {TokenIcons, TokenIconsChainSpecific} from '../../utils/Tokens';
import {isSCToken, Token} from '@atomiqlabs/sdk';

function getTokenIconUrl(tokenOrTicker: string | Token) {
  if(typeof(tokenOrTicker)==="string") return TokenIcons[tokenOrTicker];
  if(!isSCToken(tokenOrTicker)) return TokenIcons[tokenOrTicker.ticker];
  return TokenIconsChainSpecific[tokenOrTicker.chainId]?.[tokenOrTicker.ticker] ?? TokenIcons[tokenOrTicker.ticker];
}

export function TokenIcon(props: {
  tokenOrTicker: string | Token;
  className?: string;
  style?: any;
}) {
  return (
    <img
      src={getTokenIconUrl(props.tokenOrTicker)}
      className={props.className}
      style={props.style}
    />
  );
}
