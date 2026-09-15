import test from 'node:test';
import assert from 'node:assert/strict';
import { CODE_SNIPPETS, getCategories, selectSnippet, tokenizeCode } from '../scripts/snippets.js';

test('ships five C++ and five Python snippets', () => {
  assert.equal(CODE_SNIPPETS.filter(({ language }) => language === 'cpp').length, 5);
  assert.equal(CODE_SNIPPETS.filter(({ language }) => language === 'python').length, 5);
});

test('code snippets preserve indentation and newlines', () => {
  const cpp = CODE_SNIPPETS.find(({ id }) => id === 'cpp-variables-01');
  const python = CODE_SNIPPETS.find(({ id }) => id === 'python-conditionals-01');
  assert.match(cpp.code, /\n    std::cout/u);
  assert.match(python.code, /\n    grade/u);
  assert.equal(cpp.text, cpp.code);
  assert.equal(python.text, python.code);
});

test('tokenizer keeps common multi-character operators together', () => {
  assert.deepEqual(
    tokenizeCode('std::cout << i++; i <= 10;', 'cpp').filter((token) => ['::', '<<', '++', '<='].includes(token)),
    ['::', '<<', '++', '<=']
  );
  assert.deepEqual(
    tokenizeCode('value ** 2 // 3 >= 1', 'python').filter((token) => ['**', '//', '>='].includes(token)),
    ['**', '//', '>=']
  );
});

test('categories are scoped by language and difficulty', () => {
  assert.deepEqual(getCategories('cpp', 'hard'), ['stl']);
  assert.deepEqual(getCategories('python', 'easy'), ['loops', 'variables']);
});

test('snippet selection filters by language difficulty and category', () => {
  const snippet = selectSnippet({ language: 'python', difficulty: 'medium', category: 'functions', random: () => 0 });
  assert.equal(snippet.id, 'python-functions-01');
  assert.equal(snippet.language, 'python');
  assert.equal(snippet.category, 'functions');
});

test('invalid snippet combinations fail clearly', () => {
  assert.throws(
    () => selectSnippet({ language: 'cpp', difficulty: 'hard', category: 'loops' }),
    /No cpp snippets available/u
  );
});
