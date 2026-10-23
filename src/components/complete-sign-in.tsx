'use client';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
export default function CompleteSignIn() {
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (isLoaded && isSignedIn) window.location.replace('/dashboard');
  }, [isLoaded, isSignedIn]);
  return (
    <main className="session-recovery">
      <h1>Opening your workspace…</h1>
      <p role="status">
        {isLoaded && !isSignedIn
          ? 'Your sign-in did not complete. Please try again.'
          : 'Finishing your secure sign-in.'}
      </p>
      <a href={isSignedIn ? '/dashboard' : '/sign-in'}>
        {isSignedIn ? 'Open dashboard' : 'Back to sign in'}
      </a>
    </main>
  );
}
