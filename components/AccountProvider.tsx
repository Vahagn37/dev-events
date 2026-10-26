'use client';

import { Suspense, createContext, useCallback, useContext, useEffect, useRef, useState, type RefObject } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { PublicUser } from '@/database';
import type { AuthState } from '@/lib/actions/auth.actions';

type AccountValue = {
  user: PublicUser | null | undefined;
  setUser: (user: PublicUser | null) => void;
};

const AccountContext = createContext<AccountValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<PublicUser | null | undefined>(undefined);
  const generation = useRef(0);

  const setUser = useCallback((next: PublicUser | null) => {
    generation.current += 1;
    setUserState(next);
  }, []);

  return (
    <AccountContext.Provider value={{ user, setUser }}>
      <Suspense fallback={null}>
        <SessionSync generation={generation} setUserState={setUserState} />
      </Suspense>
      {children}
    </AccountContext.Provider>
  );
}

function SessionSync({
  generation,
  setUserState,
}: {
  generation: RefObject<number>;
  setUserState: (user: PublicUser | null) => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const gen = generation.current;
    let cancelled = false;

    fetch('/api/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { user?: PublicUser | null }) => {
        if (cancelled || gen !== generation.current) return;
        setUserState(data.user ?? null);
      })
      .catch(() => {
        if (cancelled || gen !== generation.current) return;
        setUserState(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, generation, setUserState]);

  return null;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used within AccountProvider');
  return value;
}

export function useSignedIn(state: AuthState) {
  const { setUser } = useAccount();
  const router = useRouter();
  const sent = useRef<AuthState>(null);

  useEffect(() => {
    if (!state || !('user' in state) || sent.current === state) return;
    sent.current = state;
    setUser(state.user);
    router.push(state.next);
    router.refresh();
  }, [state, setUser, router]);
}
