"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  CATEGORY_META,
  EMPTY_CATEGORY_COUNTS,
  FEEDING_TYPE_LABEL,
  PLANNER_TABS,
  STORAGE_KEY,
  VACCINE_HELP,
} from "@/app/planner/constants";
import type {
  ActivityCategory,
  FeedingType,
  PlannerState,
  PlannerTab,
  RecipientType,
  ScheduleType,
} from "@/app/planner/types";
import {
  createId,
  createInitialPlannerState,
  escapeCsvCell,
  formatDurationLabel,
  getAvailableCategories,
  getCalendarGrid,
  getDDayLabel,
  loadPlannerState,
  sortByDateTimeAsc,
  sortByTimeAsc,
  toDateKey,
  toTimeKey,
} from "@/app/planner/utils";

const QUICK_DATE_BUTTONS = [
  { label: "어제", offset: -1 },
  { label: "오늘", offset: 0 },
  { label: "내일", offset: 1 },
] as const;

const CHILD_STATUS_ITEMS: Array<{
  category: ActivityCategory;
  label: string;
  emoji: string;
  circleClass: string;
}> = [
  { category: "meal", label: "수유/식사", emoji: "🍼", circleClass: "bg-amber-400" },
  { category: "diaper", label: "기저귀", emoji: "🩲", circleClass: "bg-lime-400" },
  { category: "nap", label: "수면", emoji: "😴", circleClass: "bg-violet-400" },
  { category: "temperature", label: "체온", emoji: "🌡️", circleClass: "bg-rose-400" },
  { category: "daycare_dropoff", label: "등원", emoji: "🚌", circleClass: "bg-teal-400" },
];

const ELDER_STATUS_ITEMS: Array<{
  category: ActivityCategory;
  label: string;
  emoji: string;
  circleClass: string;
}> = [
  { category: "meal", label: "식사", emoji: "🍚", circleClass: "bg-amber-400" },
  { category: "medication", label: "복약", emoji: "💊", circleClass: "bg-fuchsia-400" },
  { category: "hospital", label: "병원", emoji: "🏥", circleClass: "bg-rose-400" },
  { category: "temperature", label: "체온", emoji: "🌡️", circleClass: "bg-orange-400" },
  { category: "nap", label: "휴식", emoji: "🛏️", circleClass: "bg-indigo-400" },
];

const TAB_ICONS: Record<PlannerTab, string> = {
  today: "📝",
  record: "📈",
  health: "❤️",
  schedule: "📅",
  report: "📊",
};

const GROWTH_PERCENTILE_CURVE_CONFIG = [
  { label: "25%", multiplier: 0.9, color: "#cbd5e1" },
  { label: "50%", multiplier: 1.0, color: "#94a3b8" },
  { label: "75%", multiplier: 1.08, color: "#64748b" },
  { label: "90%", multiplier: 1.15, color: "#475569" },
  { label: "97%", multiplier: 1.22, color: "#334155" },
] as const;

