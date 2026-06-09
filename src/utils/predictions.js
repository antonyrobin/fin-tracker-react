/**
 * Financial Prediction Engine
 * Analyzes historical transactions and future reminders to project cashflow,
 * upcoming payments/purchases, and category forecasts.
 */

// Helper to format Date objects as YYYY-MM-DD in local time
export function formatDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * 1. Calculates monthly averages for income, expense, and category-level spending.
 * Excludes transfers. Uses the last `months` calendar months.
 */
export function getMonthlyAverages(transactions, months = 3) {
  if (!transactions || transactions.length === 0) {
    return { avgIncome: 0, avgExpense: 0, avgByCategory: {} };
  }

  const today = new Date();
  const cutoffDate = new Date();
  cutoffDate.setMonth(today.getMonth() - months);
  cutoffDate.setDate(1);
  cutoffDate.setHours(0, 0, 0, 0);

  const filteredTxns = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= cutoffDate && t.category !== 'Transfer';
  });

  if (filteredTxns.length === 0) {
    return { avgIncome: 0, avgExpense: 0, avgByCategory: {} };
  }

  // Find actual months spanned in the transactions to handle new accounts
  const uniqueMonths = new Set();
  filteredTxns.forEach(t => {
    if (t.date) uniqueMonths.add(t.date.substring(0, 7));
  });
  const actualMonths = Math.max(1, Math.min(months, uniqueMonths.size));

  let totalIncome = 0;
  let totalExpense = 0;
  const categorySums = {};

  filteredTxns.forEach(t => {
    const amount = Number(t.amount) || 0;
    const isIncome = t.type === 'income' || t.type === 'credit';
    const isExpense = t.type === 'expense' || t.type === 'debit';

    if (isIncome) {
      totalIncome += amount;
    } else if (isExpense) {
      totalExpense += amount;
      const cat = t.category || 'Other';
      categorySums[cat] = (categorySums[cat] || 0) + amount;
    }
  });

  const avgIncome = totalIncome / actualMonths;
  const avgExpense = totalExpense / actualMonths;
  const avgByCategory = {};

  Object.entries(categorySums).forEach(([cat, sum]) => {
    avgByCategory[cat] = sum / actualMonths;
  });

  return { avgIncome, avgExpense, avgByCategory, dataMonthsCount: uniqueMonths.size };
}

/**
 * 2. Projects and sorts all reminders due within the next `daysAhead` days.
 * Handles recurring reminders (weekly, monthly, quarterly, yearly).
 */
export function getUpcomingReminders(reminders, daysAhead = 30) {
  if (!reminders || reminders.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysAhead);
  endDate.setHours(23, 59, 59, 999);

  const upcoming = [];

  reminders.forEach(r => {
    if (r.completed) return; // Skip completed reminders

    const baseDueDate = new Date(r.dueDate);
    baseDueDate.setHours(0, 0, 0, 0);

    // If the reminder is not recurring
    if (!r.recurring || r.recurring === 'none') {
      // Show if due in the future up to the end date, or if overdue (past due date)
      if (baseDueDate <= endDate) {
        upcoming.push({
          ...r,
          projectedDate: r.dueDate,
          isOverdue: baseDueDate < today,
          isProjected: false,
          uniqueKey: `${r.id}-single`
        });
      }
      return;
    }

    // For recurring reminders, project occurrences from the baseDueDate forward
    let currentProjDate = new Date(baseDueDate);
    let count = 0;

    // Continue projecting until we cross the endDate threshold.
    // Also, if baseDueDate is in the past (overdue), we must add it, and then project future ones.
    while (currentProjDate <= endDate && count < 100) { // Limit to 100 to prevent infinite loops
      const dateStr = formatDate(currentProjDate);
      
      upcoming.push({
        ...r,
        projectedDate: dateStr,
        isOverdue: currentProjDate < today,
        isProjected: count > 0,
        uniqueKey: `${r.id}-proj-${count}`
      });

      // Increment based on recurrence
      if (r.recurring === 'weekly') {
        currentProjDate.setDate(currentProjDate.getDate() + 7);
      } else if (r.recurring === 'monthly') {
        currentProjDate.setMonth(currentProjDate.getMonth() + 1);
      } else if (r.recurring === 'quarterly') {
        currentProjDate.setMonth(currentProjDate.getMonth() + 3);
      } else if (r.recurring === 'yearly') {
        currentProjDate.setFullYear(currentProjDate.getFullYear() + 1);
      } else {
        break; // Guard against unknown values
      }

      count++;
    }
  });

  // Sort upcoming reminders chronologically by projectedDate
  return upcoming.sort((a, b) => a.projectedDate.localeCompare(b.projectedDate));
}

