import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Role = "admin" | "tenant";
type RoomStatus = "Available" | "Occupied" | "Maintenance";
type PaymentMethod = "Cash" | "GCash" | "E-cash";
type PaymentStatus = "Pending" | "Verified";
type ReportStatus = "Open" | "In Progress" | "Resolved";

type Room = {
  id: string;
  name: string;
  type: string;
  monthlyRate: number;
  capacity: number;
  status: RoomStatus;
};

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomId: string;
  startDate: string;
  monthlyRent: number;
  accountId?: string;
};

type Account = {
  id: string;
  role: Role;
  username: string;
  password: string;
  tenantId?: string;
};

type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  date: string;
  status: PaymentStatus;
};

type TenantReport = {
  id: string;
  tenantId: string;
  category: string;
  title: string;
  details: string;
  date: string;
  status: ReportStatus;
};

type ScheduleItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  details: string;
  visibleToTenants: boolean;
};

type PrintPayload = {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
  table?: { headers: string[]; rows: string[][] };
  footer?: string;
};

type PropertyProfile = {
  name: string;
  owner: string;
  address: string;
  manager: string;
  phone: string;
  notes: string;
};

type Ledger = {
  tenantId: string;
  billingMonths: number;
  verifiedPaid: number;
  pendingPaid: number;
  totalCharge: number;
  balance: number;
  nextDueDate: Date;
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const addDays = (date: Date, count: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return toLocalDateKey(next);
};

const monthsAgo = (count: number, day = 5) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(Math.min(day, 28));
  date.setMonth(date.getMonth() - count);
  return toInputDate(date);
};

