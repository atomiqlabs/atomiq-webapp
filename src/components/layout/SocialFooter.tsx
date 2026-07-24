import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { SocialFooterView } from './SocialFooterView';

export function SocialFooter(props: {}) {
  const location = useLocation();
  if (location.pathname !== '/') return null;

  return <SocialFooterView isHorizontal={false} />;
}
