import { DEMO_SEED } from '../src/lib/seed';
import { accountBalances, liquidTotal, portfolioMetrics, goalProgress } from '../src/lib/profitability';
import { formatMoney, formatPercent } from '../src/lib/format';
import { monthlyFlows, patrimonySeries } from '../src/lib/reports';

const { accounts, transactions, investments, snapshots, goals, goalAllocations } = DEMO_SEED;

console.log('movimientos:', transactions.length, 'snapshots:', snapshots.length);

const balances = accountBalances(accounts, transactions);
for (const account of accounts) {
  console.log(`  ${account.name.padEnd(24)} ${formatMoney(balances[account.id] ?? 0)}`);
}
console.log('disponible:', formatMoney(liquidTotal(accounts, transactions)));

const portfolio = portfolioMetrics(investments, transactions, snapshots);
console.log('capital:', formatMoney(portfolio.totalCapital));
console.log('valor:', formatMoney(portfolio.totalValue));
console.log('ganancia:', formatMoney(portfolio.totalGain));
console.log('rentabilidad:', formatPercent(portfolio.totalReturnPct));
console.log('mensual:', formatPercent(portfolio.monthlyReturnPct));
console.log('anual:', formatPercent(portfolio.annualReturnPct));

for (const metric of portfolio.perInvestment) {
  const investment = investments.find((item) => item.id === metric.investmentId)!;
  console.log(
    `  ${investment.name.padEnd(22)} cap ${formatMoney(metric.investedCapital).padStart(14)}  val ${formatMoney(metric.currentValue).padStart(14)}  ${formatPercent(metric.returnPct)}`,
  );
}

for (const goal of goals) {
  const progress = goalProgress(goal, goalAllocations, transactions, accounts, investments);
  console.log(
    `  ${goal.name.padEnd(24)} ${formatMoney(progress.progress)} / ${formatMoney(goal.targetAmount)} = ${progress.progressPct.toFixed(1)}%`,
  );
}

console.log('flujos:', monthlyFlows(transactions, 3).map((point) => `${point.label} ${formatMoney(point.income)}/${formatMoney(point.expense)}`));
console.log(
  'patrimonio (año):',
  patrimonySeries(accounts, investments, transactions, snapshots, 'year').map(
    (point) => `${point.label} ${formatMoney(point.total)}`,
  ),
);
