"use client";

import { useEffect, useId, useState } from "react";
import {
  dimensionInfo,
  scoreText,
  type AnalysisReport,
  type DimensionKey,
  type Score,
} from "./report-types";
import s from "./analysis.module.css";

const point = (cx: number, cy: number, r: number, angle: number) => [
  cx + Math.sin(angle) * r,
  cy - Math.cos(angle) * r,
];
const pentagon = (r: number, cx = 280, cy = 220) =>
  Array.from({ length: 5 }, (_, i) =>
    point(cx, cy, r, (i * Math.PI * 2) / 5).join(","),
  ).join(" ");
const val = (n: Score) => (n === null ? 0 : Math.max(0, Math.min(100, n)));
export function Gauge({ score }: { score: Score }) {
  return (
    <svg
      viewBox="0 0 480 265"
      role="img"
      aria-label={`求职能量 ${scoreText(score)}`}
    >
      <path
        d="M100 205 A140 140 0 0 1 380 205"
        fill="none"
        stroke="#215ae6"
        strokeWidth="37"
      />
      <path
        d="M100 205 A140 140 0 0 1 380 205"
        fill="none"
        stroke="#38a5ff"
        strokeWidth="37"
        pathLength="100"
        strokeDasharray={`${val(score)} 100`}
      />
      {Array.from({ length: 27 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 26;
        const [x1, y1] = point(240, 205, 169, a);
        const [x2, y2] = point(240, 205, 173, a);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#38a5ff"
            strokeWidth="5"
            strokeLinecap="round"
          />
        );
      })}
      <path d="M53 205 H427" stroke="#456aff" strokeWidth="2" />
      <text
        x="240"
        y="180"
        textAnchor="middle"
        fontSize={score === null ? 27 : 58}
        fontWeight="700"
        fill="currentColor"
      >
        {scoreText(score)}
        {score !== null && "′"}
      </text>
    </svg>
  );
}
export function BasicsRings({ report }: { report: AnalysisReport }) {
  const { charCount, pageCount } = report.basics;
  return (
    <div className={s.rings}>
      {[
        [pageCount === null ? "—" : `${pageCount}页`, "文件页数", "#2975ff"],
        [`${(charCount / 380).toFixed(1)}min`, "阅读时间 · 估算", "#42bec5"],
        [`${(charCount / 112).toFixed(1)}s`, "快速浏览 · 估算", "#60cdef"],
      ].map(([value, label, color]) => (
        <div key={label}>
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={`${label} ${value}`}
          >
            <circle
              cx="50"
              cy="50"
              r="37"
              fill="none"
              stroke="#edf1f3"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r="37"
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeDasharray="213 233"
              transform="rotate(-90 50 50)"
            />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="16"
              fontWeight="600"
              fill="currentColor"
            >
              {value}
            </text>
          </svg>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
const radarColors = ["#2994ff", "#fa9d60", "#4cbfbb", "#ff79a7", "#6860ff"];
export function ReportRadar({ report }: { report: AnalysisReport }) {
  const keys: DimensionKey[] = [
    "trust",
    "information",
    "get",
    "match",
    "reading",
  ];
  const labels = [
    "◕ 人事信任指数",
    "▤ 个人信息指数",
    "◎ 求职能量值",
    "⌁ 岗位匹配指数",
    "▣ HR阅读指数",
  ];
  const locations = [
    [280, 35],
    [454, 185],
    [394, 408],
    [167, 408],
    [99, 185],
  ];
  return (
    <svg
      viewBox="0 0 560 445"
      role="img"
      aria-label={keys
        .map((k, i) => `${labels[i]} ${scoreText(report.dimensions[k].score)}`)
        .join("，")}
    >
      {[0.25, 0.5, 0.75, 1].map((n) => (
        <polygon
          key={n}
          points={pentagon(161 * n)}
          fill="none"
          stroke="#65a8ff"
          strokeWidth=".8"
        />
      ))}
      {keys.map((k, i) => {
        const [x, y] = point(280, 220, 161, (i * Math.PI * 2) / 5);
        return (
          <line
            key={k}
            x1="280"
            y1="220"
            x2={x}
            y2={y}
            stroke="#65a8ff"
            strokeDasharray="4 3"
            strokeWidth=".8"
          />
        );
      })}
      {keys.every((k) => report.dimensions[k].score !== null) && (
        <polygon
          points={keys
            .map((k, i) =>
              point(
                280,
                220,
                val(report.dimensions[k].score) * 1.61,
                (i * Math.PI * 2) / 5,
              ).join(","),
            )
            .join(" ")}
          fill="#58b1ff"
          fillOpacity=".48"
          stroke="#598dff"
        />
      )}
      {keys.map((k, i) => {
        const n = report.dimensions[k].score;
        const [x, y] = point(280, 220, val(n) * 1.61, (i * Math.PI * 2) / 5);
        return (
          <g key={k}>
            {n !== null && (
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={radarColors[i]}
                stroke="white"
                strokeWidth="1.5"
              />
            )}
            <text
              x={locations[i][0]}
              y={locations[i][1]}
              textAnchor="middle"
              fill="currentColor"
              fontSize="13"
            >
              {labels[i]}
              {n === null ? " · 待评估" : ""}
            </text>
          </g>
        );
      })}
      <circle cx="280" cy="220" r="10" fill="white" />
    </svg>
  );
}
export function ScoreBars({ report }: { report: AnalysisReport }) {
  const keys: DimensionKey[] = [
    "reading",
    "information",
    "trust",
    "match",
    "get",
  ];
  return (
    <div className={s.scoreBars}>
      {keys.map((k, i) => {
        const d = report.dimensions[k];
        const info = dimensionInfo.find((a) => a.key === k)!;
        const colors = ["#655bff", "#f89d61", "#2994ff", "#ff79a7", "#4cbfbb"];
        return (
          <div key={k}>
            <span>
              <i style={{ background: colors[i] }} />
              {info.name.replace("指数", "").replace("值", "")}
            </span>
            <div>
              <b style={{ width: `${val(d.score)}%`, background: colors[i] }} />
              <em>
                {scoreText(d.score)}
                {d.score !== null && "′"}
              </em>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function DimensionChart({
  kind,
  values,
}: {
  kind: DimensionKey;
  values: Score[];
}) {
  const id = useId().replace(/:/g, "");
  const info = dimensionInfo.find((a) => a.key === kind)!;
  if (kind === "information")
    return (
      <svg
        viewBox="0 0 560 205"
        role="img"
        aria-label={info.labels
          .map((l, i) => `${l} ${scoreText(values[i] ?? null)}`)
          .join("，")}
      >
        {info.labels.map((label, i) => (
          <g key={label}>
            <text
              x="102"
              y={45 + i * 58}
              textAnchor="end"
              fill="#95959e"
              fontSize="13"
            >
              {label}
            </text>
            <rect
              x="112"
              y={35 + i * 58}
              width="386"
              height="10"
              rx="5"
              fill="#f3f2fa"
            />
            <rect
              x="112"
              y={35 + i * 58}
              width={3.86 * val(values[i] ?? null)}
              height="10"
              rx="5"
              fill={["#ffabe0", "#50bdf7", "#7270ff"][i]}
            />
            <text x="510" y={45 + i * 58} fill="#95959e" fontSize="12">
              {scoreText(values[i] ?? null)}
            </text>
          </g>
        ))}
      </svg>
    );
  if (kind === "match") {
    const colors = ["#fa8284", "#70d0bf", "#fbb6f0", "#ffc779"];
    return (
      <svg
        viewBox="0 0 560 235"
        role="img"
        aria-label={info.labels
          .map((l, i) => `${l} ${scoreText(values[i] ?? null)}`)
          .join("，")}
      >
        {[20, 40, 60, 80, 100].map((n) => (
          <g key={n}>
            <circle
              cx="215"
              cy="118"
              r={n}
              fill="none"
              stroke="#d9dbe3"
              strokeDasharray={n === 100 ? "0" : "3 2"}
              strokeWidth=".7"
            />
            <text
              x="206"
              y={118 - n}
              textAnchor="end"
              fill="#999ba5"
              fontSize="11"
            >
              {n}
            </text>
          </g>
        ))}
        {values.map((n, i) => {
          const start = (i * Math.PI) / 2 + 0.08;
          const end = ((i + 1) * Math.PI) / 2 - 0.08;
          const r = 25 + val(n) * 0.75;
          const a = point(215, 118, r, start),
            b = point(215, 118, r, end),
            c = point(215, 118, 25, end),
            d = point(215, 118, 25, start);
          return n === null ? null : (
            <path
              key={i}
              d={`M${a} A${r} ${r} 0 0 1 ${b} L${c} A25 25 0 0 0 ${d} Z`}
              fill={colors[i]}
            />
          );
        })}
        {info.labels.map((label, i) => (
          <g key={label}>
            <circle cx="405" cy={75 + i * 23} r="4" fill={colors[i]} />
            <text x="422" y={79 + i * 23} fill="#92949d" fontSize="12">
              {label}
              {values[i] === null ? " · 待评估" : ""}
            </text>
          </g>
        ))}
      </svg>
    );
  }
  const maximum =
    kind === "trust" && values.every((n) => n === null || n <= 80)
      ? 80
      : kind === "get"
        ? Math.max(70, Math.ceil(Math.max(...values.map(val)) / 10) * 10)
        : 100;
  const left = 48,
    top = 20,
    w = 476,
    h = 144;
  const x = (i: number) => left + 60 + (i * (w - 120)) / (values.length - 1);
  const y = (n: Score) => top + h - (val(n) * h) / maximum;
  const coords = values.map((n, i) => `${x(i)},${y(n)}`).join(" ");
  return (
    <svg
      viewBox="0 0 560 220"
      role="img"
      aria-label={info.labels
        .map((l, i) => `${l} ${scoreText(values[i] ?? null)}`)
        .join("，")}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#3992ff" stopOpacity=".6" />
          <stop offset="1" stopColor="#3992ff" stopOpacity=".02" />
        </linearGradient>
      </defs>
      {Array.from(
        { length: maximum / (kind === "get" ? 10 : 20) + 1 },
        (_, i) => i * (kind === "get" ? 10 : 20),
      ).map((n) => (
        <g key={n}>
          <line
            x1={left}
            x2={left + w}
            y1={y(n)}
            y2={y(n)}
            stroke="#e7e9ef"
            strokeWidth=".8"
          />
          <text
            x={left - 9}
            y={y(n) + 4}
            textAnchor="end"
            fill="#9b9ca5"
            fontSize="11"
          >
            {n}′
          </text>
        </g>
      ))}
      {kind === "trust" && values.every((n) => n !== null) && (
        <polygon
          points={`${x(0)},${top + h} ${coords} ${x(values.length - 1)},${top + h}`}
          fill={`url(#${id})`}
        />
      )}
      {kind !== "get" &&
        values
          .slice(1)
          .map(
            (n, i) =>
              n !== null &&
              values[i] !== null && (
                <line
                  key={i}
                  x1={x(i)}
                  y1={y(values[i])}
                  x2={x(i + 1)}
                  y2={y(n)}
                  stroke={info.color}
                  strokeWidth="1.4"
                />
              ),
          )}
      {values.map((n, i) => (
        <g key={i}>
          {n !== null &&
            (kind === "get" ? (
              <rect
                x={x(i) - 9}
                y={y(n)}
                width="18"
                height={top + h - y(n)}
                fill="#76c2c3"
              />
            ) : (
              <circle
                cx={x(i)}
                cy={y(n)}
                r={kind === "reading" ? 4.5 : 3}
                fill={kind === "reading" ? "#ffbe13" : "white"}
                stroke={kind === "reading" ? "white" : "#3992ff"}
                strokeWidth="1.5"
              />
            ))}
          <text
            x={x(i)}
            y="188"
            textAnchor="middle"
            fill="#9b9ca5"
            fontSize={kind === "get" ? 10 : 12}
          >
            {info.labels[i]}
          </text>
          {n === null && (
            <text
              x={x(i)}
              y="110"
              textAnchor="middle"
              fill="#9b9ca5"
              fontSize="11"
            >
              待评估
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
export function WaveOverview({ report }: { report: AnalysisReport }) {
  return (
    <svg viewBox="0 0 1088 330" role="img" aria-label="TRIMG 五维指数总览">
      <defs>
        <linearGradient id="waveblue" x2="0" y2="1">
          <stop stopColor="#32b9d6" stopOpacity=".82" />
          <stop offset="1" stopColor="#6e9dee" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="wavepink" x2="0" y2="1">
          <stop stopColor="#e568c7" stopOpacity=".85" />
          <stop offset="1" stopColor="#b7a2f4" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <text
        x="544"
        y="46"
        textAnchor="middle"
        fill="#29bdc9"
        fontSize="28"
        fontWeight="750"
      >
        TRIMG
      </text>
      <path
        d="M0 198 C60 195 60 248 117 253 S182 265 206 246 S229 239 270 234 C304 231 301 161 330 165 C364 144 368 239 419 239 C460 239 478 234 515 245 S579 230 624 233 S672 235 717 260 S779 252 817 253 S885 261 922 255 C990 253 990 198 1088 201 L1088 330 H0Z"
        fill="url(#waveblue)"
      />
      <path
        d="M0 251 C55 273 83 255 112 232 C164 193 171 250 207 252 S274 274 318 241 S372 246 407 252 C464 278 490 178 539 197 S600 243 643 192 C676 92 717 133 740 184 C773 286 834 213 867 238 S926 196 965 222 S1020 269 1088 239 L1088 330 H0Z"
        fill="url(#wavepink)"
      />
      {dimensionInfo.map((d, i) => {
        const positions = [
          [157, 174],
          [358, 99],
          [554, 139],
          [758, 200],
          [947, 154],
        ];
        return (
          <g key={d.key}>
            <text
              x={positions[i][0]}
              y={positions[i][1]}
              textAnchor="middle"
              fill="currentColor"
              fontSize="17"
              fontWeight="700"
            >
              {scoreText(report.dimensions[d.key].score)}′ {d.english}
            </text>
            <text
              x={positions[i][0]}
              y={positions[i][1] + 21}
              textAnchor="middle"
              fill="currentColor"
              opacity=".65"
              fontSize="12"
            >
              {d.name}
            </text>
            <circle
              cx={positions[i][0]}
              cy={positions[i][1] + 41}
              r="4.5"
              fill={i % 2 ? "#27dbe7" : "#f573c4"}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        );
      })}
    </svg>
  );
}
export function StrengthCloud({ words }: { words: string[] }) {
  const [layout, setLayout] = useState<Array<{ text: string; x: number; y: number; size: number; rotate: number }>>([]);
  const content = JSON.stringify(words);
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    async function arrange() {
      const { default: cloud } = await import("d3-cloud");
      await document.fonts.ready;
      if (cancelled) return;
      const unique = [...new Set(JSON.parse(content) as string[])].filter(Boolean);
      const engine = cloud<{ text: string; size: number; x?: number; y?: number; rotate?: number }>()
        .size([460, 270])
        .words(unique.map((text, i) => ({ text, size: Math.min(38 - Math.min(i, 10) * 2, 350 / Math.max(text.length, 1)) })))
        .padding(4)
        .timeInterval(16)
        .rotate((_, i) => i % 5 === 4 ? 90 : 0)
        .font("sans-serif")
        .fontSize((word) => word.size)
        .random(() => 0.5)
        .on("end", (placed) => {
          if (!cancelled) setLayout(placed.map((word) => ({ text: word.text, x: word.x ?? 0, y: word.y ?? 0, size: word.size, rotate: word.rotate ?? 0 })));
        });
      stop = () => engine.stop();
      engine.start();
    }
    void arrange();
    return () => { cancelled = true; stop?.(); };
  }, [content]);
  return (
    <svg key={layout.map((word) => word.text).join("|")} viewBox="0 0 460 270" role="img" aria-label={`简历优势词云：${words.join("、")}`}>
      <g transform="translate(230 135)">
        {layout.map((word, i) => (
          <g key={word.text} transform={`translate(${word.x} ${word.y}) rotate(${word.rotate})`}>
            <text data-cloud-word="" fontFamily="sans-serif" fontSize={word.size} textAnchor="middle" fill={["#4192ff", "#7486ff", "#a89de9", "#6ecac9"][i % 4]}>{word.text}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
function RadarNumber({ value, delay }: { value: number; delay: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      () => {
        const start = performance.now();
        const tick = (now: number) => {
          const progress = reduced ? 1 : Math.min(1, (now - start) / 550);
          setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      reduced ? 0 : delay,
    );
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, delay]);
  return <>{display}′</>;
}

export function HeroRadar() {
  const labels = [
    "TRIMG指数",
    "内容完整度",
    "求职加分项",
    "文档设计性",
    "信息准确度",
  ];
  const colors = ["#16bedf", "#30bdf1", "#f14bb1", "#efbe1a", "#c669f0"];
  const spots = [
    [275, 40],
    [455, 157],
    [390, 349],
    [146, 349],
    [84, 157],
  ];
  const nums = [30, 25, 40, 20, 50];
  return (
    <svg viewBox="0 0 550 420" role="img" aria-label="五维分析雷达图">
      {[1, 0.8, 0.6, 0.4, 0.2].map((n, i) => (
        <polygon
          key={n}
          points={pentagon(143 * n, 275, 210)}
          fill={i === 0 ? "#9891fa" : "none"}
          fillOpacity=".12"
          stroke="#a09afa"
          strokeWidth=".8"
        />
      ))}
      {labels.map((label, i) => {
        const [x, y] = point(275, 210, 124, (i * Math.PI * 2) / 5);
        return (
          <g
            key={label}
            className={s.heroRadarMetric}
            data-radar-metric={i}
            style={{ animationDelay: `${650 + i * 500}ms` }}
          >
            <line
              x1="275"
              y1="210"
              x2={x}
              y2={y}
              stroke={colors[i]}
              strokeDasharray="6 4"
            />
            <circle cx={x} cy={y} r="4" fill={colors[i]} />
            <text
              x={spots[i][0]}
              y={spots[i][1] - 15}
              textAnchor="middle"
              fontSize="20"
              fontWeight="700"
              fill={colors[i]}
            >
              <RadarNumber value={nums[i]} delay={650 + i * 500} />
            </text>
            <rect
              x={spots[i][0] - 53}
              y={spots[i][1] - 4}
              width="106"
              height="27"
              rx="14"
              fill={colors[i]}
            />
            <text
              x={spots[i][0]}
              y={spots[i][1] + 14}
              textAnchor="middle"
              fontSize="12"
              fill="#203046"
            >
              {label}
            </text>
          </g>
        );
      })}
      <polygon
        className={s.radarPolygon}
        points={[0.5, 0.44, 0.87, 0.58, 0.88]
          .map((n, i) =>
            point(275, 210, 124 * n, (i * Math.PI * 2) / 5).join(","),
          )
          .join(" ")}
        fill="#5daef3"
        fillOpacity=".24"
        stroke="#47b6e3"
        strokeWidth="1.8"
      />
    </svg>
  );
}
