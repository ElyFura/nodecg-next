/**
 * React Hooks for NodeCG Replicants
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Replicant, ReplicantOptions } from './replicant-client.js';

/**
 * React Hook to use a NodeCG Replicant with real-time synchronization
 *
 * @param name - Name of the replicant
 * @param options - Replicant options including defaultValue and namespace
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * ```tsx
 * const [count, setCount] = useReplicant<number>('count', { defaultValue: 0 });
 *
 * return (
 *   <button onClick={() => setCount(count + 1)}>
 *     Count: {count}
 *   </button>
 * );
 * ```
 */
export function useReplicant<T = unknown>(
  name: string,
  options?: ReplicantOptions<T>
): [T | undefined, (value: T) => void] {
  const replicantRef = useRef<Replicant<T> | null>(null);
  const [value, setValue] = useState<T | undefined>(options?.defaultValue);

  // Initialize replicant on mount
  useEffect(() => {
    const rep = new Replicant<T>(name, options);
    replicantRef.current = rep;

    // Listen for changes
    const handleChange = (newValue: T) => {
      setValue(newValue);
    };

    rep.on(handleChange);

    // Cleanup on unmount
    return () => {
      rep.off(handleChange);
      rep.destroy();
      replicantRef.current = null;
    };
  }, [name, options?.namespace]); // Only recreate if name or namespace changes

  // Setter function
  const setReplicantValue = useCallback((newValue: T) => {
    if (replicantRef.current) {
      replicantRef.current.value = newValue;
    }
  }, []);

  return [value, setReplicantValue];
}

/**
 * React Hook to get a read-only replicant value
 *
 * @param name - Name of the replicant
 * @param options - Replicant options including defaultValue and namespace
 * @returns Current replicant value
 *
 * @example
 * ```tsx
 * const count = useReplicantValue<number>('count', { defaultValue: 0 });
 *
 * return <div>Count: {count}</div>;
 * ```
 */
export function useReplicantValue<T = unknown>(
  name: string,
  options?: ReplicantOptions<T>
): T | undefined {
  const [value] = useReplicant<T>(name, options);
  return value;
}

/**
 * React Hook to get the replicant instance directly
 * Useful for advanced use cases where you need direct access to the replicant
 *
 * @param name - Name of the replicant
 * @param options - Replicant options including defaultValue and namespace
 * @returns Replicant instance
 *
 * @example
 * ```tsx
 * const countReplicant = useReplicantInstance<number>('count', { defaultValue: 0 });
 *
 * // Access value and revision
 * console.log(countReplicant.value, countReplicant.revision);
 *
 * // Set value
 * countReplicant.value = 42;
 * ```
 */
export function useReplicantInstance<T = unknown>(
  name: string,
  options?: ReplicantOptions<T>
): Replicant<T> | null {
  const replicantRef = useRef<Replicant<T> | null>(null);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const rep = new Replicant<T>(name, options);
    replicantRef.current = rep;

    // Trigger re-render when replicant changes
    const handleChange = () => {
      forceUpdate({});
    };

    rep.on(handleChange);

    // Cleanup on unmount
    return () => {
      rep.off(handleChange);
      rep.destroy();
      replicantRef.current = null;
    };
  }, [name, options?.namespace]);

  return replicantRef.current;
}
