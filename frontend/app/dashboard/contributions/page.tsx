"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  addContribution,
  getContributions,
  updateContribution,
} from "@/services/contributionApi";
import { getMembers } from "@/services/memberApi";
import { useDemoMode } from "@/hooks/useDemoMode";

interface Member {
  _id: string;
  name?: string;
  memberCode: string;
  monthlyContribution: number;
  user?: { name?: string; email?: string } | null;
}

interface Contribution {
  _id: string;
  member: Member | string | null;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;
  fineAmount?: number;
  finePaidAmount?: number;
  status: "due" | "partial" | "paid";
  paymentDate?: string | null;
  finePaymentDate?: string | null;
  note?: string;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100";
const cellClass = "px-4 py-3 align-top";
const money = (value: number) => `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
const paisa = (value: number) => Math.round(value * 100);
const memberName = (member?: Member | null) =>
  member?.name || member?.user?.name || member?.memberCode || "Unknown member";
const memberIdOf = (item: Contribution) =>
  typeof item.member === "string" ? item.member : item.member?._id || "";
const validMoney = (value: string) => {
  const amount = Number(value);
  return value.trim() !== "" && Number.isFinite(amount) && amount >= 0 &&
    Number.isSafeInteger(paisa(amount)) && Math.abs(amount * 100 - paisa(amount)) < 0.000001;
};
const errorMessage = (error: unknown, fallback: string) => {
  const item = error as { response?: { data?: { message?: string } }; message?: string };
  return item?.response?.data?.message || item?.message || fallback;
};
const displayDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function ContributionsPage() {
  const isDemo = useDemoMode();
  const busy = useRef(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<Contribution[]>([]);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [memberId, setMemberId] = useState("");
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2026);
  const [paid, setPaid] = useState("1000");
  const [finePaid, setFinePaid] = useState("0");
  const [receipt, setReceipt] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setReady(false);
    try {
      const [memberData, contributionData] = await Promise.all([
        getMembers(), getContributions(),
      ]);
      if (!Array.isArray(memberData.members) || !Array.isArray(contributionData.contributions)) {
        throw new Error("Unexpected response while loading contributions");
      }
      setMembers(memberData.members);
      setRecords(contributionData.contributions);
      setReady(true);
    } catch (err) {
      setError(errorMessage(err, "Failed to load contributions"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka", month: "numeric", year: "numeric",
    }).formatToParts(new Date());
    setMonth(Number(parts.find((part) => part.type === "month")?.value || 1));
    setYear(Number(parts.find((part) => part.type === "year")?.value || 2026));
    void loadData();
  }, [loadData]);

  const selected = members.find((member) => member._id === memberId);
  const expected = editing?.expectedAmount ?? selected?.monthlyContribution ?? 1000;
  const oldPaid = editing?.paidAmount ?? 0;
  const oldFinePaid = editing?.finePaidAmount ?? 0;
  const savingsDelta = paisa(Number(paid)) - paisa(oldPaid);
  const fineDelta = paisa(Number(finePaid)) - paisa(oldFinePaid);
  const increases = savingsDelta > 0 || fineDelta > 0;
  const changesMoney = savingsDelta !== 0 || fineDelta !== 0;
  const disabled = Boolean(isDemo) || submitting || loading || !ready;
  const duplicate = !editing && records.find((item) =>
    memberIdOf(item) === memberId && item.month === month && item.year === year
  );

  const resetForm = () => {
    setEditing(null);
    setMemberId("");
    setPaid("1000");
    setFinePaid("0");
    setReceipt("");
    setNote("");
  };

  const editRecord = (item: Contribution) => {
    if (disabled) return;
    setEditing(item);
    setMemberId(memberIdOf(item));
    setMonth(item.month);
    setYear(item.year);
    setPaid(String(item.paidAmount));
    setFinePaid(String(item.finePaidAmount ?? 0));
    setReceipt("");
    setNote(item.note || "");
    setError("");
    setSuccess("");
    document.getElementById("contribution-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current || disabled) return;
    setError("");
    setSuccess("");
    if (!memberId) return setError("Select a member.");
    if (!Number.isInteger(month) || month < 1 || month > 12 ||
        !Number.isInteger(year) || year < 2026 || year > 9999) {
      return setError("Choose a valid month and year from 2026 onward.");
    }
    if (duplicate) return setError("This month already exists. Use Edit on that record.");
    if (!validMoney(paid) || !validMoney(finePaid)) {
      return setError("Enter non-negative amounts with at most two decimal places.");
    }
    if (paisa(Number(paid)) > paisa(expected)) {
      return setError("Savings cannot exceed this month's expected amount. Record other months separately.");
    }
    if (Number(finePaid) > 50) return setError("The collected fine cannot exceed ৳50 for one month.");

    let paymentDate: string | undefined;
    if (increases || (editing && !changesMoney && receipt)) {
      if (editing && !changesMoney && !note.trim()) {
        return setError("Explain the payment date correction in Note.");
      }
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(receipt)) {
        return setError("Enter the actual receipt date and time in Bangladesh time.");
      }
      const date = new Date(`${receipt}:00+06:00`);
      if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
        return setError("Receipt date must be valid and cannot be in the future.");
      }
      paymentDate = date.toISOString();
    }

    busy.current = true;
    setSubmitting(true);
    let saved = false;
    try {
      const payload = {
        paidAmount: Number(paid), finePaidAmount: Number(finePaid), note,
        ...(paymentDate ? { paymentDate } : {}),
      };
      if (editing) {
        await updateContribution(editing._id, payload);
      } else {
        await addContribution({ memberId, month, year, ...payload });
      }
      saved = true;
      resetForm();
      setSuccess("Contribution saved. Savings and fines were recorded separately.");
      await loadData();
    } catch (err) {
      setError(errorMessage(err, "Failed to save contribution"));
      // Refresh before another attempt if the request outcome is uncertain.
      await loadData();
    } finally {
      if (!saved) resetForm();
      setSubmitting(false);
      busy.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contributions</h1>
        <p className="mt-2 text-gray-500">Monthly savings, fines, and payment history.</p>
      </div>
      {isDemo && <p className="rounded-lg bg-amber-50 p-4 text-amber-800">Demo Mode — read only.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-700">{success}</p>}
      <button type="button" disabled={loading || submitting} onClick={() => {
        resetForm(); setError(""); void loadData();
      }} className="rounded-lg border px-4 py-2 disabled:opacity-50">
        {loading ? "Loading…" : "Refresh records"}
      </button>

      <form id="contribution-form" onSubmit={handleSubmit} className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">{editing ? "Edit contribution" : "Add contribution"}</h2>
        <p className="mb-5 text-sm text-gray-600">
          Enter cumulative totals for one contribution month. If ৳500 was paid and another ৳500 arrives,
          enter ৳1,000. Split catch-up payments across the months they settle.
        </p>
        <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm font-medium">
            <span>Member</span>
            <select required disabled={Boolean(editing)} value={memberId} className={inputClass}
              onChange={(event) => {
                setMemberId(event.target.value);
                setPaid(String(members.find((item) => item._id === event.target.value)?.monthlyContribution ?? 1000));
                setFinePaid("0"); setReceipt(""); setNote("");
              }}>
              <option value="">Select member</option>
              {members.map((member) => <option key={member._id} value={member._id}>
                {memberName(member)} — {member.memberCode}
              </option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Contribution month</span>
            <select value={month} disabled={Boolean(editing)} className={inputClass}
              onChange={(event) => setMonth(Number(event.target.value))}>
              {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Year</span>
            <input required type="number" min="2026" max="9999" step="1" value={year}
              disabled={Boolean(editing)} onChange={(event) => setYear(Number(event.target.value))} className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Savings paid total (expected {money(expected)})</span>
            <input required type="number" min="0" max={expected} step="0.01" value={paid}
              onChange={(event) => setPaid(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Fine collected total</span>
            <input required type="number" min="0" max="50" step="0.01" value={finePaid}
              onChange={(event) => setFinePaid(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Actual payment date and time — Bangladesh (UTC+6)</span>
            <input type="datetime-local" step="60" value={receipt} required={increases} disabled={!increases && !(editing && !changesMoney)}
              onChange={(event) => setReceipt(event.target.value)} className={inputClass} />
            <span className="block text-xs font-normal text-gray-500">Select when the money was received. This is separate from the contribution month and year.</span>
          </label>
          <label className="space-y-2 text-sm font-medium md:col-span-2 xl:col-span-3">
            <span>Note</span>
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
          </label>
          <div className="space-y-3 text-sm md:col-span-2 xl:col-span-3">
            <p>Late fines are assessed by the server. Enter the date money was received, not today's entry date.</p>
            {editing && <p>Currently recorded: savings {money(oldPaid)}, fine collected {money(oldFinePaid)}.
              {" "}Assessed fine: {money(editing.fineAmount ?? 0)}.</p>}
            {changesMoney && validMoney(paid) && validMoney(finePaid) &&
              <p>Net change to recorded cash: {money((savingsDelta + fineDelta) / 100)}.</p>}
            {editing && (savingsDelta < 0 || fineDelta < 0) &&
              <p className="text-amber-800">Reducing a total records a cash correction. The backend checks available cash.</p>}
            <p className="text-gray-500">To correct an existing savings payment date, keep both amounts unchanged, select the corrected date, and explain why in Note. Leave the date blank to keep it unchanged. This supports one unreversed savings receipt; instalments and collected-fine refunds require separate reconciliation. Fine payment dates are not changed.</p>
            {duplicate && <p className="text-amber-800">This member already has a record for this month. Select Edit below.</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={Boolean(duplicate)} className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50">
                {submitting ? "Saving…" : editing ? "Save changes" : "Add contribution"}
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border px-5 py-3">Cancel / clear</button>
            </div>
          </div>
        </fieldset>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <div className="border-b p-5">
          <h2 className="font-semibold">Contribution history ({records.length})</h2>
          <p className="mt-1 text-sm text-gray-500">Existing monthly records only. Dates shown in Bangladesh time.</p>
        </div>
        {records.length === 0 ? <p className="p-6 text-gray-500">{loading ? "Loading…" : "No contribution records found."}</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50"><tr>
              {["Member", "Month", "Expected", "Savings paid", "Fine assessed", "Fine collected", "Savings due", "Fine due", "Status", "Receipt dates", "Note", "Action"].map((heading) =>
                <th key={heading} scope="col" className={cellClass}>{heading}</th>
              )}
            </tr></thead>
            <tbody>{records.map((item) => {
              const member = typeof item.member === "object" ? item.member : members.find((entry) => entry._id === item.member);
              const savingsDue = Math.max(0, (paisa(item.expectedAmount) - paisa(item.paidAmount)) / 100);
              const fineDue = Math.max(0, (paisa(item.fineAmount ?? 0) - paisa(item.finePaidAmount ?? 0)) / 100);
              return <tr key={item._id} className="border-t">
                <td className={cellClass}><div className="font-medium">{memberName(member)}</div><div className="text-gray-500">{member?.memberCode}</div></td>
                <td className={`${cellClass} whitespace-nowrap`}>{months[item.month - 1]} {item.year}</td>
                <td className={cellClass}>{money(item.expectedAmount)}</td>
                <td className={cellClass}>{money(item.paidAmount)}</td>
                <td className={cellClass}>{money(item.fineAmount ?? 0)}</td>
                <td className={cellClass}>{money(item.finePaidAmount ?? 0)}</td>
                <td className={cellClass}>{money(savingsDue)}</td>
                <td className={cellClass}>{money(fineDue)}</td>
                <td className={cellClass}><span className="capitalize">Savings: {item.status}</span><div>{fineDue > 0 ? "Fine outstanding" : (item.fineAmount ?? 0) > 0 ? "Fine paid" : "No fine"}</div></td>
                <td className={`${cellClass} whitespace-nowrap`}><div>Savings: {displayDate(item.paymentDate)}</div><div>Fine: {displayDate(item.finePaymentDate)}</div></td>
                <td className={`${cellClass} min-w-40 whitespace-pre-wrap`}>{item.note || "—"}</td>
                <td className={cellClass}><button type="button" disabled={disabled || !memberIdOf(item)} onClick={() => editRecord(item)} className="rounded border px-3 py-2 disabled:opacity-50">Edit</button></td>
              </tr>;
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
