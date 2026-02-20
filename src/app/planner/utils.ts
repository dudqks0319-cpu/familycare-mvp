import {
  CATEGORY_META,
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
  VACCINE_HELP,
} from "@/app/planner/constants";
import type {
  ActivityCategory,
  ActivityEntry,
  PlannerState,
  RecipientType,
} from "@/app/planner/types";

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toTimeKey(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export function toDateTimeKey(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function sortByDateTimeAsc<T extends { date: string; time: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    toDateTimeKey(a.date, a.time).localeCompare(toDateTimeKey(b.date, b.time)),
  );
}

export function sortByTimeAsc<T extends { time: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.time.localeCompare(b.time));
}

export function getDDayLabel(targetDate: string): string {
  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${targetDate}T00:00:00`);
  const diffMs = target.getTime() - todayAtMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "D-Day";
  }

  if (diffDays > 0) {
    return `D-${diffDays}`;
  }

  return `D+${Math.abs(diffDays)}`;
}

export function formatDurationLabel(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes === 0) {
    return `${seconds}초`;
  }

  return `${minutes}분 ${String(seconds).padStart(2, "0")}초`;
}

export function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function createInitialPlannerState(): PlannerState {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const today = toDateKey(now);

  return {
    guardianName: "보호자",
    recipientName: "아기",
    recipientType: "child",
    ageMonths: 23,
    elderLargeText: true,
    activities: sortByDateTimeAsc<ActivityEntry>([
      {
        id: createId(),
        date: today,
        time: "07:40",
        category: "meal",
        title: "아침 이유식",
        notes: "150ml 섭취",
      },
      {
        id: createId(),
        date: today,
        time: "09:05",
        category: "daycare_dropoff",
        title: "어린이집 등원",
        notes: "가방/여벌옷 전달",
      },
      {
        id: createId(),
        date: today,
        time: "10:30",
        category: "snack",
        title: "바나나 간식",
        notes: "반 개 섭취",
      },
      {
        id: createId(),
        date: today,
        time: "11:15",
        category: "diaper",
        title: "기저귀 교체(소변)",
        notes: "발진 없음",
      },
      {
        id: createId(),
        date: today,
        time: "13:20",
        category: "nap",
        title: "낮잠",
        notes: "약 1시간 20분",
      },
      {
        id: createId(),
        date: today,
        time: "16:45",
        category: "daycare_pickup",
        title: "어린이집 하원",
        notes: "하원 후 간식 예정",
      },
      {
        id: createId(),
        date: today,
        time: "20:00",
        category: "medication",
        title: "감기약",
        notes: "2.5ml 복용",
      },
      {
        id: createId(),
        date: today,
        time: "20:40",
        category: "temperature",
        title: "체온 측정",
        notes: "37.4°C",
      },
    ]),
    appointments: [
      {
        id: createId(),
        date: toDateKey(tomorrow),
        time: "10:30",
        kind: "vaccine",
        title: "MMR 1차",
        description: VACCINE_HELP.MMR,
        completed: false,
      },
      {
        id: createId(),
        date: toDateKey(tomorrow),
        time: "15:00",
        kind: "hospital",
        title: "소아과 진료",
        description: "기침/코감기 경과 확인",
        completed: false,
      },
    ],
    vaccineRecords: [
      {
        id: createId(),
        name: "BCG",
        date: "2024-05-10",
        note: "이상 반응 없음",
      },
      {
        id: createId(),
        name: "DTaP-IPV 1차",
        date: "2024-07-12",
        note: "당일 미열",
      },
    ],
    medicationRoutines: [
      {
        id: createId(),
        name: "아침 혈압약",
        dosage: "1정",
        time: "08:00",
        note: "식후 복용",
        takenDates: [],
      },
      {
        id: createId(),
        name: "저녁 당뇨약",
        dosage: "1정",
        time: "20:00",
        note: "복용 후 혈당 체크",
        takenDates: [],
      },
    ],
    schedules: {
      weekday: [
        { id: createId(), time: "07:30", label: "아침 식사" },
        { id: createId(), time: "09:00", label: "어린이집 등원" },
        { id: createId(), time: "12:00", label: "점심" },
        { id: createId(), time: "13:00", label: "낮잠" },
        { id: createId(), time: "17:00", label: "하원" },
      ],
      weekend: [
        { id: createId(), time: "08:30", label: "아침 식사" },
        { id: createId(), time: "11:30", label: "공원 산책" },
        { id: createId(), time: "13:00", label: "낮잠" },
      ],
    },
  };
}

export function loadPlannerState(): PlannerState {
  const fallback = createInitialPlannerState();

  if (typeof window === "undefined") {
    return fallback;
  }

  const rawCurrent = window.localStorage.getItem(STORAGE_KEY);
  const rawLegacy = LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
  const raw = rawCurrent || rawLegacy;

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlannerState>;

    const recipientType: RecipientType =
      parsed.recipientType === "elder" ? "elder" : fallback.recipientType;

    const activities = Array.isArray(parsed.activities)
      ? parsed.activities.map((entry) => {
          const category =
            typeof entry?.category === "string"
            && Object.prototype.hasOwnProperty.call(CATEGORY_META, entry.category)
              ? (entry.category as ActivityCategory)
              : "meal";

          return {
            id: typeof entry?.id === "string" ? entry.id : createId(),
            date: typeof entry?.date === "string" ? entry.date : toDateKey(new Date()),
            time: typeof entry?.time === "string" ? entry.time : "00:00",
            category,
            title:
              typeof entry?.title === "string" && entry.title.trim()
                ? entry.title
                : CATEGORY_META[category].label,
            notes: typeof entry?.notes === "string" ? entry.notes : "",
          };
        })
      : fallback.activities;

    const nextState: PlannerState = {
      guardianName: parsed.guardianName ?? fallback.guardianName,
      recipientName: parsed.recipientName ?? fallback.recipientName,
      recipientType,
      ageMonths:
        typeof parsed.ageMonths === "number" && Number.isFinite(parsed.ageMonths)
          ? parsed.ageMonths
          : fallback.ageMonths,
      elderLargeText:
        typeof parsed.elderLargeText === "boolean"
          ? parsed.elderLargeText
          : fallback.elderLargeText,
      activities,
      appointments: Array.isArray(parsed.appointments)
        ? parsed.appointments
        : fallback.appointments,
      vaccineRecords: Array.isArray(parsed.vaccineRecords)
        ? parsed.vaccineRecords
        : fallback.vaccineRecords,
      medicationRoutines: Array.isArray(parsed.medicationRoutines)
        ? parsed.medicationRoutines.map((routine) => ({
            ...routine,
            takenDates: Array.isArray(routine?.takenDates) ? routine.takenDates : [],
          }))
        : fallback.medicationRoutines,
      schedules: {
        weekday:
          parsed.schedules && Array.isArray(parsed.schedules.weekday)
            ? parsed.schedules.weekday
            : fallback.schedules.weekday,
        weekend:
          parsed.schedules && Array.isArray(parsed.schedules.weekend)
            ? parsed.schedules.weekend
            : fallback.schedules.weekend,
      },
    };

    if (!rawCurrent && rawLegacy) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    }

    return nextState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));

    return fallback;
  }
}

export function getAvailableCategories(recipientType: RecipientType): ActivityCategory[] {
  return (Object.keys(CATEGORY_META) as ActivityCategory[]).filter((category) =>
    CATEGORY_META[category].recipientTypes.includes(recipientType),
  );
}

export function getCalendarGrid(year: number, monthIndex: number): Array<{
  date: string;
  day: number;
  inMonth: boolean;
}> {
  const firstDay = new Date(year, monthIndex, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, monthIndex, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);

    return {
      date: toDateKey(current),
      day: current.getDate(),
      inMonth: current.getMonth() === monthIndex,
    };
  });
}
