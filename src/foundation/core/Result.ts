export type Success<T> = { isSuccess: true; isFailure: false; getValue: () => T; error?: never };
export type Failure<E = string> = { isSuccess: false; isFailure: true; getError: () => E; getValue: () => never; value?: never };
export type Result<T, E = string> = Success<T> | Failure<E>;

export const ok = <T>(value: T): Success<T> => ({
  isSuccess: true,
  isFailure: false,
  getValue: () => value,
});

export const fail = <E>(error: E): Failure<E> => ({
  isSuccess: false,
  isFailure: true,
  getError: () => error,
  getValue: () => { throw new Error("Cannot get value from a failed Result"); },
});
