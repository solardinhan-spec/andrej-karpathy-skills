// Aggregation helpers ported from the prototype.

export const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : (+x.amount || 0)), 0)

export function compute(month) {
  const income = sum(month.income)
  const fixed = sum(month.expense.filter((x) => x.kind === '고정'))
  const variable = sum(month.expense.filter((x) => x.kind === '변동'))
  const expense = fixed + variable
  const savings = sum(month.savings)
  const remaining = income - expense - savings
  const byOwner = { 이현: 0, 혜원: 0, 기타: 0 }
  month.expense.forEach((x) => { byOwner[x.owner] = (byOwner[x.owner] || 0) + (+x.amount || 0) })
  return { income, fixed, variable, expense, savings, remaining, byOwner }
}