const formatMoney = (amount: number) =>
  `PHP ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);

const getBillingMonths = (startDate: string, now: Date) => {
  const start = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || now < start) return 0;

  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() >= start.getDate()) months += 1;
  return Math.max(1, months);
};

const getNextDueDate = (startDate: string, now: Date) => {
  const start = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return now;

  const next = new Date(start);
  while (next <= now) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const statusStyles: Record<RoomStatus, string> = {
  Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Occupied: "border-sky-200 bg-sky-50 text-sky-700",
  Maintenance: "border-amber-200 bg-amber-50 text-amber-700",
};

const reportStyles: Record<ReportStatus, string> = {
  Open: "border-rose-200 bg-rose-50 text-rose-700",
  "In Progress": "border-amber-200 bg-amber-50 text-amber-700",
  Resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const initialRooms: Room[] = [
  { id: "room-101", name: "Room 101", type: "Solo", monthlyRate: 4500, capacity: 1, status: "Occupied" },
  { id: "room-102", name: "Room 102", type: "Double", monthlyRate: 3800, capacity: 2, status: "Occupied" },
  { id: "room-103", name: "Room 103", type: "Solo", monthlyRate: 4500, capacity: 1, status: "Available" },
  { id: "room-201", name: "Room 201", type: "Studio", monthlyRate: 6200, capacity: 1, status: "Available" },
  { id: "room-202", name: "Room 202", type: "Double", monthlyRate: 3800, capacity: 2, status: "Maintenance" },
  { id: "room-203", name: "Room 203", type: "Bedspace", monthlyRate: 2800, capacity: 4, status: "Available" },
];

const initialTenants: Tenant[] = [
  {
    id: "tenant-ana",
    name: "Ana Cruz",
    email: "ana.cruz@example.com",
    phone: "0917 111 2233",
    roomId: "room-101",
    startDate: monthsAgo(4, 10),
    monthlyRent: 4500,
    accountId: "acct-tenant-ana",
  },
  {
    id: "tenant-miguel",
    name: "Miguel Santos",
    email: "miguel.santos@example.com",
    phone: "0920 555 1188",
    roomId: "room-102",
    startDate: monthsAgo(2, 5),
    monthlyRent: 3800,
    accountId: "acct-tenant-miguel",
  },
];

const initialAccounts: Account[] = [
  { id: "acct-admin", role: "admin", username: "admin", password: "admin123" },
  { id: "acct-tenant-ana", role: "tenant", username: "ana", password: "tenant123", tenantId: "tenant-ana" },
  { id: "acct-tenant-miguel", role: "tenant", username: "miguel", password: "tenant123", tenantId: "tenant-miguel" },
];

const initialPayments: Payment[] = [
  {
    id: "pay-ana-1",
    tenantId: "tenant-ana",
    amount: 13500,
    method: "GCash",
    reference: "GC-AX9281",
    date: monthsAgo(1, 12),
    status: "Verified",
  },
  {
    id: "pay-ana-2",
    tenantId: "tenant-ana",
    amount: 4500,
    method: "Cash",
    reference: "OR-1204",
    date: toInputDate(new Date()),
    status: "Pending",
  },
  {
    id: "pay-miguel-1",
    tenantId: "tenant-miguel",
    amount: 3800,
    method: "E-cash",
    reference: "EC-4418",
    date: monthsAgo(1, 6),
    status: "Verified",
  },
];

const initialReports: TenantReport[] = [
  {
    id: "report-1",
    tenantId: "tenant-ana",
    category: "Maintenance",
    title: "Faucet leak in comfort room",
    details: "Water continues dripping after closing the faucet.",
    date: monthsAgo(0, 2),
    status: "In Progress",
  },
  {
    id: "report-2",
    tenantId: "tenant-miguel",
    category: "Concern",
    title: "Request to check hallway light",
    details: "The second floor hallway light flickers at night.",
    date: monthsAgo(0, 4),
    status: "Open",
  },
];

const initialSchedules: ScheduleItem[] = [
  {
    id: "sched-collection",
    title: "Monthly rent collection",
    date: toLocalDateKey(new Date()),
    time: "09:00",
    category: "Payment",
    details: "Cash payments are accepted at the office. GCash receipts can be submitted in the tenant portal.",
    visibleToTenants: true,
  },
  {
    id: "sched-cleaning",
    title: "Second floor cleaning",
    date: addDays(new Date(), 3),
    time: "08:30",
    category: "Maintenance",
    details: "Please keep the hallway clear before cleaning starts.",
    visibleToTenants: true,
  },
  {
    id: "sched-inspection",
    title: "Room inspection planning",
    date: addDays(new Date(), 7),
    time: "14:00",
    category: "Admin",
    details: "Internal admin preparation for room condition checks.",
    visibleToTenants: false,
  },
];

function App() {
  const [now, setNow] = useState(() => new Date());
  const [sessionAccountId, setSessionAccountId] = useState<string | null>(null);
  const [loginRole, setLoginRole] = useState<Role>("admin");
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [loginError, setLoginError] = useState("");

  const [propertyProfile, setPropertyProfile] = useState<PropertyProfile>({
    name: "Madaje's Boarding House",
    owner: "Roberto Madaje Jr.",
    address: "Riverside Street, Barangay Mabini",
    manager: "Mariel Daje",
    phone: "0918 234 8899",
    notes: "Quiet, clean, and close to school routes.",
  });

  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [reports, setReports] = useState<TenantReport[]>(initialReports);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(initialSchedules);

  const [activeAdminTab, setActiveAdminTab] = useState("Overview");
  const [activeTenantTab, setActiveTenantTab] = useState("Dashboard");
  const [printPayload, setPrintPayload] = useState<PrintPayload | null>(null);

  const [tenantForm, setTenantForm] = useState({
    name: "",
    email: "",
    phone: "",
    startDate: toInputDate(new Date()),
    roomId: "room-103",
    monthlyRent: "4500",
  });
  const [transferForm, setTransferForm] = useState({ tenantId: "tenant-ana", roomId: "room-103" });
  const [roomForm, setRoomForm] = useState({
    name: "Room 204",
    type: "Solo",
    monthlyRate: "4500",
    capacity: "1",
    status: "Available" as RoomStatus,
  });
  const [accountForm, setAccountForm] = useState({ tenantId: "", username: "", password: "tenant123" });
  const [accountEditForm, setAccountEditForm] = useState({
    accountId: "acct-tenant-ana",
    username: "ana",
    password: "tenant123",
  });
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    category: "Reminder",
    date: toLocalDateKey(new Date()),
    time: "09:00",
    details: "",
    visibleToTenants: true,
  });
  const [tenantPaymentForm, setTenantPaymentForm] = useState({
    amount: "",
    method: "GCash" as PaymentMethod,
    reference: "",
  });
  const [tenantReportForm, setTenantReportForm] = useState({
    category: "Maintenance",
    title: "",
    details: "",
  });
  const [tenantProfileForm, setTenantProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
  });

  const currentAccount = useMemo(
    () => accounts.find((account) => account.id === sessionAccountId) ?? null,
    [accounts, sessionAccountId],
  );
  const currentTenant = useMemo(
    () =>
      currentAccount?.role === "tenant"
        ? tenants.find((tenant) => tenant.id === currentAccount.tenantId) ?? null
        : null,
    [currentAccount, tenants],
  );

  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const tenantById = useMemo(() => new Map(tenants.map((tenant) => [tenant.id, tenant])), [tenants]);
  const roomOccupancy = useMemo(() => {
    const counts = new Map<string, number>();
    tenants.forEach((tenant) => counts.set(tenant.roomId, (counts.get(tenant.roomId) ?? 0) + 1));
    return counts;
  }, [tenants]);
  const availableRooms = useMemo(
    () => rooms.filter((room) => room.status !== "Maintenance" && (roomOccupancy.get(room.id) ?? 0) < room.capacity),
    [roomOccupancy, rooms],
  );
  const tenantVisibleSchedules = useMemo(
    () =>
      scheduleItems
        .filter((item) => item.visibleToTenants)
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [scheduleItems],
  );

  const ledgers = useMemo<Ledger[]>(
    () =>
      tenants.map((tenant) => {
        const tenantPayments = payments.filter((payment) => payment.tenantId === tenant.id);
        const verifiedPaid = tenantPayments
          .filter((payment) => payment.status === "Verified")
          .reduce((sum, payment) => sum + payment.amount, 0);
        const pendingPaid = tenantPayments
          .filter((payment) => payment.status === "Pending")
          .reduce((sum, payment) => sum + payment.amount, 0);
        const billingMonths = getBillingMonths(tenant.startDate, now);
        const totalCharge = billingMonths * tenant.monthlyRent;

        return {
          tenantId: tenant.id,
          billingMonths,
          verifiedPaid,
          pendingPaid,
          totalCharge,
          balance: Math.max(0, totalCharge - verifiedPaid),
          nextDueDate: getNextDueDate(tenant.startDate, now),
        };
      }),
    [now, payments, tenants],
  );

  const ledgerByTenantId = useMemo(() => new Map(ledgers.map((ledger) => [ledger.tenantId, ledger])), [ledgers]);

  const analytics = useMemo(() => {
    const verifiedPayments = payments.filter((payment) => payment.status === "Verified");
    const revenue = verifiedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pending = payments
      .filter((payment) => payment.status === "Pending")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const totalDue = ledgers.reduce((sum, ledger) => sum + ledger.balance, 0);
    const occupied = rooms.filter((room) => (roomOccupancy.get(room.id) ?? 0) > 0).length;
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const availableSpaces = rooms.reduce(
      (sum, room) =>
        room.status === "Maintenance" ? sum : sum + Math.max(0, room.capacity - (roomOccupancy.get(room.id) ?? 0)),
      0,
    );
    const maintenance = rooms.filter((room) => room.status === "Maintenance").length;
    const openReports = reports.filter((report) => report.status !== "Resolved").length;
    const revenueByMethod = (["Cash", "GCash", "E-cash"] as PaymentMethod[]).map((method) => ({
      method,
      amount: verifiedPayments
        .filter((payment) => payment.method === method)
        .reduce((sum, payment) => sum + payment.amount, 0),
    }));

    return { revenue, pending, totalDue, occupied, totalCapacity, availableSpaces, maintenance, openReports, revenueByMethod };
  }, [ledgers, payments, reports, roomOccupancy, rooms]);

  const currentTenantLedger = currentTenant ? ledgerByTenantId.get(currentTenant.id) : undefined;
  const tenantsWithoutAccount = tenants.filter(
    (tenant) => !accounts.some((account) => account.role === "tenant" && account.tenantId === tenant.id),
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentTenant && currentAccount) {
      setTenantProfileForm({
        name: currentTenant.name,
        email: currentTenant.email,
        phone: currentTenant.phone,
        username: currentAccount.username,
        password: currentAccount.password,
      });
    }
  }, [currentAccount?.id, currentTenant?.id]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const account = accounts.find(
      (item) =>
        item.role === loginRole &&
        item.username.toLowerCase() === loginUsername.trim().toLowerCase() &&
        item.password === loginPassword,
    );

    if (!account) {
      setLoginError("No matching account found. Try the demo credentials shown in the form.");
      return;
    }

    setLoginError("");
    setSessionAccountId(account.id);
    setActiveAdminTab("Overview");
    setActiveTenantTab("Dashboard");
  };

  const useDemoLogin = (role: Role) => {
    setLoginRole(role);
    if (role === "admin") {
      setLoginUsername("admin");
      setLoginPassword("admin123");
      return;
    }
    setLoginUsername("ana");
    setLoginPassword("tenant123");
  };

  const handleLogout = () => {
    setSessionAccountId(null);
    setLoginPassword("");
    setPrintPayload(null);
  };

  const printDocument = (payload: PrintPayload) => {
    setPrintPayload(payload);
    window.setTimeout(() => window.print(), 100);
  };

  const handleRegisterTenant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const room = roomById.get(tenantForm.roomId);
    const monthlyRent = Number(tenantForm.monthlyRent);

    if (!tenantForm.name.trim() || !tenantForm.email.trim() || !room) {
      window.alert("Complete tenant name, email, and room before registering.");
      return;
    }
    const currentOccupancy = roomOccupancy.get(room.id) ?? 0;
    if (room.status === "Maintenance" || currentOccupancy >= room.capacity) {
      window.alert("Choose a room that is not under maintenance and still has available capacity.");
      return;
    }

    const tenant: Tenant = {
      id: createId("tenant"),
      name: tenantForm.name.trim(),
      email: tenantForm.email.trim(),
      phone: tenantForm.phone.trim() || "Not provided",
      roomId: room.id,
      startDate: tenantForm.startDate || toInputDate(now),
      monthlyRent: Number.isFinite(monthlyRent) && monthlyRent > 0 ? monthlyRent : room.monthlyRate,
    };

    setTenants((current) => [tenant, ...current]);
    setRooms((current) => current.map((item) => (item.id === room.id ? { ...item, status: "Occupied" } : item)));
    const nextAvailableRoom = availableRooms.find((item) => item.id !== room.id) ??
      (currentOccupancy + 1 < room.capacity ? room : undefined);

    setTenantForm({
      name: "",
      email: "",
      phone: "",
      startDate: toInputDate(now),
      roomId: nextAvailableRoom?.id ?? "",
      monthlyRent: nextAvailableRoom ? String(nextAvailableRoom.monthlyRate) : "4500",
    });
  };

  const handleTransferTenant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tenant = tenantById.get(transferForm.tenantId);
    const targetRoom = roomById.get(transferForm.roomId);

    if (!tenant || !targetRoom) {
      window.alert("Select a tenant and a target room.");
      return;
    }
    if (targetRoom.id === tenant.roomId) {
      window.alert("Select a different room for the transfer.");
      return;
    }
    const targetOccupancy = tenants.filter((item) => item.roomId === targetRoom.id && item.id !== tenant.id).length;
    if (targetRoom.status === "Maintenance" || targetOccupancy >= targetRoom.capacity) {
      window.alert("Tenant can only be transferred to a room with available capacity.");
      return;
    }

    const previousRoomId = tenant.roomId;
    const previousRoomRemaining = tenants.filter((item) => item.roomId === previousRoomId && item.id !== tenant.id).length;
    setTenants((current) =>
      current.map((item) =>
        item.id === tenant.id ? { ...item, roomId: targetRoom.id, monthlyRent: targetRoom.monthlyRate } : item,
      ),
    );
    setRooms((current) =>
      current.map((room) => {
        if (room.id === previousRoomId) return { ...room, status: previousRoomRemaining > 0 ? "Occupied" : "Available" };
        if (room.id === targetRoom.id) return { ...room, status: "Occupied" };
        return room;
      }),
    );
    setTransferForm({ tenantId: tenant.id, roomId: availableRooms.find((roomItem) => roomItem.id !== targetRoom.id)?.id ?? "" });
  };

  const handleAddRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const monthlyRate = Number(roomForm.monthlyRate);
    const capacity = Math.max(1, Math.floor(Number(roomForm.capacity)));
    if (!roomForm.name.trim() || !Number.isFinite(monthlyRate) || monthlyRate <= 0 || !Number.isFinite(capacity)) {
      window.alert("Room name, monthly rate, and capacity are required.");
      return;
    }

    setRooms((current) => [
      ...current,
      {
        id: createId("room"),
        name: roomForm.name.trim(),
        type: roomForm.type.trim() || "Standard",
        monthlyRate,
        capacity,
        status: roomForm.status,
      },
    ]);
    setRoomForm({ name: "", type: "Solo", monthlyRate: "4500", capacity: "1", status: "Available" });
  };

  const updateRoomStatus = (roomId: string, status: RoomStatus) => {
    const hasTenant = tenants.some((tenant) => tenant.roomId === roomId);
    if (hasTenant && status !== "Occupied") {
      window.alert("Transfer the tenant first before making this room available or under maintenance.");
      return;
    }
    setRooms((current) => current.map((room) => (room.id === roomId ? { ...room, status } : room)));
  };

  const handleCreateTenantAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tenant = tenantById.get(accountForm.tenantId);
    const usernameTaken = accounts.some(
      (account) => account.username.toLowerCase() === accountForm.username.trim().toLowerCase(),
    );

    if (!tenant || !accountForm.username.trim() || !accountForm.password.trim()) {
      window.alert("Select a tenant, username, and password.");
      return;
    }
    if (usernameTaken) {
      window.alert("Username already exists. Choose another one.");
      return;
    }

    const accountId = createId("acct");
    setAccounts((current) => [
      ...current,
      { id: accountId, role: "tenant", username: accountForm.username.trim(), password: accountForm.password, tenantId: tenant.id },
    ]);
    setTenants((current) => current.map((item) => (item.id === tenant.id ? { ...item, accountId } : item)));
    setAccountForm({ tenantId: "", username: "", password: "tenant123" });
    setAccountEditForm({ accountId, username: accountForm.username.trim(), password: accountForm.password });
  };

  const handleUpdateTenantAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const account = accounts.find((item) => item.id === accountEditForm.accountId && item.role === "tenant");
    const username = accountEditForm.username.trim();

    if (!account || !username || !accountEditForm.password.trim()) {
      window.alert("Select a tenant account and complete the username and password.");
      return;
    }

    const usernameTaken = accounts.some(
      (item) => item.id !== account.id && item.username.toLowerCase() === username.toLowerCase(),
    );
    if (usernameTaken) {
      window.alert("Username already exists. Choose another one.");
      return;
    }

    setAccounts((current) =>
      current.map((item) =>
        item.id === account.id ? { ...item, username, password: accountEditForm.password.trim() } : item,
      ),
    );
    window.alert("Tenant account updated.");
  };

  const handleAddSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleForm.title.trim() || !scheduleForm.date || !scheduleForm.time) {
      window.alert("Schedule title, date, and time are required.");
      return;
    }

    setScheduleItems((current) =>
      [
        ...current,
        {
          id: createId("sched"),
          title: scheduleForm.title.trim(),
          date: scheduleForm.date,
          time: scheduleForm.time,
          category: scheduleForm.category.trim() || "Reminder",
          details: scheduleForm.details.trim() || "No additional details.",
          visibleToTenants: scheduleForm.visibleToTenants,
        },
      ].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    );
    setScheduleForm({
      title: "",
      category: "Reminder",
      date: toLocalDateKey(now),
      time: "09:00",
      details: "",
      visibleToTenants: true,
    });
  };

  const toggleScheduleVisibility = (scheduleId: string) => {
    setScheduleItems((current) =>
      current.map((item) =>
        item.id === scheduleId ? { ...item, visibleToTenants: !item.visibleToTenants } : item,
      ),
    );
  };

  const deleteSchedule = (scheduleId: string) => {
    setScheduleItems((current) => current.filter((item) => item.id !== scheduleId));
  };

  const verifyPayment = (paymentId: string) => {
    setPayments((current) =>
      current.map((payment) => (payment.id === paymentId ? { ...payment, status: "Verified" } : payment)),
    );
  };

  const printPayment = (payment: Payment) => {
    const tenant = tenantById.get(payment.tenantId);
    const room = tenant ? roomById.get(tenant.roomId) : undefined;
    const ledger = tenant ? ledgerByTenantId.get(tenant.id) : undefined;
    printDocument({
      title: "Payment Report",
      subtitle: propertyProfile.name,
      rows: [
        { label: "Owner", value: propertyProfile.owner },
        { label: "Tenant", value: tenant?.name ?? "Unknown tenant" },
        { label: "Room", value: room?.name ?? "Unassigned" },
        { label: "Payment date", value: formatDate(payment.date) },
        { label: "Method", value: payment.method },
        { label: "Reference", value: payment.reference || "No reference" },
        { label: "Amount", value: formatMoney(payment.amount) },
        { label: "Status", value: payment.status },
        { label: "Current balance", value: formatMoney(ledger?.balance ?? 0) },
      ],
      footer: `Printed ${formatDate(new Date())}`,
    });
  };

  const printTenantStatement = (tenant: Tenant) => {
    const room = roomById.get(tenant.roomId);
    const ledger = ledgerByTenantId.get(tenant.id);
    const tenantPayments = payments.filter((payment) => payment.tenantId === tenant.id);

    printDocument({
      title: "Tenant Statement",
      subtitle: propertyProfile.name,
      rows: [
        { label: "Owner", value: propertyProfile.owner },
        { label: "Tenant", value: tenant.name },
        { label: "Room", value: room?.name ?? "Unassigned" },
        { label: "Move-in date", value: formatDate(tenant.startDate) },
        { label: "Billing months", value: `${ledger?.billingMonths ?? 0}` },
        { label: "Monthly rent", value: formatMoney(tenant.monthlyRent) },
        { label: "Total charge", value: formatMoney(ledger?.totalCharge ?? 0) },
        { label: "Verified payments", value: formatMoney(ledger?.verifiedPaid ?? 0) },
        { label: "Balance", value: formatMoney(ledger?.balance ?? 0) },
      ],
      table: {
        headers: ["Date", "Method", "Reference", "Amount", "Status"],
        rows: tenantPayments.map((payment) => [
          formatDate(payment.date),
          payment.method,
          payment.reference || "-",
          formatMoney(payment.amount),
          payment.status,
        ]),
      },
      footer: `Printed ${formatDate(new Date())}`,
    });
  };

  const printCollections = () => {
    printDocument({
      title: "Collection Summary",
      subtitle: propertyProfile.name,
      rows: [
        { label: "Owner", value: propertyProfile.owner },
        { label: "Total verified revenue", value: formatMoney(analytics.revenue) },
        { label: "Pending payments", value: formatMoney(analytics.pending) },
        { label: "Total outstanding balance", value: formatMoney(analytics.totalDue) },
        { label: "Total tenants", value: `${tenants.length}` },
      ],
      table: {
        headers: ["Tenant", "Room", "Monthly", "Paid", "Balance"],
        rows: tenants.map((tenant) => {
          const room = roomById.get(tenant.roomId);
          const ledger = ledgerByTenantId.get(tenant.id);
          return [
            tenant.name,
            room?.name ?? "Unassigned",
            formatMoney(tenant.monthlyRent),
            formatMoney(ledger?.verifiedPaid ?? 0),
            formatMoney(ledger?.balance ?? 0),
          ];
        }),
      },
      footer: `Printed ${formatDate(new Date())}`,
    });
  };

  const handleTenantPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentTenant) return;
    const amount = Number(tenantPaymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Enter a valid payment amount.");
      return;
    }

    setPayments((current) => [
      {
        id: createId("pay"),
        tenantId: currentTenant.id,
        amount,
        method: tenantPaymentForm.method,
        reference: tenantPaymentForm.reference.trim() || "For admin verification",
        date: toInputDate(now),
        status: "Pending",
      },
      ...current,
    ]);
    setTenantPaymentForm({ amount: "", method: "GCash", reference: "" });
    setActiveTenantTab("Payment");
  };

  const handleTenantReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentTenant) return;
    if (!tenantReportForm.title.trim() || !tenantReportForm.details.trim()) {
      window.alert("Report title and details are required.");
      return;
    }

    setReports((current) => [
      {
        id: createId("report"),
        tenantId: currentTenant.id,
        category: tenantReportForm.category,
        title: tenantReportForm.title.trim(),
        details: tenantReportForm.details.trim(),
        date: toInputDate(now),
        status: "Open",
      },
      ...current,
    ]);
    setTenantReportForm({ category: "Maintenance", title: "", details: "" });
  };

  const updateReportStatus = (reportId: string, status: ReportStatus) => {
    setReports((current) => current.map((report) => (report.id === reportId ? { ...report, status } : report)));
  };

  const handleTenantProfileSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentTenant || !currentAccount) return;

    const duplicateUsername = accounts.some(
      (account) =>
        account.id !== currentAccount.id &&
        account.username.toLowerCase() === tenantProfileForm.username.trim().toLowerCase(),
    );
    if (duplicateUsername) {
      window.alert("Username is already used by another account.");
      return;
    }

    setTenants((current) =>
      current.map((tenant) =>
        tenant.id === currentTenant.id
          ? {
              ...tenant,
              name: tenantProfileForm.name.trim() || tenant.name,
              email: tenantProfileForm.email.trim() || tenant.email,
              phone: tenantProfileForm.phone.trim() || tenant.phone,
            }
          : tenant,
      ),
    );
    setAccounts((current) =>
      current.map((account) =>
        account.id === currentAccount.id
          ? {
              ...account,
              username: tenantProfileForm.username.trim() || account.username,
              password: tenantProfileForm.password || account.password,
            }
          : account,
      ),
    );
    window.alert("Profile updated.");
  };

  if (!currentAccount) {
    return (
      <>
        <PrintableReport payload={printPayload} profile={propertyProfile} />
        <main className="app-shell min-h-screen overflow-hidden bg-[#f7efe3] text-stone-950">
          <div className="relative min-h-screen">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(132,86,40,0.18),transparent_30%),linear-gradient(135deg,#fbf4e8_0%,#f7efe3_45%,#e7d1b3_100%)]" />
            <BoardingHouseScene />
            <div className="relative grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
              <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-16">
                <div className="animate-reveal flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full border border-stone-900/15 bg-white/55 text-sm font-black shadow-sm backdrop-blur">
                    MB
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-stone-600">Owner: {propertyProfile.owner}</p>
                    <p className="text-lg font-semibold text-stone-950">{propertyProfile.name}</p>
                  </div>
                </div>

                <div className="max-w-4xl py-16 lg:py-0">
                  <p className="animate-reveal text-sm font-semibold uppercase tracking-[0.4em] text-amber-800/80">
                    Live rental operations
                  </p>
                  <h1 className="animate-reveal mt-5 max-w-4xl text-6xl font-black leading-[0.9] tracking-[-0.08em] text-stone-950 sm:text-7xl lg:text-8xl">
                    Madaje's Boarding House
                  </h1>
                  <p className="animate-reveal mt-6 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
                    Owned by {propertyProfile.owner}. Manage tenants, rooms, due dates, payments, reports, and account access in one role-based portal.
                  </p>
                </div>

                <div className="animate-reveal flex flex-wrap items-center gap-5 text-sm text-stone-700">
                  <span>{formatDate(now)}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                  <span>Owner: {propertyProfile.owner}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                  <span>{propertyProfile.address}</span>
                </div>
              </section>

              <section className="flex items-center justify-center bg-white/55 px-6 py-10 backdrop-blur-xl lg:px-10">
                <form
                  onSubmit={handleLogin}
                  className="animate-float-slow w-full max-w-md rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-stone-900/10 sm:p-8"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Secure login</p>
                    <h2 className="text-3xl font-bold tracking-tight text-stone-950">Choose an account</h2>
                    <p className="text-sm leading-6 text-stone-600">
                      Owner: {propertyProfile.owner}. Admin accounts open the full management dashboard. Tenant accounts open personal dues,
                      payments, reports, and profile settings.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-stone-100 p-1">
                    {(["admin", "tenant"] as Role[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setLoginRole(role);
                          useDemoLogin(role);
                        }}
                        className={cx(
                          "rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
                          loginRole === role ? "bg-stone-950 text-white shadow-sm" : "text-stone-600 hover:text-stone-950",
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <label className="mt-6 block text-sm font-medium text-stone-700">
                    Username
                    <input
                      value={loginUsername}
                      onChange={(event) => setLoginUsername(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-700/10"
                      placeholder="Enter username"
                    />
                  </label>

                  <label className="mt-4 block text-sm font-medium text-stone-700">
                    Password
                    <input
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      type="password"
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-700/10"
                      placeholder="Enter password"
                    />
                  </label>

                  {loginError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{loginError}</p> : null}

                  <button className="mt-6 w-full rounded-2xl bg-stone-950 px-5 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-amber-800 focus:outline-none focus:ring-4 focus:ring-stone-950/15">
                    Open {loginRole === "admin" ? "Admin" : "Tenant"} Dashboard
                  </button>

                  <div className="mt-5 grid gap-3 rounded-3xl bg-stone-50 p-4 text-sm text-stone-600">
                    <button type="button" onClick={() => useDemoLogin("admin")} className="text-left hover:text-stone-950">
                      Admin demo: <span className="font-semibold text-stone-900">admin / admin123</span>
                    </button>
                    <button type="button" onClick={() => useDemoLogin("tenant")} className="text-left hover:text-stone-950">
                      Tenant demo: <span className="font-semibold text-stone-900">ana / tenant123</span>
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (currentAccount.role === "tenant" && !currentTenant) {
    return (
      <PortalShell
        profile={propertyProfile}
        roleLabel="Tenant Portal"
        actorName={currentAccount.username}
        tabs={["Dashboard"]}
        activeTab="Dashboard"
        onTabChange={() => undefined}
        onLogout={handleLogout}
      >
        <EmptyState title="Tenant profile is missing" text="Ask the administrator to connect this account to a tenant record." />
      </PortalShell>
    );
  }

  return (
    <>
      <PrintableReport payload={printPayload} profile={propertyProfile} />
      {currentAccount.role === "admin" ? (
        <PortalShell
          profile={propertyProfile}
          roleLabel="Admin Portal"
          actorName={currentAccount.username}
          tabs={["Overview", "Tenants", "Rooms", "Payments", "Calendar", "Reports", "Users", "Profile"]}
          activeTab={activeAdminTab}
          onTabChange={setActiveAdminTab}
          onLogout={handleLogout}
        >
          {activeAdminTab === "Overview" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Admin dashboard"
                title="Analytics, revenue, tenants, rooms, and reports"
                text={`Live as of ${formatDate(now)}. Balances are recalculated from each tenant move-in date and monthly rent.`}
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric label="Verified revenue" value={formatMoney(analytics.revenue)} detail={`${formatMoney(analytics.pending)} pending`} />
                <Metric label="Total tenants" value={`${tenants.length}`} detail={`${analytics.totalDue ? formatMoney(analytics.totalDue) : "No"} balance due`} />
                <Metric label="Room capacity" value={`${tenants.length}/${analytics.totalCapacity}`} detail={`${analytics.availableSpaces} open spaces, ${analytics.maintenance} maintenance`} />
                <Metric label="Active reports" value={`${analytics.openReports}`} detail={`${reports.length} total tenant reports`} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                <Panel title="Revenue by payment type" action={<button onClick={printCollections} className="text-sm font-semibold text-amber-800 hover:text-stone-950">Print summary</button>}>
                  <div className="space-y-5">
                    {analytics.revenueByMethod.map((item) => {
                      const max = Math.max(...analytics.revenueByMethod.map((method) => method.amount), 1);
                      return (
                        <div key={item.method}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-stone-800">{item.method}</span>
                            <span className="text-stone-500">{formatMoney(item.amount)}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-700 to-stone-950 transition-all duration-700"
                              style={{ width: `${(item.amount / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel title="Due watchlist">
                  <div className="space-y-3">
                    {[...tenants]
                      .sort((a, b) => (ledgerByTenantId.get(b.id)?.balance ?? 0) - (ledgerByTenantId.get(a.id)?.balance ?? 0))
                      .slice(0, 4)
                      .map((tenant) => {
                        const ledger = ledgerByTenantId.get(tenant.id);
                        const room = roomById.get(tenant.roomId);
                        return (
                          <button
                            key={tenant.id}
                            onClick={() => {
                              setActiveAdminTab("Tenants");
                              setTransferForm((current) => ({ ...current, tenantId: tenant.id }));
                            }}
                            className="w-full rounded-3xl border border-stone-200 bg-white/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-700/40 hover:shadow-lg hover:shadow-stone-900/5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-stone-950">{tenant.name}</p>
                                <p className="text-sm text-stone-500">{room?.name ?? "Unassigned"} since {formatDate(tenant.startDate)}</p>
                              </div>
                              <span className="font-semibold text-rose-700">{formatMoney(ledger?.balance ?? 0)}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {activeAdminTab === "Tenants" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Tenant management"
                title="Register tenants and transfer rooms"
                text="New tenants can be assigned to rooms with open capacity. Transfers update occupancy and room status automatically."
              />

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Panel title="Register new tenant">
                  <form onSubmit={handleRegisterTenant} className="grid gap-4">
                    <Field label="Full name">
                      <input value={tenantForm.name} onChange={(event) => setTenantForm((current) => ({ ...current, name: event.target.value }))} className="input" placeholder="Tenant name" />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Email">
                        <input value={tenantForm.email} onChange={(event) => setTenantForm((current) => ({ ...current, email: event.target.value }))} className="input" placeholder="tenant@email.com" />
                      </Field>
                      <Field label="Phone">
                        <input value={tenantForm.phone} onChange={(event) => setTenantForm((current) => ({ ...current, phone: event.target.value }))} className="input" placeholder="09xx xxx xxxx" />
                      </Field>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Move-in date">
                        <input type="date" value={tenantForm.startDate} onChange={(event) => setTenantForm((current) => ({ ...current, startDate: event.target.value }))} className="input" />
                      </Field>
                      <Field label="Room">
                        <select
                          value={tenantForm.roomId}
                          onChange={(event) => {
                            const room = roomById.get(event.target.value);
                            setTenantForm((current) => ({
                              ...current,
                              roomId: event.target.value,
                              monthlyRent: room ? String(room.monthlyRate) : current.monthlyRent,
                            }));
                          }}
                          className="input"
                        >
                          {availableRooms.length ? null : <option value="">No available room</option>}
                          {availableRooms.map((room) => (
                            <option key={room.id} value={room.id}>{room.name} - {room.capacity - (roomOccupancy.get(room.id) ?? 0)} space(s) - {formatMoney(room.monthlyRate)}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Monthly rent">
                        <input type="number" value={tenantForm.monthlyRent} onChange={(event) => setTenantForm((current) => ({ ...current, monthlyRent: event.target.value }))} className="input" />
                      </Field>
                    </div>
                    <button className="btn-primary">Register tenant</button>
                  </form>
                </Panel>

                <Panel title="Transfer tenant to another room">
                  <form onSubmit={handleTransferTenant} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <Field label="Tenant">
                      <select value={transferForm.tenantId} onChange={(event) => setTransferForm((current) => ({ ...current, tenantId: event.target.value }))} className="input">
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Available room">
                      <select value={transferForm.roomId} onChange={(event) => setTransferForm((current) => ({ ...current, roomId: event.target.value }))} className="input">
                        {availableRooms.length ? null : <option value="">No available room</option>}
                        {availableRooms.map((room) => (
                          <option key={room.id} value={room.id}>{room.name} - {room.type} - {room.capacity - (roomOccupancy.get(room.id) ?? 0)} space(s)</option>
                        ))}
                      </select>
                    </Field>
                    <button className="btn-secondary">Transfer</button>
                  </form>
                  <TenantTable tenants={tenants} roomById={roomById} ledgerByTenantId={ledgerByTenantId} onPrint={printTenantStatement} />
                </Panel>
              </div>
            </section>
          ) : null}

          {activeAdminTab === "Rooms" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Room inventory"
                title="Add rooms and maintain statuses"
                text="Track each room capacity, open spaces, and maintenance status. Occupied rooms with tenants must be transferred first."
              />
              <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
                <Panel title="Add room">
                  <form onSubmit={handleAddRoom} className="grid gap-4">
                    <Field label="Room name">
                      <input value={roomForm.name} onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))} className="input" />
                    </Field>
                    <Field label="Type">
                      <input value={roomForm.type} onChange={(event) => setRoomForm((current) => ({ ...current, type: event.target.value }))} className="input" />
                    </Field>
                    <Field label="Monthly rate">
                      <input type="number" value={roomForm.monthlyRate} onChange={(event) => setRoomForm((current) => ({ ...current, monthlyRate: event.target.value }))} className="input" />
                    </Field>
                    <Field label="Capacity">
                      <input type="number" min="1" value={roomForm.capacity} onChange={(event) => setRoomForm((current) => ({ ...current, capacity: event.target.value }))} className="input" />
                    </Field>
                    <Field label="Initial status">
                      <select value={roomForm.status} onChange={(event) => setRoomForm((current) => ({ ...current, status: event.target.value as RoomStatus }))} className="input">
                        <option>Available</option>
                        <option>Occupied</option>
                        <option>Maintenance</option>
                      </select>
                    </Field>
                    <button className="btn-primary">Add room</button>
                  </form>
                </Panel>

                <Panel title="Rooms">
                  <div className="grid gap-3">
                    {rooms.map((room) => {
                      const roomTenants = tenants.filter((item) => item.roomId === room.id);
                      const occupancy = roomOccupancy.get(room.id) ?? 0;
                      const openSpaces = Math.max(0, room.capacity - occupancy);
                      return (
                        <div key={room.id} className="grid gap-4 rounded-3xl border border-stone-200 bg-white/75 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-stone-950">{room.name}</p>
                              <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", statusStyles[room.status])}>{room.status}</span>
                            </div>
                            <p className="mt-1 text-sm text-stone-500">{room.type} room, {formatMoney(room.monthlyRate)} monthly</p>
                            <p className="mt-1 text-sm text-stone-500">Capacity: {occupancy}/{room.capacity} occupied, {openSpaces} open space(s)</p>
                            <p className="mt-1 text-sm text-stone-500">Tenant(s): {roomTenants.map((tenant) => tenant.name).join(", ") || "None"}</p>
                          </div>
                          <select value={room.status} onChange={(event) => updateRoomStatus(room.id, event.target.value as RoomStatus)} className="input md:w-44">
                            <option>Available</option>
                            <option>Occupied</option>
                            <option>Maintenance</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {activeAdminTab === "Payments" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Payments"
                title="Review tenant payments and print reports"
                text="Cash, GCash, and E-cash payments appear here. Pending submissions can be verified by the admin."
              />
              <div className="grid gap-4 md:grid-cols-3">
                <Metric label="Verified" value={formatMoney(analytics.revenue)} detail="Confirmed collection" />
                <Metric label="Pending" value={formatMoney(analytics.pending)} detail="Awaiting admin verification" />
                <Metric label="Outstanding" value={formatMoney(analytics.totalDue)} detail="Computed monthly balance" />
              </div>
              <Panel title="Payment ledger" action={<button onClick={printCollections} className="btn-compact">Print collection report</button>}>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.22em] text-stone-500">
                      <tr>
                        <th className="py-3 pr-4">Tenant</th>
                        <th className="py-3 pr-4">Date</th>
                        <th className="py-3 pr-4">Method</th>
                        <th className="py-3 pr-4">Reference</th>
                        <th className="py-3 pr-4">Amount</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {payments.map((payment) => {
                        const tenant = tenantById.get(payment.tenantId);
                        return (
                          <tr key={payment.id} className="align-top">
                            <td className="py-4 pr-4 font-medium text-stone-900">{tenant?.name ?? "Unknown"}</td>
                            <td className="py-4 pr-4 text-stone-600">{formatDate(payment.date)}</td>
                            <td className="py-4 pr-4 text-stone-600">{payment.method}</td>
                            <td className="py-4 pr-4 text-stone-600">{payment.reference || "-"}</td>
                            <td className="py-4 pr-4 font-semibold text-stone-950">{formatMoney(payment.amount)}</td>
                            <td className="py-4 pr-4">
                              <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", payment.status === "Verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{payment.status}</span>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex flex-wrap gap-2">
                                {payment.status === "Pending" ? <button onClick={() => verifyPayment(payment.id)} className="btn-compact">Verify</button> : null}
                                <button onClick={() => printPayment(payment)} className="btn-compact-light">Print</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </section>
          ) : null}

          {activeAdminTab === "Calendar" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Schedule calendar"
                title="Create schedules tenants can see"
                text="Add rent collection dates, cleaning, inspections, and announcements. Tenant-visible schedules appear in the tenant calendar."
              />
              <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <Panel title="Add schedule">
                  <form onSubmit={handleAddSchedule} className="grid gap-4">
                    <Field label="Title">
                      <input value={scheduleForm.title} onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))} className="input" placeholder="Schedule title" />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Category">
                        <input value={scheduleForm.category} onChange={(event) => setScheduleForm((current) => ({ ...current, category: event.target.value }))} className="input" placeholder="Payment, cleaning, inspection" />
                      </Field>
                      <Field label="Time">
                        <input type="time" value={scheduleForm.time} onChange={(event) => setScheduleForm((current) => ({ ...current, time: event.target.value }))} className="input" />
                      </Field>
                    </div>
                    <Field label="Date">
                      <input type="date" value={scheduleForm.date} onChange={(event) => setScheduleForm((current) => ({ ...current, date: event.target.value }))} className="input" />
                    </Field>
                    <Field label="Details">
                      <textarea value={scheduleForm.details} onChange={(event) => setScheduleForm((current) => ({ ...current, details: event.target.value }))} className="input min-h-28" placeholder="What tenants need to know" />
                    </Field>
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700">
                      <input type="checkbox" checked={scheduleForm.visibleToTenants} onChange={(event) => setScheduleForm((current) => ({ ...current, visibleToTenants: event.target.checked }))} className="h-4 w-4 accent-amber-800" />
                      Show this schedule to tenants
                    </label>
                    <button className="btn-primary">Add schedule</button>
                  </form>
                </Panel>

                <Panel title="Calendar view">
                  <ScheduleCalendar items={scheduleItems} now={now} />
                </Panel>
              </div>

              <Panel title="Schedule list">
                <div className="grid gap-3">
                  {scheduleItems.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-white/75 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-stone-950">{item.title}</p>
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">{item.category}</span>
                            <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", item.visibleToTenants ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-500")}>
                              {item.visibleToTenants ? "Tenant visible" : "Admin only"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-stone-500">{formatDate(item.date)} at {item.time}</p>
                          <p className="mt-2 text-sm leading-6 text-stone-600">{item.details}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => toggleScheduleVisibility(item.id)} className="btn-compact-light">
                            {item.visibleToTenants ? "Hide" : "Show"}
                          </button>
                          <button onClick={() => deleteSchedule(item.id)} className="btn-compact">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          ) : null}

          {activeAdminTab === "Reports" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Tenant reports"
                title="Monitor concerns and maintenance requests"
                text="Reports submitted by tenants can be moved from open to in progress or resolved."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {reports.map((report) => {
                  const tenant = tenantById.get(report.tenantId);
                  const room = tenant ? roomById.get(tenant.roomId) : undefined;
                  return (
                    <Panel key={report.id} title={report.title} action={<span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", reportStyles[report.status])}>{report.status}</span>}>
                      <div className="space-y-4">
                        <p className="text-sm leading-6 text-stone-600">{report.details}</p>
                        <div className="grid gap-2 text-sm text-stone-500">
                          <span>{report.category} from {tenant?.name ?? "Unknown tenant"}</span>
                          <span>{room?.name ?? "Unassigned"} on {formatDate(report.date)}</span>
                        </div>
                        <select value={report.status} onChange={(event) => updateReportStatus(report.id, event.target.value as ReportStatus)} className="input max-w-xs">
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeAdminTab === "Users" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="User accounts"
                title="Create tenant login accounts"
                text="Admin accounts manage the property. Tenant accounts are connected to tenant records."
              />
              <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                <div className="grid gap-6">
                  <Panel title="Add tenant account">
                    <form onSubmit={handleCreateTenantAccount} className="grid gap-4">
                      <Field label="Tenant without account">
                        <select value={accountForm.tenantId} onChange={(event) => setAccountForm((current) => ({ ...current, tenantId: event.target.value }))} className="input">
                          <option value="">Select tenant</option>
                          {tenantsWithoutAccount.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Username">
                        <input value={accountForm.username} onChange={(event) => setAccountForm((current) => ({ ...current, username: event.target.value }))} className="input" placeholder="tenant.username" />
                      </Field>
                      <Field label="Password">
                        <input value={accountForm.password} onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))} className="input" />
                      </Field>
                      <button className="btn-primary">Create account</button>
                    </form>
                  </Panel>

                  <Panel title="Edit tenant account">
                    <form onSubmit={handleUpdateTenantAccount} className="grid gap-4">
                      <Field label="Tenant account">
                        <select
                          value={accountEditForm.accountId}
                          onChange={(event) => {
                            const selected = accounts.find((account) => account.id === event.target.value);
                            setAccountEditForm({
                              accountId: event.target.value,
                              username: selected?.username ?? "",
                              password: selected?.password ?? "",
                            });
                          }}
                          className="input"
                        >
                          {accounts.filter((account) => account.role === "tenant").map((account) => {
                            const tenant = account.tenantId ? tenantById.get(account.tenantId) : undefined;
                            return <option key={account.id} value={account.id}>{tenant?.name ?? account.username}</option>;
                          })}
                        </select>
                      </Field>
                      <Field label="Username">
                        <input value={accountEditForm.username} onChange={(event) => setAccountEditForm((current) => ({ ...current, username: event.target.value }))} className="input" />
                      </Field>
                      <Field label="Password">
                        <input value={accountEditForm.password} onChange={(event) => setAccountEditForm((current) => ({ ...current, password: event.target.value }))} className="input" />
                      </Field>
                      <button className="btn-secondary">Save account changes</button>
                    </form>
                  </Panel>
                </div>

                <Panel title="Accounts">
                  <div className="grid gap-3">
                    {accounts.map((account) => {
                      const tenant = account.tenantId ? tenantById.get(account.tenantId) : undefined;
                      return (
                        <div key={account.id} className="rounded-3xl border border-stone-200 bg-white/75 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-950">{account.username}</p>
                              <p className="text-sm text-stone-500">{account.role === "admin" ? "Admin account" : `Tenant: ${tenant?.name ?? "Unlinked"}`}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold capitalize text-stone-600">{account.role}</span>
                              {account.role === "tenant" ? (
                                <button
                                  onClick={() => setAccountEditForm({ accountId: account.id, username: account.username, password: account.password })}
                                  className="btn-compact-light"
                                >
                                  Edit
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {activeAdminTab === "Profile" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Boarding house profile"
                title="Configure public property details"
                text="These details appear on printable reports and the login experience."
              />
              <Panel title="Property information">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Boarding house name">
                    <input value={propertyProfile.name} onChange={(event) => setPropertyProfile((current) => ({ ...current, name: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Owner">
                    <input value={propertyProfile.owner} onChange={(event) => setPropertyProfile((current) => ({ ...current, owner: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Manager">
                    <input value={propertyProfile.manager} onChange={(event) => setPropertyProfile((current) => ({ ...current, manager: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Phone">
                    <input value={propertyProfile.phone} onChange={(event) => setPropertyProfile((current) => ({ ...current, phone: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Address">
                    <input value={propertyProfile.address} onChange={(event) => setPropertyProfile((current) => ({ ...current, address: event.target.value }))} className="input" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Notes">
                      <textarea value={propertyProfile.notes} onChange={(event) => setPropertyProfile((current) => ({ ...current, notes: event.target.value }))} className="input min-h-28" />
                    </Field>
                  </div>
                </div>
              </Panel>
            </section>
          ) : null}
        </PortalShell>
      ) : (
        <PortalShell
          profile={propertyProfile}
          roleLabel="Tenant Portal"
          actorName={currentTenant?.name ?? currentAccount.username}
          tabs={["Dashboard", "Calendar", "Payment", "Reports", "Profile"]}
          activeTab={activeTenantTab}
          onTabChange={setActiveTenantTab}
          onLogout={handleLogout}
        >
          {currentTenant && currentTenantLedger && activeTenantTab === "Dashboard" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Tenant dashboard"
                title={`Welcome, ${currentTenant.name}`}
                text="Your monthly due, room, payments, and available transfer options update automatically from your move-in date."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric label="Current due" value={formatMoney(currentTenantLedger.balance)} detail={`${currentTenantLedger.billingMonths} billing month(s)`} />
                <Metric label="Monthly rent" value={formatMoney(currentTenant.monthlyRent)} detail={`Next due ${formatDate(currentTenantLedger.nextDueDate)}`} />
                <Metric label="Verified paid" value={formatMoney(currentTenantLedger.verifiedPaid)} detail={`${formatMoney(currentTenantLedger.pendingPaid)} pending`} />
                <Metric label="Rooms with space" value={`${availableRooms.length}`} detail={`${analytics.availableSpaces} total open space(s)`} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Panel title="Billing timeline">
                  <div className="space-y-4">
                    <div className="rounded-3xl bg-stone-950 p-5 text-white">
                      <p className="text-sm uppercase tracking-[0.25em] text-white/55">Dynamic date calculator</p>
                      <p className="mt-3 text-3xl font-black tracking-tight">{formatMoney(currentTenantLedger.totalCharge)}</p>
                      <p className="mt-2 text-sm leading-6 text-white/70">
                        Move-in date {formatDate(currentTenant.startDate)} x {currentTenantLedger.billingMonths} month(s) at {formatMoney(currentTenant.monthlyRent)}.
                      </p>
                    </div>
                    <button onClick={() => setActiveTenantTab("Payment")} className="btn-primary w-full">Send payment</button>
                  </div>
                </Panel>
                <Panel title="Available rooms">
                  <div className="grid gap-3">
                    {availableRooms.length ? (
                      availableRooms.map((room) => (
                        <div key={room.id} className="rounded-3xl border border-stone-200 bg-white/75 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-stone-950">{room.name}</p>
                              <p className="mt-1 text-sm text-stone-500">{room.type} room, {room.capacity - (roomOccupancy.get(room.id) ?? 0)} space(s) open</p>
                            </div>
                            <span className="font-semibold text-stone-950">{formatMoney(room.monthlyRate)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No rooms available" text="The admin will update availability when rooms open." />
                    )}
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {currentTenant && activeTenantTab === "Calendar" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Tenant calendar"
                title="Schedules from Madaje's Boarding House"
                text="See rent collection, maintenance, cleaning, and other schedules published by the admin."
              />
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel title="Calendar view">
                  <ScheduleCalendar items={tenantVisibleSchedules} now={now} />
                </Panel>
                <Panel title="Upcoming schedules">
                  <div className="grid gap-3">
                    {tenantVisibleSchedules.length ? (
                      tenantVisibleSchedules.map((item) => (
                        <div key={item.id} className="rounded-3xl border border-stone-200 bg-white/75 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-950">{item.title}</p>
                              <p className="mt-1 text-sm text-stone-500">{item.category} on {formatDate(item.date)} at {item.time}</p>
                              <p className="mt-2 text-sm leading-6 text-stone-600">{item.details}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No published schedules" text="The admin has not published any tenant schedules yet." />
                    )}
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {currentTenant && activeTenantTab === "Payment" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Tenant payment"
                title="Send cash or GCash payment notice"
                text="Submissions are marked pending until the admin verifies the payment."
              />
              <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                <Panel title="Submit payment">
                  <form onSubmit={handleTenantPayment} className="grid gap-4">
                    <Field label="Amount">
                      <input type="number" value={tenantPaymentForm.amount} onChange={(event) => setTenantPaymentForm((current) => ({ ...current, amount: event.target.value }))} className="input" placeholder="0.00" />
                    </Field>
                    <Field label="Method">
                      <select value={tenantPaymentForm.method} onChange={(event) => setTenantPaymentForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))} className="input">
                        <option>GCash</option>
                        <option>Cash</option>
                      </select>
                    </Field>
                    <Field label="Reference or note">
                      <input value={tenantPaymentForm.reference} onChange={(event) => setTenantPaymentForm((current) => ({ ...current, reference: event.target.value }))} className="input" placeholder="GCash reference or cash note" />
                    </Field>
                    <button className="btn-primary">Send payment for verification</button>
                  </form>
                </Panel>
                <Panel title="My payment history">
                  <div className="grid gap-3">
                    {payments
                      .filter((payment) => payment.tenantId === currentTenant.id)
                      .map((payment) => (
                        <div key={payment.id} className="rounded-3xl border border-stone-200 bg-white/75 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-950">{formatMoney(payment.amount)}</p>
                              <p className="text-sm text-stone-500">{payment.method} on {formatDate(payment.date)}</p>
                              <p className="text-sm text-stone-500">Reference: {payment.reference || "-"}</p>
                            </div>
                            <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", payment.status === "Verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{payment.status}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {currentTenant && activeTenantTab === "Reports" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Tenant reports"
                title="Send a concern or maintenance request"
                text="Your reports go to the admin dashboard for tracking and resolution."
              />
              <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <Panel title="New report">
                  <form onSubmit={handleTenantReport} className="grid gap-4">
                    <Field label="Category">
                      <select value={tenantReportForm.category} onChange={(event) => setTenantReportForm((current) => ({ ...current, category: event.target.value }))} className="input">
                        <option>Maintenance</option>
                        <option>Payment concern</option>
                        <option>Room request</option>
                        <option>General concern</option>
                      </select>
                    </Field>
                    <Field label="Title">
                      <input value={tenantReportForm.title} onChange={(event) => setTenantReportForm((current) => ({ ...current, title: event.target.value }))} className="input" placeholder="Short report title" />
                    </Field>
                    <Field label="Details">
                      <textarea value={tenantReportForm.details} onChange={(event) => setTenantReportForm((current) => ({ ...current, details: event.target.value }))} className="input min-h-32" placeholder="Describe the issue" />
                    </Field>
                    <button className="btn-primary">Send report</button>
                  </form>
                </Panel>
                <Panel title="My reports">
                  <div className="grid gap-3">
                    {reports
                      .filter((report) => report.tenantId === currentTenant.id)
                      .map((report) => (
                        <div key={report.id} className="rounded-3xl border border-stone-200 bg-white/75 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-950">{report.title}</p>
                              <p className="mt-1 text-sm leading-6 text-stone-600">{report.details}</p>
                              <p className="mt-2 text-sm text-stone-500">{report.category} on {formatDate(report.date)}</p>
                            </div>
                            <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", reportStyles[report.status])}>{report.status}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {currentTenant && activeTenantTab === "Profile" ? (
            <section className="space-y-6">
              <HeaderBlock
                eyebrow="Profile configuration"
                title="Update your tenant profile and login"
                text="Keep your contact details current so the boarding house can reach you about dues and reports."
              />
              <Panel title="My profile">
                <form onSubmit={handleTenantProfileSave} className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name">
                    <input value={tenantProfileForm.name} onChange={(event) => setTenantProfileForm((current) => ({ ...current, name: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Email">
                    <input value={tenantProfileForm.email} onChange={(event) => setTenantProfileForm((current) => ({ ...current, email: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Phone">
                    <input value={tenantProfileForm.phone} onChange={(event) => setTenantProfileForm((current) => ({ ...current, phone: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Username">
                    <input value={tenantProfileForm.username} onChange={(event) => setTenantProfileForm((current) => ({ ...current, username: event.target.value }))} className="input" />
                  </Field>
                  <Field label="Password">
                    <input value={tenantProfileForm.password} onChange={(event) => setTenantProfileForm((current) => ({ ...current, password: event.target.value }))} className="input" />
                  </Field>
                  <div className="flex items-end">
                    <button className="btn-primary w-full">Save profile</button>
                  </div>
                </form>
              </Panel>
            </section>
          ) : null}
        </PortalShell>
      )}
    </>
  );
}

function PortalShell({
  profile,
  roleLabel,
  actorName,
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  children,
}: {
  profile: PropertyProfile;
  roleLabel: string;
  actorName: string;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <main className="app-shell min-h-screen bg-[#f6f1e9] text-stone-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-stone-200/80 bg-white/55 p-5 backdrop-blur-xl lg:block">
          <div className="flex h-full flex-col">
            <div className="rounded-[2rem] bg-stone-950 p-5 text-white shadow-xl shadow-stone-900/10">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{roleLabel}</p>
              <h1 className="mt-3 text-2xl font-black leading-none tracking-tight">{profile.name}</h1>
              <p className="mt-3 text-sm font-semibold text-amber-100">Owner: {profile.owner}</p>
              <p className="mt-3 text-sm leading-6 text-white/65">{profile.address}</p>
            </div>

            <nav className="mt-6 grid gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={cx(
                    "rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                    activeTab === tab ? "bg-amber-800 text-white shadow-lg shadow-amber-900/10" : "text-stone-600 hover:bg-white hover:text-stone-950",
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-3xl border border-stone-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Owner</p>
              <p className="mt-2 font-semibold text-stone-950">{profile.owner}</p>
              <div className="my-4 h-px bg-stone-200" />
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Signed in as</p>
              <p className="mt-2 font-semibold text-stone-950">{actorName}</p>
              <button onClick={onLogout} className="mt-4 w-full rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950">
                Log out
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-5 rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-sm shadow-stone-900/5 backdrop-blur lg:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">{roleLabel}</p>
                <p className="font-black text-stone-950">{profile.name}</p>
                <p className="text-sm font-semibold text-amber-800">Owner: {profile.owner}</p>
              </div>
              <button onClick={onLogout} className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">Log out</button>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={cx(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                    activeTab === tab ? "bg-amber-800 text-white" : "bg-stone-100 text-stone-600",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="animate-page-in">{children}</div>
        </section>
      </div>
    </main>
  );
}

function HeaderBlock({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-4xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-800">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-stone-950 md:text-5xl">{title}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">{text}</p>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="animate-rise rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-sm shadow-stone-900/5 backdrop-blur">
      <p className="text-sm font-semibold text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-stone-950">{value}</p>
      <p className="mt-2 text-sm text-stone-500">{detail}</p>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-sm shadow-stone-900/5 backdrop-blur md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-stone-950">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white/45 p-6 text-center">
      <p className="font-semibold text-stone-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{text}</p>
    </div>
  );
}

function ScheduleCalendar({ items, now }: { items: ScheduleItem[]; now: Date }) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const blanks = monthStart.getDay();
  const cells: Array<Date | null> = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1)),
  ];
  const itemsByDate = items.reduce((map, item) => {
    const dayItems = map.get(item.date) ?? [];
    dayItems.push(item);
    map.set(item.date, dayItems.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, new Map<string, ScheduleItem[]>());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xl font-black tracking-tight text-stone-950">
          {new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(monthStart)}
        </p>
        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-500">
          {items.length} schedule(s)
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, index) => {
          const key = cell ? toLocalDateKey(cell) : `blank-${index}`;
          const daySchedules = cell ? itemsByDate.get(key) ?? [] : [];
          const isToday = cell ? toLocalDateKey(cell) === toLocalDateKey(now) : false;

          return (
            <div
              key={key}
              className={cx(
                "min-h-24 rounded-2xl border p-2 text-left",
                cell ? "border-stone-200 bg-white/70" : "border-transparent bg-transparent",
                isToday && "border-amber-700 bg-amber-50",
              )}
            >
              {cell ? <p className="text-sm font-bold text-stone-950">{cell.getDate()}</p> : null}
              <div className="mt-2 space-y-1">
                {daySchedules.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-xl bg-stone-950 px-2 py-1 text-[11px] font-semibold leading-4 text-white">
                    {item.time} {item.title}
                  </div>
                ))}
                {daySchedules.length > 2 ? <p className="text-[11px] font-semibold text-stone-500">+{daySchedules.length - 2} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TenantTable({
  tenants,
  roomById,
  ledgerByTenantId,
  onPrint,
}: {
  tenants: Tenant[];
  roomById: Map<string, Room>;
  ledgerByTenantId: Map<string, Ledger>;
  onPrint: (tenant: Tenant) => void;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.22em] text-stone-500">
          <tr>
            <th className="py-3 pr-4">Tenant</th>
            <th className="py-3 pr-4">Room</th>
            <th className="py-3 pr-4">Move-in</th>
            <th className="py-3 pr-4">Monthly</th>
            <th className="py-3 pr-4">Due</th>
            <th className="py-3 pr-4">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {tenants.map((tenant) => {
            const ledger = ledgerByTenantId.get(tenant.id);
            const room = roomById.get(tenant.roomId);
            return (
              <tr key={tenant.id}>
                <td className="py-4 pr-4">
                  <p className="font-semibold text-stone-950">{tenant.name}</p>
                  <p className="text-sm text-stone-500">{tenant.email}</p>
                </td>
                <td className="py-4 pr-4 text-stone-600">{room?.name ?? "Unassigned"}</td>
                <td className="py-4 pr-4 text-stone-600">{formatDate(tenant.startDate)}</td>
                <td className="py-4 pr-4 text-stone-600">{formatMoney(tenant.monthlyRent)}</td>
                <td className="py-4 pr-4 font-semibold text-rose-700">{formatMoney(ledger?.balance ?? 0)}</td>
                <td className="py-4 pr-4">
                  <button onClick={() => onPrint(tenant)} className="btn-compact-light">Print</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PrintableReport({ payload, profile }: { payload: PrintPayload | null; profile: PropertyProfile }) {
  if (!payload) return null;

  return (
    <section className="print-area hidden p-10 text-stone-950">
      <div className="border-b border-stone-300 pb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{profile.name}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{payload.title}</h1>
        {payload.subtitle ? <p className="mt-2 text-stone-600">{payload.subtitle}</p> : null}
        <p className="mt-2 text-sm font-semibold text-stone-700">Owner: {profile.owner}</p>
        <p className="mt-2 text-sm text-stone-500">{profile.address} | {profile.phone}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        {payload.rows.map((row) => (
          <div key={row.label} className="border-b border-stone-200 pb-3">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{row.label}</p>
            <p className="mt-1 font-semibold">{row.value}</p>
          </div>
        ))}
      </div>

      {payload.table ? (
        <table className="mt-8 w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              {payload.table.headers.map((header) => (
                <th key={header} className="border border-stone-300 bg-stone-100 p-2">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="border border-stone-300 p-2">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div className="mt-10 flex items-end justify-between text-sm text-stone-600">
        <p>{payload.footer}</p>
        <div className="text-center">
          <div className="mb-2 h-px w-56 bg-stone-400" />
          <p>{profile.owner}</p>
          <p>Owner / Authorized signature</p>
        </div>
      </div>
    </section>
  );
}

function BoardingHouseScene() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[56vh] opacity-80">
      <svg className="h-full w-full" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Boarding house illustration">
        <defs>
          <linearGradient id="houseGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#8a5a2b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#292524" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path d="M0 400 C180 340 240 405 410 350 C570 300 710 355 850 318 C1010 276 1090 312 1200 250 L1200 520 L0 520 Z" fill="#d7b98d" opacity="0.45" />
        <g className="animate-house-drift" fill="url(#houseGradient)" stroke="#3f2f22" strokeOpacity="0.28" strokeWidth="3">
          <path d="M715 170 L960 250 L960 505 L555 505 L555 245 Z" />
          <path d="M525 250 L718 150 L990 242 L964 264 L718 190 L552 272 Z" fill="#6b4423" fillOpacity="0.35" />
          <path d="M610 305 H690 V385 H610 Z M755 305 H835 V385 H755 Z M610 420 H690 V500 H610 Z M755 420 H835 V500 H755 Z" fill="#fff7ed" fillOpacity="0.55" />
          <path d="M875 330 H930 V505 H875 Z" fill="#3f2f22" fillOpacity="0.2" />
          <path d="M280 275 H555 V505 H280 Z" />
          <path d="M260 276 L410 186 L575 276 Z" fill="#6b4423" fillOpacity="0.35" />
          <path d="M335 325 H390 V382 H335 Z M445 325 H500 V382 H445 Z M335 420 H390 V505 H335 Z M445 420 H500 V505 H445 Z" fill="#fff7ed" fillOpacity="0.55" />
        </g>
      </svg>
    </div>
  );
}

export default App;