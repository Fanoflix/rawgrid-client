import type { SyntaxNode, Tree } from "@lezer/common";

export interface JsonPropertyOnLine {
  propertyStart: number;
  keyText: string;
  valueText: string | null;
}

function unquoteJsonString(rawString: string) {
  try {
    return JSON.parse(rawString) as string;
  } catch {
    return rawString.replace(/^"|"$/g, "");
  }
}

export function findJsonPropertyOnLine(
  tree: Tree,
  readText: (from: number, to: number) => string,
  lineStart: number,
  lineEnd: number
): JsonPropertyOnLine | null {
  let property: SyntaxNode | null = null;
  tree.iterate({
    from: lineStart,
    to: lineEnd,
    enter: (node) => {
      if (property) return false;
      if (node.name === "Property" && node.from >= lineStart && node.from <= lineEnd) {
        property = node.node;
        return false;
      }
    },
  });
  if (!property) return null;

  const foundProperty: SyntaxNode = property;
  const keyNode = foundProperty.getChild("PropertyName");
  if (!keyNode) return null;

  const valueNode = foundProperty.lastChild;
  const hasValue =
    valueNode &&
    valueNode.name !== "PropertyName" &&
    valueNode.name !== ":" &&
    valueNode.to > valueNode.from;
  const rawValue = hasValue ? readText(valueNode.from, valueNode.to) : null;

  return {
    propertyStart: foundProperty.from,
    keyText: unquoteJsonString(readText(keyNode.from, keyNode.to)),
    valueText:
      rawValue !== null && valueNode?.name === "String"
        ? unquoteJsonString(rawValue)
        : rawValue,
  };
}
