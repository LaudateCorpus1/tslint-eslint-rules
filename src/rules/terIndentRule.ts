import * as ts from 'typescript';
import * as Lint from 'tslint/lib/lint';
import 'colors';

const DEFAULT_VARIABLE_INDENT = 1;
const DEFAULT_PARAMETER_INDENT = null;
const DEFAULT_FUNCTION_BODY_INDENT = 1;
let indentType = 'space';
let indentSize = 2;
const OPTIONS: any = {};

export class Rule extends Lint.Rules.AbstractRule {
  public static metadata: Lint.IRuleMetadata = {
    ruleName: 'ter-indent',
    description: 'enforce consistent indentation',
    rationale: Lint.Utils.dedent`
      Using only one of tabs or spaces for indentation leads to more consistent editor behavior,
      cleaner diffs in version control, and easier programatic manipulation.`,
    optionsDescription: Lint.Utils.dedent`
      The string 'tab' or an integer indicating the number of spaces to use per tab.

      An object may be provided to fine tune the indentation rules:
            
        * \`"${DEFAULT_VARIABLE_INDENT.toString()}"\` desc.
        * \`"${DEFAULT_PARAMETER_INDENT}"\` desc`,
    options: {
      type: 'array',
      items: [{
        type: 'number',
        minimum: '0'
      }, {
        type: 'string',
        enum: ['tab']
      }, {
        type: 'object',
        properties: {
          SwitchCase: {
            type: 'number',
            minimum: 0
          }
          // [OPTION_IGNORE_URLS]: {
          //   type: "string",
          //   enum: [OPTION_ALWAYS, OPTION_NEVER],
          // },
          // [OPTION_IGNORE_COMMENTS]: {
          //   type: "string",
          //   enum: [OPTION_ALWAYS, OPTION_NEVER],
          // },
          // [OPTION_IGNORE_IMPORTS]: {
          //   type: "string",
          //   enum: [OPTION_ALWAYS, OPTION_NEVER],
          // },
          // [OPTION_IGNORE_PATTERN]: {
          //   type: "string",
          // },
          // [OPTION_CODE]: {
          //   type: "number",
          //   minumum: "1",
          // },
        },
        additionalProperties: false,
      }],
      minLength: 1,
      maxLength: 2
    },
    optionExamples: [
    ],
    type: 'maintainability',
  };

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    const walker = new IndentWalker(sourceFile, this.getOptions());
    return this.applyWithWalker(walker);
  }
}

class IndentWalker extends Lint.RuleWalker {
  private srcText: string;
  private caseIndentStore: { [key:number]: number } = {};

  constructor(sourceFile: ts.SourceFile, options: Lint.IOptions) {
    super(sourceFile, options);
    const defaultOptions = {
      SwitchCase: 0,
      VariableDeclarator: {
        var: DEFAULT_VARIABLE_INDENT,
        let: DEFAULT_VARIABLE_INDENT,
        const: DEFAULT_VARIABLE_INDENT
      },
      outerIIFEBody: null,
      FunctionDeclaration: {
        parameters: DEFAULT_PARAMETER_INDENT,
        body: DEFAULT_FUNCTION_BODY_INDENT
      },
      FunctionExpression: {
        parameters: DEFAULT_PARAMETER_INDENT,
        body: DEFAULT_FUNCTION_BODY_INDENT
      }
    };
    const firstParam = this.getOptions()[0];
    if (firstParam === 'tab') {
      indentSize = 1;
      indentType = 'tab';
    } else {
      indentSize = firstParam;
      indentType = 'space';
    }
    Object.assign(OPTIONS, defaultOptions, this.getOptions()[1]);
    this.srcText = sourceFile.getFullText();
  }

  private getSourceSubstr(start: number, end: number) {
    return this.srcText.substr(start, end - start);
  }

