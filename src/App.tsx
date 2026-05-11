import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import axios from "axios";

axios.defaults.baseURL =
  process.env.NODE_ENV === "production"
    ? "https://your-render-url.onrender.com"
    : "http://localhost:5000";

/* ================= TYPES ================= */

type Role = "admin" | "tenant";
type RoomStatus = "Available" | "Occupied" | "Maintenance";
type PaymentStatus = "Pending" | "Verified";

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
  method: string;
  reference: string;
  date: string;
  status: PaymentStatus;
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
  balance: number;
};

/* ================= HELPERS ================= */

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const formatMoney = (amount: number) =>
  `PHP ${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

/* ================= APP ================= */

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [sessionAccountId, setSessionAccountId] = useState<string | null>(null);

  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [loginError, setLoginError] = useState("");

  const [propertyProfile] = useState<PropertyProfile>({
    name: "Madaje's Boarding House",
    owner: "Roberto Madaje Jr.",
    address: "San Pedro Street",
    manager: "Roberto Madaje Jr.",
    phone: "0918 234 8899",
    notes: "",
  });

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [r, t, a, p] = await Promise.all([
        axios.get("/api/rooms"),
        axios.get("/api/tenants"),
        axios.get("/api/accounts"),
        axios.get("/api/payments"),
      ]);

      setRooms(r.data);
      setTenants(t.data);
      setAccounts(a.data);
      setPayments(p.data);
    } catch (err) {
      console.error("Load error:", err);
    }
  }

  /* ================= LOGIN ================= */

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const acc = accounts.find(
      (a) =>
        a.username === loginUsername &&
        a.password === loginPassword
    );

    if (!acc) {
      setLoginError("Invalid credentials");
      return;
    }

    setSessionAccountId(acc.id);
  };

  const currentAccount = accounts.find(
    (a) => a.id === sessionAccountId
  );

  /* ================= REGISTER TENANT ================= */

  const handleRegisterTenant = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const newTenant: Tenant = {
      id: createId("tenant"),
      name: form.get("name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      roomId: form.get("roomId") as string,
      startDate: form.get("startDate") as string,
      monthlyRent: Number(form.get("monthlyRent")),
    };

    await axios.post("/api/tenants", newTenant);
    await loadData();
    e.currentTarget.reset();
  };

  /* ================= ADD ROOM ================= */

  const handleAddRoom = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const newRoom: Room = {
      id: createId("room"),
      name: form.get("name") as string,
      type: form.get("type") as string,
      monthlyRate: Number(form.get("monthlyRate")),
      capacity: Number(form.get("capacity")),
      status: "Available",
    };

    await axios.post("/api/rooms", newRoom);
    await loadData();
    e.currentTarget.reset();
  };

  /* ================= VERIFY PAYMENT ================= */

  const verifyPayment = async (id: string) => {
    await axios.patch(`/api/payments/${id}`, {
      status: "Verified",
    });
    loadData();
  };

  /* ================= LEDGER ================= */

  const ledgers = useMemo<Ledger[]>(() => {
    return tenants.map((t) => {
      const tenantPayments = payments.filter(
        (p) => p.tenantId === t.id && p.status === "Verified"
      );

      const paid = tenantPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );

      return {
        tenantId: t.id,
        balance: Math.max(0, t.monthlyRent - paid),
      };
    });
  }, [tenants, payments]);

  /* ================= LOGIN PAGE ================= */

  if (!sessionAccountId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7efe3]">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
        >
          <h2 className="text-2xl font-bold mb-6">
            Login
          </h2>

          <input
            className="w-full mb-4 p-3 border rounded-xl"
            placeholder="Username"
            value={loginUsername}
            onChange={(e) =>
              setLoginUsername(e.target.value)
            }
          />

          <input
            type="password"
            className="w-full mb-6 p-3 border rounded-xl"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) =>
              setLoginPassword(e.target.value)
            }
          />

          {loginError && (
            <p className="text-red-500 mb-4">
              {loginError}
            </p>
          )}

          <button className="w-full bg-stone-900 text-white p-4 rounded-xl font-bold">
            Login
          </button>
        </form>
      </div>
    );
  }

  /* ================= ADMIN VIEW ================= */

  return (
    <div className="min-h-screen bg-[#f6f1e9] p-8">
      <h1 className="text-3xl font-black mb-8">
        {propertyProfile.name}
      </h1>

      <button
        onClick={() => setSessionAccountId(null)}
        className="mb-8 bg-red-600 text-white px-4 py-2 rounded-xl"
      >
        Logout
      </button>

      {/* Rooms */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">
          Add Room
        </h2>

        <form
          onSubmit={handleAddRoom}
          className="grid grid-cols-4 gap-4"
        >
          <input name="name" placeholder="Name" className="p-2 border" required />
          <input name="type" placeholder="Type" className="p-2 border" required />
          <input name="monthlyRate" type="number" placeholder="Rate" className="p-2 border" required />
          <input name="capacity" type="number" placeholder="Capacity" className="p-2 border" required />
          <button className="col-span-4 bg-amber-800 text-white p-3 rounded">
            Save Room
          </button>
        </form>
      </div>

      {/* Tenants */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">
          Register Tenant
        </h2>

        <form
          onSubmit={handleRegisterTenant}
          className="grid grid-cols-3 gap-4"
        >
          <input name="name" placeholder="Name" className="p-2 border" required />
          <input name="email" placeholder="Email" className="p-2 border" required />
          <input name="phone" placeholder="Phone" className="p-2 border" />

          <select name="roomId" className="p-2 border">
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <input name="startDate" type="date" defaultValue={toInputDate(new Date())} className="p-2 border" />
          <input name="monthlyRent" type="number" placeholder="Rent" className="p-2 border" required />

          <button className="col-span-3 bg-green-600 text-white p-3 rounded">
            Save Tenant
          </button>
        </form>
      </div>

      {/* Payments */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          Payments
        </h2>

        {payments.map((p) => (
          <div key={p.id} className="flex justify-between border p-3 mb-2">
            <span>{formatMoney(p.amount)}</span>
            <span>{p.status}</span>
            {p.status === "Pending" && (
              <button
                onClick={() => verifyPayment(p.id)}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Verify
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
