import React from 'react';
import { fmt, pct } from '../utils';

function Row({ label, llc, family, highlight }) {
  return (
    <tr className={highlight ? 'bg-gray-700 font-semibold' : 'border-t border-gray-700'}>
      <td className="py-1.5 px-3 text-gray-300">{label}</td>
      <td className="py-1.5 px-3 text-right tabular-nums">{llc}</td>
      <td className="py-1.5 px-3 text-right tabular-nums text-blue-300">{family}</td>
    </tr>
  );
}

export default function ProformaTable({ p }) {
  if (!p) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-gray-800 rounded">
        <thead>
          <tr className="bg-gray-700 text-gray-400 text-xs uppercase">
            <th className="py-2 px-3 text-left">Line Item</th>
            <th className="py-2 px-3 text-right">LLC (100%)</th>
            <th className="py-2 px-3 text-right">Per Family (50%)</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Gross Rental Revenue" llc={fmt(p.grossRevenue)} family={fmt(p.grossRevenue / 2)} />
          <Row label="Management Fee" llc={`(${fmt(p.mgmtFee)})`} family={`(${fmt(p.mgmtFee / 2)})`} />
          <Row label="Platform Fees (3%)" llc={`(${fmt(p.platformFees)})`} family={`(${fmt(p.platformFees / 2)})`} />
          <Row label="Property Tax" llc={`(${fmt(p.propertyTax)})`} family={`(${fmt(p.propertyTax / 2)})`} />
          <Row label="Insurance" llc={`(${fmt(p.insurance)})`} family={`(${fmt(p.insurance / 2)})`} />
          <Row label="HOA" llc={`(${fmt(p.annualHOA)})`} family={`(${fmt(p.annualHOA / 2)})`} />
          <Row label="Maintenance" llc={`(${fmt(p.maintenance)})`} family={`(${fmt(p.maintenance / 2)})`} />
          <Row label="Utilities" llc={`(${fmt(p.utilities)})`} family={`(${fmt(p.utilities / 2)})`} />
          <Row label="Total OpEx" llc={`(${fmt(p.totalOpEx)})`} family={`(${fmt(p.totalOpEx / 2)})`} highlight />
          <Row label="Net Operating Income (NOI)" llc={fmt(p.NOI)} family={fmt(p.NOI / 2)} highlight />
          <Row label="Annual Mortgage" llc={`(${fmt(p.annualMortgage)})`} family={`(${fmt(p.annualMortgage / 2)})`} />
          <Row
            label="Net Annual Cash Flow"
            llc={fmt(p.cashFlow)}
            family={fmt(p.perFamilyNetCost)}
            highlight
          />
        </tbody>
        <tfoot>
          <tr className="bg-gray-700 text-xs text-gray-400">
            <td className="py-1.5 px-3">Cap Rate</td>
            <td className="py-1.5 px-3 text-right">{pct(p.capRate)}</td>
            <td className="py-1.5 px-3 text-right">—</td>
          </tr>
          <tr className="bg-gray-700 text-xs text-gray-400">
            <td className="py-1.5 px-3">Cash-on-Cash Return</td>
            <td className="py-1.5 px-3 text-right">{pct(p.cocReturn)}</td>
            <td className="py-1.5 px-3 text-right">—</td>
          </tr>
          <tr className="bg-gray-700 text-xs text-gray-400">
            <td className="py-1.5 px-3">Total Cash In</td>
            <td className="py-1.5 px-3 text-right">{fmt(p.totalCashIn)}</td>
            <td className="py-1.5 px-3 text-right text-blue-300">{fmt(p.perFamilyCashIn)}</td>
          </tr>
          <tr className="bg-gray-700 text-xs text-gray-400">
            <td className="py-1.5 px-3">Personal Weeks / Family</td>
            <td className="py-1.5 px-3 text-right">{(p.personalWeeksPerFamily * 2).toFixed(1)}</td>
            <td className="py-1.5 px-3 text-right text-blue-300">{p.personalWeeksPerFamily?.toFixed(1)}</td>
          </tr>
          <tr className="bg-gray-700 text-xs text-gray-400">
            <td className="py-1.5 px-3">Cost / Personal Week</td>
            <td className="py-1.5 px-3 text-right">—</td>
            <td className="py-1.5 px-3 text-right text-blue-300">{fmt(p.costPerPersonalWeek)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
