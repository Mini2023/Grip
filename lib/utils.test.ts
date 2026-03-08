import test from 'node:test';
import assert from 'node:assert';
import { cn } from './utils.ts';

test('cn merges classes correctly', async (t) => {
  await t.test('merges multiple strings', () => {
    assert.strictEqual(cn('a', 'b'), 'a b');
  });

  await t.test('handles conditional class objects', () => {
    assert.strictEqual(cn('a', { b: true, c: false }), 'a b');
  });

  await t.test('handles arrays of classes', () => {
    assert.strictEqual(cn('a', ['b', 'c']), 'a b c');
  });

  await t.test('handles falsy values', () => {
    assert.strictEqual(cn('a', null, undefined, false, ''), 'a');
  });

  await t.test('verifies Tailwind CSS conflict resolution', () => {
    assert.strictEqual(cn('px-2', 'px-4'), 'px-4');
    assert.strictEqual(cn('text-red-500', 'text-blue-500'), 'text-blue-500');
  });

  await t.test('handles nested arrays and objects', () => {
    assert.strictEqual(cn('a', ['b', { c: true, d: false }]), 'a b c');
  });
});
