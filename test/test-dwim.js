import test from 'tape-promise/tape';
import E from '../src/dwim';

test('DWIM method calls', async t => {
  try {
    const x = {
      double(n) {
        return 2 * n;
      },
    };
    const d = E(x).double(6);
    t.equal(typeof d.then, 'function', 'return is a thenable');
    t.equal(await d, 12, 'method call works');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('DWIM chains', async t => {
  try {
    const x = {
      name: 'buddy',
      val: 123,
      y: Object.freeze({
        val2: 456,
        name2: 'holly',
        fn: n => 2 * n,
      }),
      hello(greeting) {
        return `${greeting}, ${this.name}!`;
      },
    };
    t.equal(await E(x).hello('Hello'), 'Hello, buddy!', 'method call works');
    t.equal(await (1, E(x).y.fn)(4), 8, 'anonymous method works');
    t.equal(await E(x).val, 123, 'property get');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('DWIM readonly', async t => {
  try {
    const a1 = E({});
    // eslint-disable-next-line new-cap
    t.throws(() => new a1(), TypeError, 'cannot construct');
    t.isNot(+a1, +a1, 'no valueof intercept');
    t.equals(String(a1), '[DWIM Proxy]', 'no toString intercept');
    t.equals(`${a1}`, '[DWIM Proxy]', 'no string tag intercept');
    t.throws(() => (a1.foo = 'bar'), 'assignment fails');
    t.assert(!Reflect.setPrototypeOf(a1, Array), 'set prototype fails');
    t.assert(!Object.isExtensible(a1), 'not extensible');
    t.throws(() => delete a1.then, 'delete fails');

    const a2 = a1.fooBar;
    t.throws(() => new a2(), TypeError, 'cannot construct');
    t.isNot(+a2, +a2, 'no valueof intercept');
    t.equals(String(a2), '[DWIM Proxy]', 'no toString intercept');
    t.equals(`${a2}`, '[DWIM Proxy]', 'no string tag intercept');
    t.throws(() => (a2.foo = 'bar'), 'assignment fails');
    t.assert(!Reflect.setPrototypeOf(a2, Array), 'set prototype fails');
    t.assert(!Object.isExtensible(a2), 'not extensible');
    t.throws(() => delete a2.then, 'delete fails');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

