/**
 * NodeCG API Context for Bundle Extensions
 * Provides the nodecg object that extensions receive
 */

import type { Logger } from '@nodecg/types';
import type { ReplicantService } from '../replicant';

export interface NodeCGExtensionAPI {
  bundleName: string;
  log: Logger;
  Replicant: <T = unknown>(name: string, opts?: ReplicantOptions) => ReplicantProxy<T>;
}

export interface ReplicantOptions {
  defaultValue?: unknown;
  persistent?: boolean;
  schemaPath?: string;
}

export interface ReplicantProxy<T = unknown> {
  value: T;
  on(event: 'change', listener: (newValue: T, oldValue?: T) => void): void;
  once(event: 'change', listener: (newValue: T, oldValue?: T) => void): void;
  removeListener(event: 'change', listener: (newValue: T, oldValue?: T) => void): void;
}

/**
 * Create NodeCG API context for a bundle extension
 */
export function createNodeCGContext(
  bundleName: string,
  logger: Logger,
  replicantService: ReplicantService | null
): NodeCGExtensionAPI {
  return {
    bundleName,
    log: logger,

    /**
     * Create or get a replicant
     */
    Replicant: <T = unknown>(name: string, opts?: ReplicantOptions): ReplicantProxy<T> => {
      if (!replicantService) {
        logger.warn(
          `ReplicantService not available, creating mock replicant: ${bundleName}:${name}`
        );

        // Return a mock replicant that stores value locally
        let mockValue = opts?.defaultValue as T;
        const changeListeners: Array<(newValue: T, oldValue?: T) => void> = [];

        return {
          get value() {
            return mockValue;
          },
          set value(newValue: T) {
            const oldValue = mockValue;
            mockValue = newValue;
            changeListeners.forEach((listener) => listener(newValue, oldValue));
          },
          on(event: 'change', listener: (newValue: T, oldValue?: T) => void) {
            if (event === 'change') {
              changeListeners.push(listener);
            }
          },
          once(event: 'change', listener: (newValue: T, oldValue?: T) => void) {
            if (event === 'change') {
              const onceListener = (newValue: T, oldValue?: T) => {
                listener(newValue, oldValue);
                const index = changeListeners.indexOf(onceListener);
                if (index > -1) {
                  changeListeners.splice(index, 1);
                }
              };
              changeListeners.push(onceListener);
            }
          },
          removeListener(event: 'change', listener: (newValue: T, oldValue?: T) => void) {
            if (event === 'change') {
              const index = changeListeners.indexOf(listener);
              if (index > -1) {
                changeListeners.splice(index, 1);
              }
            }
          },
        };
      }

      // Use ReplicantService for real replicant management
      const namespace = bundleName;
      const fullName = `${namespace}:${name}`;
      const changeListeners: Array<(newValue: T, oldValue?: T) => void> = [];
      let cachedValue: T = opts?.defaultValue as T;

      // Initialize replicant with default value if provided
      if (opts?.defaultValue !== undefined) {
        replicantService
          .get<T>(namespace, name)
          .then(async (existing) => {
            if (!existing) {
              // Create with default value
              await replicantService.set<T>(namespace, name, opts.defaultValue as T);
              cachedValue = opts.defaultValue as T;
              logger.debug(`Created replicant: ${fullName} with default value`);
            } else {
              // Use existing value
              cachedValue = existing.value;
              logger.debug(`Loaded existing replicant: ${fullName}`);
            }
          })
          .catch((error) => {
            logger.error(`Failed to initialize replicant ${fullName}:`, error);
          });
      } else {
        // Load existing value or use undefined
        replicantService
          .get<T>(namespace, name)
          .then((existing) => {
            if (existing) {
              cachedValue = existing.value;
              logger.debug(`Loaded existing replicant: ${fullName}`);
            }
          })
          .catch((error) => {
            logger.error(`Failed to load replicant ${fullName}:`, error);
          });
      }

      // Listen for changes from other sources (other extensions, dashboard, etc.)
      const changeEventName = `change:${namespace}:${name}`;
      const internalChangeHandler = (data: { value: T; oldValue?: T }) => {
        const oldValue = cachedValue;
        cachedValue = data.value;

        // Notify listeners
        changeListeners.forEach((listener) => {
          try {
            listener(data.value, oldValue);
          } catch (error) {
            logger.error(`Error in replicant change listener for ${fullName}:`, error);
          }
        });
      };

      replicantService.on(changeEventName, internalChangeHandler);

      // Return proxy with synchronous-like interface
      return {
        get value(): T {
          return cachedValue;
        },
        set value(newValue: T) {
          const oldValue = cachedValue;
          cachedValue = newValue;

          // Update in service (async, but don't wait)
          replicantService
            .set<T>(namespace, name, newValue)
            .then(() => {
              logger.debug(
                `Replicant updated: ${fullName} from "${JSON.stringify(oldValue)}" to "${JSON.stringify(newValue)}"`
              );
            })
            .catch((error) => {
              logger.error(`Failed to update replicant ${fullName}:`, error);
            });
        },
        on(event: 'change', listener: (newValue: T, oldValue?: T) => void) {
          if (event === 'change') {
            changeListeners.push(listener);
          }
        },
        once(event: 'change', listener: (newValue: T, oldValue?: T) => void) {
          if (event === 'change') {
            const onceListener = (newValue: T, oldValue?: T) => {
              listener(newValue, oldValue);
              const index = changeListeners.indexOf(onceListener);
              if (index > -1) {
                changeListeners.splice(index, 1);
              }
            };
            changeListeners.push(onceListener);
          }
        },
        removeListener(event: 'change', listener: (newValue: T, oldValue?: T) => void) {
          if (event === 'change') {
            const index = changeListeners.indexOf(listener);
            if (index > -1) {
              changeListeners.splice(index, 1);
            }
          }
        },
      };
    },
  };
}
