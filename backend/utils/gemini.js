import { GoogleGenAI } from '@google/genai';

let ai;
const getAI = () => {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            console.error('WARNING: GEMINI_API_KEY is not set. AI features will not work.');
        }
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
};
 
const stripMarkdown = (text) => {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
    } else if (cleaned.startsWith('json')) {
        cleaned = cleaned.replace(/^json\n?/, '');
    }
    cleaned = cleaned.trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    return cleaned.trim();
};
 
// Retries on 503/429 (Gemini overload or rate limit) with exponential backoff
const retryWithBackoff = async (fn, retries = 4, delayMs = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const status = error?.status ?? error?.error?.code;
            const isRetryable = status === 503 || status === 429;

            if (isRetryable && attempt < retries) {
                const wait = delayMs * 2 ** (attempt - 1); // 1s, 2s, 4s, 8s
                console.warn(`Gemini API unavailable (attempt ${attempt}/${retries}). Retrying in ${wait}ms...`);
                await new Promise(res => setTimeout(res, wait));
            } else {
                throw error;
            }
        }
    }
};

export const generateMonthlyInsight = async ({
    totalIncome,
    totalExpenses,
    savingsRate,
    expenseBreakdown, // FIX: was `ExpenseBreakdown` (wrong casing)
    previousMonths,
    currency = 'USD'
}) => {
    const breakdownText = expenseBreakdown.length > 0
        ? expenseBreakdown.map(c => `- ${c.category}: ${currency} ${c.amount.toFixed(2)}`).join('\n')
        : '- No expenses recorded yet';
 
    const trendText = previousMonths.length > 0
        ? previousMonths.map(m => `- ${m.month}: Income ${currency} ${m.income.toFixed(2)}, Expense ${currency} ${m.expenses.toFixed(2)}`).join('\n')
        : '- No previous month data available';
 
    const prompt = `Analyze this user's monthly financial data and generate actionable insights.
    
Currency: ${currency}
Total Income (this month): ${currency} ${totalIncome.toFixed(2)}
Total Expense (this month): ${currency} ${totalExpenses.toFixed(2)}
Savings Rate: ${savingsRate.toFixed(1)}%
 
Expense breakdown by category (this month):
${breakdownText}
 
Previous months trend:
${trendText}
 
Return ONLY valid JSON (no markdown, no commentary) in this exact structure:
{
    "summary": "2-3 sentence summary of the user's financial health this month",
    "highlights": ["Positive observation 1", "Positive observation 2"],
    "concerns": ["Concern 1", "Concern 2"],
    "recommendations": [
    {"title": "Short title", "detail": "Actionable suggestion (1-2 sentences)"}
    ],
    "topSpendingCategory": "Category name or null",
    "estimatedMonthlySavings": number,
    "healthScore": number
}
 
Constraints:
- "healthScore" must be an integer between 0 and 100.
- Provide 3 recommendations.
- Reference actual numbers from the data. Tone: friendly and honest.`; // FIX: was `promt` (typo)
 
    try {
        const response = await retryWithBackoff(() => getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini API error (monthly insight):', error);
        throw new Error('Failed to generate monthly insight. Please try again.');
    }
};
 
 
export const generateBudgetAlert = async ({
    categoryName,
    budgetAmount,
    spentAmount, // FIX: was `spendAmount` in param but `spentAmount` used in body
    daysIntoPeriod,
    totalPeriodDays,
    currency = 'USD'
}) => {
    const percentUsed = ((spentAmount / budgetAmount) * 100).toFixed(1);
    const daysLeft = totalPeriodDays - daysIntoPeriod;
 
    const prompt = `A user is tracking a budget. Generate a helpful alert.
 
    Category: ${categoryName}
    Budget: ${currency} ${budgetAmount.toFixed(2)}
    Spent so far: ${currency} ${spentAmount.toFixed(2)} (${percentUsed}% used)
    Days into period: ${daysIntoPeriod} of ${totalPeriodDays} (${daysLeft} days remaining)
 
    Return ONLY valid JSON (no markdown):
    {
        "severity": "info|warning|critical",
        "title": "Short alert title",
        "message": "1-2 sentence empathetic message referencing actual numbers",
        "suggestions": ["Specific action 1", "Specific action 2", "Specific action 3"]
    }
 
    Severity guide:
    - info: under 70% spent
    - warning: 70-90% spent
    - critical: over 90% spent`; // FIX: warning/critical ranges were overlapping (70-100 and over 90)
 
    try {
        const response = await retryWithBackoff(() => getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini API error (budget alert):', error);
        throw new Error('Failed to generate budget alert.');
    }
};
 
export const generateSavingsTips = async ({ topCategories, monthlyIncome, currency = 'USD' }) => { // FIX: was `generateSavingTips` (missing 's'), mismatched with default export
    const categoryText = topCategories.length > 0
        ? topCategories.map(c => `- ${c.category}: ${currency} ${c.amount.toFixed(2)} across ${c.transactionCount}`).join('\n')
        : '- No spending data available';
 
    const prompt = `Generate personalized savings tips for a user.
 
Monthly Income (last 30 days): ${currency} ${monthlyIncome.toFixed(2)}
Top spending categories (last 30 days):
${categoryText}
 
Return ONLY valid JSON (no markdown):
{
    "overallTip": "Top-level 1-sentence advice",
    "tips": [
        {
            "category": "Category this targets",
            "title": "Short tip title",
            "detail": "2-3 sentence actionable suggestion",
            "estimatedSavings": number
        }
    ]
}
 
Provide exactly 4 tips. Each tip should reference an actual category from the data and include a realistic monthly savings estimate.`; // FIX: prompt template literal was never closed
 
    try {
        const response = await retryWithBackoff(() => getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        const cleaned = stripMarkdown(response.text); // FIX: was `respose.text` (typo)
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini API error (savings tips):', error);
        throw new Error('Failed to generate savings tips.');
    }
};
 
 
export const analyzeTransactionList = async ({ transactions, currency = 'USD' }) => { // FIX: params were wrong (`topCategories, monthlyIncome` instead of `transactions`)
    const formatDate = (d) => {
        if (!d) return ''; // FIX: was `!id` (wrong variable name)
        if (d instanceof Date) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
        return String(d).split('T')[0];
    }; // FIX: closing brace for formatDate was misplaced
 
    const lines = transactions
        .slice(0, 50)
        .map((t) => {
            const date = formatDate(t.transaction_date); // FIX: was `t.tranaction_date` (typo)
            const amt = parseFloat(t.amount).toFixed(2);
            const cat = t.category_name || 'uncategorized';
            const desc = t.description ? ` | ${t.description}` : '';
            return `- ${date}: ${t.type} ${currency} ${amt} | ${cat}${desc}`;
        })
        .join('\n');
 
    const prompt = `Analyze these ${transactions.length} transactions and provide a concise, helpful spending insight.
 
Transactions:
${lines}
 
Return ONLY valid JSON (no markdown):
{
    "insight": "2-4 sentence analysis with specific numbers from the data. Tone: friendly, helpful.",
    "highlight": "Single short phrase capturing the key takeaway (e.g., 'Heavy on dining', 'Stable income')"
}`; // FIX: prompt had garbled text and unclosed JSON template
 
    try {
        const response = await retryWithBackoff(() => getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini API error (analyze transactions):', error);
        throw new Error('Failed to analyze transactions.'); // FIX: was "Finaled" (typo)
    }
};
 
 
export const analyzeBudgetList = async ({ budgets, currency = 'USD' }) => { // FIX: stray `}` braces scattered throughout function
    const lines = budgets.map((b) => {
        const spent = parseFloat(b.spent);
        const total = parseFloat(b.amount);
        const pct = total > 0 ? ((spent / total) * 100).toFixed(1) : '0';
        return `Budget ID ${b.id} | Category: ${b.category_name} | Limit: ${currency} ${total.toFixed(2)} | Spent: ${currency} ${spent.toFixed(2)} (${pct}%)`; // FIX: return line was truncated
    }).join('\n');
 
    const prompt = `You're a personal finance assistant. Analyze each budget below and provide a one-sentence assessment.
 
Today: ${new Date().toISOString().split('T')[0]}
 
Budgets:
${lines}
 
For each budget, return:
- status: 'good' (well-paced, under target), 'caution' (approaching limit or above 70%), or 'concerning' (over budget)
- message: A specific, friendly 1-sentence assessment with actionable feedback or encouragement
 
Return ONLY valid JSON (no markdown):
{
    "analyses": [
        { "budgetId": number, "status": "good"|"caution"|"concerning", "message": "String" }
    ]
}`; // FIX: was `promt` (typo), and stray `}` inside prompt string
 
    try {
        const response = await retryWithBackoff(() => getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
        // FIX: removed dead code `const response = await getAI().models.generateContent([])` after return
    } catch (error) {
        console.error('Gemini API error (analyze budgets):', error);
        throw new Error('Failed to analyze budgets.'); // FIX: was "analyzze" (typo)
    }
};
 
 
export default {
    generateMonthlyInsight,
    generateBudgetAlert,
    generateSavingsTips,
    analyzeTransactionList,
    analyzeBudgetList,
};