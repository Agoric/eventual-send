import test from 'tape-promise/tape';
import E from '../dwim';

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

test('DWIM shortcuts', async t => {
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

test('E chains', async t => {
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
    const xC = E(x);
    t.equal(await xC.hello('Hello'), 'Hello, buddy!', 'method call works');
    t.equal(await (1, xC.y.fn)(4), 8, 'anonymous method works');
    t.equal(await xC.val, 123, 'property get');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
