import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SocialFooterView } from '../SocialFooterView';

describe('SocialFooterView', () => {
  it('renders all social links and the horizontal modifier', () => {
    const html = renderToStaticMarkup(<SocialFooterView isHorizontal={true} />);
    expect(html).toContain('href="https://github.com/atomiqlabs"');
    expect(html).toContain('href="https://twitter.com/atomiqlabs"');
    expect(html).toContain('is-horizontal');
  });
});
