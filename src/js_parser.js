// Node Modules
const acorn = require("acorn");
const acornLoose = require("acorn-loose");
const walk = require("acorn-walk");

const acornOptions = {
  sourceType: "script",
};

module.exports.getCalledFunctions = (stringCode) => {
  const functions = {};

  let parsedCode;
  try {
    parsedCode = acorn.parse(stringCode, acornOptions);
  } catch (err) {
    console.error("Error parsing data with Acorn, proceeding to Acorn Loose.");
    try {
      parsedCode = acornLoose.parse(stringCode, acornOptions);
    } catch (err) {
      console.error("Error parsing JavaScript code with Acorn Loose");
      return functions;
    }
  }

  walk.simple(parsedCode, {
    CallExpression(node) {
      let functionName = resolveFunctionName(node.callee);

      if (functionName === "") {
        return;
      } else if (functionName.indexOf("window.") === 0) {
        functionName = functionName.replace("window.", "");
      }

      if (!Object.prototype.hasOwnProperty.call(functions, functionName)) {
        functions[functionName] = 0;
      }

      functions[functionName]++;
    },
  });

  return functions;
};

function resolveFunctionName(namingTree) {
  if (namingTree.type === "Identifier") {
    return namingTree.name;
  } else if (
    namingTree.type === "CallExpression" ||
    namingTree.type === "NewExpression"
  ) {
    return `${resolveFunctionName(namingTree.callee)}()`;
  } else if (namingTree.type === "MemberExpression") {
    let left;
    let right = namingTree.property.name;

    if (namingTree.object.type === "Identifier") {
      left = namingTree.object.name;
    } else {
      left = resolveFunctionName(namingTree.object);
    }

    return `${left}.${right}`;
  }

  return "";
}
