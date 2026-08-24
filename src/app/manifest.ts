/** Care pathway PWA manifest for an explicitly installed browser notification experience. */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nirog Care Ledger',
    short_name: 'Nirog',
    description: 'Care reminders and evidence with owner-controlled notification intent.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f8f6',
    theme_color: '#0b766d',
  };
}