/**
 * 3. Calculates expected total income and expenses for the next `daysAhead` days,
 * combining concrete reminders with historical averages (avoiding duplicate categories).
 */
export function getExpectedCashflow(transactions, reminders, daysAhead = 30) {
  const upcomingRem = getUpcomingReminders(reminders, daysAhead);
  const averages = getMonthlyAverages(transactions, 3);

  // Separate reminders by type
  const incomeReminders = upcomingRem.filter(r => r.type === 'receivable');
  const expenseReminders = upcomingRem.filter(r => r.type === 'payment');

  const reminderIncomeSum = incomeReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const reminderExpenseSum = expenseReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Identify which categories are already accounted for by reminders in this period
  const reminderIncomeCategories = new Set(incomeReminders.map(r => r.category || 'Other'));
  const reminderExpenseCategories = new Set(expenseReminders.map(r => r.category || 'Other'));

  // Scaling factor for monthly averages to the projection window (e.g. 30 days is ~1 month)
  const scale = daysAhead / 30;

  // Add category averages *only if* they don't have active reminders in this window
  let avgExpenseAdjustment = 0;
  Object.entries(averages.avgByCategory).forEach(([cat, avgAmt]) => {
    if (!reminderExpenseCategories.has(cat)) {
      avgExpenseAdjustment += avgAmt * scale;
    }
  });

  // For income averages (overall avgIncome minus any categories covered by income reminders)
  // Usually income categories are fewer (Salary, Freelance, etc.). Let's handle it similarly:
  // If we have an income reminder in a category (e.g. Salary), we don't add the average monthly income for Salary.
  // To estimate average income by category, we can analyze transaction history category averages.
  const incomeCategorySums = {};
  const today = new Date();
  const cutoffDate = new Date();
  cutoffDate.setMonth(today.getMonth() - 3);
  cutoffDate.setDate(1);
  const incomeTxns = (transactions || []).filter(t => {
    const tDate = new Date(t.date);
    return tDate >= cutoffDate && (t.type === 'income' || t.type === 'credit') && t.category !== 'Transfer';
  });
  
  const uniqueMonths = new Set(incomeTxns.map(t => t.date.substring(0, 7)));
  const actualMonths = Math.max(1, uniqueMonths.size);

  incomeTxns.forEach(t => {
    const cat = t.category || 'Other';
    incomeCategorySums[cat] = (incomeCategorySums[cat] || 0) + (Number(t.amount) || 0);
  });

  let avgIncomeAdjustment = 0;
  Object.entries(incomeCategorySums).forEach(([cat, sum]) => {
    const avgAmt = sum / actualMonths;
    if (!reminderIncomeCategories.has(cat)) {
      avgIncomeAdjustment += avgAmt * scale;
    }
  });

  const expectedIncome = reminderIncomeSum + avgIncomeAdjustment;
  const expectedExpense = reminderExpenseSum + avgExpenseAdjustment;

  return {
    expectedIncome,
    expectedExpense,
    projectedRemindersIncome: reminderIncomeSum,
    projectedRemindersExpense: reminderExpenseSum,
    avgIncomeContribution: avgIncomeAdjustment,
    avgExpenseContribution: avgExpenseAdjustment,
  };
}

/**
 * 4. Forecasts category spending for the current month and compares it to averages.
 * Flag trends (up/down/stable).
 */
