"use client";
import { useState } from "react";
import {
  BedDouble, CalendarCheck2, CalendarDays,
  BarChart3, List, ChevronDown, LogOut,
  User, MoreHorizontal, ArrowUpDown, Plus, Check, X,
} from "lucide-react";

type StatusType = "Danger" | "Active" | "Pending";

interface RoomRow {
  id: string;
  title: string;
  price: string;
  status: StatusType;
}

const initialRows: RoomRow[] = [
  { id: "1", title: "",                price: "11.70", status: "Danger"  },
  { id: "2", title: "Arlene McCoy",    price: "5.22",  status: "Danger"  },
  { id: "3", title: "Cody Fisher",     price: "11.70", status: "Danger"  },
  { id: "4", title: "Esther Howard",   price: "11.70", status: "Danger"  },
  { id: "5", title: "Ronald Richards", price: "17.84", status: "Danger"  },
  { id: "6", title: "Albert Flores",   price: "5.22",  status: "Active"  },
  { id: "7", title: "Marvin McKinney", price: "11.70", status: "Pending" },
  { id: "8", title: "Floyd Miles",     price: "5.22",  status: "Danger"  },
];

const navItems = [
  { icon: BedDouble,      label: "ຈັດການຂໍ້ມູນຫ້ອງ",    hasDropdown: false },
  { icon: CalendarCheck2, label: "ຈັດການຂໍ້ມູນພະນັກງານ", hasDropdown: false },
  { icon: CalendarDays,   label: "ຈັດການການຈອງ",         hasDropdown: false },
  { icon: BarChart3,      label: "ຈັດການສິວິວ",           hasDropdown: false },
  { icon: List,           label: "ລາຍການຕ່າງໆ",           hasDropdown: true  },
];

const statusColors: Record<StatusType, string> = {
  Danger:  "bg-red-500 text-white",
  Active:  "bg-emerald-500 text-white",
  Pending: "bg-amber-400 text-white",
};

const statusOptions: StatusType[] = ["Danger", "Active", "Pending"];

interface EditState {
  title: string;
  price: string;
  status: StatusType;
}

export default function AdminDashboard() {
  const [rows, setRows]             = useState<RoomRow[]>(initialRows);
  const [activeNav, setActiveNav]   = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editState, setEditState]   = useState<EditState>({ title: "", price: "", status: "Danger" });

  // ✅ ຄຳນວນ ID ຕໍ່ຈາກ max
  const getNextId = (currentRows: RoomRow[]): string => {
    const maxId = currentRows.reduce((max, r) => {
      const num = parseInt(r.id, 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return (maxId + 1).toString();
  };

  const handleAdd = () => {
    const newId = getNextId(rows);
    const newRow: RoomRow = { id: newId, title: "", price: "0.00", status: "Pending" };
    setRows([...rows, newRow]);
    setEditingId(newRow.id);
    setEditState({ title: "", price: "0.00", status: "Pending" });
  };

  const handleEdit = (row: RoomRow) => {
    setEditingId(row.id);
    setEditState({ title: row.title, price: row.price, status: row.status });
    setOpenDropdown(null);
  };

  const handleSave = (id: string) => {
    setRows(rows.map((r) =>
      r.id === id ? { ...r, ...editState } : r
    ));
    setEditingId(null);
  };

  const handleCancel = () => setEditingId(null);

  const handleDelete = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
    setOpenDropdown(null);
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
              <button key={i} onClick={() => setActiveNav(i)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[12px] font-medium transition-all
                  ${activeNav === i ? "bg-white/10 text-white border-l-[3px] border-pink-400" : "text-white/60 hover:text-white hover:bg-white/5"}`}
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
              <div className="w-16 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ຫ້ອງ</div>
              <div className="flex-1 flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                ປະເພດ <ArrowUpDown size={11} className="text-gray-400" />
              </div>
              <div className="w-32 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ລາຄາ ($)</div>
              <div className="w-36 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ສະຖານະ</div>
              <div className="w-28 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ແກ້ໄຂ</div>
              <button onClick={handleAdd}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95">
                <Plus size={12} /> ເພີ່ມ
              </button>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-50">
              {rows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <div key={row.id}
                    className={`flex items-center px-6 py-3 transition-colors ${isEditing ? "bg-blue-50/40" : "hover:bg-gray-50/50"}`}
                  >
                    <div className="w-16 text-[12px] text-gray-400 font-mono">{row.id.padStart(2, "0")}</div>

                    <div className="flex-1 pr-4">
                      {isEditing ? (
                        <input autoFocus value={editState.title}
                          onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-md text-[13px] outline-none"
                          placeholder="Enter Title..." />
                      ) : (
                        <span className={`text-[13px] ${row.title ? "text-gray-700 font-medium" : "text-gray-300 italic"}`}>
                          {row.title || "Enter Title..."}
                        </span>
                      )}
                    </div>

                    <div className="w-32">
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">$</span>
                          <input type="number" min="0" step="0.01" value={editState.price}
                            onChange={(e) => setEditState({ ...editState, price: e.target.value })}
                            className="w-full pl-6 pr-3 py-1.5 bg-white border border-blue-300 rounded-md text-[13px] outline-none" />
                        </div>
                      ) : (
                        <span className="text-[13px] font-semibold text-gray-700 font-mono">${row.price}</span>
                      )}
                    </div>

                    <div className="w-36">
                      {isEditing ? (
                        <select value={editState.status}
                          onChange={(e) => setEditState({ ...editState, status: e.target.value as StatusType })}
                          className="px-2 py-1.5 bg-white border border-blue-300 rounded-md text-[12px] outline-none cursor-pointer">
                          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${statusColors[row.status]}`}>
                          {row.status}
                        </span>
                      )}
                    </div>

                    <div className="w-28 flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(row.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[11px] font-bold">
                            <Check size={12} /> ບັນທຶກ
                          </button>
                          <button onClick={handleCancel}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-md">
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <div className="relative">
                          <button onClick={() => setOpenDropdown(openDropdown === row.id ? null : row.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                            <MoreHorizontal size={16} />
                          </button>
                          {openDropdown === row.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                              <button onClick={() => handleEdit(row)}
                                className="w-full text-left px-3 py-2 text-[12px] text-gray-600 hover:bg-blue-50">
                                ✏️ ແກ້ໄຂ
                              </button>
                              <div className="h-px bg-gray-100 mx-2" />
                              <button onClick={() => handleDelete(row.id)}
                                className="w-full text-left px-3 py-2 text-[12px] text-red-500 hover:bg-red-50">
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

      {openDropdown && <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />}
    </div>
  );
}