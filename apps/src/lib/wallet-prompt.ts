let openPrompts = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeWalletPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isWalletPromptOpen(): boolean {
  return openPrompts > 0;
}

export async function withWalletPrompt<T>(run: () => Promise<T>): Promise<T> {
  openPrompts += 1;
  emit();
  try {
    return await run();
  } finally {
    openPrompts -= 1;
    emit();
  }
}
