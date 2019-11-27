import test from 'tape-promise/tape';
import EC from '../src/EC';

test('EC method calls', async t => {
  try {
    const x = {
      double(n) {
        return 2 * n;
      },
    };
    const d = EC(x).double(6);
    t.equal(typeof d.then, 'function', 'return is a thenable');
    t.equal(await d, 12, 'method call works');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('EC chains', async t => {
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
    const h = EC(x).hello('Hello');
    t.equal(typeof h.then, 'function', 'method call is thenable');
    t.equal(await h, 'Hello, buddy!', 'method call works');
    const a = (1, EC(x).y.fn)(4);
    t.equal(typeof a.then, 'function', 'anonymous method is thenable');
    t.equal(await a, 8, 'anonymous method works');
    const v = EC(x).val;
    t.equal(typeof v.then, 'function', 'property get is thenable');
    t.equal(await v, 123, 'property get');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('EC local evaluation', async t => {
  try {
    const a = EC(num => `foo${num}`);
    await t.rejects(a.apply(null, [123]), TypeError, 'no apply method');
    t.equals(
      await Function.apply.apply(a, [null, [987]]),
      'foo987',
      'prototype call succeeds',
    );
    t.equals(await a(123), 'foo123', 'explicit call succeeds');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('EC readonly', async t => {
  try {
    const a1 = EC({});
    // eslint-disable-next-line new-cap
    t.throws(() => new a1(), TypeError, 'cannot construct');
    t.isNot(+a1, +a1, 'no valueof intercept');
    t.equals(String(a1), '[Eventual Chain]', 'no toString intercept');
    t.equals(`${a1}`, '[Eventual Chain]', 'no string tag intercept');
    t.throws(() => (a1.foo = 'bar'), 'assignment fails');
    t.assert(!Reflect.setPrototypeOf(a1, Array), 'set prototype fails');
    t.assert(!Object.isExtensible(a1), 'not extensible');
    t.throws(() => delete a1.then, 'delete fails');

    const a2 = a1.fooBar;
    // eslint-disable-next-line new-cap
    t.throws(() => new a2(), TypeError, 'cannot construct');
    t.isNot(+a2, +a2, 'no valueof intercept');
    t.equals(String(a2), '[Eventual Chain]', 'no toString intercept');
    t.equals(`${a2}`, '[Eventual Chain]', 'no string tag intercept');
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
