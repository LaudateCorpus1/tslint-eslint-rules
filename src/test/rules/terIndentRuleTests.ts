/// <reference path='../../../typings/mocha/mocha.d.ts' />
import { runTest, IScripts } from './helper';

/**
 * Borrowing tests from eslint:
 *    https://github.com/eslint/eslint/blob/master/tests/lib/rules/no-multi-spaces.js
 */
const rule = 'ter-indent';
const scripts: { valid: IScripts, invalid: IScripts } = {
  valid: [
    {
     code: `
if (true) {
  a = 4; 
} else {
  b = 3; 
}
`,
      options: [{ exceptions: { PropertyAssignment: false } }]
    }
  ],
  invalid: [
    {
      code: 'function foo(a,  b) {}',
    }
  ]
};

describe(rule, () => {

  it('should pass when avoiding unnecessary spaces', () => {
    runTest(rule, scripts.valid);
  });

  it('should fail when using multiple spaces', () => {
    //runTest(rule, scripts.invalid);
  });

});
