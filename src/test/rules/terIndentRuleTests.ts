/// <reference path='../../../typings/mocha/mocha.d.ts' />
import * as Lint from 'tslint/lib/lint';
import { runTest, IScripts, IScriptError } from './helper';

function expectedErrors(errors: number[][], indentType: string = 'space'): IScriptError[] {
  return errors.map(function(err) {
    let message;

    if (typeof err[1] === 'string' && typeof err[2] === 'string') {
      message = `Expected indentation of ${err[1]} but found ${err[2]}.`;
    } else {
      const chars = indentType + (err[1] === 1 ? '' : 's');
      message = `Expected indentation of ${err[1]} ${chars} but found ${err[2]}.`;
    }
    return { message, line: err[0] };
  });
}

/**
 * Borrowing tests from eslint:
 *    https://github.com/eslint/eslint/blob/master/tests/lib/rules/no-multi-spaces.js
 */
const rule = 'ter-indent';
const scripts: { valid: IScripts, invalid: IScripts } = {
  valid: [
  ],
  invalid: [/*
    {
      code: Lint.Utils.dedent`
        var a = b;
        if (a) {
        b();
        }`,
      options: [2],
      errors: expectedErrors([[3, 2, 0]])
    },
    {
      code: Lint.Utils.dedent`
        if (array.some(function(){
          return true;
        })) {
        a++; // ->
          b++;
            c++; // <-
        }`,
      options: [2],
      errors: expectedErrors([[4, 2, 0], [6, 2, 4]])
    },
    {
      code: '\nif (a){\n\tb=c;\n\t\tc=d;\ne=f;\n}',
      options: ['tab'],
      errors: expectedErrors(
        [
          [3, 1, 2],
          [4, 1, 0]
        ],
        'tab'
      )
    },
    {
      code: '\nif (a){\n    b=c;\n      c=d;\n e=f;\n}',
      options: [4],
      errors: expectedErrors([[3, 4, 6], [4, 4, 1]])
    },
    {
      code: Lint.Utils.dedent`
        switch(value){
            case "1":
                a();
            break;
            case "2":
                a();
            break;
            default:
                a();
                break;
        }`,
      options: [4, { SwitchCase: 1 }],
      errors: expectedErrors([[4, 8, 4], [7, 8, 4]])
    },
    {
      code: Lint.Utils.dedent`
        var x = 0 &&
            {
               a: 1,
                  b: 2
            };`,
      options: [4],
      errors: expectedErrors([[3, 8, 7], [4, 8, 10]])
    },
    {
      code: Lint.Utils.dedent`
        switch(value){
            case "1":
                a();
                break;
            case "2":
                a();
                break;
            default:
            break;
        }`,
      options: [4, {SwitchCase: 1}],
      errors: expectedErrors([[9, 8, 4]])
    },
    {
      code: Lint.Utils.dedent`
        switch(value){
            case "1":
            case "2":
                a();
                break;
            default:
                break;
        }
        switch(value){
            case "1":
            break;
            case "2":
                a();
            break;
            default:
                a();
            break;
        }`,
      options: [4, { SwitchCase: 1 }],
      errors: expectedErrors([[11, 8, 4], [14, 8, 4], [17, 8, 4]])
    },
    {
      code: Lint.Utils.dedent`
        switch(value){
        case "1":
                a();
                break;
            case "2":
                break;
            default:
                break;
        }`,
      options: [4],
      errors: expectedErrors([
        [3, 4, 8],
        [4, 4, 8],
        [5, 0, 4],
        [6, 4, 8],
        [7, 0, 4],
        [8, 4, 8]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var obj = {foo: 1, bar: 2};
        with (obj) {
        console.log(foo + bar);
        }`,
      errors: expectedErrors([[3, 4, 0]])
    },
    {
      code: Lint.Utils.dedent`
        switch (a) {
        case '1':
        b();
        break;
        default:
        c();
        break;
        }`,
      options: [4, { SwitchCase: 1 }],
      errors: expectedErrors([
        [2, 4, 0],
        [3, 8, 0],
        [4, 8, 0],
        [5, 4, 0],
        [6, 8, 0],
        [7, 8, 0]
      ])
    },
    {
      code: '\nwhile (a)\nb();\n',
      options: [4],
      errors: expectedErrors([
        [2, 4, 0]
      ])
    },
    {
      code: '\nfor (;;) \nb();\n',
      options: [4],
      errors: expectedErrors([
        [2, 4, 0]
      ])
    },
    {
      code: '\nfor (a in x) \nb();',
      options: [4],
      errors: expectedErrors([
        [2, 4, 0]
      ])
    },
    {
      code: Lint.Utils.dedent`
        do
        b();
        while(true)`,
      options: [4],
      errors: expectedErrors([
        [2, 4, 0]
      ])
    },
    {
      code: '\nif(true) \nb();',
      options: [4],
      errors: expectedErrors([
        [2, 4, 0]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var test = {
              a: 1,
            b: 2
            };`,
      options: [2],
      errors: expectedErrors([
        [2, 2, 6],
        [3, 2, 4],
        [4, 0, 4]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var a = function() {
              a++;
            b++;
                  c++;
            },
            b;`,
      options: [4],
      errors: expectedErrors([
        [2, 8, 6],
        [3, 8, 4],
        [4, 8, 10]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var a = 1,
        b = 2,
        c = 3;`,
      options: [4],
      errors: expectedErrors([
        [2, 4, 0],
        [3, 4, 0]
      ])
    },
    {
      code: Lint.Utils.dedent`
        [a, b,
        c].forEach((index) => {
          index;
        });`,
      options: [4],
      errors: expectedErrors([
        [3, 4, 2]
      ])
    },
    {
      code: Lint.Utils.dedent`
        [a, b,
        c].forEach(function(index){
          return index;
        });`,
      options: [4],
      errors: expectedErrors([
        [3, 4, 2]
      ])
    },
    {
      code: Lint.Utils.dedent`
        [a, b, c].forEach((index) => {
          index;
        });`,
      options: [4],
      errors: expectedErrors([
        [2, 4, 2]
      ])
    },
    {
      code: Lint.Utils.dedent`
        [a, b, c].forEach(function(index){
          return index;
        });`,
      options: [4],
      errors: expectedErrors([
        [2, 4, 2]
      ])
    },
    {
      code: "\nwhile (1 < 2)\nconsole.log('foo')\n  console.log('bar')",
      options: [2],
      errors: expectedErrors([
        [2, 2, 0],
        [3, 0, 2]
      ])
    },
    {
      code: Lint.Utils.dedent`
        function salutation () {
          switch (1) {
          case 0: return console.log('hi')
            case 1: return console.log('hey')
          }
        }`,
      options: [2, { SwitchCase: 1 }],
      errors: expectedErrors([
        [3, 4, 2]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var geometry, box, face1, face2, colorT, colorB, sprite, padding, maxWidth,
        height, rotate;`,
      options: [2, { SwitchCase: 1 }],
      errors: expectedErrors([
        [2, 2, 0]
      ])
    },
    {
      code: Lint.Utils.dedent`
        switch (a) {
        case '1':
        b();
        break;
        default:
        c();
        break;
        }`,
      options: [4, { SwitchCase: 2 }],
      errors: expectedErrors([
        [2, 8, 0],
        [3, 12, 0],
        [4, 12, 0],
        [5, 8, 0],
        [6, 12, 0],
        [7, 12, 0]
      ])
    },
    {
      code: '\nvar geometry,\nrotate;',
      options: [2, { VariableDeclarator: 1 }],
      errors: expectedErrors([
        [2, 2, 0]
      ])
    },
    {
      code: '\nvar geometry,\n  rotate;',
      options: [2, { VariableDeclarator: 2 }],
      errors: expectedErrors([
        [2, 4, 2]
      ])
    },
    {
      code: '\nvar geometry,\n\trotate;',
      options: ['tab', { VariableDeclarator: 2 }],
      errors: expectedErrors(
        [
          [2, 2, 1]
        ],
        'tab'
      )
    },
    {
      code: '\nlet geometry,\n  rotate;',
      options: [2, { VariableDeclarator: 2 }],
      errors: expectedErrors([
        [2, 4, 2]
      ])
    },
    {
      code: Lint.Utils.dedent`
        if(true)
          if (true)
            if (true)
            console.log(val);`,
      options: [2, { VariableDeclarator: 2, SwitchCase: 1 }],
      errors: expectedErrors([
        [4, 6, 4]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var a = {
            a: 1,
            b: 2
        }`,
      options: [2, { VariableDeclarator: 2, SwitchCase: 1 }],
      errors: expectedErrors([
        [2, 2, 4],
        [3, 2, 4]
      ])
    }, */
    {
      code: Lint.Utils.dedent`
        var a = [
            a,
            b
        ]`,
      options: [2, { VariableDeclarator: 2, SwitchCase: 1 }],
      errors: expectedErrors([
        [2, 2, 4],
        [3, 2, 4]
      ])
    },
  ]
};

describe(rule, () => {

  it('should pass when using the correct indentation', () => {
    runTest(rule, scripts.valid);
  });

  it('should fail when using wrong indentation', () => {
    runTest(rule, scripts.invalid);
  });

});
