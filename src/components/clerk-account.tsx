'use client';
import {
  SignIn,
  SignUp,
  UserProfile,
  useAuth,
  UserButton,
} from '@clerk/nextjs';
export function ClerkAccount({
  mode,
  ready,
}: {
  mode: 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password';
  ready: boolean;
}) {
  if (!ready)
    return (
      <div className="auth-card">
        <h1>Your seller account</h1>
        <div className="setup-note">
          Seller accounts are not connected yet. Add complete, matching Clerk
          API keys to .env.local. Example keys and ellipses will not work.
        </div>
      </div>
    );
  return <ConnectedAccount mode={mode} />;
}
function ConnectedAccount({
  mode,
}: {
  mode: 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password';
}) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded)
    return (
      <div className="auth-card clerk-account" role="status">
        Loading your account…
      </div>
    );
  if (isSignedIn && mode !== 'update-password')
    return (
      <div className="auth-card clerk-account">
        <h1>You’re signed in.</h1>
        <p>
          Continue to your seller workspace, or use the account menu to sign
          out.
        </p>
        <UserButton />
        <a className="btn btn-orange" href="/dashboard" target="_top">
          Open dashboard ↗
        </a>
      </div>
    );
  const appearance = {
    variables: {
      colorPrimary: '#f45b2b',
      borderRadius: '6px',
      fontFamily: 'inherit',
    },
    elements: {
      cardBox: { width: '100%' },
      rootBox: { width: '100%' },
      form: { width: '100%' },
      formFieldRow: { width: '100%' },
      formFieldInput: {
        width: '100%',
        minHeight: '40px',
        boxSizing: 'border-box' as const,
      },
      formButtonPrimary: { width: '100%', minHeight: '40px' },
      socialButtonsBlockButton: { width: '100%', minHeight: '40px' },
    },
  };
  return (
    <div className="auth-card clerk-account">
      {mode === 'sign-up' ? (
        <SignUp
          routing="hash"
          signInUrl="/sign-in"
          forceRedirectUrl="/auth/complete"
          appearance={appearance}
        />
      ) : mode === 'update-password' ? (
        <UserProfile routing="hash" appearance={appearance} />
      ) : (
        <SignIn
          routing="hash"
          signUpUrl="/sign-up"
          forceRedirectUrl="/auth/complete"
          appearance={appearance}
        />
      )}
    </div>
  );
}
