import { useEffect, useState } from 'react';
import { setCurrentToken, getCurrentToken } from '../api/client';

const DEMO_USERS = [
  { name: 'Marta K.', token: 'demo-token-marta' },
  { name: 'Daniel P.', token: 'demo-token-daniel' },
  { name: 'Ingrid S.', token: 'demo-token-ingrid' },
];

export function UserSwitcher() {
  const [selected, setSelected] = useState(() => getCurrentToken() ?? DEMO_USERS[0].token);

  // Persists the default so a visitor's first click isn't an unauthenticated
  // request. Mount-only: onChange below persists every later selection.
  useEffect(() => {
    if (!getCurrentToken()) {
      setCurrentToken(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (token: string): void => {
    setSelected(token);
    setCurrentToken(token || null);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-600">
      Acting as
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-900"
      >
        <option value="">— not signed in —</option>
        {DEMO_USERS.map((user) => (
          <option key={user.token} value={user.token}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}
