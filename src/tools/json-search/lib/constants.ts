export interface JsonSearchConfig {
  defaultFontSize: number;
  minFontSize: number;
  maxFontSize: number;
}

export const JSON_SEARCH_CONFIG: JsonSearchConfig = {
  defaultFontSize: 12,
  minFontSize: 7,
  maxFontSize: 18,
};

export const JSON_SEARCH_DEFAULTS = {
  query: "fieldA, subFieldA [0,1]",
  json: `{
  "fieldA": 1,
  "fieldB": "something else",
  "fieldC": {
    "subFieldA": 1,
    "subFieldB": "example"
  }
}`,
};