  /**
   * Creates an error message for a line.
   *
   * expectedAmount: The expected amount of indentation characters for this line
   * actualSpaces: The actual number of indentation spaces that were found on this line
   * actualTabs: The actual number of indentation tabs that were found on this line
   */
  private createErrorMessage(expectedAmount, actualSpaces, actualTabs) {
    const expectedStatement = `${expectedAmount} ${indentType}${expectedAmount === 1 ? '' : 's'}`;
    const foundSpacesWord = `space${actualSpaces === 1 ? '' : 's'}`;
    const foundTabsWord = `tab${actualTabs === 1 ? '' : 's'}`;
    let foundStatement;

    if (actualSpaces > 0 && actualTabs > 0) {
      foundStatement = `${actualSpaces} ${foundSpacesWord} and ${actualTabs} ${foundTabsWord}`;
    } else if (actualSpaces > 0) {
      // Abbreviate the message if the expected indentation is also spaces.
      // e.g. 'Expected 4 spaces but found 2' rather than 'Expected 4 spaces but found 2 spaces'
      foundStatement = indentType === 'space' ? actualSpaces : `${actualSpaces} ${foundSpacesWord}`;
    } else if (actualTabs > 0) {
      foundStatement = indentType === 'tab' ? actualTabs : `${actualTabs} ${foundTabsWord}`;
    } else {
      foundStatement = '0';
    }

    return `Expected indentation of ${expectedStatement} but found ${foundStatement}.`;
  }

  /**
   * Reports a given indent violation
   * node: Node violating the indent rule
   * needed: Expected indentation character count
   * gottenSpaces: Indentation space count in the actual node/code
   * gottenTabs: Indentation tab count in the actual node/code
   */
  private report(node: ts.Node, needed, gottenSpaces, gottenTabs) {
    const msg = this.createErrorMessage(needed, gottenSpaces, gottenTabs);
    const width = gottenSpaces + gottenTabs;
    console.log(`${msg} in ${[node.getText()]}`.yellow);
    this.addFailure(this.createFailure(node.getStart() - width, width, msg));
  }

  /**
   * Checks node is the first in its own start line. By default it looks by start line.
   * node: The node to check
   * [byEndLocation=false]: Lookup based on start position or end
   */
  private isNodeFirstInLine(node: ts.Node, byEndLocation: boolean = false) {
    const token = byEndLocation ? node.getLastToken() : node.getFirstToken();
    let pos = token.getStart() - 1;
    while ([' ', '\t'].indexOf(this.srcText.charAt(pos)) !== -1) {
      pos -= 1;
    }
    return this.srcText.charAt(pos) === '\n';
  }

  /**
   * Get the actual indent of node
   * node: Node to examine
   *
   * Returns the node's indent. Contains keys `space` and `tab`, representing the indent of each
   * character. Also contains keys `goodChar` and `badChar`, where `goodChar` is the amount of the
   * user's desired indentation character, and `badChar` is the amount of the other indentation
   * character.
   */
  private getNodeIndent(node: ts.Node) {
    if (node === this.getSourceFile()) {
      return { space: 0, tab: 0, goodChar: 0, badChar: 0 };
    }
    if (node.kind === ts.SyntaxKind.SyntaxList) {
      return this.getNodeIndent(node.parent);
    }

    const endIndex = node.getStart();
    let pos = endIndex - 1;
    while (pos > 0 && this.srcText.charAt(pos) !== '\n') {
      pos -= 1;
    }
    const str = this.getSourceSubstr(pos + 1, endIndex);
    const whiteSpace = (str.match(/^\s+/) || [''])[0];
    const indentChars = whiteSpace.split('');
    const spaces = indentChars.filter(char => char === ' ').length;
    const tabs = indentChars.filter(char => char === '\t').length;

    return {
      firstInLine: spaces + tabs === str.length,
      space: spaces,
      tab: tabs,
      goodChar: indentType === 'space' ? spaces : tabs,
      badChar: indentType === 'space' ? tabs : spaces
    };
  }

  private checkNodeIndent(node: ts.Node, neededIndent: number) {
    const actualIndent = this.getNodeIndent(node);
    if (
      node.kind !== ts.SyntaxKind.ArrayLiteralExpression &&
      node.kind !== ts.SyntaxKind.ObjectLiteralExpression &&
      (actualIndent.goodChar !== neededIndent || actualIndent.badChar !== 0) &&
      actualIndent.firstInLine
    ) {
      this.report(node, neededIndent, actualIndent.space, actualIndent.tab);
    }

    if (node.kind === ts.SyntaxKind.IfStatement && node['elseStatement']) {
      const elseKeyword = node.getChildren().filter(ch => ch.kind === ts.SyntaxKind.ElseKeyword).shift();
      this.checkNodeIndent(elseKeyword, neededIndent);
    }
  }

  private isSingleLineNode(node) {
    return node.getText().indexOf('\n') === -1;
  }

