import { useState, useCallback, useRef } from "react";

// ─── Global type for Referral.js SDK ───────────────────
declare global {
  interface Window {
    RR?: (...args: unknown[]) => void;
  }
}

// ─── Interfaces ────────────────────────────────────────
interface Config {
  publicKey: string;
  privateKey: string;
  programId: string;
  baseUrl: string;
}

interface ReferrerMember {
  id: string;
  externalIdentifier: string;
  firstName: string;
  lastName: string;
  email: string;
  programId: string;
  referralCode: string;
  referralUrl: string;
  isActive: boolean;
  dateCreated: string;
  _raw?: Record<string, unknown>;
}

interface ReferredUser {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  externalId: string;
  referralCode: string;
}

interface WorkOrder {
  number: string;
  amount: number;
  paymentStatus: "pending" | "received";
}

interface Referral {
  id: string;
  status: "pending" | "qualified" | "approved";
  referralCode: string;
  referringMemberId: string;
  amount: number;
  dateCreated: string;
  _raw?: Record<string, unknown>;
}

interface RewardBalance {
  referrals: number;
  referralsPending: number;
  referralsQualified: number;
  referralsApproved: number;
  referralsApprovedAmount: number;
  rewardsPendingAmount: number;
  rewardsIssuedAmount: number;
  rewardAmountTotal: number;
  rewards: number;
  _raw?: Record<string, unknown>;
}

interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  statusCode: number;
  requestBody: unknown;
  responseBody: unknown;
}

// ─── Helpers ───────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

