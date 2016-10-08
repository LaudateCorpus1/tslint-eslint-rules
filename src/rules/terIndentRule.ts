import * as ts from 'typescript';
import * as Lint from 'tslint/lib/lint';
import 'colors';

const DEFAULT_VARIABLE_INDENT = 1;
const DEFAULT_PARAMETER_INDENT = null;
const DEFAULT_FUNCTION_BODY_INDENT = 1;
let indentType = 'space';
let indentSize = 4;
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
  private caseIndentStore: { [key: number]: number } = {};
  private varIndentStore: { [key: number]: number } = {};

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
      indentSize = firstParam || indentSize;
      indentType = 'space';
    }
    const userOptions = this.getOptions()[1];
    if (userOptions && typeof userOptions.VariableDeclarator === 'number') {
      userOptions.VariableDeclarator =  {
        var: userOptions.VariableDeclarator,
        let: userOptions.VariableDeclarator,
        const: userOptions.VariableDeclarator
      };
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
      ts.SyntaxKind.SourceFile
    ];
    if (node.parent && statementsWithProperties.indexOf(node.parent.kind) !== -1 && this.isNodeBodyBlock(node)) {
      indent = this.getNodeIndent(node.parent).goodChar;
    }
    else {
      indent = this.getNodeIndent(node).goodChar;
    }


    if (node.kind === ts.SyntaxKind.IfStatement && node['thenStatement'].kind !== ts.SyntaxKind.Block) {
      nodesToCheck = [node['thenStatement']];
    } else {
      if (node.kind === ts.SyntaxKind.Block) {
        nodesToCheck = node.getChildren()[1].getChildren();
      } else {
        nodesToCheck = [node.statement];
      }


    }


    this.checkNodeIndent(node, indent);



    if (nodesToCheck.length > 0) {
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
    console.log('checking node:', ts.SyntaxKind[node.kind]);
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
  private checkFirstNodeLineIndent(node, firstLineIndent) {
    const startIndent = this.getNodeIndent(node);
    const firstInLine = startIndent.firstInLine;
    if (firstInLine && (startIndent.goodChar !== firstLineIndent || startIndent.badChar !== 0)) {
      this.report(
        node,
        firstLineIndent,
        startIndent.space,
        startIndent.tab
      );
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
console.log('INDENT:', indent);
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
    console.log('INDENT HERE:', indent);
    // function body indent should be indent + indent size, unless this
    // is a FunctionDeclaration, FunctionExpression, or outer IIFE and the corresponding options are enabled.
    let functionOffset = indentSize;

    if (OPTIONS.outerIIFEBody !== null && isOuterIIFE(calleeNode)) {
      functionOffset = options.outerIIFEBody * indentSize;
    } else if (calleeNode.type === "FunctionExpression") {
      functionOffset = options.FunctionExpression.body * indentSize;
    } else if (calleeNode.type === "FunctionDeclaration") {
      functionOffset = options.FunctionDeclaration.body * indentSize;
    }
    console.log('FN OFFSET'.red, functionOffset);
    indent += functionOffset;

    // check if the node is inside a variable
    const parentVarNode = this.getVariableDeclaratorNode(node);

    if (parentVarNode && this.isNodeInVarOnTop(node, parentVarNode)) {
      const varKind = parentVarNode.parent.getFirstToken().getText();
      indent += indentSize * OPTIONS.VariableDeclarator[varKind];
    }

    console.log('NODE:', node, indent);
    if (node.statements.length > 0) {
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
    nodes.forEach(node => {
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
    const switchNode = (node.kind === ts.SyntaxKind.SwitchStatement) ? node : node.parent;
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

  /**
   */
  private expectedVarIndent(node: ts.VariableDeclaration, varIndent?: number) {
    // VariableStatement -> VariableDeclarationList -> VariableDeclaration
    const varNode = node.parent.parent;
    const line = node.getSourceFile().getLineAndCharacterOfPosition(varNode.getStart()).line;
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
  protected getParentNodeByType(node: ts.Node, kind) {
    let parent = node.parent;

    while (parent.kind !== kind && parent.kind !== ts.SyntaxKind.SourceFile) {
      parent = parent.parent;
    }

    return parent.kind === kind ? parent : null;
  }

  /**
   * Returns the VariableDeclarator based on the current node
   * if not present then return null
   * @param {ASTNode} node node to examine
   * @returns {ASTNode|void} if found then node otherwise null
   */
  protected getVariableDeclaratorNode(node: ts.Node) {
    return this.getParentNodeByType(node, ts.SyntaxKind.VariableDeclaration);
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

    const file = node.getSourceFile();
    const nodeLine = file.getLineAndCharacterOfPosition(node.getStart()).line;
    const nodeEndLine = file.getLineAndCharacterOfPosition(node.getEnd()).line;
    console.log('===>', elements);

    // Skip if first element is in same line with this node
    if (elements.length) {
      const firstElementLine = file.getLineAndCharacterOfPosition(elements[0].getStart()).line;
      if (nodeLine === firstElementLine) {
        return;
      }
    }

    let nodeIndent;
    let elementsIndent;
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
      console.log('effectiveParent:', [ts.SyntaxKind[effectiveParent.kind], effectiveParent.getText()]);

      nodeIndent = this.getNodeIndent(effectiveParent).goodChar;
      const parentVarNodeLine = file.getLineAndCharacterOfPosition(parentVarNode.getStart()).line;
      if (parentVarNode && parentVarNodeLine !== nodeLine) {
        console.log('1');
        if (parent.kind !== ts.SyntaxKind.VariableDeclaration || parentVarNode === parentVarNode.parent.declarations[0]) {
          console.log('2');
          if (parent.kind === ts.SyntaxKind.VariableDeclaration && parentVarNode.loc.start.line === effectiveParent.loc.start.line) {
            console.log('3');
            nodeIndent = nodeIndent + (indentSize * options.VariableDeclarator[parentVarNode.parent.kind]);
          } else if (
            parent.kind === ts.SyntaxKind.ObjectLiteralExpression ||
            parent.kind === ts.SyntaxKind.ArrayLiteralExpression ||
            parent.kind === ts.SyntaxKind.CallExpression ||
            parent.kind === ts.SyntaxKind.ArrowFunction ||
            parent.kind === ts.SyntaxKind.NewExpression ||
            parent.kind === ts.SyntaxKind.BinaryExpression
          ) {
            console.log('4');
            nodeIndent = nodeIndent + indentSize;
          }
        }
      } else if (!parentVarNode && !isFirstArrayElementOnSameLine(parent) && effectiveParent.type !== "MemberExpression" && effectiveParent.type !== "ExpressionStatement" && effectiveParent.type !== "AssignmentExpression" && effectiveParent.type !== "Property") {
        console.log('5');
        nodeIndent = nodeIndent + indentSize;
      }

      elementsIndent = nodeIndent + indentSize;
console.log('checking first node indent');
      this.checkFirstNodeLineIndent(node, nodeIndent);
    } else {
      console.log('Nope...'.red);
      nodeIndent = this.getNodeIndent(node).goodChar;
      elementsIndent = nodeIndent + indentSize;
    }

    /*
       * Check if the node is a multiple variable declaration; if so, then
       * make sure indentation takes that into account.
       */
    if (this.isNodeInVarOnTop(node, parentVarNode)) {
      const varKind = parentVarNode.parent.getFirstToken().getText();
      console.log('varKind', [varKind]);
      elementsIndent += indentSize * OPTIONS.VariableDeclarator[varKind];
    }

    this.checkNodesIndent(elements, elementsIndent);

    if (elements.length > 0) {
      const lastLine = file.getLineAndCharacterOfPosition(elements[elements.length - 1].getEnd()).line;
      // Skip last block line check if last item in same line
      if (lastLine === nodeEndLine) {
        return;
      }
    }

    this.checkLastNodeLineIndent(node, elementsIndent - indentSize);
  }

  /**
   * Check to see if the node is part of the multi-line variable declaration.
   * Also if its on the same line as the varNode
   * @param {ASTNode} node node to check
   * @param {ASTNode} varNode variable declaration node to check against
   * @returns {boolean} True if all the above condition satisfy
   */
  protected isNodeInVarOnTop(node: ts.Node, varNode) {
    const file = node.getSourceFile();
    const nodeLine = file.getLineAndCharacterOfPosition(node.getStart()).line;
    const parentLine = file.getLineAndCharacterOfPosition(varNode.parent.getStart()).line;
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
      console.log('node:', [node.statement.getText()]);
      this.blockIndentationCheck(node);
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
    const file = node.getSourceFile();
    const thenLine = file.getLineAndCharacterOfPosition(node.thenStatement.getStart()).line;
    const line = file.getLineAndCharacterOfPosition(node.getStart()).line;
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

/*
    // Only check the last line if there is any token after the last item
    if (sourceCode.getLastToken(node).loc.end.line <= lastElement.loc.end.line) {
      return;
    }

    const tokenBeforeLastElement = sourceCode.getTokenBefore(lastElement);

    if (tokenBeforeLastElement.value === ",") {

      // Special case for comma-first syntax where the semicolon is indented
      checkLastNodeLineIndent(node, getNodeIndent(tokenBeforeLastElement).goodChar);
    } else {
      checkLastNodeLineIndent(node, elementsIndent - indentSize);
    }*/
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
    // super.visitCaseClause(node);
  }

  protected visitDefaultClause(node: ts.DefaultClause) {
    this.visitCase(node);
    // super.visitDefaultClause(node);
  }

  protected visitWhileStatement(node: ts.WhileStatement) {
    this.blockLessNodes(node);
    // super.visitWhileStatement(node);
  }

  protected visitForStatement(node: ts.ForStatement) {
    this.blockLessNodes(node);
  }

  protected visitForInStatement(node: ts.ForInStatement) {
    this.blockLessNodes(node);
  }

  protected visitDoStatement(node: ts.DoStatement) {
    this.blockLessNodes(node);
  }

  protected visitVariableDeclarationList(node: ts.VariableDeclarationList) {
    console.log('node:', [node]);
  }

  protected visitVariableDeclaration(node: ts.VariableDeclaration) {
    this.checkIndentInVariableDeclarations(node);
    super.visitVariableDeclaration(node);
  }

  protected visitSourceFile(node: ts.SourceFile) {
    // Root nodes should have no indent
    this.checkNodesIndent(node.statements, 0);
    super.visitSourceFile(node);
  }

}
