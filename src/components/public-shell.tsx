import type { ReactNode } from 'react';
import { PublicHeader } from '@/components/app-shell';

export function PublicShell({ children }: { children: ReactNode }) {
  return <div className="public-shell"><PublicHeader />{children}</div>;
}
