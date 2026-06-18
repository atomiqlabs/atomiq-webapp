import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { SocialFooterView } from './SocialFooterView';

export function SocialFooter(props: {}) {
  const location = useLocation();
  const isHorizontal = location.pathname === '/history' || location.pathname === '/explorer';
  return <SocialFooterView isHorizontal={isHorizontal} />;
}
