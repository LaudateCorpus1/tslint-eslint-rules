/**
 * eslint commit: 332d21383d58fa75bd8d192fe03453f9bcbfe095
 *
 * Keep checking differences to that commit to see if there are any other test cases.
 */
import * as ts from 'typescript';
import * as Lint from 'tslint/lib/lint';
import 'colors';

const DEFAULT_VARIABLE_INDENT = 1;
const DEFAULT_PARAMETER_INDENT = null;
const DEFAULT_FUNCTION_BODY_INDENT = 1;
let indentType = 'space';
let indentSize = 4;
let OPTIONS: any;

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
        additionalProperties: false
      }],
      minLength: 1,
      maxLength: 2
    },
    optionExamples: [
    ],
    type: 'maintainability'
  };

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    const walker = new IndentWalker(sourceFile, this.getOptions());
    return this.applyWithWalker(walker);
  }
}

class IndentWalker extends Lint.RuleWalker {
  private srcFile: ts.SourceFile;
  private srcText: string;
  private caseIndentStore: { [key: number]: number } = {};
  private varIndentStore: { [key: number]: number } = {};

  constructor(sourceFile: ts.SourceFile, options: Lint.IOptions) {
    super(sourceFile, options);
    OPTIONS = {
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
      indentSize = firstParam || 4;
      indentType = 'space';
    }
    const userOptions = this.getOptions()[1];
    if (userOptions) {
      OPTIONS.SwitchCase = userOptions.SwitchCase || 0;

      if (typeof userOptions.VariableDeclarator === 'number') {
        OPTIONS.VariableDeclarator = {
          var: userOptions.VariableDeclarator,
          let: userOptions.VariableDeclarator,
          const: userOptions.VariableDeclarator
        };
      } else if (typeof userOptions.VariableDeclarator === 'object') {
        Object.assign(OPTIONS.VariableDeclarator, userOptions.VariableDeclarator);
      }

      if (typeof userOptions.outerIIFEBody === 'number') {
        OPTIONS.outerIIFEBody = userOptions.outerIIFEBody;
      }

      if (typeof userOptions.MemberExpression === 'number') {
        OPTIONS.MemberExpression = userOptions.MemberExpression;
      }

      if (typeof userOptions.FunctionDeclaration === 'object') {
        Object.assign(OPTIONS.FunctionDeclaration, userOptions.FunctionDeclaration);
      }

      if (typeof userOptions.FunctionExpression === 'object') {
        Object.assign(OPTIONS.FunctionExpression, userOptions.FunctionExpression);
      }
    }
    this.srcFile = sourceFile;
    this.srcText = sourceFile.getFullText();
  }

  private getSourceSubstr(start: number, end: number) {
    return this.srcText.substr(start, end - start);
  }

  private getLineAndCharacter(node: ts.Node, byEndLocation: boolean = false) {
    const index = byEndLocation ? node.getEnd() : node.getStart();
    return this.srcFile.getLineAndCharacterOfPosition(index);
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
    if (gottenSpaces && gottenTabs) {
      // To avoid conflicts with `no-mixed-spaces-and-tabs`, don't report lines that have both spaces and tabs.
      return;
    }
    const msg = this.createErrorMessage(needed, gottenSpaces, gottenTabs);
    const width = gottenSpaces + gottenTabs;
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

    let firstInLine = false;
    const comments = ts.getLeadingCommentRanges(node.getFullText(), 0);
    if (comments && comments.length) {
      const offset = node.getFullStart();
      const lastComment = comments[comments.length - 1];
      const comment = this.getSourceSubstr(lastComment.pos + offset, lastComment.end + offset);
      if (comment.indexOf('\n') !== -1) {
        firstInLine = true;
      }
    }

    return {
      firstInLine: spaces + tabs === str.length || firstInLine,
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
      if (!this.isNodeFirstInLine(node['elseStatement'])) {
        this.checkNodeIndent(node['elseStatement'], neededIndent);
      }
    }
  }

