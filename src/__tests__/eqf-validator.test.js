import { describe, it, expect } from 'vitest';
import { validateEqf } from '../eqf-validator.js';

// ─── Helper to build a minimal valid quest wrapper ───
function wrapInQuest(stateBody, extra = '') {
  return `Main
{
  questname "Test Quest"
  version 1
}

state Begin
{
${stateBody}
}
${extra}`;
}

describe('EQF Validator', () => {

  // ════════════════════════════════════════════
  // Structural checks
  // ════════════════════════════════════════════
  describe('structural checks', () => {
    it('rejects empty input', () => {
      const r = validateEqf('');
      expect(r.valid).toBe(false);
      expect(r.errors).toContain('Empty quest file');
    });

    it('rejects whitespace-only input', () => {
      const r = validateEqf('   \n\n  ');
      expect(r.valid).toBe(false);
    });

    it('requires Main block', () => {
      const r = validateEqf(`state Begin\n{\n  action End()\n}`);
      expect(r.valid).toBe(false);
      expect(r.errors).toContain('Missing Main block');
    });

    it('requires questname in Main', () => {
      const r = validateEqf(`Main\n{\n  version 1\n}\nstate Begin\n{\n  action End()\n}`);
      expect(r.valid).toBe(false);
      expect(r.errors).toContain('Main block missing "questname"');
    });

    it('requires version in Main', () => {
      const r = validateEqf(`Main\n{\n  questname "Test"\n}\nstate Begin\n{\n  action End()\n}`);
      expect(r.valid).toBe(false);
      expect(r.errors).toContain('Main block missing "version"');
    });

    it('requires state Begin', () => {
      const r = validateEqf(`Main\n{\n  questname "Test"\n  version 1\n}\nstate Other\n{\n  action End()\n}`);
      expect(r.valid).toBe(false);
      expect(r.errors).toContain('Missing "state Begin" block');
    });

    it('accepts a valid minimal quest', () => {
      const r = validateEqf(wrapInQuest('  action End()'));
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════
  // Missing action/rule keywords
  // ════════════════════════════════════════════
  describe('missing keywords', () => {
    it('catches bare action call (missing "action" keyword)', () => {
      const r = validateEqf(wrapInQuest('  ShowHint("Hello")\n  action End()'));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => /missing.*action.*keyword/i.test(e))).toBe(true);
    });

    it('catches bare rule call (missing "rule" keyword)', () => {
      const r = validateEqf(wrapInQuest(
        '  action AddNpcText(1, "Hi")\n  GotItems(12, 20) goto Done',
        'state Done\n{\n  action End()\n}'
      ));
      expect(r.valid).toBe(false);
      // Should flag either as missing rule keyword or invalid keyword
      expect(r.errors.some(e => /missing.*rule|invalid/i.test(e))).toBe(true);
    });

    it('does NOT flag properly prefixed action lines', () => {
      const r = validateEqf(wrapInQuest('  action ShowHint("Hello")\n  action End()'));
      expect(r.valid).toBe(true);
    });

    it('does NOT flag properly prefixed rule lines', () => {
      const r = validateEqf(wrapInQuest(
        '  action AddNpcText(1, "Hi")\n  rule InputNpc(1) goto Done',
        'state Done\n{\n  action End()\n}'
      ));
      expect(r.valid).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // goto syntax
  // ════════════════════════════════════════════
  describe('goto syntax', () => {
    it('catches goto(StateName) — parenthesized goto', () => {
      const r = validateEqf(wrapInQuest(
        '  action AddNpcText(1, "Hi")\n  rule InputNpc(1) goto(Done)',
        'state Done\n{\n  action End()\n}'
      ));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => /goto.*not a function|goto.*not.*paren/i.test(e))).toBe(true);
    });

    it('accepts proper goto StateName syntax', () => {
      const r = validateEqf(wrapInQuest(
        '  action AddNpcText(1, "Hi")\n  rule InputNpc(1) goto Done',
        'state Done\n{\n  action End()\n}'
      ));
      expect(r.valid).toBe(true);
    });

    it('catches goto target pointing to non-existent state', () => {
      const r = validateEqf(wrapInQuest(
        '  rule InputNpc(1) goto NonExistentState'
      ));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => /goto target.*nonexistentstate.*does not match/i.test(e))).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // Unknown actions and rules
  // ════════════════════════════════════════════
  describe('unknown functions', () => {
    it('catches unknown action', () => {
      const r = validateEqf(wrapInQuest('  action FakeAction("test")\n  action End()'));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => /unknown action.*FakeAction/i.test(e))).toBe(true);
    });

    it('catches unknown rule', () => {
      const r = validateEqf(wrapInQuest(
        '  rule FakeRule(1) goto Done',
        'state Done\n{\n  action End()\n}'
      ));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => /unknown rule.*FakeRule/i.test(e))).toBe(true);
    });

    it('accepts all known actions', () => {
      // Test a few common ones
      const r = validateEqf(wrapInQuest(
        '  action ShowHint("test")\n  action AddNpcText(1, "hi")\n  action GiveEXP(100)\n  action PlaySound(18)\n  action End()'
      ));
      expect(r.valid).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // Space before parenthesis
  // ════════════════════════════════════════════
  describe('space before parenthesis', () => {
    it('warns about space before ( in action', () => {
      const r = validateEqf(wrapInQuest('  action ShowHint ("Hello")\n  action End()'));
      expect(r.warnings.some(w => /space before.*\(/i.test(w))).toBe(true);
    });

    it('warns about space before ( in rule', () => {
      const r = validateEqf(wrapInQuest(
        '  rule GotItems (12, 20) goto Done',
        'state Done\n{\n  action End()\n}'
      ));
      expect(r.warnings.some(w => /space before.*\(/i.test(w))).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // Argument type validation
  // ════════════════════════════════════════════
  describe('argument types', () => {
    it('warns when numeric arg is quoted as string', () => {
      const r = validateEqf(wrapInQuest('  action GiveItem("1", "5")\n  action End()'));
      expect(r.warnings.some(w => /should be a number/i.test(w))).toBe(true);
    });

    it('catches when string arg is unquoted', () => {
      const r = validateEqf(wrapInQuest('  action ShowHint(Hello)\n  action End()'));
      expect(r.errors.some(e => /should be a quoted string/i.test(e))).toBe(true);
    });

    it('accepts correct argument types', () => {
      const r = validateEqf(wrapInQuest('  action GiveItem(1, 5)\n  action ShowHint("Hello")\n  action End()'));
      expect(r.valid).toBe(true);
      expect(r.warnings).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════
  // Text length limits
  // ════════════════════════════════════════════
  describe('text length limits', () => {
    it('warns when ShowHint text exceeds 120 chars', () => {
      const longText = 'A'.repeat(130);
      const r = validateEqf(wrapInQuest(`  action ShowHint("${longText}")\n  action End()`));
      expect(r.warnings.some(w => /ShowHint.*too long/i.test(w))).toBe(true);
    });

    it('warns when AddNpcText text exceeds 150 chars', () => {
      const longText = 'B'.repeat(160);
      const r = validateEqf(wrapInQuest(`  action AddNpcText(1, "${longText}")\n  action End()`));
      expect(r.warnings.some(w => /AddNpcText.*too long/i.test(w))).toBe(true);
    });

    it('warns when AddNpcChat text exceeds 120 chars', () => {
      const longText = 'C'.repeat(130);
      const r = validateEqf(wrapInQuest(`  action AddNpcChat(1, "${longText}")\n  action End()`));
      expect(r.warnings.some(w => /AddNpcChat.*too long/i.test(w))).toBe(true);
    });

    it('warns when SetTitle exceeds 32 chars', () => {
      const longTitle = 'D'.repeat(40);
      const r = validateEqf(wrapInQuest(`  action SetTitle("${longTitle}")\n  action End()`));
      expect(r.warnings.some(w => /SetTitle.*too long/i.test(w))).toBe(true);
    });

    it('warns when desc exceeds 32 chars', () => {
      const longDesc = 'E'.repeat(40);
      const r = validateEqf(wrapInQuest(`  desc "${longDesc}"\n  action End()`));
      expect(r.warnings.some(w => /desc.*too long/i.test(w))).toBe(true);
    });

    it('does NOT warn for text within limits', () => {
      const r = validateEqf(wrapInQuest(
        '  desc "Short desc"\n  action ShowHint("Short hint")\n  action AddNpcText(1, "Short dialog")\n  action End()'
      ));
      expect(r.warnings.filter(w => /too long/i.test(w))).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════
  // Invalid keywords in blocks
  // ════════════════════════════════════════════
  describe('invalid keywords', () => {
    it('catches invalid keyword in Main block', () => {
      const r = validateEqf(`Main\n{\n  questname "Test"\n  version 1\n  foobar\n}\nstate Begin\n{\n  action End()\n}`);
      expect(r.errors.some(e => /invalid keyword.*foobar.*main/i.test(e))).toBe(true);
    });

    it('catches random text in state block', () => {
      const r = validateEqf(wrapInQuest('  action ShowHint("Hi")\n  randomword\n  action End()'));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => /invalid keyword.*randomword/i.test(e))).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // Rule must have goto
  // ════════════════════════════════════════════
  describe('rule transitions', () => {
    it('catches rule without goto', () => {
      const r = validateEqf(wrapInQuest('  rule TalkedToNpc(1)\n  action End()'));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => /rule.*missing.*goto/i.test(e))).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // State reachability
  // ════════════════════════════════════════════
  describe('state reachability', () => {
    it('warns about unreachable states', () => {
      const r = validateEqf(wrapInQuest(
        '  action End()',
        'state Orphan\n{\n  action End()\n}'
      ));
      expect(r.warnings.some(w => /orphan.*unreachable/i.test(w))).toBe(true);
    });

    it('does NOT warn about states referenced by goto', () => {
      const r = validateEqf(wrapInQuest(
        '  rule TalkedToNpc(1) goto NextStep',
        'state NextStep\n{\n  action End()\n}'
      ));
      expect(r.warnings.filter(w => /unreachable/i.test(w))).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════
  // End/Reset termination
  // ════════════════════════════════════════════
  describe('termination', () => {
    it('warns if no End() or Reset()', () => {
      const r = validateEqf(wrapInQuest('  action ShowHint("stuck")'));
      expect(r.warnings.some(w => /no End\(\) or Reset\(\)/i.test(w))).toBe(true);
    });

    it('does NOT warn if End() is present', () => {
      const r = validateEqf(wrapInQuest('  action End()'));
      expect(r.warnings.filter(w => /no End\(\) or Reset\(\)/i.test(w))).toHaveLength(0);
    });

    it('does NOT warn if Reset() is present', () => {
      const r = validateEqf(wrapInQuest('  action Reset()'));
      expect(r.warnings.filter(w => /no End\(\) or Reset\(\)/i.test(w))).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════
  // Full realistic quest
  // ════════════════════════════════════════════
  describe('full realistic quest', () => {
    it('validates a complete multi-state quest', () => {
      const quest = `Main
{
  questname "Orc Ear Collection"
  version 1
}

state Begin
{
  desc "Talk to Candy"

  action AddNpcText(75, "Hello [name]! I need your help collecting Orc Ears.")
  action AddNpcInput(75, 1, "I'll help!")
  action AddNpcInput(75, 2, "Not right now.")

  rule InputNpc(1) goto CollectEars
  rule InputNpc(2) goto Declined
}

state Declined
{
  desc "Come back later"
  action AddNpcChat(75, "Come back when you're ready!")
  action Reset()
}

state CollectEars
{
  desc "Collect 20 Orc Ears"
  action ShowHint("Collect 20 Orc Ears!")
  action AddNpcChat(75, "Good luck, [name]!")
  rule GotItems(42, 20) goto TurnIn
}

state TurnIn
{
  desc "Return to Candy"
  action AddNpcText(75, "You got them all! Thank you!")
  action RemoveItem(42, 20)
  action GiveEXP(5000)
  action ShowHint("Quest complete! +5000 EXP")
  action PlaySound(97)
  action End()
}`;
      const r = validateEqf(quest);
      expect(r.errors).toHaveLength(0);
      expect(r.valid).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // Comments and blank lines
  // ════════════════════════════════════════════
  describe('comments and whitespace', () => {
    it('ignores // comments', () => {
      const r = validateEqf(wrapInQuest('  // This is a comment\n  action End()'));
      expect(r.valid).toBe(true);
    });

    it('ignores # comments', () => {
      const r = validateEqf(wrapInQuest('  # This is a comment\n  action End()'));
      expect(r.valid).toBe(true);
    });

    it('ignores blank lines', () => {
      const r = validateEqf(wrapInQuest('\n\n  action End()\n\n'));
      expect(r.valid).toBe(true);
    });
  });
});
