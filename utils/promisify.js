/**
 * Migrate your consumer code away from jQuery promises.
 * 
 * @param promise jquery promise
 */
export function promisify(promise) {
  if (promise instanceof Promise) {
    return promise;
  }
  return new Promise((resolve, reject) => {
    promise.then(resolve).fail(reject);
  });
}

/**
 * Migrate your consumer code away from jQuery promises.
 * 
 * @param promise ES6 promise
 */
export function $promisify(promise) {
  if (promise.always) {
    return promise;
  }
  return $.Deferred(function(deferred) {
    promise.then(deferred.resolve, deferred.reject);
  }).promise();
}