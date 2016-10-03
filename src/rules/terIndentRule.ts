import * as ts from 'typescript';
import * as Lint from 'tslint/lib/lint';
import 'colors';

const DEFAULT_VARIABLE_INDENT = 1;
const DEFAULT_PARAMETER_INDENT = null;
const DEFAULT_FUNCTION_BODY_INDENT = 1;
let indentType = 'space';
let indentSize = 2;

export class Rule extends Lint.Rules.AbstractRule {
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    const walker = new IndentWalker(sourceFile, this.getOptions());
    const options = {
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
    // console.log('options', this.getOptions());
    return this.applyWithWalker(walker);
  }
}

class IndentWalker extends Lint.RuleWalker {
  private srcText: string;

  constructor(sourceFile: ts.SourceFile, options: Lint.IOptions) {
    super(sourceFile, options);
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
   * @param {ASTNode} node Node violating the indent rule
   * @param {int} needed Expected indentation character count
   * @param {int} gottenSpaces Indentation space count in the actual node/code
   * @param {int} gottenTabs Indentation tab count in the actual node/code
   * @param {Object=} loc Error line and column location
   * @param {boolean} isLastNodeCheck Is the error for last node check
   * @returns {void}
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

  // private getNodeLocation(node: ts.Node, byEndLocation: boolean = false) {
  //   const index = byEndLocation ? node.getEnd() : node.getStart();
  //   return node.getSourceFile().getLineAndCharacterOfPosition(index);
  // }

  /**
   * Get the actual indent of node
   * node: Node to examine
   * [byLastLine=false]: get indent of node's last line
   * [excludeCommas=false]: skip comma on start of line
   *
   * Returns the node's indent. Contains keys `space` and `tab`, representing the indent of each
   * character. Also contains keys `goodChar` and `badChar`, where `goodChar` is the amount of the
   * user's desired indentation character, and `badChar` is the amount of the other indentation
   * character.
   */
  private getNodeIndent(node: ts.Node, byLastLine: boolean = false) {
    console.log('doing it here:', [node.getFullText()]);
    if (node === this.getSourceFile()) {
      return { space: 0, tab: 0, goodChar: 0, badChar: 0 };
    }
    if (node.kind === ts.SyntaxKind.SyntaxList) {
      console.log('Are you serious?');
      return this.getNodeIndent(node.parent, byLastLine);
    }

    const endIndex = node.getStart();
    let pos = endIndex - 1;
    while (pos > 0 && this.srcText.charAt(pos) !== '\n') {
      pos -= 1;
    }
    const str = this.getSourceSubstr(pos + 1, endIndex);
    console.log('here:'.blue, [str], [node.getFullText()]);

    const whiteSpace = (str.match(/^\s+/) || [''])[0];
    const indentChars = whiteSpace.split('');
    const spaces = indentChars.filter(char => char === ' ').length;
    const tabs = indentChars.filter(char => char === '\t').length;

    const r = {
      firstInLine: spaces + tabs === str.length,
      space: spaces,
      tab: tabs,
      goodChar: indentType === 'space' ? spaces : tabs,
      badChar: indentType === 'space' ? tabs : spaces
    };
    console.log('RETURN'.green, r, [node.getText()]);
    return r;
  }

  private checkNodeIndent(node: ts.Node, neededIndent: number) {
    console.log('getting the indent:', [node.getFullText()]);
    const actualIndent = this.getNodeIndent(node, false);
    if (
      node.kind !== ts.SyntaxKind.ArrayLiteralExpression &&
      node.kind !== ts.SyntaxKind.ObjectLiteralExpression &&
      (actualIndent.goodChar !== neededIndent || actualIndent.badChar !== 0) &&
      actualIndent.firstInLine
    ) {
      console.log('bad node: '.red, [node.getFullText(), neededIndent]);
      this.report(node, neededIndent, actualIndent.space, actualIndent.tab);
    }

    if (node.type === 'IfStatement' && node.alternate) {
      const elseToken = sourceCode.getTokenBefore(node.alternate);

      checkNodeIndent(elseToken, neededIndent);

      if (!isNodeFirstInLine(node.alternate)) {
        checkNodeIndent(node.alternate, neededIndent);
      }
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
  private blockIndentationCheck(node: ts.BlockLike) {

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
    } else {
      indent = this.getNodeIndent(node).goodChar;
    }



    // if (node.type === 'IfStatement' && node.consequent.type !== 'BlockStatement') {
    //   nodesToCheck = [node.consequent];
    // } else if (Array.isArray(node.body)) {
    //   nodesToCheck = node.body;
    // } else {
    //   nodesToCheck = [node.body];
    // }
    this.checkNodeIndent(node, indent);

    nodesToCheck = node.getChildren()[1].getChildren();

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
      this.checkNodeIndent(node, indent)
    });
  }

  protected visitBinaryExpression(node: ts.BinaryExpression) {
    // this.validateUseIsnan(node);
    super.visitBinaryExpression(node);
  }

  protected visitBlock(node: ts.Block) {
    this.blockIndentationCheck(node);
    super.visitBlock(node);
  }

  protected visitSourceFile(node: ts.SourceFile) {
    // Root nodes should have no indent
    this.checkNodesIndent(node.statements, 0);
    super.visitSourceFile(node);
  }

}