export function getCategoryForecast(transactions, averages) {
  if (!transactions || transactions.length === 0) return [];

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  
  // Calculate current month's spending by category
  const currentMonthSums = {};
  transactions
    .filter(t => t.date && t.date.startsWith(currentMonthStr) && (t.type === 'expense' || t.type === 'debit') && t.category !== 'Transfer')
    .forEach(t => {
      const cat = t.category || 'Other';
      currentMonthSums[cat] = (currentMonthSums[cat] || 0) + (Number(t.amount) || 0);
    });

  const forecast = [];
  const allCategories = new Set([
    ...Object.keys(averages.avgByCategory),
    ...Object.keys(currentMonthSums)
  ]);

  allCategories.forEach(cat => {
    const avg = averages.avgByCategory[cat] || 0;
    const actualThisMonth = currentMonthSums[cat] || 0;

    // Determine trend based on whether actual spending is tracking above or below the average
    // A simple trend check:
    // If it's the middle of the month, we can project the monthly total, or just compare current spending directly.
    // Let's project current spend to full month:
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedThisMonth = (actualThisMonth / dayOfMonth) * daysInMonth;

    let trend = 'stable'; // stable: →, up: ↑, down: ↓
    if (avg > 0) {
      const percentageDiff = (projectedThisMonth - avg) / avg;
      if (percentageDiff > 0.1) {
        trend = 'up';
      } else if (percentageDiff < -0.1) {
        trend = 'down';
      }
    } else if (actualThisMonth > 0) {
      trend = 'up'; // No average but spending this month
    }

    forecast.push({
      category: cat,
      average: avg,
      actualThisMonth,
      projectedThisMonth,
      trend
    });
  });

  // Sort by highest expected/average spending
  return forecast.sort((a, b) => Math.max(b.average, b.actualThisMonth) - Math.max(a.average, a.actualThisMonth));
}

/**
 * 5. Generates Predicted vs Actual monthly trends for the past `months` calendar months.
 * For each month, "Predicted" is computed as the rolling 3-month average of the preceding 3 months.
 */
export function getPredictedVsActual(transactions, months = 6) {
  if (!transactions || transactions.length === 0) return [];

  // Get list of last N months in YYYY-MM format
  const monthList = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthList.push(d.toISOString().substring(0, 7));
  }

  // Calculate actual income/expense for all months
  const monthlyActuals = {};
  transactions.forEach(t => {
    if (!t.date || t.category === 'Transfer') return;
    const month = t.date.substring(0, 7);
    if (!monthlyActuals[month]) {
      monthlyActuals[month] = { income: 0, expense: 0 };
    }
    const amount = Number(t.amount) || 0;
    if (t.type === 'income' || t.type === 'credit') {
      monthlyActuals[month].income += amount;
    } else if (t.type === 'expense' || t.type === 'debit') {
      monthlyActuals[month].expense += amount;
    }
  });

  return monthList.map(month => {
    const actual = monthlyActuals[month] || { income: 0, expense: 0 };

    // To predict for `month`, we need the rolling average of the 3 preceding months
    const prevMonths = [];
    const [year, monthNum] = month.split('-').map(Number);
    for (let i = 1; i <= 3; i++) {
      const d = new Date(year, monthNum - 1 - i, 1);
      prevMonths.push(d.toISOString().substring(0, 7));
    }

    let sumPrevIncome = 0;
    let sumPrevExpense = 0;
    let countMonths = 0;

    prevMonths.forEach(m => {
      if (monthlyActuals[m]) {
        sumPrevIncome += monthlyActuals[m].income;
        sumPrevExpense += monthlyActuals[m].expense;
        countMonths++;
      }
    });

    const predictedIncome = countMonths > 0 ? sumPrevIncome / countMonths : 0;
    const predictedExpense = countMonths > 0 ? sumPrevExpense / countMonths : 0;

    return {
      month, // e.g. "2026-06"
      actualIncome: actual.income,
      actualExpense: actual.expense,
      predictedIncome,
      predictedExpense
    };
  });
}
