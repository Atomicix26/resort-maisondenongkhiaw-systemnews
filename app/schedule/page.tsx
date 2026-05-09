"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble, CalendarCheck2, CalendarDays,
  BarChart3, List, ChevronDown, LogOut,
  User, ArrowUpDown, Plus, Check, X, MoreHorizontal,
} from "lucide-react";

// ---- Types ----
type BookingStatus = "ສຳເລັດ" | "ລໍຖ້າ" | "ຍົກເລີກ";

interface BookingRow {
  id: string;
  room: string;
  confirmCode: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: BookingStatus;
}

// ---- Nav ----
const navItems = [
  { icon: BedDouble,      label: "ຈັດການຂໍ້ມູນຫ້ອງ",    path: "/booking"  },
  { icon: CalendarCheck2, label: "ຈັດການຂໍ້ມູນພະນັກງານ", path: "/staff"    },
  { icon: CalendarDays,   label: "ຈັດການການຈອງ",         path: "/schedule", active: true },
  { icon: BarChart3,      label: "ຈັດການສິວິວ",           path: "/review"   },
  { icon: List,           label: "ລາຍການຕ່າງໆ",           path: "#", hasDropdown: true },
];

// ---- Mock Data ----
const initialBookings: BookingRow[] = [
  { id: "1", room: "N01", confirmCode: "BK-2026-001", checkIn: "2026-04-25", checkOut: "2026-04-27", guests: 2, status: "ສຳເລັດ" },
  { id: "2", room: "N02", confirmCode: "BK-2026-002", checkIn: "2026-05-01", checkOut: "2026-05-03", guests: 1, status: "ລໍຖ້າ"  },
  { id: "3", room: "N03", confirmCode: "BK-2026-003", checkIn: "2026-05-10", checkOut: "2026-05-12", guests: 2, status: "ຍົກເລີກ"},
  { id: "4", room: "N01", confirmCode: "BK-2026-004", checkIn: "2026-05-15", checkOut: "2026-05-18", guests: 3, status: "ລໍຖ້າ"  },
];

const statusColors: Record<BookingStatus, string> = {
  ສຳເລັດ:  "bg-emerald-500 text-white",
  ລໍຖ້າ:   "bg-red-500 text-white",
  ຍົກເລີກ: "bg-gray-400 text-white",
};

const statusOptions: BookingStatus[] = ["ສຳເລັດ", "ລໍຖ້າ", "ຍົກເລີກ"];

interface EditState {
  room: string;
  confirmCode: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: BookingStatus;
}