  private isSingleLineNode(node): boolean {
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
      this.checkIndentInFunctionBlock(node);
      return;
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
      ts.SyntaxKind.ClassExpression,
      ts.SyntaxKind.SourceFile
    ];
    if (node.parent && statementsWithProperties.indexOf(node.parent.kind) !== -1 && this.isNodeBodyBlock(node)) {
      indent = this.getNodeIndent(node.parent).goodChar;
    } else {
      indent = this.getNodeIndent(node).goodChar;
    }

    if (node.kind === ts.SyntaxKind.IfStatement && node['thenStatement'].kind !== ts.SyntaxKind.Block) {
      nodesToCheck = [node['thenStatement']];
    } else {
      if (node.kind === ts.SyntaxKind.Block) {
        nodesToCheck = node.getChildren()[1].getChildren();
      } else if (
        node.parent.kind === ts.SyntaxKind.ClassDeclaration ||
        node.parent.kind === ts.SyntaxKind.ClassExpression
      ) {
        nodesToCheck = node.getChildren();
      } else {
        nodesToCheck = [(node as ts.IterationStatement).statement];
      }
    }
    this.checkNodeIndent(node, indent);

    if (nodesToCheck.length > 0) {
      this.checkNodesIndent(nodesToCheck, indent + indentSize);
    }

