'use client';
import { useClerk } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
export function ExpiredSession() {
  const { signOut } = useClerk();
  const [error, setError] = useState(false);
  useEffect(() => {
    signOut({ redirectUrl: '/sign-in?reason=idle' }).catch(() =>
      setError(true),
    );
  }, [signOut]);
  return (
    <main className="session-recovery">
      <h1>Your session has expired.</h1>
      <p>You were inactive for 15 minutes. Sign in again to continue.</p>
      {error && (
        <button
          className="btn btn-orange"
          onClick={() => window.location.reload()}
        >
          Try sign-out again
        </button>
      )}
    </main>
  );
}
