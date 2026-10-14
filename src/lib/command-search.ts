export interface SearchableCommand {
  label: string;
  group: string;
}

const MATCH_SCORE = {
  groupWord: 10,
  groupPrefix: 8,
  labelWord: 7,
  labelPrefix: 6,
  substring: 4,
  subsequence: 2,
  none: 0,
} as const;

const MIN_FUZZY_LENGTH = 3;

function words(text: string) {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

function isSubsequence(needle: string, haystack: string) {
  let position = 0;
  for (const character of haystack) {
    if (character === needle[position]) position++;
    if (position === needle.length) return true;
  }
  return needle.length === 0;
}

function scoreAgainstWords(
  token: string,
  fieldWords: string[],
  wordScore: number,
  prefixScore: number
) {
  let best: number = MATCH_SCORE.none;
  for (const word of fieldWords) {
    if (word === token) return wordScore;
    if (word.startsWith(token)) best = Math.max(best, prefixScore);
  }
  return best;
}

function scoreToken(token: string, command: SearchableCommand) {
  const groupWords = words(command.group);
  const labelWords = words(command.label);
  const fromGroup = scoreAgainstWords(
    token,
    groupWords,
    MATCH_SCORE.groupWord,
    MATCH_SCORE.groupPrefix
  );
  const fromLabel = scoreAgainstWords(
    token,
    labelWords,
    MATCH_SCORE.labelWord,
    MATCH_SCORE.labelPrefix
  );
  const direct = Math.max(fromGroup, fromLabel);
  if (direct > MATCH_SCORE.none) return direct;

  const allWords = [...groupWords, ...labelWords];
  if (allWords.some((word) => word.includes(token))) {
    return MATCH_SCORE.substring;
  }
  if (
    token.length >= MIN_FUZZY_LENGTH &&
    allWords.some((word) => isSubsequence(token, word))
  ) {
    return MATCH_SCORE.subsequence;
  }
  return MATCH_SCORE.none;
}

export function scoreCommand(command: SearchableCommand, query: string) {
  const tokens = words(query);
  if (tokens.length === 0) return 1;
  let total = 0;
  tokens.forEach((token, index) => {
    const weight = tokens.length - index;
    total += scoreToken(token, command) * weight;
  });
  return total;
}

export function rankCommands<T extends SearchableCommand>(
  commands: T[],
  query: string
): T[] {
  if (!query.trim()) return commands;
  return commands
    .map((command, index) => ({
      command,
      index,
      score: scoreCommand(command, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .map((entry) => entry.command);
}
