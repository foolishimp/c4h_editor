// File: /packages/shared/src/components/RemoteComponent.d.ts
import React from 'react';

export interface RemoteComponentProps {
  url?: string; // Make url optional
  scope: string;
  module: string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

declare const RemoteComponent: React.FC<RemoteComponentProps>;

export default RemoteComponent;