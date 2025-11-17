import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseButton } from '../components/common/BaseButton';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex-fill text-white container text-center d-flex align-items-center justify-content-center">
      <div className="px-5 py-5 d-flex flex-column align-items-center">
        <h1 className="display-1">404</h1>
        <h3 className="mb-4">Page Not Found</h3>
        <p className="mb-4">The page you are looking for doesn't exist or has been moved.</p>
        <BaseButton variant="primary" onClick={() => navigate('/')}>
          Go to Home
        </BaseButton>
      </div>
    </div>
  );
}
