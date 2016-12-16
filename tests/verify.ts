/* eslint no-unused-expressions:0 */
/* global describe, it, expect */

/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
import { expect, use } from 'chai';
import * as chaiSubset from 'chai-subset';
import { verify } from '../index';
import VerificationCondition from '../src/vc';

use(chaiSubset);

let vcs: Array<VerificationCondition>;
function helper(description: string, expected: string, debug: boolean = false) {
  const body = async () => {
    const vc = vcs.find(v => v.description === description);
    expect(vc).to.not.be.undefined;
    if (!vc) throw new Error();
    await vc.solve();
    if (debug) vc.debugOut();
    expect(vc.result().status).to.be.eql(expected);
  };
  if (debug) {
    it.only(description.replace(/\n/g, ' '), body);
  } else {
    it(description.replace(/\n/g, ' '), body);
  }
}

function verified(description: string) { helper(description, 'verified'); }
function incorrect(description: string) { helper(description, 'incorrect'); }
function tested(description: string) { helper(description, 'tested'); }

function verifiedDebug(description: string) { helper(description, 'verified', true); }
function incorrectDebug(description: string) { helper(description, 'incorrect', true); }
function testedDebug(description: string) { helper(description, 'tested', true); }

describe('max()', () => {

  const code = (() => {
    function max(a, b) {
      requires(typeof(a) == 'number');
      requires(typeof(b) == 'number');
      if (a >= b) {
        return a;
      } else {
        return b;
      }
      ensures(max(a, b) >= a);
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  it('finds a verification conditions', () => {
    expect(vcs).to.have.length(1);
  });

  it('has a description', async () => {
    expect(vcs[0].description).to.be.eql('max:\n(max(a, b) >= a)');
  });

  verified('max:\n(max(a, b) >= a)');
});

describe('max() with missing pre', () => {

  const code = (() => {
    function max(a, b) {
      requires(typeof(b) == 'number');
      if (a >= b) {
        return a;
      } else {
        return b;
      }
      ensures(max(a, b) >= a);
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  tested('max:\n(max(a, b) >= a)');

  it('returns counter-example', async () => {
    await vcs[0].solve();
    expect(vcs[0].getModel()).to.containSubset({
      a: false,
      b: 0,
    });
  });
});

describe('counter', () => {

  const code = (() => {
    let counter = 0;
    invariant(typeof counter == 'number');
    invariant(counter >= 0);

    function increment() {
      counter++;
      ensures(counter > old(counter));
    }

    function decrement() {
      if (counter > 0) counter--;
      ensures(old(counter) > 0 ? counter < old(counter) : counter == old(counter));
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('initially:\n(typeof(counter) == "number")');
  verified('initially:\n(counter >= 0)');
  verified('increment:\n(counter > old(counter))');
  verified('increment:\n(typeof(counter) == "number")');
  verified('increment:\n(counter >= 0)');
  verified('decrement:\n(old(counter) > 0) ? (counter < old(counter)) : (counter == old(counter))');
  verified('decrement:\n(typeof(counter) == "number")');
  verified('decrement:\n(counter >= 0)');
});

describe('simple steps', () => {

  const code = (() => {
    let i = 0;
    assert(i < 1);
    i = 3;
    assert(i < 2);
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('assert:\n(i < 1)');
  incorrect('assert:\n(i < 2)');
});

describe('loop', () => {

  const code = (() => {
    let i = 0;

    while (i < 5) {
      invariant(i <= 5);
      i++;
    }

    assert(i === 5);
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('invariant on entry:\n(i <= 5)');
  verified('invariant maintained:\n(i <= 5)');
  verified('assert:\n(i === 5)');
});

describe('loop with missing invariant', () => {

  const code = (() => {
    let i = 0;

    while (i < 5) {
      i++;
    }

    assert(i === 5);
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  tested('assert:\n(i === 5)');
});

describe('sum', () => {

  const code = (() => {
    function sumTo(n) {
      requires(typeof n == 'number');
      requires(n >= 0);

      let i = 0, s = 0;
      while (i < n) {
        invariant(i <= n);
        invariant(s == (i + 1) * i / 2);
        i++;
        s = s + i;
      }
      return s;

      ensures(sumTo(n) == (n + 1) * n / 2);
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('sumTo:\ninvariant on entry:\n(i <= n)');
  verified('sumTo:\ninvariant on entry:\n(s == (((i + 1) * i) / 2))');
  verified('sumTo:\ninvariant maintained:\n(i <= n)');
  verified('sumTo:\ninvariant maintained:\n(s == (((i + 1) * i) / 2))');
  verified('sumTo:\n(sumTo(n) == (((n + 1) * n) / 2))');
});


describe('global call', () => {

  const code = (() => {
    function inc(n) {
      requires(typeof(n) == 'number');
      return n + 1;
      ensures(inc(n) > n);
    }

    let i = 3;
    let j = inc(i);
    assert(j > 3);
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('inc:\nrequires:\n(typeof(n) == "number")');
  verified('assert:\n(j > 3)');
  verified('inc:\n(inc(n) > n)');

});

describe('inline global call', () => {

  const code = (() => {
    function inc(n) {
      return n + 1;
    }
    function inc2(n) {
      return inc(inc(n));
    }

    let i = 3;
    let j = inc(i);
    assert(j == 4);
    let k = inc2(i);
    assert(k == 5);
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('assert:\n(j == 4)');
  tested('assert:\n(k == 5)');
});

describe('post conditions global call', () => {

  const code = (() => {
    function inc(n) {
      requires(typeof(n) == 'number');
      return n + 1;
      ensures(inc(n) > n);
    }
    function inc2(n) {
      return inc(inc(n));
    }

    let i = 3;
    let j = inc(i);
    assert(j == 4);
    let k = inc2(i);
    assert(k >= 5);
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('inc:\nrequires:\n(typeof(n) == "number")');
  incorrect('inc2:\ninc:\nrequires:\n(typeof(n) == "number")');
  verified('assert:\n(j == 4)');
  verified('assert:\n(k >= 5)');
});

describe('fibonacci increasing', () => {

  const code = (() => {
    function fib(n) {
      requires(typeof(n) == 'number');
      requires(n >= 0);
      if (n <= 1) return 1;
      return fib(n - 1) + fib(n - 2);
      ensures(fib(n) >= n);
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('fib:\nfib:\nrequires:\n(typeof(n) == "number")');
  verified('fib:\nfib:\nrequires:\n(n >= 0)');
  verified('fib:\n(fib(n) >= n)');
});

describe('buggy fibonacci', () => {

  const code = (() => {
    function fib(n) {
      requires(typeof(n) == 'number');
      requires(n >= 0);
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
      ensures(fib(n) >= n);
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('fib:\nfib:\nrequires:\n(typeof(n) == "number")');
  verified('fib:\nfib:\nrequires:\n(n >= 0)');
  incorrect('fib:\n(fib(n) >= n)');
  it('returns counter-example', async () => {
    await vcs[4].solve();
    expect(vcs[4].getModel()).to.containSubset({
      n: 2
    });
  });
});

describe('fibonacci increasing (external proof)', () => {

  const code = (() => {
    function fib(n) {
      if (n <= 1) return 1;
      return fib(n - 1) + fib(n - 2);
    }

    function fibInc(n) {
      requires(typeof(n) == 'number');
      requires(n >= 0);
      fib(n);
      if (n >= 2) {
        fibInc(n - 1); fib(n - 1);
        fibInc(n - 2); fib(n - 2);
      }
      ensures(fib(n) >= n);
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('fibInc:\nfibInc:\nrequires:\n(typeof(n) == "number")');
  verified('fibInc:\nfibInc:\nrequires:\n(n >= 0)');
  verified('fibInc:\n(fib(n) >= n)');
});

describe.skip('higher-order functions', () => {

  const code = (() => {
    function map(arr, f) {
      if (arr.length == 0) return [];
      return [f(arr[0])].concat(map(arr.slice(1), f));
    }

    function mapLen(arr, f) {
      requires(arr.constructor == Array);
      map(arr, f);
      if (arr.length > 0) {
        mapLen(arr.slice(1));
        map(arr.slice(1), f);
      }
      ensures(map(f, arr).length == arr.length);
    }
  }).toString();

  beforeEach(() => {
    const t = verify(code.substring(14, code.length - 2));
    if (!t) throw new Error('failed to find verification conditions');
    vcs = t;
  });

  verified('mapLen:\nmapLen:\nrequires:\n(arr.constructor == Array)');
  verified('mapLen:\n(map(f, arr).length == arr.length)');
});
