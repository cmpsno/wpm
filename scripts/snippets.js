export const CODE_SNIPPETS = Object.freeze([
  {
    id: 'cpp-variables-01', language: 'cpp', difficulty: 'easy', category: 'variables', title: 'Variables and output',
    code: '#include <iostream>\n\nint main() {\n    int score = 10;\n    std::cout << score << std::endl;\n    return 0;\n}'
  },
  {
    id: 'cpp-loops-01', language: 'cpp', difficulty: 'easy', category: 'loops', title: 'Count with a for loop',
    code: 'for (int i = 1; i <= 5; i++) {\n    std::cout << i << "\\n";\n}'
  },
  {
    id: 'cpp-conditionals-01', language: 'cpp', difficulty: 'medium', category: 'conditionals', title: 'Branch on a score',
    code: 'if (score >= 90) {\n    grade = \'A\';\n} else if (score >= 80) {\n    grade = \'B\';\n}'
  },
  {
    id: 'cpp-functions-01', language: 'cpp', difficulty: 'medium', category: 'functions', title: 'Small helper function',
    code: 'int square(int value) {\n    return value * value;\n}\n\nint result = square(6);'
  },
  {
    id: 'cpp-stl-01', language: 'cpp', difficulty: 'hard', category: 'stl', title: 'Iterate over a vector',
    code: 'std::vector<int> values{2, 4, 6, 8};\nfor (const int value : values) {\n    total += value;\n}'
  },
  {
    id: 'python-variables-01', language: 'python', difficulty: 'easy', category: 'variables', title: 'Variables and output',
    code: 'name = "Ada"\nscore = 10\nprint(f"{name}: {score}")'
  },
  {
    id: 'python-loops-01', language: 'python', difficulty: 'easy', category: 'loops', title: 'Loop through values',
    code: 'for value in range(1, 6):\n    print(value)'
  },
  {
    id: 'python-conditionals-01', language: 'python', difficulty: 'medium', category: 'conditionals', title: 'Branch on a score',
    code: 'if score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelse:\n    grade = "C"'
  },
  {
    id: 'python-functions-01', language: 'python', difficulty: 'medium', category: 'functions', title: 'Small helper function',
    code: 'def square(value):\n    return value ** 2\n\nresult = square(6)'
  },
  {
    id: 'python-collections-01', language: 'python', difficulty: 'hard', category: 'dictionaries', title: 'Dictionary comprehension',
    code: 'squares = {n: n ** 2 for n in range(1, 6)}\nfor key, value in squares.items():\n    print(key, value)'
  }
].map((snippet) => Object.freeze({ ...snippet, text: snippet.code, author: `${snippet.language.toUpperCase()} // ${snippet.category}` })));

const CPP_MULTI_CHAR = ['<<=', '>>=', '->*', '++', '--', '==', '!=', '<=', '>=', '<<', '>>', '::', '&&', '||', '+=', '-=', '*=', '/=', '->'];
const PYTHON_MULTI_CHAR = ['**=', '//=', '==', '!=', '<=', '>=', '//', '**', '+=', '-=', '*=', '/=', ':='];

export function tokenizeCode(code, language) {
  const operators = language === 'cpp' ? CPP_MULTI_CHAR : PYTHON_MULTI_CHAR;
  const tokens = [];
  let index = 0;

  while (index < code.length) {
    const char = code[index];
    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }

    const operator = operators.find((candidate) => code.startsWith(candidate, index));
    if (operator) {
      tokens.push(operator);
      index += operator.length;
      continue;
    }

    const word = code.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/u)?.[0]
      ?? code.slice(index).match(/^\d+(?:\.\d+)?/u)?.[0];
    if (word) {
      tokens.push(word);
      index += word.length;
      continue;
    }

    tokens.push(char);
    index += 1;
  }

  return tokens;
}

export function getCategories(language, difficulty = null) {
  return [...new Set(CODE_SNIPPETS
    .filter((snippet) => snippet.language === language && (!difficulty || snippet.difficulty === difficulty))
    .map((snippet) => snippet.category))].sort();
}

export function selectSnippet({ language, difficulty, category = 'all', previousId = null, random = Math.random }) {
  const matches = CODE_SNIPPETS.filter((snippet) => (
    snippet.language === language
    && snippet.difficulty === difficulty
    && (category === 'all' || snippet.category === category)
  ));

  if (matches.length === 0) {
    throw new Error(`No ${language} snippets available for ${difficulty}/${category}.`);
  }

  const candidates = matches.length > 1 && previousId
    ? matches.filter((snippet) => snippet.id !== previousId)
    : matches;
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}
