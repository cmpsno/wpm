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
    id: "cpp-e5-01-health-bar", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Health Bar",
    code: "#include <iostream>\nint main() {\n    int current, maximum; std::cin >> current >> maximum;\n    if (current < 0) current = 0;\n    if (current > maximum) current = maximum;\n    int filled = current * 10 / maximum;\n    std::cout << \"[\"; for (int i = 0; i < 10; ++i) std::cout << (i < filled ? '#' : '-');\n    std::cout << \"] \" << current * 100 / maximum << \"%\\n\";\n}"
  },
  {
    id: "cpp-e5-02-damage-calculator", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Damage Calculator",
    code: "#include <algorithm>\n#include <iostream>\nint main() { int attack, defense; std::cin >> attack >> defense; std::cout << \"Damage: \" << std::max(1, attack - defense) << \"\\n\"; }"
  },
  {
    id: "cpp-e5-03-coin-conversion", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Coin Conversion",
    code: "#include <iostream>\nint main() { long long copper; std::cin >> copper; std::cout << copper / 10000 << \" gold, \" << copper / 100 % 100 << \" silver, \" << copper % 100 << \" copper\\n\"; }"
  },
  {
    id: "cpp-e5-04-respawn-timer", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Respawn Timer",
    code: "#include <iomanip>\n#include <iostream>\nint main() { int seconds; std::cin >> seconds; std::cout << std::setfill('0') << std::setw(2) << seconds / 60 << \":\" << std::setw(2) << seconds % 60 << \"\\n\"; }"
  },
  {
    id: "cpp-e5-05-inventory-check", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Inventory Check",
    code: "#include <iostream>\nint main() { int used, maximum; std::cin >> used >> maximum; if (used > maximum) std::cout << \"Over capacity\\n\"; else if (used == maximum) std::cout << \"Full\\n\"; else if (used >= maximum - 2) std::cout << \"Almost full\\n\"; else std::cout << \"Space available\\n\"; }"
  },
  {
    id: "cpp-e5-06-xp-level", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "XP Level",
    code: "#include <iostream>\nint main() { int xp; std::cin >> xp; std::cout << \"Level \" << xp / 100 + 1 << \", \" << 100 - xp % 100 << \" XP to next\\n\"; }"
  },
  {
    id: "cpp-e5-07-grid-move", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Grid Move",
    code: "#include <iostream>\n#include <string>\nint main() { int x, y; std::string direction; std::cin >> x >> y >> direction; if (direction == \"N\") --y; else if (direction == \"S\") ++y; else if (direction == \"E\") ++x; else if (direction == \"W\") --x; std::cout << x << \" \" << y << \"\\n\"; }"
  },
  {
    id: "cpp-e5-08-critical-hit", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Critical Hit",
    code: "#include <iostream>\nint main() { int base, chance, roll; std::cin >> base >> chance >> roll; std::cout << \"Damage: \" << (roll < chance ? base * 2 : base) << \"\\n\"; }"
  },
  {
    id: "cpp-e5-09-potion-cooldown", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Potion Cooldown",
    code: "#include <iostream>\nint main() { int current, last, cooldown; std::cin >> current >> last >> cooldown; int elapsed = current - last; if (elapsed >= cooldown) std::cout << \"Ready\\n\"; else std::cout << \"Wait \" << cooldown - elapsed << \" seconds\\n\"; }"
  },
  {
    id: "cpp-e5-10-high-score", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "High Score",
    code: "#include <algorithm>\n#include <iostream>\nint main() { int first, second, third; std::cin >> first >> second >> third; std::cout << std::max({first, second, third}) << \"\\n\"; if (third > first && third > second) std::cout << \"New high score!\\n\"; }"
  },
  {
    id: "cpp-e5-11-tip-calculator", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Tip Calculator",
    code: "#include <iomanip>\n#include <iostream>\nint main() { double bill, tip; int party; std::cin >> bill >> tip >> party; std::cout << std::fixed << std::setprecision(2) << \"Total per person: \" << (bill + bill * tip / 100) / party << \"\\n\"; }"
  },
  {
    id: "cpp-e5-12-password-strength", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Password Strength",
    code: "#include <cctype>\n#include <iostream>\n#include <string>\nint main() { std::string password; std::getline(std::cin, password); bool digit = false, upper = false, symbol = false; for (unsigned char c : password) { digit |= std::isdigit(c); upper |= std::isupper(c); symbol |= !std::isalnum(c); } int checks = (password.size() >= 8) + digit + upper + symbol; std::cout << (checks <= 1 ? \"Weak\" : checks == 2 ? \"Medium\" : \"Strong\") << \"\\n\"; }"
  },
  {
    id: "cpp-e5-13-countdown", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Countdown",
    code: "#include <iostream>\nint main() { int days; std::cin >> days; std::cout << days / 7 << \" weeks, \" << days % 7 << \" days\\n\"; }"
  },
  {
    id: "cpp-e5-14-grocery-receipt", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Grocery Receipt",
    code: "#include <iomanip>\n#include <iostream>\nint main() { double price, taxPercent; int quantity; std::cin >> price >> quantity >> taxPercent; double subtotal = price * quantity, tax = subtotal * taxPercent / 100; std::cout << std::fixed << std::setprecision(2) << \"Subtotal: \" << subtotal << \"\\nTax: \" << tax << \"\\nTotal: \" << subtotal + tax << \"\\n\"; }"
  },
  {
    id: "cpp-e5-15-grade-calculator", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Grade Calculator",
    code: "#include <iostream>\nint main() { int score; std::cin >> score; char grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'; std::cout << grade << \"\\n\"; }"
  },
  {
    id: "cpp-e5-16-dice-statistics", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Dice Statistics",
    code: "#include <algorithm>\n#include <iomanip>\n#include <iostream>\nint main() { int value, sum = 0, minimum = 7, maximum = 0; for (int i = 0; i < 5; ++i) { std::cin >> value; sum += value; minimum = std::min(minimum, value); maximum = std::max(maximum, value); } std::cout << std::fixed << std::setprecision(1) << \"Sum: \" << sum << \"\\nMin: \" << minimum << \"\\nMax: \" << maximum << \"\\nAverage: \" << sum / 5.0 << \"\\n\"; }"
  },
  {
    id: "cpp-e5-17-time-zone-converter", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Time Zone Converter",
    code: "#include <iostream>\nint main() { int hour, offset; std::cin >> hour >> offset; std::cout << ((hour + offset) % 24 + 24) % 24 << \"\\n\"; }"
  },
  {
    id: "cpp-e5-18-word-counter", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Word Counter",
    code: "#include <cctype>\n#include <iostream>\n#include <string>\nint main() { std::string line; std::getline(std::cin, line); int words = 0, characters = 0; bool inWord = false; for (unsigned char c : line) { if (c != ' ') ++characters; if (!std::isspace(c) && !inWord) { ++words; inWord = true; } else if (std::isspace(c)) inWord = false; } std::cout << \"Words: \" << words << \"\\nCharacters: \" << characters << \"\\n\"; }"
  },
  {
    id: "cpp-e5-19-temperature-converter", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Temperature Converter",
    code: "#include <iomanip>\n#include <iostream>\nint main() { double celsius; std::cin >> celsius; std::cout << std::fixed << std::setprecision(2) << \"Fahrenheit: \" << celsius * 9 / 5 + 32 << \"\\nKelvin: \" << celsius + 273.15 << \"\\n\"; }"
  },
  {
    id: "cpp-e5-20-simple-atm", language: 'cpp', difficulty: 'easy', category: 'foundation-review', title: "Simple ATM",
    code: "#include <iomanip>\n#include <iostream>\nint main() { double balance, withdrawal; std::cin >> balance >> withdrawal; if (withdrawal > balance) std::cout << \"Insufficient funds\\n\"; else std::cout << std::fixed << std::setprecision(2) << \"Remaining balance: \" << balance - withdrawal << \"\\n\"; }"
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
