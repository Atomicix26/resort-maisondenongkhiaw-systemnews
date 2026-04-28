"use client";
import React, { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ຂໍ້ມູນຕົວຢ່າງ
const bookingData = [
  { id: "03", name: "mexay", email: "mexay@gmail.com", checkIn: "2026-02-9",  checkOut: "2026-02-10", status: "ສຳເລັດ" },
  { id: "04", name: "somchai", email: "somchai@gmail.com", checkIn: "2026-03-1", checkOut: "2026-03-3",  status: "ລໍຖ້າ" },
  { id: "05", name: "boupha",  email: "boupha@gmail.com",  checkIn: "2026-03-5", checkOut: "2026-03-7",  status: "ຍົກເລີກ" },
];

const statusStyle: Record<string, string> = {
  ສຳເລັດ: "bg-green-100 text-green-700 border border-green-200",
  ລໍຖ້າ:  "bg-yellow-100 text-yellow-700 border border-yellow-200",
  ຍົກເລີກ: "bg-red-100 text-red-600 border border-red-200",
};

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = bookingData.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 backdrop-blur-sm pt-24 px-4 font-lao">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-gray-800">ປະຫວັດການຈອງ</h2>
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              New Items
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search list..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[12px] outline-none bg-gray-50 w-48 focus:border-blue-300 transition-colors"
              />
            </div>

            {/* Filter icon */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <SlidersHorizontal size={16} className="text-gray-500" />
            </button>

            {/* Close */}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-8 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider w-16">ຫ້ອງ</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">ຊື່</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">ອີເມວ</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">ເຂົ້າພັກ</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">ອອກ</th>
                <th className="text-right px-8 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length > 0 ? (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 text-gray-500 font-mono">{b.id}</td>
                    <td className="px-4 py-4 font-medium text-gray-800">{b.name}</td>
                    <td className="px-4 py-4 text-blue-500 hover:underline cursor-pointer">{b.email}</td>
                    <td className="px-4 py-4 text-gray-600 font-mono">{b.checkIn}</td>
                    <td className="px-4 py-4 text-gray-600 font-mono">{b.checkOut}</td>
                    <td className="px-8 py-4 text-right">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${statusStyle[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-gray-400 text-[13px]">
                    ບໍ່ພົບຂໍ້ມູນ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-1.5 px-8 py-5 border-t border-gray-100">
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 text-[13px]">‹</button>
          {[1, 2, 3, 4, 10].map((p) => (
            <button
              key={p}
              className={`w-7 h-7 flex items-center justify-center rounded-md text-[12px] font-medium transition-colors
                ${p === 2 ? "bg-pink-400 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {p}
            </button>
          ))}
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 text-[13px]">›</button>
        </div>

      </div>
    </div>
  );
}