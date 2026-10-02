"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  getLoans, createLoanRequest, approveLoan, rejectLoan,
  disburseLoan, recordLoanRepayment,
} from "@/services/loanApi";
import type { LoanStatus } from "@/services/loanApi";
import { getMembers } from "@/services/memberApi";
import { getCurrentUser } from "@/services/authApi";

interface User {
  _id?: string;
  id?: string;
  name?: string;
  role: "admin" | "member";
  isDemo?: boolean;
  dataScope?: string;
}
interface Member {
  _id: string;
  name?: string;
  memberCode?: string;
  membershipStatus?: string;
  user?: { name?: string } | null;
}
interface Repayment {
  _id?: string;
  amount: number;
  paymentDate: string;
  note?: string;
}
interface Loan {
  _id: string;
  member: Member | null;
  requestedAmount: number;
  approvedAmount: number;
  disbursedAmount: number;
  repaidAmount: number;
  outstandingAmount: number;
  reason: string;
  status: LoanStatus;
  createdAt: string;
  disbursedAt?: string | null;
  repaymentDueDate?: string | null;
  adminNote?: string;
  repayments: Repayment[];
}
type Action = "approve" | "reject" | "disburse" | "repay";
const field = "mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100";
const button = "rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";
const money = (value: number) => `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
const nameOf = (member: Member | null) =>
  member?.name || member?.user?.name || member?.memberCode || "Unavailable member";
const dateOf = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const messageOf = (error: unknown) => {
  const item = error as { response?: { data?: { message?: string } }; message?: string };
  return item?.response?.data?.message || item?.message || "Request failed";
};
const positiveMoney = (value: string) => {
  const number = Number(value);
  const cents = Math.round(number * 100);
  return value.trim() !== "" && Number.isFinite(number) && number > 0 &&
    Number.isSafeInteger(cents) && Math.abs(number * 100 - cents) < 0.000001;
};

export default function LoansPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<LoanStatus | "all">("all");
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<{ loan: Loan; action: Action } | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [due, setDue] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setReady(false);
    try {
      const account = await getCurrentUser();
      if (!account?.user || !["admin", "member"].includes(account.user.role)) {
        throw new Error("An authenticated admin or member account is required.");
      }
      const currentUser: User = account.user;
      setUser(currentUser);
      const [loanData, memberData] = await Promise.all([
        getLoans(),
        currentUser.role === "admin" ? getMembers() : Promise.resolve({ members: [] }),
      ]);
      if (!Array.isArray(loanData.loans) || !Array.isArray(memberData.members)) {
        throw new Error("Unexpected response while loading loans.");
      }
      setLoans(loanData.loans);
      setMembers(memberData.members);
      setReady(true);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const admin = user?.role === "admin";
  const demo = user?.isDemo === true || user?.dataScope === "demo";
  const disabled = demo || loading || saving || !ready;
  const visible = filter === "all" ? loans : loans.filter((loan) => loan.status === filter);
  const outstanding = loans.reduce((sum, loan) => sum + Math.round(loan.outstandingAmount * 100), 0) / 100;
  const disbursed = loans.reduce((sum, loan) => sum + Math.round(loan.disbursedAmount * 100), 0) / 100;
  const repaid = loans.reduce((sum, loan) => sum + Math.round(loan.repaidAmount * 100), 0) / 100;

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || busy.current) return;
    setError(""); setSuccess("");
    if (!positiveMoney(amount)) return setError("Enter a positive amount with at most two decimals.");
    if (!reason.trim()) return setError("Enter the reason for this loan.");
    if (admin && !memberId) return setError("Select the borrowing member.");
    busy.current = true;
    setSaving(true);
    try {
      await createLoanRequest({
        amount: Number(amount), reason: reason.trim(),
        ...(admin ? { memberId } : {}),
      });
      setAmount(""); setReason(""); setMemberId("");
      setSuccess("Loan request submitted. Approval does not disburse cash.");
      await load();
    } catch (err) {
      setError(messageOf(err) + " Refresh and check the register before submitting again.");
      // A failed network response can hide a successful write.
      setReady(false);
    } finally {
      setSaving(false);
      busy.current = false;
    }
  };

  const openAction = (loan: Loan, action: Action) => {
    if (disabled || !admin) return;
    setSelected({ loan, action });
    setActionAmount(action === "approve" ? String(loan.requestedAmount) : "");
    setActionNote(""); setDue(""); setConfirmed(false);
    setError(""); setSuccess("");
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || disabled || !admin || busy.current) return;
    setError(""); setSuccess("");
    const { loan, action } = selected;
    if ((action === "approve" || action === "repay") && !positiveMoney(actionAmount)) {
      return setError("Enter a positive amount with at most two decimals.");
    }
    if (action === "approve" && Math.round(Number(actionAmount) * 100) > Math.round(loan.requestedAmount * 100)) {
      return setError("Approval cannot exceed the requested amount.");
    }
    if (action === "repay" && Math.round(Number(actionAmount) * 100) > Math.round(loan.outstandingAmount * 100)) {
      return setError("Repayment cannot exceed the outstanding balance.");
    }
    if ((action === "disburse" || action === "repay") && !confirmed) {
      return setError("Confirm the actual cash transfer before recording it.");
    }
    let repaymentDueDate: string | undefined;
    if (action === "approve" && due) {
      const date = new Date(`${due}:00+06:00`);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        return setError("The repayment deadline must be in the future (Bangladesh time).");
      }
      repaymentDueDate = date.toISOString();
    }
    busy.current = true;
    setSaving(true);
    try {
      if (action === "approve") {
        await approveLoan(loan._id, {
          approvedAmount: Number(actionAmount), adminNote: actionNote.trim(),
          ...(repaymentDueDate ? { repaymentDueDate } : {}),
        });
      } else if (action === "reject") {
        await rejectLoan(loan._id, { adminNote: actionNote.trim() });
      } else if (action === "disburse") {
        await disburseLoan(loan._id);
      } else {
        await recordLoanRepayment(loan._id, { amount: Number(actionAmount), note: actionNote.trim() });
      }
      setSelected(null);
      setSuccess("Loan action saved. The register has been refreshed.");
      await load();
    } catch (err) {
      setError(messageOf(err) + " Refresh and verify the loan before retrying.");
      setSelected(null);
      setReady(false);
    } finally {
      setSaving(false);
      busy.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Group Loans</h1>
          <p className="mt-2 text-gray-500">See who borrowed, how much was repaid, and what remains outstanding.</p>
        </div>
        <button type="button" className={button} disabled={loading || saving} onClick={() => {
          setSelected(null); setError(""); setSuccess(""); void load();
        }}>{loading ? "Loading…" : "Refresh register"}</button>
      </div>
      {demo && <p className="rounded-lg bg-amber-50 p-4 text-amber-800">Demo Mode — all modification actions are disabled.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-700">{success}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[["Total disbursed", disbursed], ["Total repaid", repaid], ["Outstanding loans", outstanding]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{ready ? money(Number(value)) : "—"}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500">Group totals include all statuses. Loans are not personal savings or expenses. Disbursements reduce cash; repayments restore it.</p>

      <form onSubmit={submitRequest} className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Request a loan</h2>
        <fieldset disabled={disabled || Boolean(selected)} className="grid gap-4 md:grid-cols-2">
          {admin && <label className="text-sm font-medium">Borrowing member
            <select required value={memberId} onChange={(event) => setMemberId(event.target.value)} className={field}>
              <option value="">Select active member</option>
              {members.filter((member) => member.membershipStatus === "active").map((member) =>
                <option key={member._id} value={member._id}>{nameOf(member)} — {member.memberCode}</option>
              )}
            </select>
          </label>}
          <label className="text-sm font-medium">Requested amount (৳)
            <input required type="number" min="0.01" step="0.01" value={amount}
              onChange={(event) => setAmount(event.target.value)} className={field} />
          </label>
          <label className="text-sm font-medium md:col-span-2">Reason
            <textarea required rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className={field} />
          </label>
          <div className="md:col-span-2"><button type="submit" className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50">
            {saving ? "Saving…" : "Submit request"}
          </button></div>
        </fieldset>
      </form>

      {selected && admin && <form onSubmit={submitAction} className="rounded-xl border border-emerald-300 bg-white p-5">
        <h2 className="text-lg font-semibold capitalize">{selected.action === "repay" ? "Record repayment" : selected.action + " loan"}</h2>
        <p className="mt-1 text-sm text-gray-600">{nameOf(selected.loan.member)} — requested {money(selected.loan.requestedAmount)}</p>
        <fieldset disabled={disabled} className="mt-4 grid gap-4 md:grid-cols-2">
          {(selected.action === "approve" || selected.action === "repay") && <label className="text-sm font-medium">
            {selected.action === "approve" ? "Approved amount" : "This repayment amount"}
            <input type="number" required min="0.01" step="0.01"
              max={selected.action === "approve" ? selected.loan.requestedAmount : selected.loan.outstandingAmount}
              value={actionAmount} onChange={(event) => setActionAmount(event.target.value)} className={field} />
          </label>}
          {selected.action === "approve" && <label className="text-sm font-medium">Optional repayment deadline — Bangladesh time
            <input type="datetime-local" step="60" value={due} onChange={(event) => setDue(event.target.value)} className={field} />
          </label>}
          {selected.action !== "disburse" && <label className="text-sm font-medium md:col-span-2">
            {selected.action === "repay" ? "Repayment note" : "Admin note"}
            <textarea rows={2} value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={field} />
          </label>}
          {(selected.action === "disburse" || selected.action === "repay") && <div className="space-y-3 md:col-span-2">
            <p className="text-sm text-amber-800">This records money already transferred; it does not send money.
              The current backend records the event time as now. Do not use this for historical loan imports.</p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>{selected.action === "disburse"
                ? `I confirm the full approved amount of ${money(selected.loan.approvedAmount)} was handed to this member.`
                : "I confirm this repayment was received. This is not the cumulative repayment total."}</span>
            </label>
          </div>}
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" className="rounded-lg bg-black px-5 py-3 text-white">{saving ? "Saving…" : "Confirm action"}</button>
            <button type="button" onClick={() => setSelected(null)} className={button}>Cancel</button>
          </div>
        </fieldset>
      </form>}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <h2 className="font-semibold">Loan register ({visible.length})</h2>
          <label className="text-sm">Status
            <select value={filter} onChange={(event) => setFilter(event.target.value as LoanStatus | "all")} className="ml-2 rounded border p-2">
              {["all", "pending", "approved", "rejected", "active", "repaid", "cancelled"].map((status) =>
                <option key={status} value={status}>{status}</option>
              )}
            </select>
          </label>
        </div>
        {!ready && <p className="p-4 text-amber-800">{loading ? "Loading current records…" : "Records may be stale. Refresh before taking action."}</p>}
        {ready && visible.length === 0 && <p className="p-6 text-gray-500">No loans match this status.</p>}
        <div className="divide-y">{visible.map((loan) => <article key={loan._id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{nameOf(loan.member)}</h3>
              <p className="text-xs text-gray-500">{loan.member?.memberCode} · Requested {dateOf(loan.createdAt)}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm capitalize">{loan.status}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm">{loan.reason}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {[["Requested", loan.requestedAmount], ["Approved", loan.approvedAmount], ["Disbursed", loan.disbursedAmount], ["Repaid", loan.repaidAmount], ["Outstanding", loan.outstandingAmount]].map(([label, value]) =>
              <div key={String(label)}><dt className="text-gray-500">{label}</dt><dd className="mt-1 font-medium">{money(Number(value))}</dd></div>
            )}
          </dl>
          <p className="mt-3 text-xs text-gray-500">Disbursed: {dateOf(loan.disbursedAt)} · Deadline: {dateOf(loan.repaymentDueDate)} · Times: Bangladesh</p>
          {loan.adminNote && <p className="mt-2 whitespace-pre-wrap text-sm">Admin note: {loan.adminNote}</p>}
          {admin && <div className="mt-4 flex flex-wrap gap-2">
            {loan.status === "pending" && <>
              <button type="button" disabled={disabled || Boolean(selected)} onClick={() => openAction(loan, "approve")} className={button}>Approve</button>
              <button type="button" disabled={disabled || Boolean(selected)} onClick={() => openAction(loan, "reject")} className={button}>Reject</button>
            </>}
            {loan.status === "approved" && <button type="button" disabled={disabled || Boolean(selected)} onClick={() => openAction(loan, "disburse")} className={button}>Record disbursement</button>}
            {loan.status === "active" && <button type="button" disabled={disabled || Boolean(selected)} onClick={() => openAction(loan, "repay")} className={button}>Record repayment</button>}
          </div>}
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium">Repayment history ({loan.repayments.length})</summary>
            {loan.repayments.length === 0 ? <p className="mt-2 text-gray-500">No repayments recorded.</p> :
              <ul className="mt-2 space-y-2">{loan.repayments.map((payment, index) =>
                <li key={payment._id || index} className="rounded-lg bg-gray-50 p-3">
                  {money(payment.amount)} · {dateOf(payment.paymentDate)}
                  {payment.note && <p className="mt-1 whitespace-pre-wrap text-gray-600">{payment.note}</p>}
                </li>
              )}</ul>}
          </details>
        </article>)}</div>
      </section>
    </div>
  );
}