function estimateGrowthBaseWeight(day: number): number {
  return 3.1 + 8.2 * (1 - Math.exp(-day / 220)) + day * 0.0013;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatActivityRelative(date: string, time: string): string {
  const target = new Date(`${date}T${time}:00`);

  if (Number.isNaN(target.getTime())) {
    return date;
  }

  const diffMs = Date.now() - target.getTime();

  if (diffMs < 0) {
    return "방금 전";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "방금 전";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays <= 7) {
    return `${diffDays}일 전`;
  }

  return date;
}

export function PlannerClient() {
  const [planner, setPlanner] = useState<PlannerState>(loadPlannerState);
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));
  const [activeTab, setActiveTab] = useState<PlannerTab>("today");
  const [calendarMonth, setCalendarMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const [activityDraft, setActivityDraft] = useState({
    date: toDateKey(new Date()),
    time: toTimeKey(new Date()),
    category: "meal" as ActivityCategory,
    title: "",
    notes: "",
  });

  const [scheduleDraft, setScheduleDraft] = useState({
    type: "weekday" as ScheduleType,
    time: "09:00",
    label: "",
  });

  const [hospitalDraft, setHospitalDraft] = useState({
    date: toDateKey(new Date()),
    time: "10:00",
    title: "",
    description: "",
  });

  const [vaccineDraft, setVaccineDraft] = useState({
    date: toDateKey(new Date()),
    time: "10:00",
    vaccineName: "MMR",
    description: VACCINE_HELP.MMR,
  });

  const [vaccineRecordDraft, setVaccineRecordDraft] = useState({
    date: toDateKey(new Date()),
    name: "",
    note: "",
  });

  const [medicationRoutineDraft, setMedicationRoutineDraft] = useState({
    name: "",
    dosage: "1회",
    time: "08:00",
    note: "",
  });

  const [feedingDraft, setFeedingDraft] = useState({
    type: "formula" as FeedingType,
    amountMl: "120",
    note: "",
  });

  const [temperatureDraft, setTemperatureDraft] = useState({
    celsius: "37.0",
    note: "",
  });

  const [activeTimer, setActiveTimer] = useState<{
    mode: "feeding" | "sleep";
    startedAt: number;
  } | null>(null);

  const [timerNow, setTimerNow] = useState<number>(() => Date.now());
  const [quickActionsExpanded, setQuickActionsExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.innerWidth >= 768;
  });
  const [reportView, setReportView] = useState<"daily" | "weekly" | "interval">("daily");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(planner));
  }, [planner]);

  useEffect(() => {
    if (!activeTimer) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeTimer]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(message);

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  const applySelectedDate = (nextDate: string) => {
    setSelectedDate(nextDate);
    setActivityDraft((prev) => ({ ...prev, date: nextDate }));
  };

  const quickDateOptions = useMemo(() => {
    const base = new Date(`${selectedDate}T00:00:00`);
    const baseDate = Number.isNaN(base.getTime()) ? new Date() : base;

    return QUICK_DATE_BUTTONS.map((option) => {
      const nextDate = new Date(baseDate);
      nextDate.setDate(baseDate.getDate() + option.offset);

      return {
        label: option.label,
        date: toDateKey(nextDate),
      };
    });
  }, [selectedDate]);

  const availableCategories = useMemo(
    () => getAvailableCategories(planner.recipientType),
    [planner.recipientType],
  );

  const selectedCategory = availableCategories.includes(activityDraft.category)
    ? activityDraft.category
    : availableCategories[0] ?? "meal";

  const dayActivities = useMemo(
    () =>
      sortByDateTimeAsc(
        planner.activities.filter((entry) => entry.date === selectedDate),
      ),
    [planner.activities, selectedDate],
  );

  const eventCounts = useMemo(() => {
    return dayActivities.reduce<Record<ActivityCategory, number>>(
      (acc, entry) => {
        acc[entry.category] = (acc[entry.category] ?? 0) + 1;
        return acc;
      },
      { ...EMPTY_CATEGORY_COUNTS },
    );
  }, [dayActivities]);

  const sortedAppointments = useMemo(
    () => sortByDateTimeAsc(planner.appointments),
    [planner.appointments],
  );

  const nextVaccineAppointment = useMemo(
    () =>
      sortedAppointments.find(
        (appointment) => appointment.kind === "vaccine" && !appointment.completed,
      ) ?? null,
    [sortedAppointments],
  );

  const dayOfWeek = useMemo(() => {
    const day = new Date(`${selectedDate}T00:00:00`).getDay();
    return day === 0 || day === 6 ? "weekend" : "weekday";
  }, [selectedDate]);

  const activeSchedule = planner.schedules[dayOfWeek];

  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, { count: number; tags: string[] }>();

    const pushEvent = (date: string, tag: string) => {
      const current = map.get(date);
      if (!current) {
        map.set(date, { count: 1, tags: [tag] });
        return;
      }

      current.count += 1;
      if (current.tags.length < 2) {
        current.tags.push(tag);
      }
      map.set(date, current);
    };

    planner.activities.forEach((entry) => {
      pushEvent(entry.date, CATEGORY_META[entry.category].label);
    });

    planner.appointments.forEach((appointment) => {
      pushEvent(
        appointment.date,
        appointment.kind === "vaccine" ? "접종예약" : "병원예약",
      );
    });

    planner.vaccineRecords.forEach((record) => {
      pushEvent(record.date, "접종완료");
    });

    return map;
  }, [planner.activities, planner.appointments, planner.vaccineRecords]);

  const [calendarYear, calendarMonthNumber] = calendarMonth
    .split("-")
    .map((value) => Number.parseInt(value, 10));

  const calendarGrid = useMemo(
    () => getCalendarGrid(calendarYear, (calendarMonthNumber || 1) - 1),
    [calendarMonthNumber, calendarYear],
  );

  const daycareEntries = dayActivities.filter(
    (entry) =>
      entry.category === "daycare_dropoff" || entry.category === "daycare_pickup",
  );

  const medicationEntries = dayActivities.filter(
    (entry) => entry.category === "medication",
  );

  const vaccineAppointments = sortedAppointments.filter(
    (appointment) => appointment.kind === "vaccine",
  );

  const hospitalAppointments = sortedAppointments.filter(
    (appointment) => appointment.kind === "hospital",
  );

  const medicationRoutines = useMemo(
    () => sortByTimeAsc(planner.medicationRoutines),
    [planner.medicationRoutines],
  );

  const takenRoutineCount = medicationRoutines.filter((item) =>
    item.takenDates.includes(selectedDate),
  ).length;

  const daySummary = useMemo(() => {
    return {
      total: dayActivities.length,
      byCategory: eventCounts,
    };
  }, [dayActivities.length, eventCounts]);

  const weekSummary = useMemo(() => {
    const selected = new Date(`${selectedDate}T00:00:00`);
    const weekday = selected.getDay();
    const moveToMonday = weekday === 0 ? -6 : 1 - weekday;

    const start = new Date(selected);
    start.setDate(selected.getDate() + moveToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startKey = toDateKey(start);
    const endKey = toDateKey(end);

    const weeklyActivities = planner.activities.filter(
      (entry) => entry.date >= startKey && entry.date <= endKey,
    );

    const checkedMedicationCount = planner.medicationRoutines.reduce((sum, routine) => {
      const count = routine.takenDates.filter(
        (date) => date >= startKey && date <= endKey,
      ).length;

      return sum + count;
    }, 0);

    const medicationTargetCount = planner.medicationRoutines.length * 7;
    const medicationRate =
      medicationTargetCount > 0
        ? Math.round((checkedMedicationCount / medicationTargetCount) * 100)
        : 0;

    return {
      startKey,
      endKey,
      activityCount: weeklyActivities.length,
      checkedMedicationCount,
      medicationTargetCount,
      medicationRate,
    };
  }, [planner.activities, planner.medicationRoutines, selectedDate]);

  const hourlyActivityCounts = useMemo(() => {
    const counts = Array.from({ length: 24 }, () => 0);

    dayActivities.forEach((entry) => {
      const hour = Number.parseInt(entry.time.split(":")[0] ?? "0", 10);
      if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) {
        counts[hour] += 1;
      }
    });

    return counts;
  }, [dayActivities]);

  const maxHourlyActivityCount = useMemo(() => {
    return Math.max(1, ...hourlyActivityCounts);
  }, [hourlyActivityCounts]);

  const timerElapsedSeconds = activeTimer
    ? Math.max(0, Math.floor((timerNow - activeTimer.startedAt) / 1000))
    : 0;

  const visibleTabs = useMemo(
    () =>
      planner.recipientType === "elder"
        ? PLANNER_TABS.filter((tab) => ["today", "health", "schedule"].includes(tab.id))
        : PLANNER_TABS,
    [planner.recipientType],
  );

  const effectiveTab: PlannerTab =
    visibleTabs.find((tab) => tab.id === activeTab)?.id ?? "today";

  const nextTodoItems = useMemo(() => {
    const todos: Array<{
      type: "medication" | "vaccine" | "hospital";
      title: string;
      description: string;
      severity: "critical" | "warning";
    }> = [];

    const pendingRoutine = medicationRoutines.find(
      (routine) => !routine.takenDates.includes(selectedDate),
    );

    if (pendingRoutine) {
      todos.push({
        type: "medication",
        title: `복약 미완료 · ${pendingRoutine.time} ${pendingRoutine.name}`,
        description: pendingRoutine.note || "복약 체크리스트에서 완료 처리해 주세요.",
        severity: "critical",
      });
    }

    if (nextVaccineAppointment) {
      todos.push({
        type: "vaccine",
        title: `${nextVaccineAppointment.title} ${getDDayLabel(nextVaccineAppointment.date)}`,
        description: `${nextVaccineAppointment.date} ${nextVaccineAppointment.time}`,
        severity: "warning",
      });
    }

    const nextHospital = hospitalAppointments.find((appointment) => !appointment.completed);
    if (nextHospital) {
      todos.push({
        type: "hospital",
        title: `병원 일정 · ${nextHospital.title}`,
        description: `${nextHospital.date} ${nextHospital.time}`,
        severity: "warning",
      });
    }

    return todos.slice(0, 3);
  }, [
    hospitalAppointments,
    medicationRoutines,
    nextVaccineAppointment,
    selectedDate,
  ]);

  const recentActivityByCategory = useMemo(() => {
    const sorted = [...planner.activities].sort((a, b) =>
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    );

    const map = new Map<ActivityCategory, { date: string; time: string; title: string }>();

    sorted.forEach((entry) => {
      if (!map.has(entry.category)) {
        map.set(entry.category, entry);
      }
    });

    return map;
  }, [planner.activities]);

  const quickStatusItems = useMemo(() => {
    const presets = planner.recipientType === "child" ? CHILD_STATUS_ITEMS : ELDER_STATUS_ITEMS;

    return presets.map((preset) => {
      const recent = recentActivityByCategory.get(preset.category);

      return {
        ...preset,
        recentText: recent
          ? `${formatActivityRelative(recent.date, recent.time)} · ${recent.title}`
          : "기록 없음",
      };
    });
  }, [planner.recipientType, recentActivityByCategory]);

  const ageInDays = Math.max(0, Math.round(planner.ageMonths * 30.4));

  const patternRingGradient = useMemo(() => {
    const total = hourlyActivityCounts.reduce((sum, count) => sum + count, 0);

    if (total <= 0) {
      return "conic-gradient(#e2e8f0 0deg 360deg)";
    }

    let currentAngle = 0;
    const pieces: string[] = [];

    hourlyActivityCounts.forEach((count) => {
      if (count <= 0) {
        return;
      }

      const nextAngle = currentAngle + (count / total) * 360;
      const lightness = Math.max(
        45,
        84 - Math.round((count / Math.max(1, maxHourlyActivityCount)) * 30),
      );

      pieces.push(`hsl(219 72% ${lightness}%) ${currentAngle}deg ${nextAngle}deg`);
      currentAngle = nextAngle;
    });

    if (currentAngle < 360) {
      pieces.push(`#e2e8f0 ${currentAngle}deg 360deg`);
    }

    return `conic-gradient(${pieces.join(",")})`;
  }, [hourlyActivityCounts, maxHourlyActivityCount]);

  const weeklyPatternCounts = useMemo(() => {
    const weekStart = new Date(`${weekSummary.startKey}T00:00:00`);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);

      const dateKey = toDateKey(date);
      const count = planner.activities.filter((entry) => entry.date === dateKey).length;
      const dayLabel = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date);

      return {
        dateKey,
        dayLabel,
        count,
      };
    });
  }, [planner.activities, weekSummary.startKey]);

  const averageMealIntervalHours = useMemo(() => {
    const mealEntries = dayActivities
      .filter((entry) => entry.category === "meal")
      .sort((a, b) => a.time.localeCompare(b.time));

    if (mealEntries.length < 2) {
      return null;
    }

    let totalMinutes = 0;

    for (let index = 1; index < mealEntries.length; index += 1) {
      const prev = mealEntries[index - 1];
      const next = mealEntries[index];
      const prevMinutes = Number.parseInt(prev.time.slice(0, 2), 10) * 60 + Number.parseInt(prev.time.slice(3, 5), 10);
      const nextMinutes = Number.parseInt(next.time.slice(0, 2), 10) * 60 + Number.parseInt(next.time.slice(3, 5), 10);

      totalMinutes += Math.max(0, nextMinutes - prevMinutes);
    }

    const avgMinutes = totalMinutes / (mealEntries.length - 1);
    return Math.round((avgMinutes / 60) * 10) / 10;
  }, [dayActivities]);

  const growthChartWidth = 320;
  const growthChartHeight = 220;
  const growthMinKg = 3;
  const growthMaxKg = 19;
  const growthMaxDay = Math.max(1000, Math.ceil(Math.max(ageInDays, 30) / 100) * 100);

  const growthReferenceCurves = useMemo(() => {
    const toX = (day: number) => (day / growthMaxDay) * growthChartWidth;
    const toY = (kg: number) => {
      const normalized = (kg - growthMinKg) / (growthMaxKg - growthMinKg);
      return growthChartHeight - clampNumber(normalized, 0, 1) * growthChartHeight;
    };

    return GROWTH_PERCENTILE_CURVE_CONFIG.map((curve) => {
      const points = Array.from({ length: 41 }, (_, index) => {
        const day = (growthMaxDay / 40) * index;
        const kg = estimateGrowthBaseWeight(day) * curve.multiplier;

        return {
          day,
          kg,
          x: toX(day),
          y: toY(kg),
        };
      });

      const path = points
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(" ");

      return {
        ...curve,
        points,
        path,
      };
    });
  }, [
    growthChartHeight,
    growthChartWidth,
    growthMaxDay,
    growthMaxKg,
    growthMinKg,
  ]);

  const growthObservedPoints = useMemo(() => {
    const toX = (day: number) => (day / growthMaxDay) * growthChartWidth;
    const toY = (kg: number) => {
      const normalized = (kg - growthMinKg) / (growthMaxKg - growthMinKg);
      return growthChartHeight - clampNumber(normalized, 0, 1) * growthChartHeight;
    };

    const sampleCount = 16;

    return Array.from({ length: sampleCount }, (_, index) => {
      const day = Math.round((ageInDays / (sampleCount - 1)) * index);
      const baseline = estimateGrowthBaseWeight(day);
      const trendBoost = planner.recipientType === "child" ? 1.03 : 0.97;
      const variation = Math.sin(day / 55) * 0.22;
      const kg = clampNumber(baseline * trendBoost + variation, growthMinKg, growthMaxKg);

      return {
        day,
        kg: Math.round(kg * 10) / 10,
        x: toX(day),
        y: toY(kg),
      };
    });
  }, [
    ageInDays,
    growthChartHeight,
    growthChartWidth,
    growthMaxDay,
    growthMaxKg,
    growthMinKg,
    planner.recipientType,
  ]);

  const growthObservedPath = useMemo(() => {
    if (growthObservedPoints.length === 0) {
      return "";
    }

    return growthObservedPoints
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
  }, [growthObservedPoints]);

  const currentGrowthPoint =
    growthObservedPoints[growthObservedPoints.length - 1]
    ?? {
      day: ageInDays,
      kg: clampNumber(estimateGrowthBaseWeight(ageInDays), growthMinKg, growthMaxKg),
      x: (ageInDays / growthMaxDay) * growthChartWidth,
      y: growthChartHeight / 2,
    };

  const currentGrowthPercentile = useMemo(() => {
    const baseline = estimateGrowthBaseWeight(currentGrowthPoint.day);

    if (!baseline) {
      return 50;
    }

    const ratio = currentGrowthPoint.kg / baseline;
    const percentile = 25 + ((ratio - 0.9) / (1.22 - 0.9)) * (97 - 25);

    return Math.round(clampNumber(percentile, 3, 99) * 10) / 10;
  }, [currentGrowthPoint.day, currentGrowthPoint.kg]);

  const growthYAxisTicks = [3, 6, 9, 12, 15, 18];

  const growthXAxisTicks = useMemo(() => {
    const step = 200;

    return Array.from({ length: Math.floor(growthMaxDay / step) + 1 }, (_, index) => {
      const day = index * step;
      const x = (day / growthMaxDay) * growthChartWidth;

      return {
        day,
        x,
      };
    });
  }, [growthChartWidth, growthMaxDay]);

  const weeklyPatternMax = useMemo(() => {
    return Math.max(1, ...weeklyPatternCounts.map((item) => item.count));
  }, [weeklyPatternCounts]);

  const addActivity = () => {
    const title = activityDraft.title.trim() || CATEGORY_META[selectedCategory].label;

    setPlanner((prev) => ({
      ...prev,
      activities: sortByDateTimeAsc([
        ...prev.activities,
        {
          id: createId(),
          date: activityDraft.date,
          time: activityDraft.time,
          category: selectedCategory,
          title,
          notes: activityDraft.notes.trim(),
        },
      ]),
    }));

    setSelectedDate(activityDraft.date);
    setActivityDraft((prev) => ({
      ...prev,
      title: "",
      notes: "",
    }));
  };

  const addQuickActivity = (
    category: ActivityCategory,
    title: string,
    notes = "",
  ) => {
    if (!CATEGORY_META[category].recipientTypes.includes(planner.recipientType)) {
      return;
    }

    setPlanner((prev) => ({
      ...prev,
      activities: sortByDateTimeAsc([
        ...prev.activities,
        {
          id: createId(),
          date: selectedDate,
          time: toTimeKey(new Date()),
          category,
          title,
          notes,
        },
      ]),
    }));

    setActivityDraft((prev) => ({
      ...prev,
      date: selectedDate,
      category,
      title,
      notes,
    }));

    triggerToast(`✅ ${CATEGORY_META[category].label} 기록 완료`);
  };

  const addDetailedFeeding = () => {
    const feedLabel = FEEDING_TYPE_LABEL[feedingDraft.type];

    const autoNotes: string[] = [];
    if (feedingDraft.type === "formula" && feedingDraft.amountMl.trim()) {
      autoNotes.push(`${feedingDraft.amountMl.trim()}ml`);
    }

    if (feedingDraft.note.trim()) {
      autoNotes.push(feedingDraft.note.trim());
    }

    addQuickActivity("meal", `빠른기록 · ${feedLabel}`, autoNotes.join(" · "));
    setFeedingDraft((prev) => ({ ...prev, note: "" }));
  };

  const addTemperatureRecord = () => {
    const temperatureValue = temperatureDraft.celsius.trim();
    const note = temperatureDraft.note.trim();

    if (!temperatureValue) {
      return;
    }

    const notes = [
      `${temperatureValue}°C`,
      note,
    ]
      .filter(Boolean)
      .join(" · ");

    addQuickActivity("temperature", "빠른기록 · 체온 측정", notes);

    setTemperatureDraft((prev) => ({
      ...prev,
      note: "",
    }));
  };

  const exportSelectedDateCsv = () => {
    const rows: string[][] = [["유형", "날짜", "시간", "분류", "제목", "메모"]];

    dayActivities.forEach((entry) => {
      rows.push([
        "활동",
        entry.date,
        entry.time,
        CATEGORY_META[entry.category].label,
        entry.title,
        entry.notes,
      ]);
    });

    sortedAppointments
      .filter((appointment) => appointment.date === selectedDate)
      .forEach((appointment) => {
        rows.push([
          "예약",
          appointment.date,
          appointment.time,
          appointment.kind === "vaccine" ? "접종" : "병원",
          appointment.title,
          appointment.description,
        ]);
      });

    planner.vaccineRecords
      .filter((record) => record.date === selectedDate)
      .forEach((record) => {
        rows.push([
          "접종완료",
          record.date,
          "",
          "접종",
          record.name,
          record.note,
        ]);
      });

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvCell(cell ?? "")).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `familycare-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startTimer = (mode: "feeding" | "sleep") => {
    const now = Date.now();
    setTimerNow(now);
    setActiveTimer({ mode, startedAt: now });
  };

  const stopTimerAndSave = () => {
    if (!activeTimer) {
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - activeTimer.startedAt) / 1000));
    const durationLabel = formatDurationLabel(elapsedSeconds);

    if (activeTimer.mode === "feeding") {
      addQuickActivity("meal", "타이머 기록 · 수유", `소요 ${durationLabel}`);
    } else {
      addQuickActivity("nap", "타이머 기록 · 수면", `소요 ${durationLabel}`);
    }

    setActiveTimer(null);
  };

  const cancelTimer = () => {
    setActiveTimer(null);
  };

  const removeActivity = (id: string) => {
    setPlanner((prev) => ({
      ...prev,
      activities: prev.activities.filter((entry) => entry.id !== id),
    }));
  };

  const addSchedule = () => {
    if (!scheduleDraft.label.trim()) {
      return;
    }

    setPlanner((prev) => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [scheduleDraft.type]: sortByTimeAsc([
          ...prev.schedules[scheduleDraft.type],
          {
            id: createId(),
            time: scheduleDraft.time,
            label: scheduleDraft.label.trim(),
          },
        ]),
      },
    }));

    setScheduleDraft((prev) => ({ ...prev, label: "" }));
  };

  const removeSchedule = (type: ScheduleType, id: string) => {
    setPlanner((prev) => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [type]: prev.schedules[type].filter((item) => item.id !== id),
      },
    }));
  };

  const copyScheduleTemplate = (from: ScheduleType, to: ScheduleType) => {
    setPlanner((prev) => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [to]: prev.schedules[from].map((item) => ({
          ...item,
          id: createId(),
        })),
      },
    }));
  };

  const addMedicationRoutine = () => {
    if (!medicationRoutineDraft.name.trim()) {
      return;
    }

    setPlanner((prev) => ({
      ...prev,
      medicationRoutines: sortByTimeAsc([
        ...prev.medicationRoutines,
        {
          id: createId(),
          name: medicationRoutineDraft.name.trim(),
          dosage: medicationRoutineDraft.dosage.trim(),
          time: medicationRoutineDraft.time,
          note: medicationRoutineDraft.note.trim(),
          takenDates: [],
        },
      ]),
    }));

    setMedicationRoutineDraft((prev) => ({
      ...prev,
      name: "",
      note: "",
    }));
  };

  const toggleMedicationRoutineTaken = (routineId: string) => {
    setPlanner((prev) => ({
      ...prev,
      medicationRoutines: prev.medicationRoutines.map((routine) => {
        if (routine.id !== routineId) {
          return routine;
        }

        const exists = routine.takenDates.includes(selectedDate);
        return {
          ...routine,
          takenDates: exists
            ? routine.takenDates.filter((date) => date !== selectedDate)
            : [...routine.takenDates, selectedDate],
        };
      }),
    }));
  };

  const removeMedicationRoutine = (routineId: string) => {
    setPlanner((prev) => ({
      ...prev,
      medicationRoutines: prev.medicationRoutines.filter((routine) => routine.id !== routineId),
    }));
  };

  const addHospitalAppointment = () => {
    if (!hospitalDraft.title.trim()) {
      return;
    }

    setPlanner((prev) => ({
      ...prev,
      appointments: sortByDateTimeAsc([
        ...prev.appointments,
        {
          id: createId(),
          date: hospitalDraft.date,
          time: hospitalDraft.time,
          kind: "hospital",
          title: hospitalDraft.title.trim(),
          description: hospitalDraft.description.trim(),
          completed: false,
        },
      ]),
    }));

    setHospitalDraft((prev) => ({
      ...prev,
      title: "",
      description: "",
    }));
  };

  const addVaccineAppointment = () => {
    if (!vaccineDraft.vaccineName.trim()) {
      return;
    }

    setPlanner((prev) => ({
      ...prev,
      appointments: sortByDateTimeAsc([
        ...prev.appointments,
        {
          id: createId(),
          date: vaccineDraft.date,
          time: vaccineDraft.time,
          kind: "vaccine",
          title: vaccineDraft.vaccineName,
          description: vaccineDraft.description.trim(),
          completed: false,
        },
      ]),
    }));
  };

  const toggleAppointmentComplete = (appointmentId: string) => {
    setPlanner((prev) => {
      const target = prev.appointments.find((row) => row.id === appointmentId);
      if (!target) {
        return prev;
      }

      const nextCompleted = !target.completed;
      const nextAppointments = prev.appointments.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, completed: nextCompleted }
          : appointment,
      );

      let nextVaccineRecords = prev.vaccineRecords;

      if (target.kind === "vaccine") {
        if (nextCompleted) {
          const exists = prev.vaccineRecords.some(
            (record) => record.sourceAppointmentId === target.id,
          );

          if (!exists) {
            nextVaccineRecords = [
              {
                id: createId(),
                name: target.title,
                date: target.date,
                note: target.description || "예약 기반 완료 처리",
                sourceAppointmentId: target.id,
              },
              ...prev.vaccineRecords,
            ];
          }
        } else {
          nextVaccineRecords = prev.vaccineRecords.filter(
            (record) => record.sourceAppointmentId !== target.id,
          );
        }
      }

      return {
        ...prev,
        appointments: nextAppointments,
        vaccineRecords: nextVaccineRecords,
      };
    });
  };

  const addVaccineRecord = () => {
    if (!vaccineRecordDraft.name.trim()) {
      return;
    }

    setPlanner((prev) => ({
      ...prev,
      vaccineRecords: [
        {
          id: createId(),
          name: vaccineRecordDraft.name.trim(),
          date: vaccineRecordDraft.date,
          note: vaccineRecordDraft.note.trim(),
        },
        ...prev.vaccineRecords,
      ],
    }));

    setVaccineRecordDraft((prev) => ({ ...prev, name: "", note: "" }));
  };

  const resetPlanner = () => {
    setPlanner(createInitialPlannerState());
    setSelectedDate(toDateKey(new Date()));
    setActiveTimer(null);
  };

  const donutTotal = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);

  const chartSlices = useMemo(() => {
    const rows = (Object.keys(CATEGORY_META) as ActivityCategory[])
      .map((category) => ({
        category,
        count: eventCounts[category],
      }))
      .filter((row) => row.count > 0);

    if (rows.length === 0) {
      return [] as Array<{ category: ActivityCategory; count: number; percent: number }>;
    }

    return rows.map((row) => ({
      ...row,
      percent: row.count / donutTotal,
    }));
  }, [donutTotal, eventCounts]);

  const getTabId = (tabId: PlannerTab) => `planner-tab-${tabId}`;
  const getPanelId = (tabId: PlannerTab) => `planner-panel-${tabId}`;

  const focusTabByIndex = (index: number) => {
    const nextTab = visibleTabs[index];

    if (!nextTab) {
      return;
    }

    setActiveTab(nextTab.id);

    window.requestAnimationFrame(() => {
      const element = document.getElementById(getTabId(nextTab.id));
      element?.focus();
      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: PlannerTab) => {
    const currentIndex = visibleTabs.findIndex((tab) => tab.id === tabId);

    if (currentIndex < 0) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTabByIndex((currentIndex + 1) % visibleTabs.length);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTabByIndex((currentIndex - 1 + visibleTabs.length) % visibleTabs.length);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusTabByIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusTabByIndex(visibleTabs.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setActiveTab(tabId);
    }
  };

  return (
    <div
      className={`space-y-6 pb-24 md:pb-6 ${
        planner.recipientType === "elder" && planner.elderLargeText
          ? "text-[17px] leading-7"
          : ""
      }`}
    >
      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className="max-w-sm rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            {toastMessage}
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-sky-900">임시 공개 테스트 모드</h2>
            <p className="mt-1 text-sm text-sky-800">
              로그인 없이 전체 기능 테스트 가능 · 브라우저 로컬 저장소에 저장됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={resetPlanner}
            className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
          >
            샘플 데이터로 초기화
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur md:sticky md:top-0 md:z-20 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">오늘의 대상자</p>
            <p className="text-lg font-semibold text-slate-900">
              {planner.recipientType === "child" ? "👶" : "🧓"} {planner.recipientName || "대상자"}
              <span className="ml-2 text-sm font-medium text-slate-500">({planner.ageMonths}개월)</span>
            </p>
            <p className="text-xs text-slate-500">
              보호자 {planner.guardianName || "보호자"} · {planner.recipientType === "child" ? "영유아/어린이" : "어르신"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="radiogroup"
              aria-label="빠른 날짜 선택"
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1"
            >
              {quickDateOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={selectedDate === option.date}
                  onClick={() => applySelectedDate(option.date)}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                    selectedDate === option.date
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="text-sm text-slate-700">
              날짜
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => applySelectedDate(event.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <select
              value={planner.recipientType}
              onChange={(event) => {
                const nextRecipientType = event.target.value as RecipientType;

                setPlanner((prev) => ({
                  ...prev,
                  recipientType: nextRecipientType,
                }));

                const nextCategories = getAvailableCategories(nextRecipientType);
                setActivityDraft((prev) => ({
                  ...prev,
                  category: nextCategories[0] ?? "meal",
                }));

                if (
                  nextRecipientType === "elder"
                  && !["today", "health", "schedule"].includes(activeTab)
                ) {
                  setActiveTab("today");
                }
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              <option value="child">영유아 모드</option>
              <option value="elder">어르신 모드</option>
            </select>
            <button
              type="button"
              onClick={exportSelectedDateCsv}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              CSV
            </button>
            <Link
              href="/settings"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              설정
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {planner.ageMonths}개월 · D+{ageInDays}
              </p>
              <p className="text-xs text-slate-500">
                베이비타임 스타일 요약 카드 (최근 기록 기반)
              </p>
            </div>
            <p className="text-xs font-medium text-slate-500">{selectedDate}</p>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {quickStatusItems.map((item) => (
              <div
                key={`${item.category}-${item.label}`}
                className="min-w-[92px] rounded-2xl border border-white/60 bg-white px-2 py-2 text-center shadow-sm"
              >
                <div
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-sm ${item.circleClass}`}
                  aria-hidden="true"
                >
                  {item.emoji}
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-800">{item.label}</p>
                <p className="mt-0.5 min-h-[2rem] text-[11px] leading-4 text-slate-500">{item.recentText}</p>
              </div>
            ))}
          </div>
        </div>

        {planner.recipientType === "elder" ? (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={planner.elderLargeText}
              onChange={(event) =>
                setPlanner((prev) => ({ ...prev, elderLargeText: event.target.checked }))
              }
              className="h-4 w-4"
            />
            어르신 가독성 모드(큰 글씨)
          </label>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">빠른기록</p>
            <button
              type="button"
              onClick={() => setQuickActionsExpanded((prev) => !prev)}
              aria-expanded={quickActionsExpanded}
              aria-controls="planner-quick-actions"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {quickActionsExpanded ? "접기 ▲" : "펼치기 ▼"}
            </button>
          </div>
          <p className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
            [퀵 노트 도움말] 빠른기록 버튼을 누르면 최근 패턴을 더 쉽게 남기실 수 있어요.
          </p>

          {quickActionsExpanded ? (
            <div
              id="planner-quick-actions"
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:flex md:gap-2 md:overflow-x-auto pb-1"
            >
              {planner.recipientType === "child" ? (
                <>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("meal", "빠른기록 · 식사")}
                    aria-label="빠른기록 식사 추가"
                    className="shrink-0 rounded-full border border-sky-300 bg-sky-50 min-h-[48px] px-3 py-3 text-sm text-sky-700 transition-transform active:scale-95"
                  >
                    🍼 식사
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("nap", "빠른기록 · 수면")}
                    aria-label="빠른기록 수면 추가"
                    className="shrink-0 rounded-full border border-violet-300 bg-violet-50 min-h-[48px] px-3 py-3 text-sm text-violet-700 transition-transform active:scale-95"
                  >
                    😴 수면
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("diaper", "빠른기록 · 기저귀(소변)")}
                    aria-label="빠른기록 기저귀 추가"
                    className="shrink-0 rounded-full border border-lime-300 bg-lime-50 min-h-[48px] px-3 py-3 text-sm text-lime-700 transition-transform active:scale-95"
                  >
                    🩲 기저귀
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addQuickActivity("temperature", "빠른기록 · 체온 측정", `${temperatureDraft.celsius}°C`)
                    }
                    aria-label="빠른기록 체온 추가"
                    className="shrink-0 rounded-full border border-amber-300 bg-amber-50 min-h-[48px] px-3 py-3 text-sm text-amber-700 transition-transform active:scale-95"
                  >
                    🌡️ 체온
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("meal", "빠른기록 · 식사")}
                    aria-label="빠른기록 식사 추가"
                    className="shrink-0 rounded-full border border-sky-300 bg-sky-50 min-h-[48px] px-3 py-3 text-sm text-sky-700 transition-transform active:scale-95"
                  >
                    🍚 식사
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("medication", "빠른기록 · 복약 완료")}
                    aria-label="빠른기록 복약 추가"
                    className="shrink-0 rounded-full border border-pink-300 bg-pink-50 min-h-[48px] px-3 py-3 text-sm text-pink-700 transition-transform active:scale-95"
                  >
                    💊 복약
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("hospital", "빠른기록 · 병원 방문")}
                    aria-label="빠른기록 병원 방문 추가"
                    className="shrink-0 rounded-full border border-rose-300 bg-rose-50 min-h-[48px] px-3 py-3 text-sm text-rose-700 transition-transform active:scale-95"
                  >
                    🏥 병원
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div
          className="flex gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-100 p-1"
          role="tablist"
          aria-label="플래너 탭"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              id={getTabId(tab.id)}
              type="button"
              role="tab"
              tabIndex={effectiveTab === tab.id ? 0 : -1}
              aria-selected={effectiveTab === tab.id}
              aria-controls={getPanelId(tab.id)}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              onFocus={(event) => {
                event.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              className={`snap-start shrink-0 min-h-[42px] min-w-[72px] rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                effectiveTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 md:hidden">탭을 좌우로 밀어 더 보실 수 있어요.</p>
      </section>

      {effectiveTab === "today" ? (
        <section
          id={getPanelId("today")}
          role="tabpanel"
          aria-labelledby={getTabId("today")}
          tabIndex={0}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">오늘 요약</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{daySummary.byCategory.meal}</p>
                <p className="text-xs text-slate-500">식사</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{daySummary.byCategory.nap}</p>
                <p className="text-xs text-slate-500">수면</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{daySummary.byCategory.diaper}</p>
                <p className="text-xs text-slate-500">기저귀</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-xl font-bold text-slate-900">{daySummary.byCategory.temperature}</p>
                <p className="text-xs text-slate-500">체온</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">일과표 기록</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {selectedDate}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {dayActivities.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-500">
                  선택한 날짜의 기록이 없습니다.
                </li>
              ) : (
                dayActivities.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[64px_1fr_auto] items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3"
                  >
                    <p className="text-base font-semibold text-slate-800">{entry.time}</p>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_META[entry.category].color }}
                        />
                        {CATEGORY_META[entry.category].label}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-800">{entry.title}</p>
                      {entry.notes ? <p className="mt-1 text-xs text-slate-500">{entry.notes}</p> : null}
                    </div>
                    <span className="text-lg text-slate-300">›</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">다음 할 일</h3>
            <div className="mt-3 space-y-2 text-sm">
              {nextTodoItems.length === 0 ? (
                <p className="rounded-lg border border-slate-200 p-3 text-slate-500">현재 예정된 알림이 없습니다.</p>
              ) : (
                nextTodoItems.map((todo) => (
                  <div
                    key={`${todo.type}-${todo.title}`}
                    className={`rounded-lg p-3 ${
                      todo.severity === "critical"
                        ? "border border-rose-300 bg-rose-50 text-rose-800"
                        : "border border-amber-300 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <p className="font-semibold">{todo.title}</p>
                    <p className="text-xs">{todo.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {effectiveTab === "record" ? (
        <section
          id={getPanelId("record")}
          role="tabpanel"
          aria-labelledby={getTabId("record")}
          tabIndex={0}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">24시간 활동 기록</h3>
            <p className="mt-1 text-sm text-slate-600">
              언제 무엇을 했는지 시간 단위로 기록하고, 동그란 그래프로 한눈에 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm text-slate-700">
              기준 날짜
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => applySelectedDate(event.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={exportSelectedDateCsv}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              선택일 CSV 내보내기
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">일간 요약 ({selectedDate})</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
              <p>총 기록: <span className="font-semibold">{daySummary.total}건</span></p>
              <p>식사: <span className="font-semibold">{daySummary.byCategory.meal}건</span></p>
              <p>수면: <span className="font-semibold">{daySummary.byCategory.nap}건</span></p>
              <p>기저귀: <span className="font-semibold">{daySummary.byCategory.diaper}건</span></p>
              <p>복약: <span className="font-semibold">{daySummary.byCategory.medication}건</span></p>
              <p>체온: <span className="font-semibold">{daySummary.byCategory.temperature}건</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              주간 요약 ({weekSummary.startKey} ~ {weekSummary.endKey})
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p>주간 활동: <span className="font-semibold">{weekSummary.activityCount}건</span></p>
              <p>
                복약 체크: <span className="font-semibold">{weekSummary.checkedMedicationCount}</span>
                /{weekSummary.medicationTargetCount}회
              </p>
              <p>복약 달성률: <span className="font-semibold">{weekSummary.medicationRate}%</span></p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">활동 분포 도넛 차트</p>
            <div className="mt-4 flex justify-center">
              <svg width="180" height="180" viewBox="0 0 180 180" aria-label="활동 분포">
                <g transform="translate(90 90) rotate(-90)">
                  <circle r="62" cx="0" cy="0" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                  {chartSlices.length > 0
                    ? (() => {
                        const circumference = 2 * Math.PI * 62;
                        let offset = 0;

                        return chartSlices.map((slice) => {
                          const length = slice.percent * circumference;
                          const rendered = (
                            <circle
                              key={slice.category}
                              r="62"
                              cx="0"
                              cy="0"
                              fill="none"
                              stroke={CATEGORY_META[slice.category].color}
                              strokeWidth="20"
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              strokeLinecap="butt"
                            />
                          );
                          offset += length;
                          return rendered;
                        });
                      })()
                    : null}
                </g>
                <text x="90" y="84" textAnchor="middle" className="fill-slate-500 text-xs">
                  총 활동
                </text>
                <text x="90" y="106" textAnchor="middle" className="fill-slate-900 text-lg font-semibold">
                  {donutTotal}건
                </text>
              </svg>
            </div>

            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {chartSlices.length === 0 ? (
                <li className="text-slate-500">해당 날짜 기록이 아직 없습니다.</li>
              ) : (
                chartSlices.map((slice) => (
                  <li key={slice.category} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_META[slice.category].color }}
                      />
                      {CATEGORY_META[slice.category].label}
                    </span>
                    <span className="font-medium">{slice.count}건</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">활동 추가</p>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm text-slate-700">
                날짜
                <input
                  type="date"
                  value={activityDraft.date}
                  onChange={(event) =>
                    setActivityDraft((prev) => ({ ...prev, date: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                시간
                <input
                  type="time"
                  value={activityDraft.time}
                  onChange={(event) =>
                    setActivityDraft((prev) => ({ ...prev, time: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                활동 유형
                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setActivityDraft((prev) => ({
                      ...prev,
                      category: event.target.value as ActivityCategory,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_META[category].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                제목
                <input
                  value={activityDraft.title}
                  onChange={(event) =>
                    setActivityDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="예: 점심 이유식 / 해열제 복용"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                메모
                <input
                  value={activityDraft.notes}
                  onChange={(event) =>
                    setActivityDraft((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="양/반응/특이사항"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addActivity}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                기록 추가
              </button>

              {planner.recipientType === "child" ? (
                <>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("meal", "빠른기록 · 식사")}
                    className="rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
                  >
                    식사 원탭
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("nap", "빠른기록 · 낮잠")}
                    className="rounded-lg border border-violet-300 px-3 py-2 text-sm text-violet-700 hover:bg-violet-50"
                  >
                    낮잠 원탭
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("medication", "빠른기록 · 해열제 복용")}
                    className="rounded-lg border border-pink-300 px-3 py-2 text-sm text-pink-700 hover:bg-pink-50"
                  >
                    해열제 원탭
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("diaper", "빠른기록 · 기저귀(소변)")}
                    className="rounded-lg border border-lime-300 px-3 py-2 text-sm text-lime-700 hover:bg-lime-50"
                  >
                    기저귀 소변
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("diaper", "빠른기록 · 기저귀(대변)")}
                    className="rounded-lg border border-lime-300 px-3 py-2 text-sm text-lime-700 hover:bg-lime-50"
                  >
                    기저귀 대변
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("diaper", "빠른기록 · 기저귀(혼합)")}
                    className="rounded-lg border border-lime-300 px-3 py-2 text-sm text-lime-700 hover:bg-lime-50"
                  >
                    기저귀 혼합
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("daycare_dropoff", "빠른기록 · 어린이집 등원")}
                    className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                  >
                    등원 원탭
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("daycare_pickup", "빠른기록 · 어린이집 하원")}
                    className="rounded-lg border border-teal-300 px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
                  >
                    하원 원탭
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("meal", "빠른기록 · 식사")}
                    className="rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
                  >
                    식사 원탭
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("medication", "빠른기록 · 복약 완료")}
                    className="rounded-lg border border-pink-300 px-3 py-2 text-sm text-pink-700 hover:bg-pink-50"
                  >
                    복약 원탭
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickActivity("hospital", "빠른기록 · 병원 방문")}
                    className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    병원 원탭
                  </button>
                </>
              )}
            </div>

            {planner.recipientType === "child" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">수유 세분화 입력 (BabyTime 스타일)</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-slate-700 md:col-span-2">
                      수유 유형
                      <select
                        value={feedingDraft.type}
                        onChange={(event) =>
                          setFeedingDraft((prev) => ({
                            ...prev,
                            type: event.target.value as FeedingType,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        {(Object.keys(FEEDING_TYPE_LABEL) as FeedingType[]).map((type) => (
                          <option key={type} value={type}>
                            {FEEDING_TYPE_LABEL[type]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm text-slate-700">
                      분유량(ml)
                      <input
                        type="number"
                        min={0}
                        value={feedingDraft.amountMl}
                        onChange={(event) =>
                          setFeedingDraft((prev) => ({ ...prev, amountMl: event.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm text-slate-700">
                      메모
                      <input
                        value={feedingDraft.note}
                        onChange={(event) =>
                          setFeedingDraft((prev) => ({ ...prev, note: event.target.value }))
                        }
                        placeholder="예: 트림 잘함"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={addDetailedFeeding}
                    className="mt-3 rounded-lg border border-sky-300 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                  >
                    수유 세분화 기록 추가
                  </button>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-slate-900">체온/투약 빠른 기록</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-slate-700">
                        체온(°C)
                        <input
                          type="number"
                          step="0.1"
                          value={temperatureDraft.celsius}
                          onChange={(event) =>
                            setTemperatureDraft((prev) => ({
                              ...prev,
                              celsius: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        메모
                        <input
                          value={temperatureDraft.note}
                          onChange={(event) =>
                            setTemperatureDraft((prev) => ({
                              ...prev,
                              note: event.target.value,
                            }))
                          }
                          placeholder="예: 해열제 30분 후 재측정"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </label>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={addTemperatureRecord}
                        className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        체온 기록 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => addQuickActivity("medication", "빠른기록 · 감기약 복용", "체온기록 연계")}
                        className="rounded-lg border border-pink-300 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
                      >
                        투약 기록 추가
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">수유/수면 타이머</p>
                  <p className="mt-1 text-xs text-slate-500">
                    시작 후 종료하면 자동으로 활동 기록에 소요 시간이 저장됩니다.
                  </p>

                  {activeTimer ? (
                    <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                      <p className="font-semibold">
                        {activeTimer.mode === "feeding" ? "수유 타이머" : "수면 타이머"} 진행 중
                      </p>
                      <p className="mt-1 text-lg font-bold">{formatDurationLabel(timerElapsedSeconds)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={stopTimerAndSave}
                          className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                        >
                          종료 후 기록 저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelTimer}
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startTimer("feeding")}
                        className="rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 hover:bg-sky-50"
                      >
                        수유 타이머 시작
                      </button>
                      <button
                        type="button"
                        onClick={() => startTimer("sleep")}
                        className="rounded-lg border border-violet-300 px-3 py-2 text-sm text-violet-700 hover:bg-violet-50"
                      >
                        수면 타이머 시작
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          {dayActivities.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-300 p-4 text-slate-500">
              선택한 날짜의 기록이 없습니다.
            </li>
          ) : (
            dayActivities.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{entry.time}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_META[entry.category].badgeClass}`}>
                      {CATEGORY_META[entry.category].label}
                    </span>
                    <span className="font-medium">{entry.title}</span>
                  </div>
                  {entry.notes ? <p className="mt-1 text-xs text-slate-500">{entry.notes}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeActivity(entry.id)}
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                >
                  삭제
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">24시간 패턴 차트</p>
          <p className="mt-1 text-xs text-slate-500">
            선택한 날짜의 시간대별 활동 건수를 막대로 표시합니다.
          </p>

          <div className="mt-3 grid gap-1.5">
            {hourlyActivityCounts.map((count, hour) => {
              const widthRatio = count === 0 ? 4 : Math.max(8, (count / maxHourlyActivityCount) * 100);

              return (
                <div key={hour} className="grid grid-cols-[42px_1fr_32px] items-center gap-2 text-xs text-slate-600">
                  <span>{String(hour).padStart(2, "0")}시</span>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${widthRatio}%` }}
                    />
                  </div>
                  <span className="text-right font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      ) : null}

      {effectiveTab === "health" && planner.recipientType === "child" ? (
        <section id="daycare" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">어린이집 등·하원</h3>
          <p className="mt-1 text-sm text-slate-600">
            선택 날짜의 어린이집 기록만 따로 모아 확인합니다.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {daycareEntries.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-500">
                등원/하원 기록이 없습니다.
              </li>
            ) : (
              daycareEntries.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 p-3">
                  <span className="font-semibold text-slate-900">{entry.time}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span>{entry.title}</span>
                  {entry.notes ? <p className="mt-1 text-xs text-slate-500">{entry.notes}</p> : null}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {effectiveTab === "health" ? (
      <section
        id={getPanelId("health")}
        role="tabpanel"
        aria-labelledby={getTabId("health")}
        tabIndex={0}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-slate-900">복약 관리</h3>
        <p className="mt-1 text-sm text-slate-600">
          복약 루틴 체크리스트와 활동기록 기반 복약 로그를 함께 관리합니다.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{selectedDate} 복약 체크리스트</p>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                완료 {takenRoutineCount}/{medicationRoutines.length}
              </span>
            </div>

            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {medicationRoutines.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-500">
                  등록된 복약 루틴이 없습니다.
                </li>
              ) : (
                medicationRoutines.map((routine) => {
                  const taken = routine.takenDates.includes(selectedDate);

                  return (
                    <li
                      key={routine.id}
                      className={`rounded-lg border p-3 ${
                        taken ? "border-emerald-200 bg-emerald-50" : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {routine.time} · {routine.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {routine.dosage || "용량 미기재"}
                            {routine.note ? ` · ${routine.note}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMedicationRoutineTaken(routine.id)}
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              taken
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {taken ? "복용 완료" : "완료 처리"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMedicationRoutine(routine.id)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">복약 루틴 추가</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-700 md:col-span-2">
                약 이름
                <input
                  value={medicationRoutineDraft.name}
                  onChange={(event) =>
                    setMedicationRoutineDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="예: 아침 혈압약"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                복용 시간
                <input
                  type="time"
                  value={medicationRoutineDraft.time}
                  onChange={(event) =>
                    setMedicationRoutineDraft((prev) => ({ ...prev, time: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                용량
                <input
                  value={medicationRoutineDraft.dosage}
                  onChange={(event) =>
                    setMedicationRoutineDraft((prev) => ({ ...prev, dosage: event.target.value }))
                  }
                  placeholder="예: 1정"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                메모
                <input
                  value={medicationRoutineDraft.note}
                  onChange={(event) =>
                    setMedicationRoutineDraft((prev) => ({ ...prev, note: event.target.value }))
                  }
                  placeholder="예: 식후 복용"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={addMedicationRoutine}
              className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              루틴 추가
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">활동기록 기반 복약 로그</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {medicationEntries.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-500">
                오늘 복약 기록이 없습니다.
              </li>
            ) : (
              medicationEntries.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 p-3">
                  <span className="font-semibold text-slate-900">{entry.time}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span>{entry.title}</span>
                  {entry.notes ? <p className="mt-1 text-xs text-slate-500">{entry.notes}</p> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
      ) : null}

      {effectiveTab === "health" && planner.recipientType === "elder" ? (
        <section id="hospital" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">병원 예약</h3>
          <p className="mt-1 text-sm text-slate-600">
            다음 병원 일정과 예약 메모를 한눈에 관리합니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-700">
              날짜
              <input
                type="date"
                value={hospitalDraft.date}
                onChange={(event) =>
                  setHospitalDraft((prev) => ({ ...prev, date: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              시간
              <input
                type="time"
                value={hospitalDraft.time}
                onChange={(event) =>
                  setHospitalDraft((prev) => ({ ...prev, time: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700 md:col-span-2">
              일정 제목
              <input
                value={hospitalDraft.title}
                onChange={(event) =>
                  setHospitalDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="예: 내과 정기검진"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700 md:col-span-4">
              설명
              <input
                value={hospitalDraft.description}
                onChange={(event) =>
                  setHospitalDraft((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="예: 혈압약 처방 갱신"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={addHospitalAppointment}
            className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            병원 예약 추가
          </button>

          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {hospitalAppointments.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-500">
                병원 예약이 없습니다.
              </li>
            ) : (
              hospitalAppointments.map((appointment) => (
                <li key={appointment.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {appointment.date} {appointment.time} · {appointment.title}
                  </p>
                  {appointment.description ? (
                    <p className="mt-1 text-xs text-slate-500">{appointment.description}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleAppointmentComplete(appointment.id)}
                    className={`mt-2 rounded px-2 py-1 text-xs font-semibold ${
                      appointment.completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {appointment.completed ? "완료됨 (클릭 시 취소)" : "완료 처리"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {effectiveTab === "health" && planner.recipientType === "child" ? (
        <section id="vaccine" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">접종 관리</h3>
          <p className="mt-1 text-sm text-slate-600">
            접종 예약/완료 이력을 함께 관리하고, 다음 접종 일정을 확인합니다.
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">접종 예약 등록</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  날짜
                  <input
                    type="date"
                    value={vaccineDraft.date}
                    onChange={(event) =>
                      setVaccineDraft((prev) => ({ ...prev, date: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  시간
                  <input
                    type="time"
                    value={vaccineDraft.time}
                    onChange={(event) =>
                      setVaccineDraft((prev) => ({ ...prev, time: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  접종 종류
                  <select
                    value={vaccineDraft.vaccineName}
                    onChange={(event) => {
                      const vaccineName = event.target.value;
                      setVaccineDraft((prev) => ({
                        ...prev,
                        vaccineName,
                        description: VACCINE_HELP[vaccineName] ?? prev.description,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {Object.keys(VACCINE_HELP).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  설명
                  <input
                    value={vaccineDraft.description}
                    onChange={(event) =>
                      setVaccineDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={addVaccineAppointment}
                className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                접종 예약 추가
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">접종 완료 기록 추가</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  접종 날짜
                  <input
                    type="date"
                    value={vaccineRecordDraft.date}
                    onChange={(event) =>
                      setVaccineRecordDraft((prev) => ({ ...prev, date: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  접종명
                  <input
                    value={vaccineRecordDraft.name}
                    onChange={(event) =>
                      setVaccineRecordDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="예: MMR 1차"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  메모
                  <input
                    value={vaccineRecordDraft.note}
                    onChange={(event) =>
                      setVaccineRecordDraft((prev) => ({ ...prev, note: event.target.value }))
                    }
                    placeholder="예: 접종 후 미열"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={addVaccineRecord}
                className="mt-3 rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                완료 기록 추가
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">다음 예약</p>
            {nextVaccineAppointment ? (
              <div className="mt-2 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <p>
                    <span className="font-semibold">{nextVaccineAppointment.date}</span>{" "}
                    {nextVaccineAppointment.time}
                    <span className="mx-2 text-slate-400">·</span>
                    {nextVaccineAppointment.title}
                  </p>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {getDDayLabel(nextVaccineAppointment.date)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{nextVaccineAppointment.description}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">등록된 접종 예약이 없습니다.</p>
            )}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">접종 예약 목록</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {vaccineAppointments.length === 0 ? (
                  <li className="text-slate-500">접종 예약이 없습니다.</li>
                ) : (
                  vaccineAppointments.map((appointment) => (
                    <li key={appointment.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">
                        {appointment.date} {appointment.time} · {appointment.title}
                      </p>
                      {appointment.description ? (
                        <p className="mt-1 text-xs text-slate-500">{appointment.description}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => toggleAppointmentComplete(appointment.id)}
                        className={`mt-2 rounded px-2 py-1 text-xs font-semibold ${
                          appointment.completed
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {appointment.completed ? "완료됨 (클릭 시 취소)" : "완료 처리"}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">접종 완료 이력</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {planner.vaccineRecords.length === 0 ? (
                  <li className="text-slate-500">접종 완료 기록이 없습니다.</li>
                ) : (
                  [...planner.vaccineRecords]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((record) => (
                      <li key={record.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="font-medium text-slate-900">{record.name}</p>
                        <p className="text-xs text-slate-500">{record.date}</p>
                        {record.note ? (
                          <p className="mt-1 text-xs text-slate-500">{record.note}</p>
                        ) : null}
                      </li>
                    ))
                )}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {effectiveTab === "schedule" ? (
      <section
        id={getPanelId("schedule")}
        role="tabpanel"
        aria-labelledby={getTabId("schedule")}
        tabIndex={0}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-slate-900">평일/주말 일정 템플릿</h3>
        <p className="mt-1 text-sm text-slate-600">
          평일과 주말을 분리해서 루틴을 관리합니다. 선택한 날짜에는
          <span className="font-semibold"> {dayOfWeek === "weekday" ? "평일" : "주말"}</span>
          템플릿이 적용됩니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyScheduleTemplate("weekday", "weekend")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            평일 → 주말 복사
          </button>
          <button
            type="button"
            onClick={() => copyScheduleTemplate("weekend", "weekday")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            주말 → 평일 복사
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">{selectedDate} 적용 일정</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {activeSchedule.length === 0 ? (
              <li className="text-slate-500">등록된 일정이 없습니다.</li>
            ) : (
              activeSchedule.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.time}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  {item.label}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">일정 추가</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="text-sm text-slate-700">
                구분
                <select
                  value={scheduleDraft.type}
                  onChange={(event) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      type: event.target.value as ScheduleType,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="weekday">평일</option>
                  <option value="weekend">주말</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                시간
                <input
                  type="time"
                  value={scheduleDraft.time}
                  onChange={(event) =>
                    setScheduleDraft((prev) => ({ ...prev, time: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 md:col-span-1">
                내용
                <input
                  value={scheduleDraft.label}
                  onChange={(event) =>
                    setScheduleDraft((prev) => ({ ...prev, label: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={addSchedule}
              className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              일정 항목 추가
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">평일/주말 목록</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {(["weekday", "weekend"] as ScheduleType[]).map((type) => (
                <div key={type}>
                  <p className="text-xs font-semibold text-slate-500">
                    {type === "weekday" ? "평일" : "주말"}
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {planner.schedules[type].length === 0 ? (
                      <li className="text-slate-400">비어있음</li>
                    ) : (
                      planner.schedules[type].map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 p-2"
                        >
                          <span>
                            {item.time} · {item.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSchedule(type, item.id)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            삭제
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {effectiveTab === "schedule" ? (
      <section id="calendar" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">달력 보기</h3>
            <p className="mt-1 text-sm text-slate-600">
              활동/예약/접종 기록을 날짜별로 한 번에 확인합니다.
            </p>
          </div>
          <label className="text-sm text-slate-700">
            월 선택
            <input
              type="month"
              value={calendarMonth}
              onChange={(event) => setCalendarMonth(event.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <p className="mt-3 text-sm font-semibold text-slate-800">
          {calendarYear}년 {calendarMonthNumber}월
        </p>

        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
          {[
            "일",
            "월",
            "화",
            "수",
            "목",
            "금",
            "토",
          ].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {calendarGrid.map((cell) => {
            const events = calendarEventsByDate.get(cell.date);
            const isSelected = cell.date === selectedDate;

            return (
              <button
                type="button"
                key={cell.date}
                onClick={() => applySelectedDate(cell.date)}
                className={`min-h-[86px] rounded-lg border p-2 text-left transition ${
                  isSelected
                    ? "border-sky-400 bg-sky-50"
                    : cell.inMonth
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <p className="text-sm font-semibold">{cell.day}</p>
                {events ? (
                  <>
                    <p className="mt-1 text-[11px] font-medium text-sky-700">
                      이벤트 {events.count}건
                    </p>
                    {events.tags.map((tag) => (
                      <p key={tag} className="truncate text-[10px] text-slate-600">
                        · {tag}
                      </p>
                    ))}
                  </>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-400">기록 없음</p>
                )}
              </button>
            );
          })}
        </div>
      </section>
      ) : null}

      {effectiveTab === "report" ? (
      <section
        id={getPanelId("report")}
        role="tabpanel"
        aria-labelledby={getTabId("report")}
        tabIndex={0}
        className="space-y-4"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">패턴 분석</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-full border border-slate-200 bg-slate-100 p-1">
            {([
              { key: "daily", label: "일과표" },
              { key: "weekly", label: "주간 패턴" },
              { key: "interval", label: "간격 패턴" },
            ] as const).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setReportView(option.key)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  reportView === option.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {quickStatusItems.map((item) => (
              <div
                key={`report-${item.category}`}
                className="min-w-[72px] rounded-full border border-slate-200 bg-white px-3 py-2 text-center"
              >
                <p className="text-lg">{item.emoji}</p>
                <p className="text-[11px] font-medium text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{quickStatusItems.length}개 지표를 기준으로 패턴을 계산합니다.</p>

          {reportView === "daily" ? (
            <div className="mt-5 flex flex-col items-center">
              <div className="relative h-72 w-72">
                <div className="absolute inset-0 rounded-full border border-slate-200 bg-slate-50" />
                <div className="absolute inset-4 rounded-full" style={{ background: patternRingGradient }} />
                <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full border border-white bg-white/95 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">DAY</p>
                  <p className="text-4xl font-bold text-indigo-700">D+{ageInDays}</p>
                </div>
                <span className="absolute left-1/2 top-1 -translate-x-1/2 text-xs font-semibold text-slate-500">0</span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">6</span>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-500">12</span>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">18</span>
              </div>
              <p className="mt-3 text-xl font-semibold text-slate-700">📅 {selectedDate}</p>
            </div>
          ) : null}

          {reportView === "weekly" ? (
            <div className="mt-5 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {weeklyPatternCounts.map((item) => (
                <div key={item.dateKey} className="grid grid-cols-[48px_1fr_28px] items-center gap-2 text-sm text-slate-700">
                  <span className="font-semibold">{item.dayLabel}</span>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${Math.max(8, (item.count / weeklyPatternMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          ) : null}

          {reportView === "interval" ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">평균 수유 간격</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {averageMealIntervalHours ? `${averageMealIntervalHours}시간` : "데이터 없음"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">선택일 총 기록</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{daySummary.total}건</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">최근 수면 기록</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{daySummary.byCategory.nap}회</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">성장 분석 보고서</h3>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              비교 그룹: {planner.recipientType === "child" ? "영유아" : "어르신"}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">현재 성장 데이터</p>
            <p className="mt-1 text-sm text-slate-600">최근 기록을 기반으로 성장 추세를 계산합니다.</p>
            <button
              type="button"
              className="mt-4 w-full rounded-2xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-800"
            >
              몸무게 작성하기 (새 일기)
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">성장곡선 미리보기</p>
              <p className="text-xs font-medium text-slate-500">최근 한국 표준 성장곡선 톤</p>
            </div>

            <svg
              viewBox={`0 0 ${growthChartWidth} ${growthChartHeight}`}
              className="mt-3 h-72 w-full rounded-xl bg-slate-50 p-2"
              aria-label="성장곡선 미리보기"
            >
              {growthYAxisTicks.map((kg) => {
                const y = growthChartHeight - ((kg - growthMinKg) / (growthMaxKg - growthMinKg)) * growthChartHeight;

                return (
                  <g key={`y-${kg}`}>
                    <line x1="0" y1={y} x2={growthChartWidth} y2={y} stroke="#dbe3ef" strokeDasharray="3 4" />
                    <text x="2" y={y - 2} fontSize="9" fill="#94a3b8">{kg}kg</text>
                  </g>
                );
              })}

              {growthXAxisTicks.map((tick) => (
                <g key={`x-${tick.day}`}>
                  <line x1={tick.x} y1="0" x2={tick.x} y2={growthChartHeight} stroke="#eef2f7" />
                  <text x={tick.x} y={growthChartHeight - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
                    {tick.day}
                  </text>
                </g>
              ))}

              {growthReferenceCurves.map((curve) => (
                <g key={curve.label}>
                  <path
                    d={curve.path}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={curve.label === "50%" ? 1.8 : 1.2}
                    strokeDasharray={curve.label === "50%" ? undefined : "3 4"}
                  />
                  <text
                    x={growthChartWidth - 4}
                    y={curve.points[curve.points.length - 1]?.y ?? 10}
                    textAnchor="end"
                    fontSize="9"
                    fill={curve.color}
                  >
                    {curve.label}
                  </text>
                </g>
              ))}

              <line
                x1={currentGrowthPoint.x}
                y1="0"
                x2={currentGrowthPoint.x}
                y2={growthChartHeight}
                stroke="#94a3b8"
                strokeOpacity="0.55"
              />

              <path d={growthObservedPath} fill="none" stroke="#ec4899" strokeWidth="2.4" strokeLinecap="round" />
              {growthObservedPoints.map((point) => (
                <circle key={`point-${point.day}`} cx={point.x} cy={point.y} r="2.8" fill="#ec4899" />
              ))}

              <circle cx={currentGrowthPoint.x} cy={currentGrowthPoint.y} r="4.6" fill="#be185d" />

              <g
                transform={`translate(${Math.min(growthChartWidth - 132, currentGrowthPoint.x + 8)} ${Math.max(12, currentGrowthPoint.y - 46)})`}
              >
                <rect width="126" height="40" rx="8" fill="white" stroke="#cbd5e1" />
                <text x="8" y="16" fontSize="11" fontWeight="600" fill="#1f3c88">
                  {currentGrowthPoint.kg.toFixed(1)}kg ({currentGrowthPercentile.toFixed(1)}%)
                </text>
                <text x="8" y="30" fontSize="10" fill="#64748b">D+{currentGrowthPoint.day}</text>
              </g>
            </svg>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                표준 성장곡선 보기
              </button>
            </div>
          </div>
        </section>
      </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-3 z-30 px-4 md:hidden">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
          <div className="grid grid-cols-5 gap-1">
            {visibleTabs.map((tab) => (
              <button
                key={`bottom-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-2 py-1.5 text-center text-[11px] font-medium ${
                  effectiveTab === tab.id ? "bg-sky-100 text-sky-700" : "text-slate-500"
                }`}
              >
                <p className="text-base leading-4">{TAB_ICONS[tab.id]}</p>
                <p className="mt-0.5">{tab.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-base font-semibold text-slate-900">현재 사용 가능한 기능</h3>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>탭 기반 구조(오늘/기록/건강/일정/리포트)로 화면 분리</li>
          <li>상단 요약 바(모바일 비고정 / 데스크톱 고정)</li>
          <li>원탭 빠른기록(식사/수면/기저귀/복약/체온/등하원/병원)</li>
          <li>수유 세분화 입력(모유 좌/우, 분유, 이유식)</li>
          <li>수유/수면 타이머(시작/종료 후 소요시간 자동 기록)</li>
          <li>일간/주간 요약 카드 + 24시간 패턴 차트 + 도넛 차트</li>
          <li>복약 루틴 체크리스트 + 날짜별 복용 완료 처리</li>
          <li>접종 예약 + 완료 이력 + 다음 접종 D-day 카드</li>
          <li>평일/주말 루틴 분리 + 템플릿 복사 + 달력 보기</li>
          <li>선택일 CSV 내보내기 + 비회원 공개 테스트 모드</li>
        </ul>
      </section>
    </div>
  );
}