  /**
   * Check indentation for blocks
   * @param {ASTNode} node node to check
   * @returns {void}
   */
  private blockIndentationCheck(node: ts.Node) {

    // Skip inline blocks
    if (this.isSingleLineNode(node)) {
      return;
    }

    if (node.parent && (
        node.parent.kind === ts.SyntaxKind.FunctionExpression ||
        node.parent.kind === ts.SyntaxKind.FunctionDeclaration ||
        node.parent.kind === ts.SyntaxKind.ArrowFunction
      )) {
    //  this.checkIndentInFunctionBlock(node);
      //return;
    }

    let indent;
    let nodesToCheck = [];

    /*
   * For this statements we should check indent from statement beginning,
   * not from the beginning of the block.
   */
    const statementsWithProperties = [
      ts.SyntaxKind.IfStatement,
      ts.SyntaxKind.WhileStatement,
      ts.SyntaxKind.ForStatement,
      ts.SyntaxKind.ForInStatement,
      ts.SyntaxKind.ForOfStatement,
      ts.SyntaxKind.DoStatement,
      ts.SyntaxKind.ClassDeclaration,
      ts.SyntaxKind.SourceFile,
    ];
console.log('checking block...', [node.getFullText(), ts.SyntaxKind[node.kind]]);
    if (node.parent && statementsWithProperties.indexOf(node.parent.kind) !== -1 && this.isNodeBodyBlock(node)) {
      indent = this.getNodeIndent(node.parent).goodChar;
    }
    else {
      indent = this.getNodeIndent(node).goodChar;
    }



    if (node.kind === ts.SyntaxKind.IfStatement && node['thenStatement'].kind !== ts.SyntaxKind.Block) {
      console.log('MADE IT HERE...');
      nodesToCheck = [node['thenStatement']];
    } else {
      nodesToCheck = node.getChildren()[1].getChildren();
    }
    this.checkNodeIndent(node, indent);



    if (nodesToCheck.length > 0) {
      console.log('Checking children with indent', [indent]);
      this.checkNodesIndent(nodesToCheck, indent + indentSize);
    }

    if (node.kind === ts.SyntaxKind.Block) {
      console.log('CHECKING THIS'.america, [node.getFullText(), indent]);
      this.checkLastNodeLineIndent(node, indent);
    }
  }

  /**
   * Check if the node or node body is a BlockStatement or not
   * @param {ASTNode} node node to test
   * @returns {boolean} True if it or its body is a block statement
   */
  private isNodeBodyBlock(node) {
    return node.kind === ts.SyntaxKind.Block ||
        node.kind === ts.SyntaxKind.ClassExpression;
    // return node.type === "BlockStatement" || node.type === "ClassBody" || (node.body && node.body.type === "BlockStatement") ||
    //   (node.consequent && node.consequent.type === "BlockStatement");
  }

  /**
   * Check last node line indent this detects, that block closed correctly
   * @param {ASTNode} node Node to examine
   * @param {int} lastLineIndent needed indent
   * @returns {void}
   */
  private checkLastNodeLineIndent(node, lastLineIndent) {
    const lastToken = node.getLastToken();
    console.log('getting indent of last token...');
    const endIndent = this.getNodeIndent(lastToken, true);
    console.log('endIndent of last token:', endIndent, [lastToken.getText(), lastLineIndent]);
    const firstInLine = endIndent.firstInLine;
    if (firstInLine && (endIndent.goodChar !== lastLineIndent || endIndent.badChar !== 0)) {
      this.report(
        lastToken,
        lastLineIndent,
        endIndent.space,
        endIndent.tab
      );
    }
  }