export default function SchedulePage() {
  const router = useRouter();

  const [rows, setRows]                   = useState<BookingRow[]>(initialBookings);
  const [activeNav, setActiveNav]         = useState(2); // ຈັດການການຈອງ = index 2
  const [openDropdown, setOpenDropdown]   = useState<string | null>(null);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editState, setEditState]         = useState<EditState>({
    room: "", confirmCode: "", checkIn: "", checkOut: "", guests: 1, status: "ລໍຖ້າ",
  });
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "ຍືນຢັນ" | "ຍົກເລີກ" } | null>(null);

  const handleNav = (path: string, index: number) => {
    setActiveNav(index);
    router.push(path);
  };

  const getNextId = (current: BookingRow[]): string => {
    const max = current.reduce((m, r) => Math.max(m, parseInt(r.id) || 0), 0);
    return (max + 1).toString();
  };

  const handleAdd = () => {
    const newRow: BookingRow = {
      id: getNextId(rows),
      room: "",
      confirmCode: `BK-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`,
      checkIn: "",
      checkOut: "",
      guests: 1,
      status: "ລໍຖ້າ",
    };
    setRows([...rows, newRow]);
    setEditingId(newRow.id);
    setEditState({ room: "", confirmCode: newRow.confirmCode, checkIn: "", checkOut: "", guests: 1, status: "ລໍຖ້າ" });
  };

  const handleEdit = (row: BookingRow) => {
    setEditingId(row.id);
    setEditState({ room: row.room, confirmCode: row.confirmCode, checkIn: row.checkIn, checkOut: row.checkOut, guests: row.guests, status: row.status });
    setOpenDropdown(null);
  };

  const handleSave = (id: string) => {
    setRows(rows.map((r) => r.id === id ? { ...r, ...editState } : r));
    setEditingId(null);
  };

  const handleCancel = () => setEditingId(null);

  const handleDelete = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
    setOpenDropdown(null);
    setConfirmAction(null);
  };

  // ✅ ຍືນຢັນ → ສຳເລັດ
  const handleConfirm = (id: string) => {
    setRows(rows.map((r) => r.id === id ? { ...r, status: "ສຳເລັດ" } : r));
    setOpenDropdown(null);
    setConfirmAction(null);
  };

  // ✅ ຍົກເລີກ → ຍົກເລີກ
  const handleCancelBooking = (id: string) => {
    setRows(rows.map((r) => r.id === id ? { ...r, status: "ຍົກເລີກ" } : r));
    setOpenDropdown(null);
    setConfirmAction(null);
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]" style={{ fontFamily: "'Noto Sans Lao','Phetsarath OT',sans-serif" }}>

      {/* SIDEBAR */}
      <aside className="w-[210px] min-h-screen bg-[#1E1040] flex flex-col justify-between fixed left-0 top-0 z-40">
        <div>
          <div className="px-6 py-5 border-b border-white/10">
            <span className="text-white font-bold text-[15px] tracking-wide">ທຫ້າເລັກ</span>
          </div>
          <nav className="mt-4 px-3 space-y-1">
            {navItems.map((item, i) => (
              <button
                key={i}
                onClick={() => handleNav(item.path, i)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[12px] font-medium transition-all
                  ${activeNav === i
                    ? "bg-white/10 text-white border-l-[3px] border-pink-400"
                    : "text-white/60 hover:text-white hover:bg-white/5"}`}
              >
                <item.icon size={16} className="shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.hasDropdown && <ChevronDown size={12} className="text-white/40" />}
              </button>
            ))}
          </nav>
        </div>
        <button className="flex items-center gap-2 px-6 py-5 text-white/50 hover:text-white text-[12px] transition-colors border-t border-white/10">
          <LogOut size={14} /> Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="ml-[210px] flex-1 flex flex-col min-h-screen">

        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-8 sticky top-0 z-30">
          <button className="flex items-center gap-2 bg-[#1E1040] text-white px-4 py-1.5 rounded-lg text-[12px] font-medium">
            Admin <User size={13} />
          </button>
        </header>

        <div className="flex-1 p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">

            {/* Table Head */}
            <div className="flex items-center px-6 py-3 border-b border-gray-100 bg-gray-50/60 gap-2">
              <div className="w-14 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ຫ້ອງ</div>
              <div className="flex-1 flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                ເລກລະຫັດຍືນຢັນການຈອງ <ArrowUpDown size={11} className="text-gray-400" />
              </div>
              <div className="w-32 flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                ເຂົ້າພັກ <ArrowUpDown size={11} className="text-gray-400" />
              </div>
              <div className="w-32 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ອອກ</div>
              <div className="w-24 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ຈຳນວນຄົນ</div>
              <div className="w-28 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</div>
              <div className="w-20 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ຈັດການ</div>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
              >
                <Plus size={12} /> ເພີ່ມ
              </button>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-50">
              {rows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <div
                    key={row.id}
                    className={`flex items-center px-6 py-3 gap-2 transition-colors ${isEditing ? "bg-blue-50/40" : "hover:bg-gray-50/50"}`}
                  >
                    {/* ຫ້ອງ */}
                    <div className="w-14">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editState.room}
                          onChange={(e) => setEditState({ ...editState, room: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-blue-300 rounded-md text-[12px] outline-none"
                          placeholder="N01"
                        />
                      ) : (
                        <span className="text-[12px] font-mono font-semibold text-gray-700">{row.room || "-"}</span>
                      )}
                    </div>

                    {/* ເລກລະຫັດ */}
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          value={editState.confirmCode}
                          onChange={(e) => setEditState({ ...editState, confirmCode: e.target.value })}
                          className="w-full px-3 py-1 bg-white border border-blue-300 rounded-md text-[12px] outline-none"
                          placeholder="BK-2026-001"
                        />
                      ) : (
                        <span className="text-[12px] text-gray-600 font-mono">{row.confirmCode}</span>
                      )}
                    </div>

                    {/* ເຂົ້າພັກ */}
                    <div className="w-32">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editState.checkIn}
                          onChange={(e) => setEditState({ ...editState, checkIn: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-blue-300 rounded-md text-[12px] outline-none"
                        />
                      ) : (
                        <span className="text-[12px] text-gray-600">{row.checkIn || "-"}</span>
                      )}
                    </div>

                    {/* ອອກ */}
                    <div className="w-32">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editState.checkOut}
                          onChange={(e) => setEditState({ ...editState, checkOut: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-blue-300 rounded-md text-[12px] outline-none"
                        />
                      ) : (
                        <span className="text-[12px] text-gray-600">{row.checkOut || "-"}</span>
                      )}
                    </div>

                    {/* ຈຳນວນຄົນ */}
                    <div className="w-24">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editState.guests}
                          onChange={(e) => setEditState({ ...editState, guests: parseInt(e.target.value) || 1 })}
                          className="w-16 px-2 py-1 bg-white border border-blue-300 rounded-md text-[12px] outline-none text-center"
                        />
                      ) : (
                        <span className="text-[12px] text-gray-600">{row.guests} ທ່ານ</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-28">
                      {isEditing ? (
                        <select
                          value={editState.status}
                          onChange={(e) => setEditState({ ...editState, status: e.target.value as BookingStatus })}
                          className="px-2 py-1 bg-white border border-blue-300 rounded-md text-[11px] outline-none cursor-pointer"
                        >
                          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${statusColors[row.status]}`}>
                          {row.status}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="w-20 flex items-center">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSave(row.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[11px] font-bold"
                          >
                            <Check size={11} /> ບັນທຶກ
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-md"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === row.id ? null : row.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {/* ✅ Dropdown ຈັດການ */}
                          {openDropdown === row.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                              {/* ຈັດການ / ແກ້ໄຂ */}
                              <button
                                onClick={() => handleEdit(row)}
                                className="w-full text-left px-4 py-2 text-[12px] text-gray-600 hover:bg-gray-50 font-medium"
                              >
                                ✏️ ຈັດການ
                              </button>
                              <div className="h-px bg-gray-100 mx-3 my-1" />
                              {/* ຍືນຢັນ */}
                              <button
                                onClick={() => setConfirmAction({ id: row.id, type: "ຍືນຢັນ" })}
                                className="w-full text-left px-4 py-2 text-[12px] text-emerald-600 hover:bg-emerald-50 font-medium"
                              >
                                ✅ ຍືນຢັນ
                              </button>
                              <div className="h-px bg-gray-100 mx-3 my-1" />
                              {/* ຍົກເລີກ */}
                              <button
                                onClick={() => setConfirmAction({ id: row.id, type: "ຍົກເລີກ" })}
                                className="w-full text-left px-4 py-2 text-[12px] text-red-500 hover:bg-red-50 font-medium"
                              >
                                🚫 ຍົກເລີກ
                              </button>
                              <div className="h-px bg-gray-100 mx-3 my-1" />
                              {/* ລຶບ */}
                              <button
                                onClick={() => handleDelete(row.id)}
                                className="w-full text-left px-4 py-2 text-[12px] text-gray-400 hover:bg-gray-50 font-medium"
                              >
                                🗑️ ລຶບ
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {rows.length === 0 && (
                <div className="py-16 text-center text-gray-300 text-[13px]">ບໍ່ມີຂໍ້ມູນ</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center animate-in fade-in zoom-in duration-200">
            <div className="text-4xl mb-3">{confirmAction.type === "ຍືນຢັນ" ? "✅" : "🚫"}</div>
            <h3 className="font-bold text-gray-800 text-[15px] mb-2">
              {confirmAction.type === "ຍືນຢັນ" ? "ຢືນຢັນການຈອງ" : "ຍົກເລີກການຈອງ"}
            </h3>
            <p className="text-gray-400 text-[12px] mb-6">
              {confirmAction.type === "ຍືນຢັນ"
                ? "ທ່ານຕ້ອງການຢືນຢັນການຈອງນີ້ແທ້ບໍ?"
                : "ທ່ານຕ້ອງການຍົກເລີກການຈອງນີ້ແທ້ບໍ?"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setConfirmAction(null); setOpenDropdown(null); }}
                className="px-5 py-2 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-50"
              >
                ຍ້ອນກັບ
              </button>
              <button
                onClick={() =>
                  confirmAction.type === "ຍືນຢັນ"
                    ? handleConfirm(confirmAction.id)
                    : handleCancelBooking(confirmAction.id)
                }
                className={`px-5 py-2 text-white rounded-lg text-[12px] font-bold transition-all
                  ${confirmAction.type === "ຍືນຢັນ" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}
              >
                {confirmAction.type === "ຍືນຢັນ" ? "ຢືນຢັນ" : "ຍົກເລີກ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown */}
      {openDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}