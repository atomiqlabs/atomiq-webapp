import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export function useAnchorNavigate() {
  const navigate = useNavigate();

  const onClick = useCallback((e) => {
    if(!e.currentTarget.attributes.href.value.startsWith('http')) {
      e.preventDefault();
      navigate(e.currentTarget.attributes.href.value)
    };
  }, []);

  return onClick;
}
