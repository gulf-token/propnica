import { produce, Draft } from 'immer';
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

// ===========================================
// Immer Middleware Type Definitions
// ===========================================

type Immer = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  initializer: StateCreator<T, [...Mps, ['zustand/immer', never]], Mcs>
) => StateCreator<T, Mps, [['zustand/immer', never], ...Mcs]>;

declare module 'zustand' {
  interface StoreMutators<S, A> {
    ['zustand/immer']: WithImmer<S>;
  }
}

type Write<T, U> = Omit<T, keyof U> & U;

type WithImmer<S> = Write<S, StoreImmer<S>>;

type StoreImmer<S> = S extends {
  getState: () => infer T;
  setState: infer SetState;
}
  ? SetState extends (...args: infer Args) => infer Result
    ? {
        setState(
          nextStateOrUpdater:
            | T
            | Partial<T>
            | ((state: Draft<T>) => void),
          shouldReplace?: boolean | undefined
        ): Result;
      }
    : never
  : never;

// ===========================================
// Immer Middleware Implementation
// ===========================================

type ImmerImpl = <T>(
  initializer: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

const immerImpl: ImmerImpl = (initializer) => (set, get, store) => {
  type T = ReturnType<typeof initializer>;

  store.setState = (updater, replace) => {
    const nextState = (
      typeof updater === 'function'
        ? produce(updater as (state: Draft<T>) => void)
        : updater
    ) as ((state: T) => T) | T | Partial<T>;

    return set(nextState as T, replace as boolean | undefined);
  };

  return initializer(store.setState as typeof set, get, store);
};

export const immer = immerImpl as unknown as Immer;
