import { useCallback, useRef } from 'react';

export function useHistory(initialPresent) {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const presentRef = useRef(initialPresent);

  const setPresent = useCallback((next) => {
    pastRef.current.push(presentRef.current);
    presentRef.current = next;
    futureRef.current = [];
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return presentRef.current;
    const prev = pastRef.current.pop();
    futureRef.current.unshift(presentRef.current);
    presentRef.current = prev;
    return presentRef.current;
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return presentRef.current;
    const next = futureRef.current.shift();
    pastRef.current.push(presentRef.current);
    presentRef.current = next;
    return presentRef.current;
  }, []);

  const reset = useCallback((nextPresent) => {
    pastRef.current = [];
    futureRef.current = [];
    presentRef.current = nextPresent;
  }, []);

  const getPresent = useCallback(() => presentRef.current, []);

  return { getPresent, setPresent, undo, redo, reset };
}
