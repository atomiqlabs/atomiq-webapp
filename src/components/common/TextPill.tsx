import * as React from 'react';

export function TextPill(props: {
  variant: 'success' | 'danger' | 'warning';
  children: React.ReactNode;
}) {
  return <div className={`text-pill text-pill--${props.variant}`}>{props.children}</div>;
}
