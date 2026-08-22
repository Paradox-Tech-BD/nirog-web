'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="global-error-shell">
          <p className="eyebrow">Nirog care workspace</p>
          <h1>We could not open this page.</h1>
          <p>The care record was not changed. Try the page again, or return to the Nirog home page.</p>
          <div className="global-error-actions"><button className="button button-primary" onClick={reset} type="button">Try again</button><a className="button button-secondary" href="/">Go to home</a></div>
        </main>
      </body>
    </html>
  );
}
