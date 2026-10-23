'use client';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useState } from 'react';
export function SessionRecovery({
  clockProblem = false,
}: {
  clockProblem?: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [error, setError] = useState('');
  return (
    <main className="session-recovery">
      <h1>Let’s reconnect your workspace.</h1>
      <p>
        {clockProblem
          ? 'The server clock is out of sync, so your sign-in token is not valid yet. On this local PC, open Windows Settings → Time & language → Date & time, enable automatic time and select Sync now. Then reload this workspace. On a hosted server, contact support.'
          : !isLoaded
            ? 'Checking your account…'
            : isSignedIn
              ? 'Your browser is signed in, but the server could not verify your workspace session. Reload once, or sign out and sign in again.'
              : 'Sign in to open your seller workspace.'}
      </p>
      {isLoaded && (
        <div>
          <a
            className="btn btn-orange"
            href={isSignedIn ? '/dashboard' : '/sign-in'}
          >
            {isSignedIn ? 'Reload workspace' : 'Sign in'}
          </a>
          {isSignedIn && (
            <button
              className="btn btn-dark"
              onClick={() => {
                signOut({ redirectUrl: '/sign-in' }).catch(() =>
                  setError('Could not sign out. Please try again.'),
                );
              }}
            >
              Sign out
            </button>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
