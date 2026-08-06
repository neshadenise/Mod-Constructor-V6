/** Shared password policy for Mod Constructor accounts. */

export type PasswordCheck = {
  ok: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  failures: string[];
};

export const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "digit", label: "One number", test: (v: string) => /\d/.test(v) },
  { id: "symbol", label: "One symbol (!, ?, #, …)", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;

export function checkPassword(value: string): PasswordCheck {
  const passed = PASSWORD_RULES.filter((r) => r.test(value));
  const failures = PASSWORD_RULES.filter((r) => !r.test(value)).map((r) => r.label);
  // Length rule is mandatory; score is how many of the five rules are met.
  const score = Math.max(0, Math.min(4, passed.length - 1)) as PasswordCheck["score"];
  return {
    ok: failures.length === 0,
    score,
    label: LABELS[score],
    failures,
  };
}
