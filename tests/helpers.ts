import { expect } from 'chai';
import { verificationConditions } from '../src';
import { FreeVar } from '../src/logic';
import { log } from '../src/message';
import { plainToJSVal } from '../src/model';
import { setOptions } from '../src/options';
import VerificationCondition from '../src/verification';

declare const assert: (x: boolean) => void;
declare const ensures: (x: boolean | ((y: any) => boolean)) => void;
declare const every: (a: Array<any>, b: ((x: any) => boolean) | ((x: any, y: any) => boolean)) => boolean;
declare const invariant: (x: boolean) => void;
declare const old: (x: any) => any;
declare const pure: () => boolean;
declare const requires: (x: boolean) => void;
declare const spec: (f: any, r: (rx: any) => boolean, s: (sx: any, sy: any) => boolean) => boolean;

let savedVCs: Array<VerificationCondition>;

export function vcs (): Array<VerificationCondition> {
  return savedVCs;
}

export function code (fn: () => any) {
  before(() => {
    const code = fn.toString();
    const t = verificationConditions(code.substring(14, code.length - 2));
    if (!(t instanceof Array)) {
      log(t);
      if (t.status === 'error' && t.type === 'unexpected') console.log(t.error);
      throw new Error('failed to find verification conditions');
    }
    savedVCs = t;
  });
}

function helper (expected: 'verified' | 'unverified' | 'incorrect', description: string,
                 debug: boolean, expectedModel: Map<FreeVar, any>): Mocha.ITest {
  const body = async () => {
    /* tslint:disable:no-unused-expression */
    if (debug) {
      setOptions({ quiet: false, verbose: true });
      console.log(savedVCs.map(vc => vc.description).join('\n'));
    }
    const vc = savedVCs.find(v => v.description === description);
    expect(vc).to.be.ok;
    const res = await vc.verify();
    if (res.status === 'error' && debug) console.log(res);
    if (expected === 'verified' || expected === 'unverified') {
      const st = res.status === 'error' && res.type === 'incorrect' ? res.type : res.status;
      expect(st).to.be.eql(expected);
      if (res.status === 'unverified') {
        for (const v of expectedModel.keys()) {
          expect(res.model.variables()).to.include(typeof v === 'string' ? v : v.name);
          expect(res.model.valueOf(v)).to.eql(plainToJSVal(expectedModel.get(v)));
        }
      }
    } else {
      expect(res.status).to.equal('error');
      if (res.status === 'error') {
        expect(res.type).to.equal(expected);
        if (res.type === 'incorrect') {
          for (const v of expectedModel.keys()) {
            expect(res.model.variables()).to.include(typeof v === 'string' ? v : v.name);
            expect(res.model.valueOf(v)).to.eql(plainToJSVal(expectedModel.get(v)));
          }
        }
      }
    }
  };
  if (debug) {
    return it.only(description + ' ' + expected, body);
  } else {
    return it(description + ' ' + expected, body);
  }
}

export function skip (description: string) { return it.skip(description); }

export function verified (description: string): Mocha.ITest {
  return helper('verified', description, false, new Map());
}

export function unverified (description: string, ...expectedVariables: Array<[FreeVar, any]>): Mocha.ITest {
  return helper('unverified', description, false, new Map(expectedVariables));
}

export function incorrect (description: string, ...expectedVariables: Array<[FreeVar, any]>): Mocha.ITest {
  return helper('incorrect', description, false, new Map(expectedVariables));
}

export function verifiedDebug (description: string): Mocha.ITest {
  return helper('verified', description, true, new Map());
}

export function unverifiedDebug (description: string, ...expectedVariables: Array<[FreeVar, any]>): Mocha.ITest {
  return helper('unverified', description, true, new Map(expectedVariables));
}

export function incorrectDebug (description: string, ...expectedVariables: Array<[FreeVar, any]>): Mocha.ITest {
  return helper('incorrect', description, true, new Map(expectedVariables));
}
