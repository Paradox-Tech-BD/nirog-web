export const appNavigation = [
  { href: '/', label: 'Overview' },
  { href: '/evidence', label: 'Prescription evidence' },
  { href: '/care-plan', label: 'Care plan' },
  { href: '/care-circle', label: 'Care circle' },
] as const;

export const signOutRedirectUrl = '/';

export function isNavigationActive(pathname: string, href: (typeof appNavigation)[number]['href']): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