  /**
   * Check indent for function block content
   * @param {ASTNode} node A BlockStatement node that is inside of a function.
   * @returns {void}
   */
  private checkIndentInFunctionBlock(node) {

    /*
   * Search first caller in chain.
   * Ex.:
   *
   * Models <- Identifier
   *   .User
   *   .find()
   *   .exec(function() {
   *   // function body
   * });
   *
   * Looks for 'Models'
   */
    const calleeNode = node.parent; // FunctionExpression
    let indent;

    if (calleeNode.parent &&
      (calleeNode.parent.type === "Property" ||
      calleeNode.parent.type === "ArrayExpression")) {

      // If function is part of array or object, comma can be put at left
      indent = this.getNodeIndent(calleeNode).goodChar;
    } else {

      // If function is standalone, simple calculate indent
      indent = this.getNodeIndent(calleeNode).goodChar;
    }

    if (calleeNode.parent.type === "CallExpression") {
      const calleeParent = calleeNode.parent;

      if (calleeNode.type !== "FunctionExpression" && calleeNode.type !== "ArrowFunctionExpression") {
        if (calleeParent && calleeParent.loc.start.line < node.loc.start.line) {
          indent = this.getNodeIndent(calleeParent).goodChar;
        }
      } else {
        if (isArgBeforeCalleeNodeMultiline(calleeNode) &&
          calleeParent.callee.loc.start.line === calleeParent.callee.loc.end.line &&
          !isNodeFirstInLine(calleeNode)) {
          indent = this.getNodeIndent(calleeParent).goodChar;
        }
      }
    }

    // function body indent should be indent + indent size, unless this
    // is a FunctionDeclaration, FunctionExpression, or outer IIFE and the corresponding options are enabled.
    let functionOffset = indentSize;

    if (options.outerIIFEBody !== null && isOuterIIFE(calleeNode)) {
      functionOffset = options.outerIIFEBody * indentSize;
    } else if (calleeNode.type === "FunctionExpression") {
      functionOffset = options.FunctionExpression.body * indentSize;
    } else if (calleeNode.type === "FunctionDeclaration") {
      functionOffset = options.FunctionDeclaration.body * indentSize;
    }
    indent += functionOffset;

    // check if the node is inside a variable
    const parentVarNode = getVariableDeclaratorNode(node);

    if (parentVarNode && isNodeInVarOnTop(node, parentVarNode)) {
      indent += indentSize * options.VariableDeclarator[parentVarNode.parent.kind];
    }

    if (node.body.length > 0) {
      checkNodesIndent(node.body, indent);
    }

    checkLastNodeLineIndent(node, indent - functionOffset);
  }

  /**
   * Check indent for nodes list
   * @param {ASTNode[]} nodes list of node objects
   * @param {int} indent needed indent
   * @param {boolean} [excludeCommas=false] skip comma on start of line
   * @returns {void}
   */
  protected checkNodesIndent(nodes: ts.Node[], indent: number) {
    nodes.forEach(node => {
      console.log('checking node in loop:', [node.getFullText(), indent]);
      this.checkNodeIndent(node, indent);
    });
  }

  /**
   * Returns the expected indentation for the case statement
   * @param {ASTNode} node node to examine
   * @param {int} [switchIndent] indent for switch statement
   * @returns {int} indent size
   */
  private expectedCaseIndent(node: ts.Node, switchIndent?: number) {
    const switchNode = (node.kind === ts.SyntaxKind.CaseBlock) ? node.parent : node.parent.parent;
    const line = node.getSourceFile().getLineAndCharacterOfPosition(switchNode.getStart()).line;
    let caseIndent;

    if (this.caseIndentStore[line]) {
      return this.caseIndentStore[line];
    } else {
      if (typeof switchIndent === 'undefined') {
        switchIndent = this.getNodeIndent(switchNode).goodChar;
      }

      caseIndent = switchIndent + (indentSize * OPTIONS.SwitchCase);
      this.caseIndentStore[line] = caseIndent;
      return caseIndent;
    }
  }

  protected visitBinaryExpression(node: ts.BinaryExpression) {
    // this.validateUseIsnan(node);
    super.visitBinaryExpression(node);
  }

  protected visitBlock(node: ts.Block) {
    this.blockIndentationCheck(node);
    super.visitBlock(node);
  }

  protected visitIfStatement(node: ts.IfStatement) {
    const thenLine = node.getSourceFile().getLineAndCharacterOfPosition(node.thenStatement.getStart()).line;
    const line = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line;
    if (node.thenStatement.kind !== ts.SyntaxKind.Block && thenLine > line) {
      this.blockIndentationCheck(node);
    }
    super.visitIfStatement(node);
  }

  protected visitSwitchStatement(node: ts.SwitchStatement) {
    super.visitSwitchStatement(node);
  }

  protected visitCaseClause(node: ts.CaseClause) {
    if (this.isSingleLineNode(node)) {
      return;
    }
    const caseIndent = this.expectedCaseIndent(node);
    this.checkNodesIndent(node.statements, caseIndent + indentSize);

    super.visitCaseClause(node);
  }

  protected visitSourceFile(node: ts.SourceFile) {
    // Root nodes should have no indent
    this.checkNodesIndent(node.statements, 0);
    super.visitSourceFile(node);
  }

}
