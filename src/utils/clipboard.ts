// Clipboard utility functions

// Type definition for React state setter
type SetCopiedStates = (
  value: Map<string, boolean> | ((prev: Map<string, boolean>) => Map<string, boolean>),
) => void;

/**
 * Copy text to clipboard and manage copied state
 */
export async function copyToClipboard(
  text: string,
  messageId: string,
  setCopiedStates: SetCopiedStates,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    setCopiedStates((prev) => new Map(prev.set(messageId, true)));
    setTimeout(() => {
      setCopiedStates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
    }, 2000);
  } catch (error) {
    console.error('Failed to copy text:', error);
  }
}
