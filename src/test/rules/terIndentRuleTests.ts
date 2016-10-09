/// <reference path='../../../typings/mocha/mocha.d.ts' />
import * as fs from 'fs';
import * as path from 'path';
import * as Lint from 'tslint/lib/lint';
import { runTest, IScripts, IScriptError } from './helper';

const fixture = fs.readFileSync(
  path.join(__dirname, '../../../src/test/fixtures/indent-invalid.txt'), 'utf8'
);
type NumStr = number | string;

function expectedErrors(errors: [[number, NumStr, NumStr]], indentType: string = 'space'): IScriptError[] {
  return errors.map((err) => {
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
    {
      code:
      "bridge.callHandler(\n" +
      "  'getAppVersion', 'test23', function(responseData) {\n" +
      "    window.ah.mobileAppVersion = responseData;\n" +
      "  }\n" +
      ");\n",
      options: [2]
    },
    {
      code:
      "bridge.callHandler(\n" +
      "  'getAppVersion', 'test23', function(responseData) {\n" +
      "    window.ah.mobileAppVersion = responseData;\n" +
      "  });\n",
      options: [2]
    },
    {
      code:
      "bridge.callHandler(\n" +
      "  'getAppVersion',\n" +
      "  null,\n" +
      "  function responseCallback(responseData) {\n" +
      "    window.ah.mobileAppVersion = responseData;\n" +
      "  }\n" +
      ");\n",
      options: [2]
    },
    {
      code:
      "bridge.callHandler(\n" +
      "  'getAppVersion',\n" +
      "  null,\n" +
      "  function responseCallback(responseData) {\n" +
      "    window.ah.mobileAppVersion = responseData;\n" +
      "  });\n",
      options: [2]
    },
    {
      code:
      "function doStuff(keys) {\n" +
      "    _.forEach(\n" +
      "        keys,\n" +
      "        key => {\n" +
      "            doSomething(key);\n" +
      "        }\n" +
      "   );\n" +
      "}\n",
      options: [4],
    },
    {
      code:
      "example(\n" +
      "    function () {\n" +
      "        console.log('example');\n" +
      "    }\n" +
      ");\n",
      options: [4]
    },
    {
      code:
      "let foo = somethingList\n" +
      "    .filter(x => {\n" +
      "        return x;\n" +
      "    })\n" +
      "    .map(x => {\n" +
      "        return 100 * x;\n" +
      "    });\n",
      options: [4],
    },
    {
      code:
      "var x = 0 &&\n" +
      "    {\n" +
      "        a: 1,\n" +
      "        b: 2\n" +
      "    };",
      options: [4]
    },
    {
      code:
      "var x = 0 &&\n" +
      "\t{\n" +
      "\t\ta: 1,\n" +
      "\t\tb: 2\n" +
      "\t};",
      options: ["tab"]
    },
    {
      code:
      "var x = 0 &&\n" +
      "    {\n" +
      "        a: 1,\n" +
      "        b: 2\n" +
      "    }||\n" +
      "    {\n" +
      "        c: 3,\n" +
      "        d: 4\n" +
      "    };",
      options: [4]
    },
    {
      code:
        "var x = 0 && 1;",
      options: [4]
    },
    {
      code:
        "var x = 0 && { a: 1, b: 2 };",
      options: [4]
    },
    {
      code:
      "var x = 0 &&\n" +
      "    (\n" +
      "        1\n" +
      "    );",
      options: [4]
    },
    {
      code:
        "var x = 0 && { a: 1, b: 2 };",
      options: [4]
    },
    {
      code:
      "require('http').request({hostname: 'localhost',\n" +
      "                         port: 80}, function(res) {\n" +
      "  res.end();\n" +
      "});\n",
      options: [2]
    },
    {
      code:
      "function test() {\n" +
      "  return client.signUp(email, PASSWORD, { preVerified: true })\n" +
      "    .then(function (result) {\n" +
      "      // hi\n" +
      "    })\n" +
      "    .then(function () {\n" +
      "      return FunctionalHelpers.clearBrowserState(self, {\n" +
      "        contentServer: true,\n" +
      "        contentServer1: true\n" +
      "      });\n" +
      "    });\n" +
      "}",
      options: [2]
    },
    {
      code:
      "it('should... some lengthy test description that is forced to be' +\n" +
      "  'wrapped into two lines since the line length limit is set', () => {\n" +
      "  expect(true).toBe(true);\n" +
      "});\n",
      options: [2]
    },
    {
      code:
      "function test() {\n" +
      "    return client.signUp(email, PASSWORD, { preVerified: true })\n" +
      "        .then(function (result) {\n" +
      "            var x = 1;\n" +
      "            var y = 1;\n" +
      "        }, function(err){\n" +
      "            var o = 1 - 2;\n" +
      "            var y = 1 - 2;\n" +
      "            return true;\n" +
      "        })\n" +
      "}",
      options: [4]
    },
    {
      code:
      "function test() {\n" +
      "    return client.signUp(email, PASSWORD, { preVerified: true })\n" +
      "    .then(function (result) {\n" +
      "        var x = 1;\n" +
      "        var y = 1;\n" +
      "    }, function(err){\n" +
      "        var o = 1 - 2;\n" +
      "        var y = 1 - 2;\n" +
      "        return true;\n" +
      "    });\n" +
      "}",
      options: [4, {MemberExpression: 0}]
    },
    {
      code:
        "// hi",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var Command = function() {\n" +
      "  var fileList = [],\n" +
      "      files = []\n" +
      "\n" +
      "  files.concat(fileList)\n" +
      "};\n",
      options: [2, {VariableDeclarator: { var: 2, let: 2, const: 3}}]
    },
    {
      code:
        "  ",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "if(data) {\n" +
      "  console.log('hi');\n" +
      "  b = true;};",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "foo = () => {\n" +
      "  console.log('hi');\n" +
      "  return true;};",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "function test(data) {\n" +
      "  console.log('hi');\n" +
      "  return true;};",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var test = function(data) {\n" +
      "  console.log('hi');\n" +
      "};",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "arr.forEach(function(data) {\n" +
      "  otherdata.forEach(function(zero) {\n" +
      "    console.log('hi');\n" +
      "  }) });",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "a = [\n" +
      "    ,3\n" +
      "]",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "[\n" +
      "  ['gzip', 'gunzip'],\n" +
      "  ['gzip', 'unzip'],\n" +
      "  ['deflate', 'inflate'],\n" +
      "  ['deflateRaw', 'inflateRaw'],\n" +
      "].forEach(function(method) {\n" +
      "  console.log(method);\n" +
      "});\n",
      options: [2, {SwitchCase: 1, VariableDeclarator: 2}]
    },
    {
      code:
      "test(123, {\n" +
      "    bye: {\n" +
      "        hi: [1,\n" +
      "            {\n" +
      "                b: 2\n" +
      "            }\n" +
      "        ]\n" +
      "    }\n" +
      "});",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var xyz = 2,\n" +
      "    lmn = [\n" +
      "        {\n" +
      "            a: 1\n" +
      "        }\n" +
      "    ];",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "lmn = [{\n" +
      "    a: 1\n" +
      "},\n" +
      "{\n" +
      "    b: 2\n" +
      "}," +
      "{\n" +
      "    x: 2\n" +
      "}];",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "abc({\n" +
      "    test: [\n" +
      "        [\n" +
      "            c,\n" +
      "            xyz,\n" +
      "            2\n" +
      "        ].join(',')\n" +
      "    ]\n" +
      "});",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "abc = {\n" +
      "  test: [\n" +
      "    [\n" +
      "      c,\n" +
      "      xyz,\n" +
      "      2\n" +
      "    ]\n" +
      "  ]\n" +
      "};",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "abc(\n" +
      "  {\n" +
      "    a: 1,\n" +
      "    b: 2\n" +
      "  }\n" +
      ");",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "abc({\n" +
      "    a: 1,\n" +
      "    b: 2\n" +
      "});",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var abc = \n" +
      "  [\n" +
      "    c,\n" +
      "    xyz,\n" +
      "    {\n" +
      "      a: 1,\n" +
      "      b: 2\n" +
      "    }\n" +
      "  ];",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var abc = [\n" +
      "  c,\n" +
      "  xyz,\n" +
      "  {\n" +
      "    a: 1,\n" +
      "    b: 2\n" +
      "  }\n" +
      "];",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var abc = 5,\n" +
      "    c = 2,\n" +
      "    xyz = \n" +
      "    {\n" +
      "      a: 1,\n" +
      "      b: 2\n" +
      "    };",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "var abc = \n" +
      "    {\n" +
      "      a: 1,\n" +
      "      b: 2\n" +
      "    };",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "var a = new abc({\n" +
      "        a: 1,\n" +
      "        b: 2\n" +
      "    }),\n" +
      "    b = 2;",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var a = 2,\n" +
      "  c = {\n" +
      "    a: 1,\n" +
      "    b: 2\n" +
      "  },\n" +
      "  b = 2;",
      options: [2, {VariableDeclarator: 1, SwitchCase: 1}]
    },
    {
      code:
      "var x = 2,\n" +
      "    y = {\n" +
      "      a: 1,\n" +
      "      b: 2\n" +
      "    },\n" +
      "    b = 2;",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "var e = {\n" +
      "      a: 1,\n" +
      "      b: 2\n" +
      "    },\n" +
      "    b = 2;",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "var a = {\n" +
      "  a: 1,\n" +
      "  b: 2\n" +
      "};",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "function test() {\n" +
      "  if (true ||\n " +
      "            false){\n" +
      "    console.log(val);\n" +
      "  }\n" +
      "}",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "for (var val in obj)\n" +
      "  if (true)\n" +
      "    console.log(val);",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "if(true)\n" +
      "  if (true)\n" +
      "    if (true)\n" +
      "      console.log(val);",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "function hi(){     var a = 1;\n" +
      "  y++;                   x++;\n" +
      "}",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "for(;length > index; index++)if(NO_HOLES || index in self){\n" +
      "  x++;\n" +
      "}",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "function test(){\n" +
      "  switch(length){\n" +
      "    case 1: return function(a){\n" +
      "      return fn.call(that, a);\n" +
      "    };\n" +
      "  }\n" +
      "}",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}]
    },
    {
      code:
      "var geometry = 2,\n" +
      "rotate = 2;",
      options: [2, {VariableDeclarator: 0}]
    },
    {
      code:
      "var geometry,\n" +
      "    rotate;",
      options: [4, {VariableDeclarator: 1}]
    },
    {
      code:
      "var geometry,\n" +
      "\trotate;",
      options: ["tab", {VariableDeclarator: 1}]
    },
    {
      code:
      "var geometry,\n" +
      "  rotate;",
      options: [2, {VariableDeclarator: 1}]
    },
    {
      code:
      "var geometry,\n" +
      "    rotate;",
      options: [2, {VariableDeclarator: 2}]
    },
    {
      code:
      "let geometry,\n" +
      "    rotate;",
      options: [2, {VariableDeclarator: 2}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "const geometry = 2,\n" +
      "    rotate = 3;",
      options: [2, {VariableDeclarator: 2}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "var geometry, box, face1, face2, colorT, colorB, sprite, padding, maxWidth,\n" +
      "  height, rotate;",
      options: [2, {SwitchCase: 1}]
    },
    {
      code:
        "var geometry, box, face1, face2, colorT, colorB, sprite, padding, maxWidth;",
      options: [2, {SwitchCase: 1}]
    },
    {
      code:
      "if (1 < 2){\n" +
      "//hi sd \n" +
      "}",
      options: [2]
    },
    {
      code:
      "while (1 < 2){\n" +
      "  //hi sd \n" +
      "}",
      options: [2]
    },
    {
      code:
        "while (1 < 2) console.log('hi');",
      options: [2]
    },
    {
      code:
      "[a, b, \nc].forEach((index) => {\n" +
      "    index;\n" +
      "});\n",
      options: [4],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "[a, b, \nc].forEach(function(index){\n" +
      "    return index;\n" +
      "});\n",
      options: [4],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "[a, b, c].forEach((index) => {\n" +
      "    index;\n" +
      "});\n",
      options: [4],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "[a, b, c].forEach(function(index){\n" +
      "    return index;\n" +
      "});\n",
      options: [4],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "switch (x) {\n" +
      "    case \"foo\":\n" +
      "        a();\n" +
      "        break;\n" +
      "    case \"bar\":\n" +
      "        switch (y) {\n" +
      "            case \"1\":\n" +
      "                break;\n" +
      "            case \"2\":\n" +
      "                a = 6;\n" +
      "                break;\n" +
      "        }\n" +
      "    case \"test\":\n" +
      "        break;\n" +
      "}",
      options: [4, {SwitchCase: 1}]
    },
    {
      code:
      "switch (x) {\n" +
      "        case \"foo\":\n" +
      "            a();\n" +
      "            break;\n" +
      "        case \"bar\":\n" +
      "            switch (y) {\n" +
      "                    case \"1\":\n" +
      "                        break;\n" +
      "                    case \"2\":\n" +
      "                        a = 6;\n" +
      "                        break;\n" +
      "            }\n" +
      "        case \"test\":\n" +
      "            break;\n" +
      "}",
      options: [4, {SwitchCase: 2}]
    },
    {
      code:
      "switch (a) {\n" +
      "case \"foo\":\n" +
      "    a();\n" +
      "    break;\n" +
      "case \"bar\":\n" +
      "    switch(x){\n" +
      "    case '1':\n" +
      "        break;\n" +
      "    case '2':\n" +
      "        a = 6;\n" +
      "        break;\n" +
      "    }\n" +
      "}"
    },
    {
      code:
      "switch (a) {\n" +
      "case \"foo\":\n" +
      "    a();\n" +
      "    break;\n" +
      "case \"bar\":\n" +
      "    if(x){\n" +
      "        a = 2;\n" +
      "    }\n" +
      "    else{\n" +
      "        a = 6;\n" +
      "    }\n" +
      "}"
    },
    {
      code:
      "switch (a) {\n" +
      "case \"foo\":\n" +
      "    a();\n" +
      "    break;\n" +
      "case \"bar\":\n" +
      "    if(x){\n" +
      "        a = 2;\n" +
      "    }\n" +
      "    else\n" +
      "        a = 6;\n" +
      "}"
    },
    {
      code:
      "switch (a) {\n" +
      "case \"foo\":\n" +
      "    a();\n" +
      "    break;\n" +
      "case \"bar\":\n" +
      "    a(); break;\n" +
      "case \"baz\":\n" +
      "    a(); break;\n" +
      "}"
    },
    {
      code: "switch (0) {\n}"
    },
    {
      code:
      "function foo() {\n" +
      "    var a = \"a\";\n" +
      "    switch(a) {\n" +
      "    case \"a\":\n" +
      "        return \"A\";\n" +
      "    case \"b\":\n" +
      "        return \"B\";\n" +
      "    }\n" +
      "}\n" +
      "foo();"
    },
    {
      code:
      "switch(value){\n" +
      "    case \"1\":\n" +
      "    case \"2\":\n" +
      "        a();\n" +
      "        break;\n" +
      "    default:\n" +
      "        a();\n" +
      "        break;\n" +
      "}\n" +
      "switch(value){\n" +
      "    case \"1\":\n" +
      "        a();\n" +
      "        break;\n" +
      "    case \"2\":\n" +
      "        break;\n" +
      "    default:\n" +
      "        break;\n" +
      "}",
      options: [4, {SwitchCase: 1}]
    },
    {
      code:
      "var obj = {foo: 1, bar: 2};\n" +
      "with (obj) {\n" +
      "    console.log(foo + bar);\n" +
      "}\n"
    },
    {
      code:
      "if (a) {\n" +
      "    (1 + 2 + 3);\n" + // no error on this line
      "}"
    },
    {
      code:
        "switch(value){ default: a(); break; }\n"
    },
    {
      code: "import {addons} from 'react/addons'\nimport React from 'react'",
      options: [2],
      parserOptions: { sourceType: "module" }
    },
    {
      code:
      "var a = 1,\n" +
      "    b = 2,\n" +
      "    c = 3;\n",
      options: [4]
    },
    {
      code:
      "var a = 1\n" +
      "   ,b = 2\n" +
      "   ,c = 3;\n",
      options: [4]
    },
    {
      code: "while (1 < 2) console.log('hi')\n",
      options: [2]
    },
    {
      code:
      "function salutation () {\n" +
      "  switch (1) {\n" +
      "    case 0: return console.log('hi')\n" +
      "    case 1: return console.log('hey')\n" +
      "  }\n" +
      "}\n",
      options: [2, { SwitchCase: 1 }]
    },
    {
      code:
      "var items = [\n" +
      "  {\n" +
      "    foo: 'bar'\n" +
      "  }\n" +
      "];\n",
      options: [2, {VariableDeclarator: 2}]
    },
    {
      code:
      "const a = 1,\n" +
      "      b = 2;\n" +
      "const items1 = [\n" +
      "  {\n" +
      "    foo: 'bar'\n" +
      "  }\n" +
      "];\n" +
      "const items2 = Items(\n" +
      "  {\n" +
      "    foo: 'bar'\n" +
      "  }\n" +
      ");\n",
      options: [2, {VariableDeclarator: 3}],
      parserOptions: { ecmaVersion: 6 }

    },
    {
      code:
      "const geometry = 2,\n" +
      "      rotate = 3;\n" +
      "var a = 1,\n" +
      "  b = 2;\n" +
      "let light = true,\n" +
      "    shadow = false;",
      options: [2, { VariableDeclarator: { const: 3, let: 2 } }],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "const abc = 5,\n" +
      "      c = 2,\n" +
      "      xyz = \n" +
      "      {\n" +
      "        a: 1,\n" +
      "        b: 2\n" +
      "      };\n" +
      "let abc = 5,\n" +
      "  c = 2,\n" +
      "  xyz = \n" +
      "  {\n" +
      "    a: 1,\n" +
      "    b: 2\n" +
      "  };\n" +
      "var abc = 5,\n" +
      "    c = 2,\n" +
      "    xyz = \n" +
      "    {\n" +
      "      a: 1,\n" +
      "      b: 2\n" +
      "    };\n",
      options: [2, { VariableDeclarator: { var: 2, const: 3 }, SwitchCase: 1}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "module.exports =\n" +
      "{\n" +
      "  'Unit tests':\n" +
      "  {\n" +
      "    rootPath: './',\n" +
      "    environment: 'node',\n" +
      "    tests:\n" +
      "    [\n" +
      "      'test/test-*.js'\n" +
      "    ],\n" +
      "    sources:\n" +
      "    [\n" +
      "      '*.js',\n" +
      "      'test/**.js'\n" +
      "    ]\n" +
      "  }\n" +
      "};",
      options: [2]
    },
    {
      code:
      "var path     = require('path')\n" +
      "  , crypto    = require('crypto')\n" +
      "  ;\n",
      options: [2]
    },
    {
      code:
      "var a = 1\n" +
      "   ,b = 2\n" +
      "   ;"
    },
    {
      code:
      "export function create (some,\n" +
      "                        argument) {\n" +
      "  return Object.create({\n" +
      "    a: some,\n" +
      "    b: argument\n" +
      "  });\n" +
      "};",
      parserOptions: { sourceType: "module" },
      options: [2]
    },
    {
      code:
      "export function create (id, xfilter, rawType,\n" +
      "                        width=defaultWidth, height=defaultHeight,\n" +
      "                        footerHeight=defaultFooterHeight,\n" +
      "                        padding=defaultPadding) {\n" +
      "  // ... function body, indented two spaces\n" +
      "}\n",
      parserOptions: { sourceType: "module" },
      options: [2]
    },
    {
      code:
      "var obj = {\n" +
      "  foo: function () {\n" +
      "    return new p()\n" +
      "      .then(function (ok) {\n" +
      "        return ok;\n" +
      "      }, function () {\n" +
      "        // ignore things\n" +
      "      });\n" +
      "  }\n" +
      "};\n",
      options: [2]
    },
    {
      code:
      "a.b()\n" +
      "  .c(function(){\n" +
      "    var a;\n" +
      "  }).d.e;\n",
      options: [2]
    },
    {
      code:
      "const YO = 'bah',\n" +
      "      TE = 'mah'\n" +
      "\n" +
      "var res,\n" +
      "    a = 5,\n" +
      "    b = 4\n",
      parserOptions: { ecmaVersion: 6 },
      options: [2, {VariableDeclarator: { var: 2, let: 2, const: 3}}]
    },
    {
      code:
      "const YO = 'bah',\n" +
      "      TE = 'mah'\n" +
      "\n" +
      "var res,\n" +
      "    a = 5,\n" +
      "    b = 4\n" +
      "\n" +
      "if (YO) console.log(TE)",
      parserOptions: { ecmaVersion: 6 },
      options: [2, {VariableDeclarator: { var: 2, let: 2, const: 3}}]
    },
    {
      code:
      "var foo = 'foo',\n" +
      "  bar = 'bar',\n" +
      "  baz = function() {\n" +
      "      \n" +
      "  }\n" +
      "\n" +
      "function hello () {\n" +
      "    \n" +
      "}\n",
      options: [2]
    },
    {
      code:
      "var obj = {\n" +
      "  send: function () {\n" +
      "    return P.resolve({\n" +
      "      type: 'POST'\n" +
      "    })\n" +
      "      .then(function () {\n" +
      "        return true;\n" +
      "      }, function () {\n" +
      "        return false;\n" +
      "      });\n" +
      "  }\n" +
      "};\n",
      options: [2]
    },
    {
      code:
      "var obj = {\n" +
      "  send: function () {\n" +
      "    return P.resolve({\n" +
      "      type: 'POST'\n" +
      "    })\n" +
      "    .then(function () {\n" +
      "      return true;\n" +
      "    }, function () {\n" +
      "      return false;\n" +
      "    });\n" +
      "  }\n" +
      "};\n",
      options: [2, {MemberExpression: 0}]
    },
    {
      code:
      "const someOtherFunction = argument => {\n" +
      "        console.log(argument);\n" +
      "    },\n" +
      "    someOtherValue = 'someOtherValue';\n",
    },
    {
      code:
      "[\n" +
      "  'a',\n" +
      "  'b'\n" +
      "].sort().should.deepEqual([\n" +
      "  'x',\n" +
      "  'y'\n" +
      "]);\n",
      options: [2]
    },
    {
      code:
      "var a = 1,\n" +
      "    B = class {\n" +
      "      constructor(){}\n" +
      "      a(){}\n" +
      "      get b(){}\n" +
      "    };",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "var a = 1,\n" +
      "    B = \n" +
      "    class {\n" +
      "      constructor(){}\n" +
      "      a(){}\n" +
      "      get b(){}\n" +
      "    },\n" +
      "    c = 3;",
      options: [2, {VariableDeclarator: 2, SwitchCase: 1}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "class A{\n" +
      "    constructor(){}\n" +
      "    a(){}\n" +
      "    get b(){}\n" +
      "}",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "var A = class {\n" +
      "    constructor(){}\n" +
      "    a(){}\n" +
      "    get b(){}\n" +
      "}",
      options: [4, {VariableDeclarator: 1, SwitchCase: 1}],
      parserOptions: { ecmaVersion: 6 }
    },
    {
      code:
      "var a = {\n" +
      "  some: 1\n" +
      ", name: 2\n" +
      "};\n",
      options: [2]
    },
    {
      code:
      "a.c = {\n" +
      "    aa: function() {\n" +
      "        'test1';\n" +
      "        return 'aa';\n" +
      "    }\n" +
      "    , bb: function() {\n" +
      "        return this.bb();\n" +
      "    }\n" +
      "};\n",
      options: [4]
    },
    {
      code:
      "var a =\n" +
      "{\n" +
      "    actions:\n" +
      "    [\n" +
      "        {\n" +
      "            name: 'compile'\n" +
      "        }\n" +
      "    ]\n" +
      "};\n",
      options: [4, {VariableDeclarator: 0, SwitchCase: 1}]
    },
    {
      code:
      "var a =\n" +
      "[\n" +
      "    {\n" +
      "        name: 'compile'\n" +
      "    }\n" +
      "];\n",
      options: [4, {VariableDeclarator: 0, SwitchCase: 1}]
    },
    {
      code:
      "const func = function (opts) {\n" +
      "    return Promise.resolve()\n" +
      "    .then(() => {\n" +
      "        [\n" +
      "            'ONE', 'TWO'\n" +
      "        ].forEach(command => { doSomething(); });\n" +
      "    });\n" +
      "};",
      parserOptions: { ecmaVersion: 6 },
      options: [4, {MemberExpression: 0}]
    },
    {
      code:
      "const func = function (opts) {\n" +
      "    return Promise.resolve()\n" +
      "        .then(() => {\n" +
      "            [\n" +
      "                'ONE', 'TWO'\n" +
      "            ].forEach(command => { doSomething(); });\n" +
      "        });\n" +
      "};",
      parserOptions: { ecmaVersion: 6 },
      options: [4]
    },
    {
      code:
      "var haveFun = function () {\n" +
      "    SillyFunction(\n" +
      "        {\n" +
      "            value: true,\n" +
      "        },\n" +
      "        {\n" +
      "            _id: true,\n" +
      "        }\n" +
      "    );\n" +
      "};",
      options: [4]
    },
    {
      code:
      "var haveFun = function () {\n" +
      "    new SillyFunction(\n" +
      "        {\n" +
      "            value: true,\n" +
      "        },\n" +
      "        {\n" +
      "            _id: true,\n" +
      "        }\n" +
      "    );\n" +
      "};",
      options: [4]
    },
    {
      code:
      "let object1 = {\n" +
      "  doThing() {\n" +
      "    return _.chain([])\n" +
      "      .map(v => (\n" +
      "        {\n" +
      "          value: true,\n" +
      "        }\n" +
      "      ))\n" +
      "      .value();\n" +
      "  }\n" +
      "};",
      parserOptions: { ecmaVersion: 6 },
      options: [2]
    },
    {
      code:
      "class Foo\n" +
      "  extends Bar {\n" +
      "  baz() {}\n" +
      "}",
      options: [2]
    },
    {
      code:
      "class Foo extends\n" +
      "  Bar {\n" +
      "  baz() {}\n" +
      "}",
      options: [2]
    },
    {
      code:
      "fs.readdirSync(path.join(__dirname, '../rules')).forEach(name => {\n" +
      "  files[name] = foo;\n" +
      "});",
      options: [2, { outerIIFEBody: 0 }],
    },
    // {
    //   code:
    //   "(function(){\n" +
    //   "function foo(x) {\n" +
    //   "  return x + 1;\n" +
    //   "}\n" +
    //   "})();",
    //   options: [2, { outerIIFEBody: 0 }]
    // },
    // {
    //   code:
    //   "(function(){\n" +
    //   "        function foo(x) {\n" +
    //   "            return x + 1;\n" +
    //   "        }\n" +
    //   "})();",
    //   options: [4, { outerIIFEBody: 2 }]
    // },
    // {
    //   code:
    //   "(function(x, y){\n" +
    //   "function foo(x) {\n" +
    //   "  return x + 1;\n" +
    //   "}\n" +
    //   "})(1, 2);",
    //   options: [2, { outerIIFEBody: 0 }]
    // },
    // {
    //   code:
    //   "(function(){\n" +
    //   "function foo(x) {\n" +
    //   "  return x + 1;\n" +
    //   "}\n" +
    //   "}());",
    //   options: [2, { outerIIFEBody: 0 }]
    // },




  ],
  invalid: [
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
    },
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
    {
      code: Lint.Utils.dedent`
        let a = [
            a,
            b
        ]`,
      options: [2, { VariableDeclarator: { let: 2 }, SwitchCase: 1 }],
      errors: expectedErrors([
        [2, 2, 4],
        [3, 2, 4]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var a = new Test({
              a: 1
          }),
            b = 4;`,
      options: [4],
      errors: expectedErrors([
        [2, 8, 6],
        [3, 4, 2]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var a = new Test({
              a: 1
            }),
            b = 4;
        const a = new Test({
              a: 1
            }),
            b = 4;`,
      options: [2, { VariableDeclarator: { var: 2 } }],
      errors: expectedErrors([
        [6, 4, 6],
        [7, 2, 4],
        [8, 2, 4]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var abc = 5,
            c = 2,
            xyz =
             {
               a: 1,
                b: 2
             };`,
      options: [2, { VariableDeclarator: 2, SwitchCase: 1 }],
      errors: expectedErrors([
        [4, 4, 5],
        [5, 6, 7],
        [6, 6, 8],
        [7, 4, 5]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var abc =
             {
               a: 1,
                b: 2
             };`,
      options: [2, { VariableDeclarator: 2, SwitchCase: 1 }],
      errors: expectedErrors([
        [2, 4, 5],
        [3, 6, 7],
        [4, 6, 8],
        [5, 4, 5]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var path     = require('path')
         , crypto    = require('crypto')
        ;`,
      options: [2],
      errors: expectedErrors([
        [3, 1, 0]
      ])
    },
    {
      code: Lint.Utils.dedent`
        var a = 1
           ,b = 2
        ;`,
      errors: expectedErrors([
        [3, 3, 0]
      ])
    },
    {
      code: Lint.Utils.dedent`
        class A{
          constructor(){}
            a(){}
            get b(){}
        }`,
      options: [4, { VariableDeclarator: 1, SwitchCase: 1 }],
      errors: expectedErrors([[2, 4, 2]])
    },
    {
      code: Lint.Utils.dedent`
        var A = class {
          constructor(){}
            a(){}
          get b(){}
        };`,
      options: [4, { VariableDeclarator: 1, SwitchCase: 1 }],
      errors: expectedErrors([[2, 4, 2], [4, 4, 2]])
    },
    {
      code: Lint.Utils.dedent`
        var a = 1,
            B = class {
            constructor(){}
              a(){}
              get b(){}
            };`,
      options: [2, { VariableDeclarator: 2, SwitchCase: 1 }],
      errors: expectedErrors([[3, 6, 4]])
    },
    {
      code: Lint.Utils.dedent`
        {
            if(a){
                foo();
            }
          else{
                bar();
            }
        }`,
      options: [4],
      errors: expectedErrors([[5, 4, 2]])
    },
    {
      code: Lint.Utils.dedent`
        {
            if(a){
                foo();
            }
          else
                bar();

        }`,
      options: [4],
      errors: expectedErrors([[5, 4, 2]])
    },
    {
      code: Lint.Utils.dedent`
        {
            if(a)
                foo();
          else
                bar();
        }`,
      options: [4],
      errors: expectedErrors([[4, 4, 2]])
    },
    {
      code: Lint.Utils.dedent`
        (function(){
          function foo(x) {
            return x + 1;
          }
        })();`,
      options: [2, { outerIIFEBody: 0 }],
      errors: expectedErrors([[2, 0, 2]])
    },
    {
      code: Lint.Utils.dedent`
        (function(){
            function foo(x) {
                return x + 1;
            }
        })();`,
      options: [4, { outerIIFEBody: 2 }],
      errors: expectedErrors([[2, 8, 4]])
    },
    {
      code: Lint.Utils.dedent`
        if(data) {
        console.log('hi');
        }`,
      options: [2, { outerIIFEBody: 0 }],
      errors: expectedErrors([[2, 2, 0]])
    },
    {
      code: Lint.Utils.dedent`
        var ns = function(){
            function fooVar(x) {
                return x + 1;
            }
        }(x);`,
      options: [4, { outerIIFEBody: 2 }],
      errors: expectedErrors([[2, 8, 4]])
    },
    {
      code: Lint.Utils.dedent`
        var obj = {
          foo: function() {
          return true;
          }()
        };`,
      options: [2, { outerIIFEBody: 0 }],
      errors: expectedErrors([[3, 4, 2]])
    },
    {
      code: Lint.Utils.dedent`
        typeof function() {
            function fooVar(x) {
              return x + 1;
            }
        }();`,
      options: [2, { outerIIFEBody: 2 }],
      errors: expectedErrors([[2, 2, 4]])
    },
    {
      code: Lint.Utils.dedent`
        {
        \t!function(x) {
        \t\t\t\treturn x + 1;
        \t}()
        };`,
      options: ['tab', { outerIIFEBody: 3 }],
      errors: expectedErrors([[3, 2, 4]], 'tab')
    },
    {
      code: '\nBuffer\n.toString()',
      options: [4, { MemberExpression: 1 }],
      errors: expectedErrors([[2, 4, 0]])
    },
    {
      code: Lint.Utils.dedent`
        Buffer
            .indexOf('a')
        .toString()`,
      options: [4, { MemberExpression: 1 }],
      errors: expectedErrors([[3, 4, 0]])
    },
    {
      code: '\nBuffer.\nlength',
      options: [4, { MemberExpression: 1 }],
      errors: expectedErrors([[2, 4, 0]])
    },
    {
      code: '\nBuffer.\n\t\tlength',
      options: ['tab', { MemberExpression: 1 }],
      errors: expectedErrors([[2, 1, 2]], 'tab')
    },
    {
      code: '\nBuffer\n  .foo\n  .bar',
      options: [2, { MemberExpression: 2 }],
      errors: expectedErrors([[2, 4, 2], [3, 4, 2]])
    },
    {
      code: Lint.Utils.dedent`
        if (foo) bar();
        else if (baz) foobar();
          else if (qux) qux();`,
      options: [2],
      errors: expectedErrors([[3, 0, 2]])
    },
    {
      code: Lint.Utils.dedent`
        if (foo) bar();
        else if (baz) foobar();
          else qux();`,
      options: [2],
      errors: expectedErrors([[3, 0, 2]])
    },
    {
      code: Lint.Utils.dedent`
        foo();
          if (baz) foobar();
          else qux();`,
      options: [2],
      errors: expectedErrors([[2, 0, 2], [3, 0, 2]])
    },
    {
      code: Lint.Utils.dedent`
        if (foo) bar();
        else if (baz) foobar();
             else if (bip) {
               qux();
             }`,
      options: [2],
      errors: expectedErrors([[3, 0, 5]])
    },
    {
      code: Lint.Utils.dedent`
        if (foo) bar();
        else if (baz) {
            foobar();
             } else if (boop) {
               qux();
             }`,
      options: [2],
      errors: expectedErrors([[3, 2, 4], [4, 0, 5]])
    },
    {
      code: Lint.Utils.dedent`
        function foo(aaa,
            bbb, ccc, ddd) {
              bar();
        }`,
      options: [2, { FunctionDeclaration: { parameters: 1, body: 2 } }],
      errors: expectedErrors([[2, 2, 4], [3, 4, 6]])
    },
    {
      code: Lint.Utils.dedent`
        function foo(aaa, bbb,
          ccc, ddd) {
        bar();
        }",
        utput:
        function foo(aaa, bbb,
              ccc, ddd) {
          bar();
        }`,
      options: [2, { FunctionDeclaration: { parameters: 3, body: 1 } }],
      errors: expectedErrors([[2, 6, 2], [3, 2, 0]])
    },
    {
      code: Lint.Utils.dedent`
        function foo(aaa,
                bbb,
          ccc) {
              bar();
        }`,
      options: [4, { FunctionDeclaration: { parameters: 1, body: 3 } }],
      errors: expectedErrors([[2, 4, 8], [3, 4, 2], [4, 12, 6]])
    },
    {
      code: Lint.Utils.dedent`
        function foo(aaa,
          bbb, ccc,
                           ddd, eee, fff) {
           bar();
        }`,
      options: [2, { FunctionDeclaration: { parameters: 'first', body: 1 } }],
      errors: expectedErrors([[2, 13, 2], [3, 13, 19], [4, 2, 3]])
    },
    {
      code: Lint.Utils.dedent`
        function foo(aaa, bbb)
        {
        bar();
        }`,
      options: [2, { FunctionDeclaration: { body: 3 } }],
      errors: expectedErrors([[3, 6, 0]])
    },
    {
      code: Lint.Utils.dedent`
        function foo(
        aaa,
            bbb) {
        bar();
        }`,
      options: [2, { FunctionDeclaration: { parameters: 'first', body: 2 } }],
      errors: expectedErrors([[3, 0, 4], [4, 4, 0]])
    },
    {
      code: Lint.Utils.dedent`
        var foo = function(aaa,
          bbb,
            ccc,
              ddd) {
          bar();
        }`,
      options: [2, { FunctionExpression: { parameters: 2, body: 0 } }],
      errors: expectedErrors([[2, 4, 2], [4, 4, 6], [5, 0, 2]])
    },
    {
      code: Lint.Utils.dedent`
        var foo = function(aaa,
           bbb,
         ccc) {
          bar();
        }`,
      options: [2, { FunctionExpression: { parameters: 1, body: 10 }}],
      errors: expectedErrors([[2, 2, 3], [3, 2, 1], [4, 20, 2]])
    },
    {
      code: Lint.Utils.dedent`
        var foo = function(aaa,
          bbb, ccc, ddd,
                                eee, fff) {
                bar();
        }`,
      options: [4, { FunctionExpression: { parameters: 'first', body: 1 } }],
      errors: expectedErrors([[2, 19, 2], [3, 19, 24], [4, 4, 8]])
    },
    {
      code: Lint.Utils.dedent`
        var foo = function(
        aaa, bbb, ccc,
            ddd, eee) {
          bar();
        }`,
      options: [2, {FunctionExpression: { parameters: 'first', body: 3 } }],
      errors: expectedErrors([[3, 0, 4], [4, 6, 2]])
    },
    {
      code: '\nvar foo = bar;\n\t\t\tvar baz = qux;',
      options: [2],
      errors: expectedErrors([[2, '0 spaces', '3 tabs']])
    },
    {
      code: '\nfunction foo() {\n\tbar();\n  baz();\n              qux();\n}',
      options: ['tab'],
      errors: expectedErrors([[3, '1 tab', '2 spaces'], [4, '1 tab', '14 spaces']], 'tab')
    },
    {
      code: [
        '\nfunction foo() {',
        '  bar();',
        '\t\t}'
      ].join('\n'),
      options: [2],
      errors: expectedErrors([[3, '0 spaces', '2 tabs']])
    },
    {
      code: Lint.Utils.dedent`
        function foo() {
          function bar() {
                baz();
          }
        }`,
      options: [2, { FunctionDeclaration: { body: 1 } }],
      errors: expectedErrors([[3, 4, 8]])
    },
    {
      code: Lint.Utils.dedent`
        function foo() {
          function bar(baz,
            qux) {
            foobar();
          }
        }`,
      options: [2, { FunctionDeclaration: { body: 1, parameters: 2 } }],
      errors: expectedErrors([[3, 6, 4]])
    },
    {
      code: Lint.Utils.dedent`
        function foo() {
          var bar = function(baz,
                  qux) {
            foobar();
          };
        }`,
      options: [2, { FunctionExpression: { parameters: 3 } }],
      errors: expectedErrors([[3, 8, 10]])
    },/*
    {
      code: fixture,
      options: [2, { SwitchCase: 1, MemberExpression: 1 }],
      errors: expectedErrors([
        [5, 2, 4],
        [10, 4, 6],
        [11, 2, 4],
        [15, 4, 2],
        [16, 2, 4],
        [23, 2, 4],
        [29, 2, 4],
        [31, 4, 2],
        [36, 4, 6],
        [38, 2, 4],
        [39, 4, 2],
        [40, 2, 0],
        [46, 0, 1],
        [54, 2, 4],
        [114, 4, 2],
        [120, 4, 6],
        [124, 4, 2],
        [134, 4, 6],
        [138, 2, 3],
        [139, 2, 3],
        [143, 4, 0],
        [151, 4, 6],
        [159, 4, 2],
        [161, 4, 6],
        [175, 2, 0],
        [177, 2, 4],
        [189, 2, 0],
        [193, 6, 4],
        [195, 6, 8],
        [304, 4, 6],
        [306, 4, 8],
        [307, 2, 4],
        [308, 2, 4],
        [311, 4, 6],
        [312, 4, 6],
        [313, 4, 6],
        [314, 2, 4],
        [315, 2, 4],
        [318, 4, 6],
        [319, 4, 6],
        [320, 4, 6],
        [321, 2, 4],
        [322, 2, 4],
        [326, 2, 1],
        [327, 2, 1],
        [328, 2, 1],
        [329, 2, 1],
        [330, 2, 1],
        [331, 2, 1],
        [332, 2, 1],
        [333, 2, 1],
        [334, 2, 1],
        [335, 2, 1],
        [340, 2, 4],
        [341, 2, 0],
        [344, 2, 4],
        [345, 2, 0],
        [348, 2, 4],
        [349, 2, 0],
        [355, 2, 0],
        [357, 2, 4],
        [361, 4, 6],
        [362, 2, 4],
        [363, 2, 4],
        [368, 2, 0],
        [370, 2, 4],
        [374, 4, 6],
        [376, 4, 2],
        [383, 2, 0],
        [385, 2, 4],
        [390, 2, 0],
        [392, 2, 4],
        [409, 2, 0],
        [410, 2, 4],
        [416, 2, 0],
        [417, 2, 4],
        [422, 2, 4],
        [423, 2, 0],
        [427, 2, 6],
        [428, 2, 8],
        [429, 2, 4],
        [430, 0, 4],
        [433, 2, 4],
        [434, 0, 4],
        [437, 2, 0],
        [438, 0, 4],
        [451, 2, 0],
        [453, 2, 4],
        [499, 6, 8],
        [500, 10, 8],
        [501, 8, 6],
        [506, 6, 8]
      ])
    }*/
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
