import { HandledPromise } from '.';

const harden = Object.freeze;

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

export default function DWIM(x, parentProp = undefined) {
  const t = () => {};
  t.toString = harden(() => `[DWIM Proxy]`);
  return harden(
    new Proxy(harden(t), {
      apply(_target, thisArg, argArray = undefined) {
        // Anonymous function application.
        if (parentProp === undefined) {
          return DWIM(HandledPromise.applyFunction(x, argArray));
        }

        if (!thisArg) {
          // Property get followed by function call.
          return DWIM(
            HandledPromise.applyFunction(
              HandledPromise.get(x, parentProp),
              argArray,
            ),
          );
        }

        // Aggregate as a method call.
        return DWIM(HandledPromise.applyMethod(x, parentProp, argArray));
      },
      get(target, p, _receiver) {
        if (p === 'then') {
          if (parentProp === undefined) {
            // Just provide a thenable.
            return harden((...args) => Promise.resolve(x).then(...args));
          }
          // Commit to getting the parent property.
          return harden((...args) =>
            HandledPromise.get(x, parentProp).then(...args),
          );
        }

        // We act enough like a function that prototype methods are not
        // forwarded.
        const val = Reflect.get(target, p);
        if (typeof p === 'symbol' || typeof val === 'function') {
          return val;
        }

        // Not a method, so use as a property to peek further.
        const x2 =
          parentProp === undefined ? x : HandledPromise.get(x, parentProp);
        return DWIM(x2, p);
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
}