function genWO() {
  return "WO-" + String(Math.floor(1000 + Math.random() * 9000));
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ─── JSON Syntax Highlighter ───────────────────────────
function JsonBlock({ data, defaultOpen = false }: { data: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (data == null) return <span className="text-gray-400 text-xs">No data</span>;
  const json = JSON.stringify(data, null, 2);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-blue-600 hover:underline mb-1"
      >
        {open ? "Hide JSON" : "Show JSON"}
      </button>
      {open && (
        <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
          {json}
        </pre>
      )}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────
function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    qualified: "bg-blue-100 text-blue-800 border-blue-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    success: "bg-green-100 text-green-800 border-green-300",
    error: "bg-red-100 text-red-800 border-red-300",
    locked: "bg-gray-100 text-gray-500 border-gray-300",
    info: "bg-blue-100 text-blue-800 border-blue-300",
  };
  const c = colors[status.toLowerCase()] || colors.info;
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium border rounded-full ${c}`}>
      {status}
    </span>
  );
}

// ─── Step Card Wrapper ─────────────────────────────────
function StepCard({
  step,
  currentStep,
  title,
  children,
  status,
}: {
  step: number;
  currentStep: number;
  title: string;
  children: React.ReactNode;
  status?: "pending" | "success" | "error" | "locked";
}) {
  const locked = step > currentStep;
  const active = step === currentStep;
  const complete = step < currentStep;
  const borderColor = locked
    ? "border-l-gray-300"
    : status === "error"
    ? "border-l-red-500"
    : complete || status === "success"
    ? "border-l-green-500"
    : active
    ? "border-l-blue-500"
    : "border-l-gray-300";

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${borderColor} mb-4 ${
        locked ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Step {step} — {title}
          </h3>
          {status && <Badge status={status} />}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Inspector Section ─────────────────────────────────
function InspectorSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg mb-3 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <span>
          {icon} {title}
        </span>
        <span className="text-gray-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="px-3 pb-3 text-xs">{children}</div>}
    </div>
  );
}

// ─── Field Row ─────────────────────────────────────────
function Field({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  return (
    <div className="flex items-start py-1">
      <span className="text-gray-500 w-36 flex-shrink-0">{label}:</span>
      <span className="text-gray-800 font-mono break-all">{String(value ?? "—")}</span>
    </div>
  );
}

// ─── Referral Status Timeline ──────────────────────────
function StatusTimeline({ status }: { status: string | undefined }) {
  const stages = ["pending", "qualified", "approved"];
  const labels = ["Pending", "Qualified", "Approved"];
  const currentIdx = status ? stages.indexOf(status) : -1;
  return (
    <div className="flex items-center gap-1 mt-2">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full border-2 ${
              i <= currentIdx
                ? "bg-green-500 border-green-500"
                : "bg-white border-gray-300"
            }`}
          />
          <span className="text-[10px] text-gray-500 ml-1">{labels[i]}</span>
          {i < stages.length - 1 && (
            <div
              className={`w-6 h-0.5 mx-1 ${
                i < currentIdx ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Input (top-level to preserve focus) ───────────
function Input({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded ${
          readOnly ? "bg-gray-100 text-gray-500" : "bg-white"
        } focus:outline-none focus:ring-1 focus:ring-blue-500`}
      />
    </div>
  );
}

// ─── Banner (top-level) ────────────────────────────
function BannerMsg({ banner }: { banner?: { type: string; message: string } }) {
  if (!banner) return null;
  const colors =
    banner.type === "error"
      ? "bg-red-50 border-red-200 text-red-800"
      : banner.type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-blue-50 border-blue-200 text-blue-800";
  return (
    <div className={`mt-2 p-2 text-xs border rounded ${colors}`}>{banner.message}</div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  // ─── Config ────────────────────────────────────────
  const [config, setConfig] = useState<Config>({
    publicKey: import.meta.env.VITE_PUBLIC_KEY || "YOUR_PUBLIC_KEY",
    privateKey: import.meta.env.VITE_PRIVATE_KEY || "YOUR_PRIVATE_KEY",
    programId: import.meta.env.VITE_PROGRAM_ID || "YOUR_PROGRAM_ID",
    baseUrl: "",
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "untested" | "connected" | "error"
  >("untested");
  const [connectionError, setConnectionError] = useState("");

  // ─── Flow State ────────────────────────────────────
  const [step, setStep] = useState<number>(1);
  const [referrer, setReferrer] = useState<ReferrerMember | null>(null);
  const [referredUser, setReferredUser] = useState<ReferredUser | null>(null);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [apiLog, setApiLog] = useState<ApiLogEntry[]>([]);
  const [simulatedWebhook, setSimulatedWebhook] = useState<object | null>(null);

  // ─── Step statuses ─────────────────────────────────
  const [stepStatuses, setStepStatuses] = useState<
    Record<number, "pending" | "success" | "error" | "locked">
  >({ 1: "pending", 2: "locked", 3: "locked", 4: "locked" });

  // ─── Loading states ────────────────────────────────
  const [loading, setLoading] = useState<Record<number | string, boolean>>({});

  // ─── Step form defaults with UUID-based values ─────
  const [s1, setS1] = useState(() => {
    const id: string = uuid();
    return {
      firstName: "Deepak",
      lastName: "Mittal",
      email: `${id.slice(0, 8)}@divvynow.com`,
      companyName: "Divisions Inc",
      externalId: id,
    };
  });
  const [s2, setS2] = useState(() => {
    const id: string = uuid();
    return {
      firstName: "James",
      lastName: "Wu",
      email: `${id.slice(0, 8)}@divvynow.com`,
      companyName: "Wu Electrical Services",
      externalId: id,
      referralCode: "",
    };
  });
  const [s3, setS3] = useState({ number: genWO(), amount: 320.0 });

  // ─── Step response JSON ────────────────────────────
  const [stepResponses, setStepResponses] = useState<Record<number, unknown>>({});

  // ─── Banner messages ───────────────────────────────
  const [banners, setBanners] = useState<Record<number, { type: string; message: string }>>({});

  // ─── Reward Balances ──────────────────────────────
  const [referrerBalance, setReferrerBalance] = useState<RewardBalance | null>(null);
  const [referredBalance, setReferredBalance] = useState<RewardBalance | null>(null);

  const actionsRef = useRef<HTMLDivElement>(null);

  // ─── API Helper ────────────────────────────────────
  const apiCall = useCallback(
    async (
      method: string,
      endpoint: string,
      body?: unknown
    ): Promise<{ ok: boolean; status: number; data: unknown }> => {
      const url = `${config.baseUrl}${endpoint}`;
      const auth = btoa(`${config.publicKey}:${config.privateKey}`);
      const entry: ApiLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method,
        endpoint,
        statusCode: 0,
        requestBody: body ?? null,
        responseBody: null,
      };

      try {
        const resp = await fetch(url, {
          method,
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await resp.json().catch(() => null);
        entry.statusCode = resp.status;
        entry.responseBody = data;
        setApiLog((prev) => [entry, ...prev]);
        return { ok: resp.ok, status: resp.status, data };
      } catch (err) {
        entry.statusCode = 0;
        entry.responseBody = { error: String(err) };
        setApiLog((prev) => [entry, ...prev]);
        return { ok: false, status: 0, data: { error: String(err) } };
      }
    },
    [config]
  );

  // ─── SDK Log Helper ────────────────────────────────
  const logSdkCall = useCallback((call: string, args: unknown) => {
    const entry: ApiLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method: "[SDK]",
      endpoint: call,
      statusCode: 200,
      requestBody: args,
      responseBody: { note: "Client-side SDK call — no HTTP response" },
    };
    setApiLog((prev) => [entry, ...prev]);
  }, []);

  // ─── Update referral status helper ─────────────────
  const updateReferralStatus = async (
    referralId: string,
    newStatus: string,
    note: string,
    amount?: number
  ): Promise<{ ok: boolean; data: unknown }> => {
    const updatePayload: Record<string, unknown> = { status: newStatus, note };
    if (amount !== undefined) {
      updatePayload.amount = amount;
    }
    const payload = [
      {
        query: { primaryInfo: { referralId } },
        referral: updatePayload,
      },
    ];
    return await apiCall("POST", "/api/referral/update", payload);
  };

  // ─── Fetch member balance by email ──────────────────
  const fetchMemberBalance = async (
    email: string
  ): Promise<RewardBalance | null> => {
    const qs = `programId=${encodeURIComponent(config.programId)}&query=${encodeURIComponent(email)}`;
    const { ok, data } = await apiCall("GET", `/api/members?${qs}`);
    if (!ok || !data || typeof data !== "object") return null;
    const raw = data as Record<string, unknown>;
    // Response: { members: [ { ...memberFields } ] }
    const members = raw.members as Record<string, unknown>[] | undefined;
    if (!members || members.length === 0) return null;
    const m = members[0];
    return {
      referrals: Number(m.referrals ?? 0),
      referralsPending: Number(m.referralsPending ?? 0),
      referralsQualified: Number(m.referralsQualified ?? 0),
      referralsApproved: Number(m.referralsApproved ?? 0),
      referralsApprovedAmount: Number(m.referralsApprovedAmount ?? 0),
      rewardsPendingAmount: Number(m.rewardsPendingAmount ?? 0),
      rewardsIssuedAmount: Number(m.rewardsIssuedAmount ?? 0),
      rewardAmountTotal: Number(m.rewardAmountTotal ?? 0),
      rewards: Number(m.rewards ?? 0),
      _raw: m,
    };
  };

  // ─── Fetch referral details by member ID ────────────
  const fetchReferralDetails = async (
    memberId: string
  ): Promise<Record<string, unknown> | null> => {
    const qs = `programId=${encodeURIComponent(config.programId)}&memberId=${encodeURIComponent(memberId)}`;
    const { ok, data } = await apiCall("GET", `/api/referrals?${qs}`);
    if (!ok || !data || typeof data !== "object") return null;
    const raw = data as Record<string, unknown>;
    const referrals = raw.referrals as Record<string, unknown>[] | undefined;
    if (!referrals || referrals.length === 0) return null;
    return referrals[0];
  };

  const mapReferralToBalance = (r: Record<string, unknown>): RewardBalance => {
    const status = String(r.status ?? "").toLowerCase();
    return {
      referrals: 0,
      referralsPending: status === "pending" ? 1 : 0,
      referralsQualified: status === "qualified" ? 1 : 0,
      referralsApproved: status === "approved" ? 1 : 0,
      referralsApprovedAmount: Number(r.amount ?? 0),
      rewardsPendingAmount: 0,
      rewardsIssuedAmount: 0,
      rewardAmountTotal: 0,
      rewards: 0,
      _raw: r,
    };
  };

  const refreshBalances = async () => {
    setLoading((p) => ({ ...p, balances: true }));
    // Referrer is a member — fetch reward balance from members API
    if (referrer) {
      const rb = await fetchMemberBalance(referrer.email);
      if (rb) setReferrerBalance(rb);
    }
    // Referred person is a referral — fetch latest referral details
    if (referral && referrer) {
      const r = await fetchReferralDetails(referrer.id);
      if (r) setReferredBalance(mapReferralToBalance(r));
    }
    setLoading((p) => ({ ...p, balances: false }));
  };

  // ─── Test Connection ───────────────────────────────
  const testConnection = async () => {
    setLoading((p) => ({ ...p, conn: true }));
    const { ok, data } = await apiCall("GET", "/api/programs");
    if (ok) {
      setConnectionStatus("connected");
      setConnectionError("");
    } else {
      setConnectionStatus("error");
      setConnectionError(
        typeof data === "object" && data !== null && "message" in data
          ? String((data as Record<string, unknown>).message)
          : "Connection failed"
      );
    }
    setLoading((p) => ({ ...p, conn: false }));
  };

  // ─── Step 1: Create Referrer ───────────────────────
  const doStep1 = async () => {
    setLoading((p) => ({ ...p, 1: true }));
    setStepStatuses((p) => ({ ...p, 1: "pending" }));
    const payload = {
      programId: config.programId,
      firstName: s1.firstName,
      lastName: s1.lastName,
      email: s1.email,
      companyName: s1.companyName,
      externalIdentifier: s1.externalId,
    };
    const { ok, data } = await apiCall("POST", "/api/members", payload);

    if (ok && data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      // API response: { message, member: { id, referralCode, ... } }
      const m = (raw.member ?? raw) as Record<string, unknown>;
      const member: ReferrerMember = {
        id: String(m.id ?? ""),
        externalIdentifier: String(m.externalIdentifier ?? s1.externalId),
        firstName: String(m.firstName ?? s1.firstName),
        lastName: String(m.lastName ?? s1.lastName),
        email: String(m.email ?? s1.email),
        programId: String(m.programId ?? config.programId),
        referralCode: String(m.referralCode ?? ""),
        referralUrl: String(m.referralUrl ?? ""),
        isActive: m.isActive !== false,
        dateCreated: String(m.createDt ?? m.dateCreated ?? new Date().toISOString()),
        _raw: raw,
      };
      setReferrer(member);
      setStepResponses((p) => ({ ...p, 1: raw }));
      setStepStatuses((p) => ({ ...p, 1: "success", 2: "pending" }));
      setStep(2);

      // Pre-fill step 2 referral code
      setS2((p) => ({ ...p, referralCode: member.referralCode }));

      // Initialize Referral.js SDK
      if (window.RR) {
        window.RR("init", config.publicKey);
        logSdkCall("RR('init', publicKey)", { publicKey: config.publicKey });
        window.RR("setMember", { email: member.email });
        logSdkCall("RR('setMember', {...})", { email: member.email });
      }

      setBanners((p) => ({
        ...p,
        1: {
          type: "success",
          message: `Referrer enrolled! Code: ${member.referralCode}`,
        },
      }));

      // Fetch initial balance for referrer
      const bal = await fetchMemberBalance(member.email);
      if (bal) setReferrerBalance(bal);
    } else {
      setStepStatuses((p) => ({ ...p, 1: "error" }));
      setStepResponses((p) => ({ ...p, 1: data }));
      setBanners((p) => ({
        ...p,
        1: { type: "error", message: "Failed to create referrer. Check API response." },
      }));
    }
    setLoading((p) => ({ ...p, 1: false }));
  };

  // ─── Step 2: Signup → Create Referral (Pending) ────
  const doStep2 = async () => {
    setLoading((p) => ({ ...p, 2: true }));
    setStepStatuses((p) => ({ ...p, 2: "pending" }));

    const user: ReferredUser = {
      firstName: s2.firstName,
      lastName: s2.lastName,
      email: s2.email,
      companyName: s2.companyName,
      externalId: s2.externalId,
      referralCode: s2.referralCode,
    };
    setReferredUser(user);

    // POST /api/referrals → creates referral in Pending
    const payload = {
      referralCode: s2.referralCode,
      firstName: s2.firstName,
      lastName: s2.lastName,
      email: s2.email,
      externalIdentifier: s2.externalId,
      companyName: s2.companyName,
    };
    const { ok, data } = await apiCall("POST", "/api/referrals", payload);

    if (ok && data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      // API response: { message, referral: { id, status, ... } }
      const r = (raw.referral ?? raw) as Record<string, unknown>;
      const ref: Referral = {
        id: String(r.id ?? ""),
        status: "pending",
        referralCode: String(r.referralCode ?? r.memberReferralCode ?? s2.referralCode),
        referringMemberId: String(r.referringMemberId ?? referrer?.id ?? ""),
        amount: Number(r.amount ?? 0),
        dateCreated: String(r.createDate ?? new Date().toISOString()),
        _raw: raw,
      };
      setReferral(ref);
      setStepResponses((p) => ({ ...p, 2: raw }));
      setStepStatuses((p) => ({ ...p, 2: "success", 3: "pending" }));
      setStep(3);

      // SDK conversion call
      if (window.RR) {
        window.RR("conversion", { email: user.email, referralCode: user.referralCode });
        logSdkCall("RR('conversion', {...})", { email: user.email, referralCode: user.referralCode });
      }

      setBanners((p) => ({
        ...p,
        2: {
          type: "success",
          message: `Referral created in Pending state (ID: ${ref.id.slice(0, 8)}...).`,
        },
      }));

      // Refresh balances — referrer from members API, referred from referrals API
      const [rb, refb] = await Promise.all([
        referrer ? fetchMemberBalance(referrer.email) : Promise.resolve(null),
        referrer ? fetchReferralDetails(referrer.id) : Promise.resolve(null),
      ]);
      if (rb) setReferrerBalance(rb);
      if (refb) setReferredBalance(mapReferralToBalance(refb));
    } else {
      setStepStatuses((p) => ({ ...p, 2: "error" }));
      setStepResponses((p) => ({ ...p, 2: data }));
      setBanners((p) => ({
        ...p,
        2: { type: "error", message: "Failed to create referral. Check API response." },
      }));
    }
    setLoading((p) => ({ ...p, 2: false }));
  };

  // ─── Step 3: Work Order → Referral → Qualified ─────
  const doStep3 = async () => {
    if (!referral) return;
    setLoading((p) => ({ ...p, 3: true }));
    setStepStatuses((p) => ({ ...p, 3: "pending" }));

    const wo: WorkOrder = { number: s3.number, amount: s3.amount, paymentStatus: "pending" };
    setWorkOrder(wo);

    const note = `Work order ${s3.number} placed — $${s3.amount.toFixed(2)}.`;
    const { ok, data } = await updateReferralStatus(referral.id, "qualified", note, s3.amount);

    if (ok) {
      setReferral({ ...referral, status: "qualified", amount: s3.amount });
      setStepResponses((p) => ({ ...p, 3: data }));
      setStepStatuses((p) => ({ ...p, 3: "success", 4: "pending" }));
      setStep(4);
      setBanners((p) => ({
        ...p,
        3: {
          type: "success",
          message: `Work order ${s3.number} placed. Referral moved to Qualified.`,
        },
      }));

      // Refresh balances
      const [rb, refb] = await Promise.all([
        referrer ? fetchMemberBalance(referrer.email) : Promise.resolve(null),
        referrer ? fetchReferralDetails(referrer.id) : Promise.resolve(null),
      ]);
      if (rb) setReferrerBalance(rb);
      if (refb) setReferredBalance(mapReferralToBalance(refb));
    } else {
      setStepStatuses((p) => ({ ...p, 3: "error" }));
      setStepResponses((p) => ({ ...p, 3: data }));
      setBanners((p) => ({
        ...p,
        3: { type: "error", message: "Failed to update referral to qualified. Check API response." },
      }));
    }
    setLoading((p) => ({ ...p, 3: false }));
  };

  // ─── Step 4: Payment Received → Referral → Approved ─
  const doStep4 = async () => {
    if (!referral || !workOrder) return;
    setLoading((p) => ({ ...p, 4: true }));
    setStepStatuses((p) => ({ ...p, 4: "pending" }));

    const note = `Payment received for ${workOrder.number} ($${workOrder.amount.toFixed(2)}) — referral approved.`;
    const { ok, data } = await updateReferralStatus(referral.id, "approved", note);

    if (ok) {
      setWorkOrder({ ...workOrder, paymentStatus: "received" });
      setReferral({ ...referral, status: "approved" });
      setStepResponses((p) => ({ ...p, 4: data }));
      setStepStatuses((p) => ({ ...p, 4: "success" }));

      // Build simulated webhook payload
      const webhook = {
        eventType: "RewardApproved",
        transactionId: "txn_" + crypto.randomUUID(),
        memberId: referrer?.id,
        memberEmail: referrer?.email,
        memberExternalIdentifier: referrer?.externalIdentifier,
        referralId: referral.id,
        rewardAmount: 50.0,
        rewardType: "Custom",
        currency: "USD",
        programId: config.programId,
        dateApproved: new Date().toISOString(),
      };
      setSimulatedWebhook(webhook);

      setBanners((p) => ({
        ...p,
        4: {
          type: "success",
          message: `Payment received. Referral Approved — $50 credit will be issued to ${referrer?.firstName ?? "referrer"}.`,
        },
      }));

      // Refresh balances
      const [rb, refb] = await Promise.all([
        referrer ? fetchMemberBalance(referrer.email) : Promise.resolve(null),
        referrer ? fetchReferralDetails(referrer.id) : Promise.resolve(null),
      ]);
      if (rb) setReferrerBalance(rb);
      if (refb) setReferredBalance(mapReferralToBalance(refb));
    } else {
      setStepStatuses((p) => ({ ...p, 4: "error" }));
      setStepResponses((p) => ({ ...p, 4: data }));
      setBanners((p) => ({
        ...p,
        4: { type: "error", message: "Failed to approve referral. Check API response." },
      }));
    }
    setLoading((p) => ({ ...p, 4: false }));
  };

  // ─── Reset ─────────────────────────────────────────
  const resetDemo = () => {
    setStep(1);
    setReferrer(null);
    setReferredUser(null);
    setWorkOrder(null);
    setReferral(null);
    setApiLog([]);
    setSimulatedWebhook(null);
    setReferrerBalance(null);
    setReferredBalance(null);
    setStepStatuses({ 1: "pending", 2: "locked", 3: "locked", 4: "locked" });
    setStepResponses({});
    setBanners({});
    const id1 = uuid();
    const id2 = uuid();
    setS1({ firstName: "Deepak", lastName: "Mittal", email: `${id1.slice(0, 8)}@divvynow.com`, companyName: "Divisions Inc", externalId: id1 });
    setS2({ firstName: "James", lastName: "Wu", email: `${id2.slice(0, 8)}@divvynow.com`, companyName: "Wu Electrical Services", externalId: id2, referralCode: "" });
    setS3({ number: genWO(), amount: 320.0 });
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ───────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Divvy Now — Referral Rock POC
            </h1>
            <p className="text-xs text-gray-500">
              Full referral program flow: Pending → Qualified → Approved
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetDemo}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
            >
              Reset Demo
            </button>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
            >
              {settingsOpen ? "Hide Settings" : "Show Settings"}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Settings Panel ───────────────────────── */}
      {settingsOpen && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1600px] mx-auto px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PUBLIC_KEY</label>
                <input
                  type="text"
                  value={config.publicKey}
                  onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PRIVATE_KEY</label>
                <div className="relative">
                  <input
                    type={showPrivateKey ? "text" : "password"}
                    value={config.privateKey}
                    onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showPrivateKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PROGRAM_ID</label>
                <input
                  type="text"
                  value={config.programId}
                  onChange={(e) => setConfig({ ...config, programId: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  BASE_URL <span className="font-normal text-gray-400">(leave empty for Vite proxy)</span>
                </label>
                <input
                  type="text"
                  value={config.baseUrl}
                  placeholder="empty = proxied via Vite dev server"
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={testConnection}
                  disabled={!!loading.conn}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {loading.conn ? "Testing..." : "Save & Test Connection"}
                </button>
                {connectionStatus === "connected" && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-300 rounded-full">
                    Connected
                  </span>
                )}
                {connectionStatus === "error" && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 border border-red-300 rounded-full" title={connectionError}>
                    Error
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content ─────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ LEFT: Actions ═══ */}
          <div ref={actionsRef}>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              Actions
            </h2>

            {/* Step 1: Create Referrer */}
            <StepCard step={1} currentStep={step} title="Create Referrer (Enroll Member)" status={stepStatuses[1]}>
              <div className="grid grid-cols-2 gap-2">
                <Input label="First Name" value={s1.firstName} onChange={(v) => setS1({ ...s1, firstName: v })} />
                <Input label="Last Name" value={s1.lastName} onChange={(v) => setS1({ ...s1, lastName: v })} />
              </div>
              <Input label="Email" value={s1.email} onChange={(v) => setS1({ ...s1, email: v })} />
              <Input label="Company Name" value={s1.companyName} onChange={(v) => setS1({ ...s1, companyName: v })} />
              <Input label="External ID" value={s1.externalId} onChange={(v) => setS1({ ...s1, externalId: v })} />
              <button
                onClick={doStep1}
                disabled={!!loading[1]}
                className="mt-2 w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading[1] ? "Creating..." : "Create Referrer"}
              </button>
              <BannerMsg banner={banners[1]} />
              {referrer && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-block px-2 py-1 text-xs font-bold bg-green-100 text-green-800 border border-green-300 rounded">
                    Code: {referrer.referralCode}
                  </span>
                  {referrer.referralUrl && (
                    <button
                      onClick={() => copyToClipboard(referrer.referralUrl)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Copy referral URL
                    </button>
                  )}
                </div>
              )}
              <JsonBlock data={stepResponses[1]} />
            </StepCard>

            {/* Step 2: Signup → Create Referral (Pending) */}
            <StepCard step={2} currentStep={step} title="Referred Business Signs Up → Referral (Pending)" status={stepStatuses[2]}>
              <div className="grid grid-cols-2 gap-2">
                <Input label="First Name" value={s2.firstName} onChange={(v) => setS2({ ...s2, firstName: v })} />
                <Input label="Last Name" value={s2.lastName} onChange={(v) => setS2({ ...s2, lastName: v })} />
              </div>
              <Input label="Email" value={s2.email} onChange={(v) => setS2({ ...s2, email: v })} />
              <Input label="Company Name" value={s2.companyName} onChange={(v) => setS2({ ...s2, companyName: v })} />
              <Input label="External ID" value={s2.externalId} onChange={(v) => setS2({ ...s2, externalId: v })} />
              <Input label="Referral Code" value={s2.referralCode} onChange={(v) => setS2({ ...s2, referralCode: v })} />
              <button
                onClick={doStep2}
                disabled={!!loading[2]}
                className="mt-2 w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading[2] ? "Creating Referral..." : "Simulate Signup → Create Referral (Pending)"}
              </button>
              <BannerMsg banner={banners[2]} />
              <JsonBlock data={stepResponses[2]} />
            </StepCard>

            {/* Step 3: Work Order → Qualified */}
            <StepCard step={3} currentStep={step} title="Place Work Order → Referral (Qualified)" status={stepStatuses[3]}>
              <Input label="Work Order #" value={s3.number} onChange={(v) => setS3({ ...s3, number: v })} />
              <Input label="Order Amount ($)" value={s3.amount} onChange={(v) => setS3({ ...s3, amount: Number(v) || 0 })} type="number" />
              <button
                onClick={doStep3}
                disabled={!!loading[3]}
                className="mt-2 w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading[3] ? "Placing Order..." : "Place Work Order → Move to Qualified"}
              </button>
              <BannerMsg banner={banners[3]} />
              <JsonBlock data={stepResponses[3]} />
            </StepCard>

            {/* Step 4: Payment → Approved */}
            <StepCard step={4} currentStep={step} title="Payment Received → Referral (Approved)" status={stepStatuses[4]}>
              {workOrder && (
                <div className="space-y-1 mb-3">
                  <Field label="Work Order #" value={workOrder.number} />
                  <Field label="Amount" value={`$${workOrder.amount.toFixed(2)}`} />
                  <Field label="Referred Business" value={referredUser ? `${referredUser.firstName} ${referredUser.lastName} (${referredUser.companyName})` : "—"} />
                  <Field label="Referral ID" value={referral?.id} />
                </div>
              )}
              <button
                onClick={doStep4}
                disabled={!!loading[4]}
                className="mt-2 w-full px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading[4] ? "Processing..." : "Mark Payment Received → Approve Referral"}
              </button>
              <BannerMsg banner={banners[4]} />
              <JsonBlock data={stepResponses[4]} />
            </StepCard>
          </div>

          {/* ═══ RIGHT: Live Data Inspector ═══ */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              Live Data Inspector
            </h2>

            {/* Referrer */}
            <InspectorSection title="Referrer" icon="👤">
              {referrer ? (
                <>
                  <Field label="ID" value={referrer.id} />
                  <Field label="External ID" value={referrer.externalIdentifier} />
                  <Field label="Referral Code" value={referrer.referralCode} />
                  <Field label="Referral URL" value={referrer.referralUrl} />
                  <Field label="Email" value={referrer.email} />
                  <Field label="Program ID" value={referrer.programId} />
                  <Field label="Active" value={referrer.isActive} />
                  <JsonBlock data={referrer._raw} />
                </>
              ) : (
                <span className="text-gray-400">No referrer enrolled yet</span>
              )}
            </InspectorSection>

            {/* Referred Business */}
            <InspectorSection title="Referred Business" icon="🏢">
              {referredUser ? (
                <>
                  <Field label="Name" value={`${referredUser.firstName} ${referredUser.lastName}`} />
                  <Field label="Email" value={referredUser.email} />
                  <Field label="Company" value={referredUser.companyName} />
                  <Field label="External ID" value={referredUser.externalId} />
                  <Field label="Referral Code" value={referredUser.referralCode} />
                  <JsonBlock data={referredUser} />
                </>
              ) : (
                <span className="text-gray-400">No referred business yet</span>
              )}
            </InspectorSection>

            {/* Work Order */}
            <InspectorSection title="Work Order" icon="📋">
              {workOrder ? (
                <>
                  <Field label="Number" value={workOrder.number} />
                  <Field label="Amount" value={`$${workOrder.amount.toFixed(2)}`} />
                  <Field label="Payment Status" value={workOrder.paymentStatus} />
                  <Field label="Referral ID" value={referral?.id} />
                  <JsonBlock data={workOrder} />
                </>
              ) : (
                <span className="text-gray-400">No work order yet</span>
              )}
            </InspectorSection>

            {/* Referral */}
            <InspectorSection title="Referral" icon="🔗">
              {referral ? (
                <>
                  <Field label="ID" value={referral.id} />
                  <div className="flex items-center py-1">
                    <span className="text-gray-500 w-36 flex-shrink-0">Status:</span>
                    <Badge status={referral.status} />
                  </div>
                  <Field label="Referring Member ID" value={referral.referringMemberId} />
                  <Field label="Referral Code" value={referral.referralCode} />
                  <Field label="Amount" value={`$${referral.amount.toFixed(2)}`} />
                  <Field label="Date Created" value={referral.dateCreated} />
                  <StatusTimeline status={referral.status} />
                  <div className="mt-2">
                    <JsonBlock data={referral._raw} />
                  </div>
                </>
              ) : (
                <span className="text-gray-400">No referral yet</span>
              )}
            </InspectorSection>

            {/* Reward Balances */}
            <InspectorSection title="Reward Balances" icon="💰" defaultOpen={true}>
              <div className="flex justify-end mb-2">
                <button
                  onClick={refreshBalances}
                  disabled={!!loading.balances || (!referrer && !referredUser)}
                  className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-40"
                >
                  {loading.balances ? "Refreshing..." : "Refresh Balances"}
                </button>
              </div>
              {referrer ? (
                <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    👤 {referrer.firstName} {referrer.lastName} <span className="font-normal text-gray-400">(referrer)</span>
                  </div>
                  {referrerBalance ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-4">
                        <Field label="Referrals" value={referrerBalance.referrals} />
                        <Field label="Pending" value={referrerBalance.referralsPending} />
                        <Field label="Qualified" value={referrerBalance.referralsQualified} />
                        <Field label="Approved" value={referrerBalance.referralsApproved} />
                      </div>
                      <div className="mt-1 pt-1 border-t border-gray-200">
                        <Field label="Rewards Pending" value={`$${referrerBalance.rewardsPendingAmount.toFixed(2)}`} />
                        <Field label="Rewards Issued" value={`$${referrerBalance.rewardsIssuedAmount.toFixed(2)}`} />
                        <Field label="Reward Total" value={`$${referrerBalance.rewardAmountTotal.toFixed(2)}`} />
                      </div>
                      <JsonBlock data={referrerBalance._raw} />
                    </>
                  ) : (
                    <span className="text-gray-400">No balance data yet</span>
                  )}
                </div>
              ) : (
                <div className="mb-3 text-gray-400">Referrer not enrolled yet</div>
              )}
              {referredUser ? (
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    🏢 {referredUser.firstName} {referredUser.lastName} <span className="font-normal text-gray-400">(referred)</span>
                  </div>
                  {referredBalance ? (
                    <>
                      <div className="flex items-center py-1">
                        <span className="text-gray-500 w-36 flex-shrink-0">Status:</span>
                        <Badge status={
                          referredBalance.referralsApproved ? "approved" :
                          referredBalance.referralsQualified ? "qualified" : "pending"
                        } />
                      </div>
                      <Field label="Referral Amount" value={`$${referredBalance.referralsApprovedAmount.toFixed(2)}`} />
                      <div className="mt-1 pt-1 border-t border-gray-200 text-[10px] text-gray-400">
                        Referral Rock does not track rewards on the referral object.
                        Referred-party rewards are configured at the program level
                        and issued via webhook when the referral is approved.
                      </div>
                      <JsonBlock data={referredBalance._raw} />
                    </>
                  ) : (
                    <span className="text-gray-400">Referral not created yet</span>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">Referred business not signed up yet</div>
              )}
            </InspectorSection>

            {/* API Log */}
            <InspectorSection title="API Log" icon="📡" defaultOpen={true}>
              {apiLog.length === 0 ? (
                <span className="text-gray-400">No API calls yet</span>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {apiLog.map((entry) => (
                    <ApiLogRow key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </InspectorSection>

            {/* Simulated Webhook */}
            {simulatedWebhook && (
              <InspectorSection title="Simulated Webhook Payload" icon="🪝" defaultOpen={true}>
                <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2 text-xs text-amber-800">
                  This is what your <code className="font-mono">/webhooks/referralrock</code> endpoint
                  would receive. Your backend should credit $50 to this user.
                </div>
                <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded overflow-x-auto">
                  {JSON.stringify(simulatedWebhook, null, 2)}
                </pre>
              </InspectorSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── API Log Row ───────────────────────────────────────
function ApiLogRow({ entry }: { entry: ApiLogEntry }) {
  const [open, setOpen] = useState(false);
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const isSdk = entry.method === "[SDK]";
  const methodColor = isSdk
    ? "text-purple-600"
    : entry.method === "GET"
    ? "text-green-600"
    : "text-blue-600";
  const statusColor =
    entry.statusCode >= 200 && entry.statusCode < 300
      ? "text-green-600"
      : entry.statusCode === 0
      ? "text-gray-400"
      : "text-red-600";

  return (
    <div className="border border-gray-100 rounded text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-1.5 hover:bg-gray-50 text-left"
      >
        <span className="text-gray-400 w-16 flex-shrink-0">{time}</span>
        <span className={`font-bold w-10 flex-shrink-0 ${methodColor}`}>{entry.method}</span>
        <span className="text-gray-700 truncate flex-1 font-mono">{entry.endpoint}</span>
        {!isSdk && (
          <span className={`font-bold flex-shrink-0 ${statusColor}`}>{entry.statusCode || "ERR"}</span>
        )}
        <span className="text-gray-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="p-2 border-t border-gray-100 space-y-2">
          {entry.requestBody != null && (
            <div>
              <div className="text-gray-500 font-semibold mb-1">Request:</div>
              <pre className="bg-gray-900 text-blue-300 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(entry.requestBody, null, 2)}
              </pre>
            </div>
          )}
          <div>
            <div className="text-gray-500 font-semibold mb-1">Response:</div>
            <pre className="bg-gray-900 text-green-300 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(entry.responseBody, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