    if (node.kind === ts.SyntaxKind.Block) {
      this.checkLastNodeLineIndent(node, indent);
    }
  }

  private isClassLike(node) {
    return node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.ClassExpression;
  }

  /**
   * Check if the node or node body is a BlockStatement or not
   * @param {ASTNode} node node to test
   * @returns {boolean} True if it or its body is a block statement
   */
  private isNodeBodyBlock(node) {
    return node.kind === ts.SyntaxKind.Block ||
      (node.kind === ts.SyntaxKind.SyntaxList && this.isClassLike(node.parent.kind));
    // return node.type === "BlockStatement" || node.type === "ClassBody" || (node.body && node.body.type === "BlockStatement") ||
    //   (node.consequent && node.consequent.type === "BlockStatement");
  }

  /**
   * Check last node line indent this detects, that block closed correctly
   * @param {ASTNode} node Node to examine
   * @param {int} lastLineIndent needed indent
   * @returns {void}
   */
  private checkFirstNodeLineIndent(node, firstLineIndent) {
    const startIndent = this.getNodeIndent(node);
    const firstInLine = startIndent.firstInLine;
    if (firstInLine && (startIndent.goodChar !== firstLineIndent || startIndent.badChar !== 0)) {
      this.report(node, firstLineIndent, startIndent.space, startIndent.tab);
    }
  }

  /**
   * Check last node line indent this detects, that block closed correctly
   * @param {ASTNode} node Node to examine
   * @param {int} lastLineIndent needed indent
   * @returns {void}
   */
  private checkLastNodeLineIndent(node, lastLineIndent) {
    const lastToken = node.getLastToken();
    const endIndent = this.getNodeIndent(lastToken);
    const firstInLine = endIndent.firstInLine;
    if (firstInLine && (endIndent.goodChar !== lastLineIndent || endIndent.badChar !== 0)) {
      this.report(lastToken, lastLineIndent, endIndent.space, endIndent.tab);
    }
  }

  /**
   * Check to see if the node is a file level IIFE
   * @param {ASTNode} node The function node to check.
   * @returns {boolean} True if the node is the outer IIFE
   */
  private isOuterIIFE(node) {
    let parent = node.parent;
    let expressionIsNode = parent.expression !== node;
    if (parent.kind === ts.SyntaxKind.ParenthesizedExpression) {
      parent = parent.parent;
    }
    let stmt = parent.parent;
    /*
   * Verify that the node is an IIEF
   */
    if (parent.kind !== ts.SyntaxKind.CallExpression || expressionIsNode) {
      return false;
    }
    /*
   * Navigate legal ancestors to determine whether this IIEF is outer
   */
    while (
      stmt.kind === ts.SyntaxKind.PrefixUnaryExpression && (
        stmt.operator === ts.SyntaxKind.ExclamationToken ||
        stmt.operator === ts.SyntaxKind.TildeToken ||
        stmt.operator === ts.SyntaxKind.PlusToken ||
        stmt.operator === ts.SyntaxKind.MinusToken
      ) ||
      (stmt.kind === ts.SyntaxKind.BinaryExpression && stmt.operatorToken.getText() === '=') ||
      stmt.kind === ts.SyntaxKind.BinaryExpression ||
      stmt.kind === ts.SyntaxKind.SyntaxList ||
      stmt.kind === ts.SyntaxKind.VariableDeclaration ||
      stmt.kind === ts.SyntaxKind.VariableDeclarationList ||
      stmt.kind === ts.SyntaxKind.ParenthesizedExpression
    ) {
      stmt = stmt.parent;
    }

    return ((
      stmt.kind === ts.SyntaxKind.ExpressionStatement ||
      stmt.kind === ts.SyntaxKind.VariableStatement) &&
      stmt.parent && stmt.parent.kind === ts.SyntaxKind.SourceFile
    );
  }

  /**
   * Check to see if the argument before the callee node is multi-line and
   * there should only be 1 argument before the callee node
   * @param {ASTNode} node node to check
   * @returns {boolean} True if arguments are multi-line
   */
  private isArgBeforeCalleeNodeMultiline(node: ts.Node) {
    const parent = node.parent;
    if (parent['arguments'].length >= 2 && parent['arguments'][1] === node) {
      const firstArg = parent['arguments'][0];
      return this.getLineAndCharacter(firstArg, true).line > this.getLineAndCharacter(firstArg).line;
    }

    return false;
  }

  /**
   * Check indent for function block content
   * @param {ASTNode} node A BlockStatement node that is inside of a function.
   * @returns {void}
   */
  private checkIndentInFunctionBlock(node) {
    const calleeNode = node.parent; // FunctionExpression
    let indent = this.getNodeIndent(calleeNode).goodChar;

    if (calleeNode.parent.kind === ts.SyntaxKind.CallExpression) {
      const calleeParent = calleeNode.parent;

      if (calleeNode.kind !== ts.SyntaxKind.FunctionExpression && calleeNode.kind !== ts.SyntaxKind.ArrowFunction) {
        if (calleeParent && this.getLineAndCharacter(calleeParent).line < this.getLineAndCharacter(node).line) {
          indent = this.getNodeIndent(calleeParent).goodChar;
        }
      } else {
        const callee = calleeParent.expression;
        if (
          this.isArgBeforeCalleeNodeMultiline(calleeNode) &&
          this.getLineAndCharacter(callee).line === this.getLineAndCharacter(callee, true).line &&
          !this.isNodeFirstInLine(calleeNode)
        ) {
          indent = this.getNodeIndent(calleeParent).goodChar;
        }
      }
    }
    // function body indent should be indent + indent size, unless this
    // is a FunctionDeclaration, FunctionExpression, or outer IIFE and the corresponding options are enabled.
    let functionOffset = indentSize;
    if (OPTIONS.outerIIFEBody !== null && this.isOuterIIFE(calleeNode)) {
      functionOffset = OPTIONS.outerIIFEBody * indentSize;
    } else if (calleeNode.kind === ts.SyntaxKind.FunctionExpression) {
      functionOffset = OPTIONS.FunctionExpression.body * indentSize;
    } else if (calleeNode.kind === ts.SyntaxKind.FunctionDeclaration) {
      functionOffset = OPTIONS.FunctionDeclaration.body * indentSize;
    }
    indent += functionOffset;

    // check if the node is inside a variable
    const parentVarNode = this.getVariableDeclaratorNode(node);

    if (parentVarNode && this.isNodeInVarOnTop(node, parentVarNode)) {
      const varKind = parentVarNode.parent.getFirstToken().getText();
      indent += indentSize * OPTIONS.VariableDeclarator[varKind];
    }

    if (node.statements.length) {
      this.checkNodesIndent(node.statements, indent);
    }

    this.checkLastNodeLineIndent(node, indent - functionOffset);
  }

  /**
   * Check indent for nodes list
   * @param {ASTNode[]} nodes list of node objects
   * @param {int} indent needed indent
   * @param {boolean} [excludeCommas=false] skip comma on start of line
   * @returns {void}
   */
  protected checkNodesIndent(nodes: ts.Node[], indent: number) {
    nodes.forEach(node => this.checkNodeIndent(node, indent));
  }

  /**
   * Returns the expected indentation for the case statement
   * @param {ASTNode} node node to examine
   * @param {int} [switchIndent] indent for switch statement
   * @returns {int} indent size
   */
  private expectedCaseIndent(node: ts.Node, switchIndent?: number) {
    const switchNode = (node.kind === ts.SyntaxKind.SwitchStatement) ? node : node.parent;
    const line = this.getLineAndCharacter(switchNode).line;
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

  /**
   */
  private expectedVarIndent(node: ts.VariableDeclaration, varIndent?: number) {
    // VariableStatement -> VariableDeclarationList -> VariableDeclaration
    const varNode = node.parent.parent;
    const line = this.getLineAndCharacter(varNode).line;
    let indent;

    if (this.varIndentStore[line]) {
      return this.varIndentStore[line];
    } else {
      if (typeof varIndent === 'undefined') {
        varIndent = this.getNodeIndent(varNode).goodChar;
      }
      const varKind = varNode.getFirstToken().getText();
      indent = varIndent + (indentSize * OPTIONS.VariableDeclarator[varKind]);
      this.varIndentStore[line] = indent;
      return indent;
    }
  }

  /**
   * Returns a parent node of given node based on a specified type
   * if not present then return null
   * @param {ASTNode} node node to examine
   * @param {string} type type that is being looked for
   * @returns {ASTNode|void} if found then node otherwise null
   */
  private getParentNodeByType<T extends ts.Node>(node: ts.Node, kind): T {
    let parent = node.parent;

    while (parent.kind !== kind && parent.kind !== ts.SyntaxKind.SourceFile) {
      parent = parent.parent;
    }

    return parent.kind === kind ? parent as T : null;
  }

  /**
   * Returns the VariableDeclarator based on the current node
   * if not present then return null
   * @param {ASTNode} node node to examine
   * @returns {ASTNode|void} if found then node otherwise null
   */
  protected getVariableDeclaratorNode(node: ts.Node): ts.VariableDeclaration {
    return this.getParentNodeByType<ts.VariableDeclaration>(node, ts.SyntaxKind.VariableDeclaration);
  }

  protected getBinaryExpressionNode(node: ts.Node): ts.BinaryExpression {
    return this.getParentNodeByType<ts.BinaryExpression>(node, ts.SyntaxKind.BinaryExpression);
  }

  /**
   * Check indent for array block content or object block content
   * @param {ASTNode} node node to examine
   * @returns {void}
   */
  protected checkIndentInArrayOrObjectBlock(node: ts.Node) {
    if (this.isSingleLineNode(node)) {
      return;
    }

    let elements = (node.kind === ts.SyntaxKind.ObjectLiteralExpression) ? node['properties'] : node['elements'];

    // filter out empty elements example would be [ , 2] so remove first element as espree considers it as null
    elements = elements.filter((elem) => {
      return elem !== null;
    });

    // Skip if first element is in same line with this node
    if (elements.length && this.getLineAndCharacter(elements[0]).line === this.getLineAndCharacter(node).line) {
      return;
    }

    const nodeLine = this.getLineAndCharacter(node).line;
    const nodeEndLine = this.getLineAndCharacter(node, true).line;

    // Skip if first element is in same line with this node
    if (elements.length) {
      const firstElementLine = this.getLineAndCharacter(elements[0]).line;
      if (nodeLine === firstElementLine) {
        return;
      }
    }

    let nodeIndent;
    let elementsIndent;
    let varKind;
    const parentVarNode = this.getVariableDeclaratorNode(node);

    if (this.isNodeFirstInLine(node)) {
      const parent = node.parent;
      let effectiveParent = parent;

      if (parent.kind === ts.SyntaxKind.PropertyDeclaration) {
        if (this.isNodeFirstInLine(parent)) {
          effectiveParent = parent.parent.parent;
        } else {
          effectiveParent = parent.parent;
        }
      }

      nodeIndent = this.getNodeIndent(effectiveParent).goodChar;
      if (parentVarNode && this.getLineAndCharacter(parentVarNode).line !== nodeLine) {
        if (parent.kind !== ts.SyntaxKind.VariableDeclaration || parentVarNode === parentVarNode.parent.declarations[0]) {
          const parentVarLine = this.getLineAndCharacter(parentVarNode).line;
          const effectiveParentLine = this.getLineAndCharacter(effectiveParent).line;
          if (parent.kind === ts.SyntaxKind.VariableDeclaration && parentVarLine === effectiveParentLine) {
            varKind = parentVarNode.parent.getFirstToken().getText();
            nodeIndent = nodeIndent + (indentSize * OPTIONS.VariableDeclarator[varKind]);
          } else if (
            parent.kind === ts.SyntaxKind.ObjectLiteralExpression ||
            parent.kind === ts.SyntaxKind.ArrayLiteralExpression ||
            parent.kind === ts.SyntaxKind.CallExpression ||
            parent.kind === ts.SyntaxKind.ArrowFunction ||
            parent.kind === ts.SyntaxKind.NewExpression ||
            parent.kind === ts.SyntaxKind.BinaryExpression
          ) {
            nodeIndent = nodeIndent + indentSize;
          }
        }
      } else if (
        !parentVarNode &&
        !this.isFirstArrayElementOnSameLine(parent) &&
        effectiveParent.kind !== ts.SyntaxKind.PropertyAccessExpression &&
        effectiveParent.kind !== ts.SyntaxKind.ExpressionStatement &&
        effectiveParent.kind !== ts.SyntaxKind.PropertyAssignment &&
        !(effectiveParent.kind === ts.SyntaxKind.BinaryExpression && effectiveParent.operatorToken.getText() === '=')
      ) {
        nodeIndent = nodeIndent + indentSize;
      }

      elementsIndent = nodeIndent + indentSize;
      this.checkFirstNodeLineIndent(node, nodeIndent);
    } else {
      nodeIndent = this.getNodeIndent(node).goodChar;
      elementsIndent = nodeIndent + indentSize;
    }

    /*
       * Check if the node is a multiple variable declaration; if so, then
       * make sure indentation takes that into account.
       */
    if (parentVarNode && this.isNodeInVarOnTop(node, parentVarNode)) {
      varKind = parentVarNode.parent.getFirstToken().getText();
      elementsIndent += indentSize * OPTIONS.VariableDeclarator[varKind];
    }

    this.checkNodesIndent(elements, elementsIndent);

    if (elements.length > 0) {
      const lastLine = this.getLineAndCharacter(elements[elements.length - 1], true).line;
      // Skip last block line check if last item in same line
      if (lastLine === nodeEndLine) {
        return;
      }
    }

    this.checkLastNodeLineIndent(node, elementsIndent - indentSize);
  }

  /**
   * Check to see if the first element inside an array is an object and on the same line as the node
   * If the node is not an array then it will return false.
   * @param {ASTNode} node node to check
   * @returns {boolean} success/failure
   */
  private isFirstArrayElementOnSameLine(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.ArrayLiteralExpression && node.elements[0]) {
      return this.getLineAndCharacter(node.elements[0]).line === this.getLineAndCharacter(node).line && node.elements[0].kind === ts.SyntaxKind.ObjectLiteralExpression;
    }
    return false;
  }

  /**
   * Check to see if the node is part of the multi-line variable declaration.
   * Also if its on the same line as the varNode
   * @param {ASTNode} node node to check
   * @param {ASTNode} varNode variable declaration node to check against
   * @returns {boolean} True if all the above condition satisfy
   */
  protected isNodeInVarOnTop(node: ts.Node, varNode) {
    const nodeLine = this.getLineAndCharacter(node).line;
    const parentLine = this.getLineAndCharacter(varNode.parent).line;
    return varNode &&
      parentLine === nodeLine &&
      varNode.parent.declarations.length > 1;
  }

  /**
   * Check and decide whether to check for indentation for blockless nodes
   * Scenarios are for or while statements without braces around them
   * @param {ASTNode} node node to examine
   * @returns {void}
   */
  protected blockLessNodes(node) {
    if (node.statement.kind !== ts.SyntaxKind.Block) {
      this.blockIndentationCheck(node);
    }
  }

  protected visitClassDeclaration(node: ts.ClassDeclaration) {
    const len = node.getChildCount();
    this.blockIndentationCheck(node.getChildAt(len - 2));
    super.visitClassDeclaration(node);
  }

  protected visitClassExpression(node: ts.ClassExpression) {
    const len = node.getChildCount();
    this.blockIndentationCheck(node.getChildAt(len - 2));
    super.visitClassExpression(node);
  }

  protected visitBlock(node: ts.Block) {
    this.blockIndentationCheck(node);
    super.visitBlock(node);
  }

  protected visitIfStatement(node: ts.IfStatement) {
    const thenLine = this.getLineAndCharacter(node.thenStatement).line;
    const line = this.getLineAndCharacter(node).line;
    if (node.thenStatement.kind !== ts.SyntaxKind.Block && thenLine > line) {
      this.blockIndentationCheck(node);
    }
    super.visitIfStatement(node);
  }

  protected visitObjectLiteralExpression(node: ts.ObjectLiteralExpression) {
    this.checkIndentInArrayOrObjectBlock(node);
    super.visitObjectLiteralExpression(node);
  }

  protected visitArrayLiteralExpression(node: ts.ArrayLiteralExpression) {
    this.checkIndentInArrayOrObjectBlock(node);
    super.visitArrayLiteralExpression(node);
  }

  protected visitSwitchStatement(node: ts.SwitchStatement) {
    const switchIndent = this.getNodeIndent(node).goodChar;
    const caseIndent = this.expectedCaseIndent(node, switchIndent);
    this.checkNodesIndent(node.caseBlock.clauses, caseIndent);
    this.checkLastNodeLineIndent(node, switchIndent);
    super.visitSwitchStatement(node);
  }

  /**
   * Check indentation for variable declarations
   * @param {ASTNode} node node to examine
   * @returns {void}
   */
  private checkIndentInVariableDeclarations(node: ts.VariableDeclaration) {
    const indent = this.expectedVarIndent(node);
    this.checkNodeIndent(node, indent);
  }

  private visitCase(node: ts.Node) {
    if (this.isSingleLineNode(node)) {
      return;
    }
    const caseIndent = this.expectedCaseIndent(node);
    this.checkNodesIndent(node.statements, caseIndent + indentSize);
  }

  protected visitCaseClause(node: ts.CaseClause) {
    this.visitCase(node);
    super.visitCaseClause(node);
  }

  protected visitDefaultClause(node: ts.DefaultClause) {
    this.visitCase(node);
    super.visitDefaultClause(node);
  }

  protected visitWhileStatement(node: ts.WhileStatement) {
    this.blockLessNodes(node);
    super.visitWhileStatement(node);
  }

  protected visitForStatement(node: ts.ForStatement) {
    this.blockLessNodes(node);
    super.visitForStatement(node);
  }

  protected visitForInStatement(node: ts.ForInStatement) {
    this.blockLessNodes(node);
    super.visitForInStatement(node);
  }

  protected visitDoStatement(node: ts.DoStatement) {
    this.blockLessNodes(node);
    super.visitDoStatement(node);
  }

  protected visitVariableDeclaration(node: ts.VariableDeclaration) {
    this.checkIndentInVariableDeclarations(node);
    super.visitVariableDeclaration(node);
  }

  protected visitVariableStatement(node: ts.VariableStatement) {
    super.visitVariableStatement(node);

    // VariableStatement -> VariableDeclarationList -> (VarKeyword, SyntaxList)
    const list = node.getChildAt(0).getChildAt(1);
    const len = list.getChildCount();
    const lastElement = list.getChildAt(len - 1);
    const lastToken = node.getLastToken();
    const lastTokenLine = this.getLineAndCharacter(lastToken, true).line;
    const lastElementLine = this.getLineAndCharacter(lastElement, true).line;

    // Only check the last line if there is any token after the last item
    if (lastTokenLine <= lastElementLine) {
      return;
    }

    const tokenBeforeLastElement = list.getChildAt(len - 2);
    if (tokenBeforeLastElement.kind === ts.SyntaxKind.CommaToken) {
      // Special case for comma-first syntax where the semicolon is indented
      this.checkLastNodeLineIndent(node, this.getNodeIndent(tokenBeforeLastElement).goodChar);
    } else {
      this.checkLastNodeLineIndent(node, elementsIndent - indentSize);
    }
  }

  protected visitFunctionDeclaration(node: ts.FunctionDeclaration) {
    if (this.isSingleLineNode(node)) {
      return;
    }
    if (OPTIONS.FunctionDeclaration.parameters === 'first' && node.parameters.length) {
      const indent = this.getLineAndCharacter(node.parameters[0]).character;
      this.checkNodesIndent(node.parameters.slice(1), indent);
    } else if (OPTIONS.FunctionDeclaration.parameters !== null) {
      this.checkNodesIndent(
        node.parameters,
        this.getNodeIndent(node).goodChar + indentSize * OPTIONS.FunctionDeclaration.parameters
      );
    }

    super.visitFunctionDeclaration(node);
  }

  protected visitFunctionExpression(node: ts.FunctionExpression) {
    if (this.isSingleLineNode(node)) {
      return;
    }
    if (OPTIONS.FunctionExpression.parameters === 'first' && node.parameters.length) {
      const indent = this.getLineAndCharacter(node.parameters[0]).character;
      this.checkNodesIndent(node.parameters.slice(1), indent);
    } else if (OPTIONS.FunctionExpression.parameters !== null) {
      this.checkNodesIndent(
        node.parameters,
        this.getNodeIndent(node).goodChar + indentSize * OPTIONS.FunctionExpression.parameters
      );
    }
    super.visitFunctionExpression(node);
  }

  protected visitPropertyAccessExpression(node: ts.PropertyAccessExpression) {
    if (typeof OPTIONS.MemberExpression === 'undefined') {
      return;
    }

    if (this.isSingleLineNode(node)) {
      return;
    }

    // The typical layout of variable declarations and assignments
    // alter the expectation of correct indentation. Skip them.
    // TODO: Add appropriate configuration options for variable
    // declarations and assignments.
    if (this.getVariableDeclaratorNode(node)) {
      return;
    }

    const binaryNode: ts.BinaryExpression = this.getBinaryExpressionNode(node);
    if (binaryNode && binaryNode.operatorToken.getText() === '=') {
      return;
    }

    const propertyIndent = this.getNodeIndent(node).goodChar + indentSize * OPTIONS.MemberExpression;
    const checkNodes = [node.name, node.dotToken];

    this.checkNodesIndent(checkNodes, propertyIndent);
    super.visitPropertyAccessExpression(node);
  }

  protected visitSourceFile(node: ts.SourceFile) {
    // Root nodes should have no indent
    this.checkNodesIndent(node.statements, 0);
    super.visitSourceFile(node);
  }

}
