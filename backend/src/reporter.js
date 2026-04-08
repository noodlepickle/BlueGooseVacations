'use strict';

const { Resend } = require('resend');
const { marked } = require('marked');

function fmt(n) {
  if (n == null) return 'N/A';
  return '$' + Math.round(n).toLocaleString();
}

function pct(n) {
  if (n == null) return 'N/A';
  return n.toFixed(1) + '%';
}

/**
 * Build a markdown digest from all area screening results.
 */
function buildDigest(allAreaResults, goals, runDate) {
  const totalProps = allAreaResults.reduce((s, a) => s + a.results.length, 0);
  const totalQualifying = allAreaResults.reduce((s, a) => s + a.results.filter(r => r.qualifies).length, 0);

  const lines = [];
  lines.push(`# Beach House Screener — ${runDate}`);
  lines.push('');
  lines.push(`**Run summary:** ${totalProps} properties across ${allAreaResults.length} markets · **${totalQualifying} qualifying**`);
  lines.push('');

  // Goals table
  lines.push('## Screening Goals');
  lines.push('');
  lines.push('| Goal | Value |');
  lines.push('|------|-------|');
  lines.push(`| Max Purchase Price | ${fmt(goals.maxPurchasePrice)} |`);
  lines.push(`| Max Net Annual Cost / Family | ${fmt(goals.maxNetCostPerFamily)} |`);
  lines.push(`| Min Personal Weeks / Family | ${goals.minPersonalWeeksPerFamily} weeks |`);
  lines.push(`| Down Payment | ${goals.downPaymentPct}% |`);
  lines.push(`| Interest Rate | ${goals.interestRate}% |`);
  lines.push(`| Loan Term | ${goals.loanTermYears} years |`);
  lines.push('');

  for (const { area, results } of allAreaResults) {
    const qualifying = results.filter(r => r.qualifies);
    const nearMiss = results.filter(r => !r.qualifies && r.issues.length <= 1);

    lines.push(`## ${area.data.label}`);
    lines.push('');
    lines.push(`${results.length} properties · ${qualifying.length} qualifying · ${nearMiss.length} near-miss`);
    lines.push('');

    if (qualifying.length > 0) {
      lines.push('### Qualifying Properties');
      lines.push('');
      for (const r of qualifying) {
        const p = r.proforma;
        const newBadge = r.isNew ? ' 🆕 **NEW**' : '';
        lines.push(`#### ${r.listing.address}${newBadge}`);
        lines.push('');
        lines.push(`**${fmt(r.listing.purchasePrice)}** · ${r.listing.beds}bd/${r.listing.baths}ba · [View Listing](${r.listing.listingUrl})`);
        lines.push('');
        lines.push('| Metric | LLC | Per Family |');
        lines.push('|--------|-----|------------|');
        lines.push(`| Net Annual Cost | ${fmt(p.cashFlow)} | **${fmt(p.perFamilyNetCost)}** |`);
        lines.push(`| Gross Revenue | ${fmt(p.grossRevenue)} | ${fmt(p.grossRevenue / 2)} |`);
        lines.push(`| Total OpEx | ${fmt(p.totalOpEx)} | ${fmt(p.totalOpEx / 2)} |`);
        lines.push(`| Annual Mortgage | ${fmt(p.annualMortgage)} | ${fmt(p.annualMortgage / 2)} |`);
        lines.push(`| Cap Rate | ${pct(p.capRate)} | — |`);
        lines.push(`| CoC Return | ${pct(p.cocReturn)} | — |`);
        lines.push(`| Personal Weeks | ${(p.personalWeeksPerFamily * 2).toFixed(1)} | ${p.personalWeeksPerFamily.toFixed(1)} |`);
        lines.push(`| Cost / Personal Week | — | ${fmt(p.costPerPersonalWeek)} |`);
        lines.push(`| Total Cash In | ${fmt(p.totalCashIn)} | ${fmt(p.perFamilyCashIn)} |`);
        lines.push('');
      }
    } else {
      lines.push('_No qualifying properties in this market._');
      lines.push('');
    }

    if (nearMiss.length > 0) {
      lines.push('### Near-Miss Properties (fails 1 goal)');
      lines.push('');
      for (const r of nearMiss) {
        const p = r.proforma;
        lines.push(`- **${r.listing.address}** — ${fmt(r.listing.purchasePrice)} · Net cost/family: ${fmt(p.perFamilyNetCost)} · _${r.issues.join('; ')}_`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function sendEmail(markdown, runDate) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[reporter] RESEND_API_KEY not set — skipping email');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = marked(markdown);

  await resend.emails.send({
    from: process.env.DIGEST_FROM,
    to: (process.env.DIGEST_TO || '').split(',').map(s => s.trim()).filter(Boolean),
    subject: `Beach House Screener — ${runDate}`,
    html,
  });

  console.log('[reporter] Email sent via Resend');
}

async function writeToNotion(markdown, allAreaResults, runDate) {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.log('[reporter] Notion not configured — skipping');
    return;
  }

  // Lazy import to avoid requiring @notionhq/client when not configured
  try {
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        title: {
          title: [{ text: { content: `Beach House Screener — ${runDate}` } }],
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: markdown.slice(0, 2000) } }],
          },
        },
      ],
    });

    console.log('[reporter] Notion page created');
  } catch (err) {
    console.error('[reporter] Notion error:', err.message);
  }
}

module.exports = { buildDigest, sendEmail, writeToNotion };
