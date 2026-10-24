// Shared by the React dashboard shell and its standalone HTML workspace.
// Status polling never extends the deadline; only trusted user input does.
export function startIdleSession({ onState, onExpired }) {
  let stopped = false,
    expired = false,
    pending = false,
    deadline = 0;
  let clockOffset = 0,
    lastTouch = -Infinity,
    state = { checking: true, remaining: Infinity, error: '' };
  const documents = new Set(),
    frames = new Set();
  const controllers = new Set();
  const emit = (changes) => {
    state = { ...state, ...changes };
    if (!stopped) onState(state);
  };
  const expire = () => {
    if (stopped || expired) return;
    expired = true;
    onExpired();
  };
  async function sync(touch = false, blocking = false) {
    if (stopped || expired || pending) return;
    pending = true;
    if (blocking) emit({ checking: true });
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/session/activity', {
        method: touch ? 'POST' : 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (stopped) return;
      if (response.status === 401) {
        expire();
        return;
      }
      if (!response.ok) throw new Error('Session check failed');
      const data = await response.json();
      if (
        !data.active ||
        !Number.isFinite(data.expiresAt) ||
        !Number.isFinite(data.serverNow)
      )
        throw new Error('Invalid session state');
      clockOffset = data.serverNow - Date.now();
      deadline = data.expiresAt;
      if (touch) lastTouch = Date.now();
      emit({
        checking: false,
        error: '',
        remaining: Math.max(0, deadline - Date.now() - clockOffset),
      });
    } catch {
      if (!stopped)
        emit({
          error:
            'Couldn’t check your session. Check your connection and try again.',
        });
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
      pending = false;
    }
  }
  function activity(event) {
    if (!event.isTrusted || document.hidden || state.checking || expired)
      return;
    if (deadline <= Date.now() + clockOffset) {
      void sync(false, true);
      return;
    }
    if (Date.now() - lastTouch >= 15000) void sync(true);
  }
  const inputEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  function attach(doc) {
    if (documents.has(doc)) return;
    documents.add(doc);
    inputEvents.forEach((name) =>
      doc.addEventListener(name, activity, { passive: true, capture: true }),
    );
  }
  function attachFrame(event) {
    try {
      if (event.currentTarget.contentDocument)
        attach(event.currentTarget.contentDocument);
    } catch {
      /* Clerk's cross-origin frames are not inspected. */
    }
  }
  function scanFrames() {
    document.querySelectorAll('iframe').forEach((frame) => {
      if (!frames.has(frame)) {
        frames.add(frame);
        frame.addEventListener('load', attachFrame);
      }
      try {
        if (frame.contentDocument) attach(frame.contentDocument);
      } catch {
        /* Different origin. */
      }
    });
  }
  function resume() {
    if (!document.hidden) void sync(false, true);
  }
  function frameExpiry(event) {
    if (
      event.origin === location.origin &&
      event.data?.type === 'heaven:idle-expired'
    )
      expire();
  }
  attach(document);
  scanFrames();
  const observer = new MutationObserver(scanFrames);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);
  window.addEventListener('heaven:idle-expired', expire);
  window.addEventListener('message', frameExpiry);
  const tick = setInterval(() => {
    if (stopped || expired || !deadline) return;
    const remaining = Math.max(0, deadline - Date.now() - clockOffset);
    emit({ remaining });
    if (!remaining && !pending) void sync(false, true);
  }, 1000);
  const poll = setInterval(() => {
    if (!document.hidden) void sync();
  }, 30000);
  void sync(false, true);
  return {
    stay: () => sync(true),
    retry: () => sync(false, true),
    stop() {
      stopped = true;
      clearInterval(tick);
      clearInterval(poll);
      observer.disconnect();
      controllers.forEach((controller) => controller.abort());
      documents.forEach((doc) =>
        inputEvents.forEach((name) =>
          doc.removeEventListener(name, activity, true),
        ),
      );
      frames.forEach((frame) => frame.removeEventListener('load', attachFrame));
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('heaven:idle-expired', expire);
      window.removeEventListener('message', frameExpiry);
    },
  };
}

export function mountStandaloneIdleSession() {
  if (window.parent !== window) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/storefront/session-idle.css';
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.className = 'idle-dialog';
  dialog.innerHTML =
    '<h2>Your seller session</h2><p class="idle-message"></p><p class="idle-error" role="status"></p><button type="button" class="idle-stay">Stay signed in</button><button type="button" class="idle-retry">Retry connection</button><button type="button" class="idle-signout">Sign out</button>';
  document.body.append(dialog);
  dialog.addEventListener('cancel', (event) => event.preventDefault());
  const signout = async () => {
    document.body.replaceChildren();
    const screen = document.createElement('main');
    screen.className = 'idle-screen';
    screen.innerHTML =
      '<div class="idle-dialog"><h2>Your session has expired.</h2><p>Sign in again to continue. Unsaved changes may not have been saved.</p><button type="button">Continue to sign in</button></div>';
    document.body.append(screen);
    const finish = async () => {
      try {
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error();
        location.replace('/sign-in?reason=idle');
      } catch {
        screen.querySelector('button').textContent = 'Retry sign-out';
      }
    };
    screen.querySelector('button').onclick = finish;
    await finish();
  };
  const controller = startIdleSession({
    onState: ({ checking, remaining, error }) => {
      const show = checking || remaining <= 60000;
      dialog.querySelector('.idle-message').textContent = checking
        ? 'Checking your secure session…'
        : `You’ll be signed out in ${Math.ceil(remaining / 1000)} seconds because of inactivity. Save your work or stay signed in.`;
      dialog.querySelector('.idle-error').textContent = error;
      dialog.querySelector('.idle-stay').hidden = checking;
      dialog.querySelector('.idle-retry').hidden = !error;
      if (show && !dialog.open) dialog.showModal();
      else if (!show && dialog.open) dialog.close();
    },
    onExpired: () => {
      controller.stop();
      void signout();
    },
  });
  dialog.querySelector('.idle-stay').onclick = () => controller.stay();
  dialog.querySelector('.idle-retry').onclick = () => controller.retry();
  dialog.querySelector('.idle-signout').onclick = () => {
    controller.stop();
    void signout();
  };
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) controller.stop();
  });
}
