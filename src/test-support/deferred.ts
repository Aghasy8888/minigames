export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
};

/** A promise the test settles by hand, to control when an async dependency answers. */
export function deferred<T>(): Deferred<T> {
  let settle: Pick<Deferred<T>, 'resolve' | 'reject'> | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    settle = { resolve, reject };
  });

  return {
    promise,
    resolve: (value) => settle?.resolve(value),
    reject: (reason) => settle?.reject(reason),
  };
}
