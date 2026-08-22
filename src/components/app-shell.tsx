'use client';

import { SignInButton, SignOutButton, SignUpButton, useUser } from '@clerk/nextjs';
import { ChevronDown, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { appNavigation, isNavigationActive, signOutRedirectUrl } from '@/lib/navigation';

export function NirogMark() {
  return (
    <span className="nirog-mark" aria-hidden="true">
      <span />
      <i />
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Nirog care workspace">
      <NirogMark />
      {!compact && <span>Nirog</span>}
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav aria-label="Public navigation" className="public-nav">
        <Link href="/#principles">How it works</Link>
        <Link href="/#principles">Safety by design</Link>
      </nav>
      <div className="public-actions">
        <SignInButton>
          <button className="button button-ghost" type="button">Sign in</button>
        </SignInButton>
        <SignUpButton>
          <button className="button button-primary" type="button">Create account</button>
        </SignUpButton>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, user } = useUser();
  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'Your account';
  const initials = firstName.slice(0, 1).toUpperCase();

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-header-inner">
          <Brand />
          <nav aria-label="Care workspace navigation" className="app-nav">
            {appNavigation.map((item) => (
              <Link
                className={isNavigationActive(pathname, item.href) ? 'app-nav-link is-active' : 'app-nav-link'}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-account">
            <span className="connection-state"><ShieldCheck size={15} /> Secure session</span>
            <details className="account-menu">
              <summary aria-label="Open account menu">
                <span className="account-avatar">{isLoaded ? initials : '•'}</span>
                <span className="account-summary"><small>Signed in</small><strong>{isLoaded ? firstName : 'Loading'}</strong></span>
                <ChevronDown size={15} />
              </summary>
              <div className="account-menu-panel">
                <p className="account-menu-name">{user?.fullName ?? 'Nirog account'}</p>
                {user?.primaryEmailAddress?.emailAddress && <p className="account-menu-email">{user.primaryEmailAddress.emailAddress}</p>}
                <div className="account-menu-divider" />
                <SignOutButton redirectUrl={signOutRedirectUrl}>
                  <button className="account-sign-out" type="button"><LogOut size={16} /> Sign out</button>
                </SignOutButton>
              </div>
            </details>
          </div>
          <details className="mobile-menu">
            <summary aria-label="Open navigation"><Menu className="menu-open" size={21} /><X className="menu-close" size={21} /></summary>
            <div className="mobile-menu-panel">
              {appNavigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
              <SignOutButton redirectUrl={signOutRedirectUrl}>
                <button type="button"><LogOut size={16} /> Sign out</button>
              </SignOutButton>
            </div>
          </details>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
