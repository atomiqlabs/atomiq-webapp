import { TokenIcons } from '../../utils/Tokens';
import { Token } from '@atomiqlabs/sdk';

export function TokenIcon(props: {
  tokenOrTicker: string | Token;
  className?: string;
  style?: any;
}) {
  return (
    <img
      src={
        TokenIcons[
          typeof props.tokenOrTicker === 'string' ? props.tokenOrTicker : props.tokenOrTicker.ticker
        ]
      }
      className={props.className}
      style={props.style}
    />
  );
}
