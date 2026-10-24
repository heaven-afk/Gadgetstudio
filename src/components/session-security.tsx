'use client';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { startIdleSession } from '../../public/storefront/session-idle.js';
import { ExpiredSession } from './expired-session';
import '../../public/storefront/session-idle.css';
type IdleState = { checking: boolean; remaining: number; error: string };
export function SessionSecurity({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const { signOut } = useClerk();
  const [state, setState] = useState<IdleState>({
    checking: true,
    remaining: Infinity,
    error: '',
  });
  const [expired, setExpired] = useState(false);
  const controller = useRef<ReturnType<typeof startIdleSession> | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isLoaded) return;
    setExpired(false);
    if (!isSignedIn) return;
    setState({ checking: true, remaining: Infinity, error: '' });
    controller.current = startIdleSession({
      onState: setState,
      onExpired: () => setExpired(true),
    });
    return () => {
      controller.current?.stop();
      controller.current = null;
    };
  }, [isLoaded, isSignedIn, sessionId]);
  const warning =
    isLoaded &&
    isSignedIn &&
    !expired &&
    !state.checking &&
    state.remaining <= 60000;
  useEffect(() => {
    if (warning && !dialog.current?.open) dialog.current?.showModal();
    else if (!warning && dialog.current?.open) dialog.current.close();
  }, [warning]);
  if (expired) return <ExpiredSession />;
  return (
    <>
      {children}
      {isLoaded && isSignedIn && state.checking && (
        <div className="idle-screen">
          <div
            className="idle-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="idle-check-title"
          >
            <h2 id="idle-check-title">Checking your session…</h2>
            <p>Confirming your seller access before you continue.</p>
            {state.error && (
              <>
                <p className="idle-error" role="status">
                  {state.error}
                </p>
                <button onClick={() => controller.current?.retry()}>
                  Retry connection
                </button>
                <button onClick={() => setExpired(true)}>Sign out</button>
              </>
            )}
          </div>
        </div>
      )}
      <dialog
        ref={dialog}
        className="idle-dialog"
        aria-labelledby="idle-warning-title"
        onCancel={(event) => event.preventDefault()}
      >
        <h2 id="idle-warning-title">Still working?</h2>
        <p>
          You’ll be signed out in {Math.ceil(state.remaining / 1000)} seconds
          because of inactivity. Save your work or stay signed in.
        </p>
        {state.error && (
          <p className="idle-error" role="status">
            {state.error}
          </p>
        )}
        <button onClick={() => controller.current?.stay()}>
          Stay signed in
        </button>
        <button
          onClick={() =>
            signOut({ redirectUrl: '/sign-in' }).catch(() => setExpired(true))
          }
        >
          Sign out
        </button>
      </dialog>
    </>
  );
}
