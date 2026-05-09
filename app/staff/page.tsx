"use client";
import { useState } from "react";
import {
  BedDouble, CalendarCheck2, CalendarDays,
  BarChart3, List, ChevronDown, LogOut,
  User, ArrowUpDown, Plus, Check, X, Pencil, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StaffRow {
  id: string;
  name: string;
  startDate: string;
  phone: string;
}

const initialStaff: StaffRow[] = [
  { id: "1", name: "ton",  startDate: "September 9, 2013",  phone: "704.555.0127" },
  { id: "2", name: "anon", startDate: "August 2, 2013",     phone: "205.555.0100" },
];

const navItems = [
  { icon: BedDouble,      label: "ຈັດການຂໍ້ມູນຫ້ອງ",    path: "/booking"  },
  { icon: CalendarCheck2, label: "ຈັດການຂໍ້ມູນພະນັກງານ", path: "/staff"    },
  { icon: CalendarDays,   label: "ຈັດການການຈອງ",         path: "/schedule" },
  { icon: BarChart3,      label: "ຈັດການສິວິວ",           path: "/review"   },
  { icon: List,           label: "ລາຍການຕ່າງໆ",           path: "#", hasDropdown: true },
];

interface EditState {
  name: string;
  startDate: string;
  phone: string;
}

export default function StaffPage() {
  const router = useRouter();
  const [rows, setRows]               = useState<StaffRow[]>(initialStaff);
  const [activeNav, setActiveNav]     = useState(1); // ຈັດການຂໍ້ມູນພະນັກງານ = index 1
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editState, setEditState]     = useState<EditState>({ name: "", startDate: "", phone: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getNextId = (currentRows: StaffRow[]): string => {
    const maxId = currentRows.reduce((max, r) => Math.max(max, parseInt(r.id, 10) || 0), 0);
    return (maxId + 1).toString();
  };

  const handleAdd = () => {
    const newRow: StaffRow = {
      id: getNextId(rows),
      name: "",
      startDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      phone: "",
    };
    setRows([...rows, newRow]);
    setEditingId(newRow.id);
    setEditState({ name: "", startDate: newRow.startDate, phone: "" });
  };

  const handleEdit = (row: StaffRow) => {
    setEditingId(row.id);
    setEditState({ name: row.name, startDate: row.startDate, phone: row.phone });
  };

  const handleSave = (id: string) => {
    setRows(rows.map((r) => r.id === id ? { ...r, ...editState } : r));
    setEditingId(null);
  };

  const handleCancel = () => setEditingId(null);

  const handleDelete = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
  };

  const handleNav = (path: string, index: number) => {
    setActiveNav(index);
    router.push(path);
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
                    : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
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
            Owner <User size={13} />
          </button>
        </header>

        <div className="flex-1 p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">

            {/* Table Head */}
            <div className="flex items-center px-6 py-3 border-b border-gray-100 bg-gray-50/60">
              <div className="w-16 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ID</div>
              <div className="flex-1 flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                ຊື່ ນາມສະກຸນ <ArrowUpDown size={11} className="text-gray-400" />
              </div>
              <div className="w-52 flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                ມື້ເລີ້ວຮັກ <ArrowUpDown size={11} className="text-gray-400" />
              </div>
              <div className="w-44 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ເບີ</div>
              <div className="w-28 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ແກ້ໄຂ</div>
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
                    className={`flex items-center px-6 py-3.5 transition-colors ${isEditing ? "bg-blue-50/40" : "hover:bg-gray-50/50"}`}
                  >
                    {/* ID */}
                    <div className="w-16 text-[12px] text-gray-400 font-mono">{row.id.padStart(2, "0")}</div>

                    {/* ຊື່ */}
                    <div className="flex-1 pr-4">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editState.name}
                          onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                          placeholder="ຊື່ ນາມສະກຸນ..."
                          className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-md text-[13px] outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <span className={`text-[13px] ${row.name ? "text-gray-700 font-medium" : "text-gray-300 italic"}`}>
                          {row.name || "ຊື່ ນາມສະກຸນ..."}
                        </span>
                      )}
                    </div>

                    {/* ມື້ເລີ້ວຮັກ */}
                    <div className="w-52">
                      {isEditing ? (
                        <input
                          type="date"
                          value={
                            editState.startDate
                              ? new Date(editState.startDate).toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) => {
                            const d = new Date(e.target.value);
                            setEditState({
                              ...editState,
                              startDate: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-md text-[13px] outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <span className="text-[13px] text-gray-600">{row.startDate || "-"}</span>
                      )}
                    </div>

                    {/* ເບີໂທ */}
                    <div className="w-44">
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editState.phone}
                          onChange={(e) => setEditState({ ...editState, phone: e.target.value })}
                          placeholder="000.000.0000"
                          className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-md text-[13px] outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <span className="text-[13px] text-gray-600 font-mono">{row.phone || "-"}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="w-28 flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSave(row.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[11px] font-bold transition-all"
                          >
                            <Check size={12} /> ບັນທຶກ
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-md"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          {/* ✅ ປຸ່ມ ແກ້ໄຂ */}
                          <button
                            onClick={() => handleEdit(row)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-[11px] font-bold transition-all"
                          >
                            <Pencil size={11} /> ແກ້ໄຂ
                          </button>
                          {/* ✅ ປຸ່ມ ລຶບ */}
                          <button
                            onClick={() => setConfirmDeleteId(row.id)}
                            className="p-1.5 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* ✅ Confirm Delete Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-800 text-[15px] mb-2">ຢືນຢັນການລຶບ</h3>
            <p className="text-gray-400 text-[12px] mb-6">ທ່ານຕ້ອງການລຶບພະນັກງານນີ້ແທ້ບໍ?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-5 py-2 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-50"
              >
                ຍົກເລີກ
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[12px] font-bold transition-all"
              >
                ລຶບ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}