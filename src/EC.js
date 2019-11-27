/* global globalThis window */
/* eslint-disable no-use-before-define */
import { HandledPromise } from '.';

// Shim globalThis when we don't have it.
if (typeof globalThis === 'undefined') {
  const myGlobal = typeof window === 'undefined' ? global : window;
  myGlobal.globalThis = myGlobal;
}

const harden = (globalThis.SES && globalThis.SES.harden) || Object.freeze;

/*
Do-What-I-Mean eventual send chain proxy

If we ever do `.then` on a DWIM proxy, it behaves as if it were
a Thenable for the result thus far.

Disambiguates method calls from eventual get by looking ahead one
operation.  If it's a property get, then the prior was a get.  If
it's an apply with a thisArg, treat as a method call.  If it's an
apply with no thisArg (`(1, DWIM(x).fn)(arg)`), treat as a separate
property get and anonymous function invocation.

await DWIM(x).method(arg, arg2).foo.bar.baz(123);

This mechanism means that if a chain ends in a property get,
that get is postponed until `.then` is called, but we would
ordinarily want to do that right away.

TODO: Proper hardening and read-only invariants.
*/

const makeEC = peek =>
  harden((parent, peekingProp = undefined) => {
    const t = () => {};
    t.toString = harden(() => `[Eventual Chain]`);
    return harden(
      new Proxy(harden(t), {
        apply(_target, thisArg, argArray = undefined) {
          // Anonymous function application.
          if (!peek) {
            return EC(HandledPromise.applyFunction(parent, argArray));
          }

          if (!thisArg) {
            // Property get followed by function call.
            return EC(
              HandledPromise.applyFunction(
                HandledPromise.get(parent, peekingProp),
                argArray,
              ),
            );
          }

          // Aggregate as a method call.
          return EC(HandledPromise.applyMethod(parent, peekingProp, argArray));
        },
        get(target, p, _receiver) {
          if (p === 'then') {
            if (peek) {
              // Commit to getting the parent property.
              return harden((...args) =>
                HandledPromise.get(parent, peekingProp).then(...args),
              );
            }
            // Just provide a thenable.
            return harden((...args) => Promise.resolve(parent).then(...args));
          }

          // Symbols are not forwarded, nor are Object.prototype methods.
          if (typeof p === 'symbol' || p in Object.prototype) {
            return Reflect.get(target, p);
          }

          // Not a method, so use as a property to peek further.
          let newParent = parent;
          if (peek) {
            newParent = HandledPromise.get(parent, peekingProp);
          }
          return ECPeek(newParent, p);
        },
        has(_target, p) {
          // We ensure thenability.
          return p === 'then';
        },
        enumerate(_target) {
          return ['then'];
        },
        deleteProperty(_target, _prop) {
          return false;
        },
      }),
    );
  });

const ECPeek = makeEC(true);
const EC = makeEC();

export default EC;
