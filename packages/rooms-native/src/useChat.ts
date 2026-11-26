// Re-renders a screen whenever the company's chat client changes (sync, sends, reads).
import { useEffect, useState } from 'react';
import type { ChatClient } from './matrix/client';

export function useChatClient(client: ChatClient | null): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!client) return undefined;
    setVersion((v) => v + 1);
    return client.subscribe(() => setVersion((v) => v + 1));
  }, [client]);
  return version;
}
