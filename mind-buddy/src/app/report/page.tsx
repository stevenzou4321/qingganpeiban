"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { EmotionEntry } from "@/lib/types";
import { loadEmotions } from "@/lib/storage";
import { Header } from "@/components/header";

const EMOTION_LABELS: Record<number, string> = {
  1: "很低落",
  2: "比较低落",
  3: "一般",
  4: "还不错",
  5: "很好",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `周${WEEKDAYS[d.getDay()]}`;
}

function generateSummary(entries: EmotionEntry[]): string {
  if (entries.length === 0) {
    return "这周还没有聊天记录。来聊聊吧，我会帮你追踪情绪变化的。";
  }
  if (entries.length < 3) {
    return "这周聊的还不多，数据还不够生成完整的周报。多来聊聊，我才能帮你看到情绪的变化趋势。";
  }

  const avg = entries.reduce((s, e) => s + e.score, 0) / entries.length;
  const first = entries[0].score;
  const last = entries[entries.length - 1].score;
  const lowest = entries.reduce((min, e) => (e.score < min.score ? e : min));
  const highest = entries.reduce((max, e) => (e.score > max.score ? e : max));

  const parts: string[] = [];

  if (last > first + 0.5) {
    parts.push("这周整体情绪在好转，后半周比前半周状态好了不少。");
  } else if (last < first - 0.5) {
    parts.push("这周情绪有些波动，后半周状态不如前半周。");
  } else {
    parts.push("这周情绪比较平稳。");
  }

  if (lowest.event) {
    parts.push(
      `${formatDay(lowest.date)}情绪最低，和「${lowest.event}」有关。`
    );
  }
  if (highest.event && highest.date !== lowest.date) {
    parts.push(
      `${formatDay(highest.date)}状态最好${highest.event ? `，可能和「${highest.event}」有关` : ""}。`
    );
  }

  if (avg >= 3.5) {
    parts.push("总体来说这周还不错，继续保持。");
  } else {
    parts.push("如果觉得压力大，随时来聊聊。");
  }

  return parts.join("");
}

export default function ReportPage() {
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const days = getLast7Days();

  useEffect(() => {
    const all = loadEmotions();
    const weekData = days
      .map((d) => all.find((e) => e.date === d))
      .filter(Boolean) as EmotionEntry[];
    setEmotions(weekData);
  }, []);

  const chartData = days.map((d) => {
    const entry = emotions.find((e) => e.date === d);
    return {
      date: d,
      label: formatDay(d),
      score: entry?.score ?? null,
      emotion: entry?.emotion ?? "",
      event: entry?.event ?? "",
    };
  });

  const summary = generateSummary(emotions);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { emotion: string; event: string; score: number } }> }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    if (!data.score) return null;
    return (
      <div
        className="rounded-xl px-3 py-2 text-sm shadow-lg border"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      >
        <p className="font-medium">{data.emotion} · {EMOTION_LABELS[data.score]}</p>
        {data.event && (
          <p style={{ color: "var(--text-muted)" }} className="text-xs mt-1">
            {data.event}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-dvh">
      <Header />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <h2
          className="text-xl font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          情绪周报
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          过去 7 天的情绪变化
        </p>

        {/* Chart */}
        <div
          className="rounded-2xl border p-4 mb-6"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-muted)", fontSize: 13 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => EMOTION_LABELS[v]?.slice(0, 2) || ""}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "var(--accent)", strokeWidth: 0 }}
                activeDot={{ r: 7, fill: "var(--accent)" }}
                connectNulls
              />
              {/* Mark events */}
              {chartData
                .filter((d) => d.event && d.score)
                .map((d) => (
                  <ReferenceDot
                    key={d.date}
                    x={d.label}
                    y={d.score!}
                    r={8}
                    fill="var(--accent)"
                    fillOpacity={0.2}
                    stroke="var(--accent)"
                    strokeWidth={1}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div
          className="rounded-2xl border p-5"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            🌿 本周小结
          </h3>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: "var(--text-primary)" }}
          >
            {summary}
          </p>
        </div>

        {/* Daily breakdown */}
        {emotions.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              每日记录
            </h3>
            {emotions.map((e) => (
              <div
                key={e.date}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="text-sm font-medium w-10" style={{ color: "var(--text-muted)" }}>
                  {formatDay(e.date)}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--accent-light)",
                    color: "var(--accent)",
                  }}
                >
                  {e.emotion}
                </span>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {EMOTION_LABELS[e.score]}
                </span>
                {e.event && (
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                    {e.event}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
