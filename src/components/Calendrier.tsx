"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMAD, getMonthKey } from "@/lib/format";

interface Booking {
  id: number;
  checkIn: string | null;
  checkOut: string | null;
  roomName: string | null;
  client: string | null;
  amount: string;
}

function buildMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function getDaysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export default function Calendrier() {
  const [month, setMonth] = useState(getMonthKey());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    client: string;
    amount: string;
  }>({ visible: false, x: 0, y: 0, client: "", amount: "" });

  const monthOptions = useMemo(() => buildMonthOptions(), []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/encaissements?month=${month}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([encData, settingsData]) => {
        setBookings(encData.data || []);
        setRooms(settingsData.rooms || []);
      })
      .catch(() => {
        setBookings([]);
        setRooms([]);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const daysInMonth = getDaysInMonth(month);
  const [yearNum, monthNum] = month.split("-").map(Number);

  const today = new Date();
  const todayDay =
    today.getFullYear() === yearNum && today.getMonth() + 1 === monthNum
      ? today.getDate()
      : null;

  // Build occupancy map: roomName -> day -> Booking
  const occupancyMap = useMemo(() => {
    const map = new Map<string, Map<number, Booking>>();
    for (const room of rooms) {
      map.set(room, new Map());
    }
    for (const b of bookings) {
      if (!b.checkIn || !b.checkOut || !b.roomName) continue;
      if (!map.has(b.roomName)) continue;

      const ciDate = new Date(b.checkIn);
      const coDate = new Date(b.checkOut);
      const monthStart = new Date(yearNum, monthNum - 1, 1);
      const monthEnd = new Date(yearNum, monthNum - 1, daysInMonth);

      const startDay = ciDate < monthStart ? 1 : ciDate.getDate();
      const endDay = coDate > monthEnd ? daysInMonth : coDate.getDate();

      const roomMap = map.get(b.roomName)!;
      // checkOut day is departure, so occupy up to but not including checkOut
      const lastOccupied = coDate > monthEnd ? daysInMonth : Math.max(endDay - 1, startDay);
      for (let d = startDay; d <= lastOccupied; d++) {
        roomMap.set(d, b);
      }
    }
    return map;
  }, [bookings, rooms, yearNum, monthNum, daysInMonth]);

  // Stats
  const stats = useMemo(() => {
    let totalNights = 0;
    let totalRevenue = 0;
    const totalAvailable = rooms.length * daysInMonth;

    for (const roomMap of occupancyMap.values()) {
      totalNights += roomMap.size;
      const counted = new Set<number>();
      for (const [, b] of roomMap) {
        if (!counted.has(b.id)) {
          counted.add(b.id);
          totalRevenue += parseFloat(b.amount) || 0;
        }
      }
    }

    const occupancyRate = totalAvailable > 0 ? (totalNights / totalAvailable) * 100 : 0;
    const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0;

    return { totalNights, totalAvailable, occupancyRate, avgNightlyRate };
  }, [occupancyMap, rooms.length, daysInMonth]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function handleCellHover(
    e: React.MouseEvent,
    booking: Booking | undefined
  ) {
    if (!booking) {
      setTooltip((t) => ({ ...t, visible: false }));
      return;
    }
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      client: booking.client || "—",
      amount: formatMAD(parseFloat(booking.amount) || 0),
    });
  }

  function handleCellLeave() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-brown-dark">
          Calendrier d&apos;occupation
        </h2>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-cream-dark bg-white p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cream-dark border-t-gold" />
          </div>
        ) : rooms.length === 0 ? (
          <p className="py-8 text-center text-sm text-brown">
            Aucune chambre configurée. Ajoutez des chambres dans les Paramètres.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-xs font-semibold text-brown-dark">
                    Chambre
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className={`min-w-[2rem] px-0 py-1 text-center text-[10px] font-medium text-brown ${
                        d === todayDay
                          ? "border-l-2 border-r-2 border-t-2 border-gold/50"
                          : ""
                      }`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const roomMap = occupancyMap.get(room);
                  return (
                    <tr key={room}>
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1 text-xs font-medium text-brown-dark">
                        {room}
                      </td>
                      {days.map((d) => {
                        const booking = roomMap?.get(d);
                        const isOccupied = !!booking;
                        const isToday = d === todayDay;
                        return (
                          <td
                            key={d}
                            className={`h-8 w-8 cursor-default border border-cream-dark/50 text-center text-[10px] transition-colors ${
                              isOccupied
                                ? "bg-gold/70 text-white"
                                : "bg-cream"
                            } ${
                              isToday
                                ? "border-l-2 border-r-2 border-gold/50"
                                : ""
                            }`}
                            onMouseEnter={(e) => handleCellHover(e, booking)}
                            onMouseLeave={handleCellLeave}
                          >
                            {isOccupied ? "●" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold text-brown-dark">{tooltip.client}</p>
          <p className="text-brown">{tooltip.amount}</p>
        </div>
      )}

      {/* Occupancy stats bar */}
      {!loading && rooms.length > 0 && (
        <div className="rounded-xl border border-cream-dark bg-white p-5">
          <h3 className="font-[family-name:var(--font-heading)] mb-3 text-sm font-semibold text-brown-dark">
            Statistiques d&apos;occupation
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brown">
                Nuitées réservées
              </p>
              <p className="text-lg font-semibold text-brown-dark">
                {stats.totalNights}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brown">
                Nuitées disponibles
              </p>
              <p className="text-lg font-semibold text-brown-dark">
                {stats.totalAvailable}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brown">
                Taux d&apos;occupation
              </p>
              <p className="text-lg font-semibold text-brown-dark">
                {stats.occupancyRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brown">
                Tarif moyen / nuit
              </p>
              <p className="text-lg font-semibold text-brown-dark">
                {formatMAD(stats.avgNightlyRate)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
