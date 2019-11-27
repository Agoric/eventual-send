import { HandledPromise } from './src';

const harden = Object.freeze;

/*
Do-What-I-Mean eventual send proxy

If we ever do `.then` on a DWIM proxy, it behaves as if it were
a Thenable for the result thus far.

Disambiguates method calls from eventual get by looking ahead one
operation.  If next operation is an apply, it's a method call.  If
it's a property get, then the prior was a get.

await DWIM(x).method(arg, arg2).foo.bar.baz(123);

This mechanism means the last property get in a chain is postponed
until .then is called, but we would ordinarily want to do that
right away.

TODO: Proper hardening and read-only invariants.
*/
export default function DWIM(x) {
  return new Proxy(harden({}), {
    has(target, p) {
      // Always a Thenable.
      return p === 'then';
    },
    set(_target, _p, _value, _receiver) {
      // Immutable.
      return false;
    },
    deleteProperty(_target, _p) {
      return false;
    },
    apply(_target, _thisArg, argArray = undefined) {
      // Anonymous function application.
      return DWIM(HandledPromise.applyFunction(x, argArray));
    },
    get(_target, p, _receiver) {
      if (p === 'then') {
        // Register callbacks on our chain.
        return (...args) => Promise.resolve(x).then(...args);
      }
      // eslint-disable-next-line no-use-before-define
      return DWIMPeek(x, p);
    },
  });
}

function DWIMPeek(x, propName) {
  return new Proxy(harden(() => {}), {
    has(_target, p) {
      // We ensure thenability.
      return p === 'then';
    },
    apply(_target, thisArg, argArray = undefined) {
      if (!thisArg) {
        // Property get followed by function call.
        return DWIM(
          HandledPromise.applyFunction(
            HandledPromise.get(x, propName),
            argArray,
          ),
        );
      }
      // Convert to a method call.
      return DWIM(HandledPromise.applyMethod(x, propName, argArray));
    },
    get(_target, p, _receiver) {
      // Commit to looking up propName.
      if (p === 'then') {
        // Provide Thenable for propName.
        return (...args) => HandledPromise.get(x, propName).then(...args);
      }
      // Continue the chain with a new propName.
      return DWIMPeek(HandledPromise.get(x, propName), p);
    },
  });
}
