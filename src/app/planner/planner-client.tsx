"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RecipientType = "child" | "elder";
type ScheduleType = "weekday" | "weekend";

type ActivityCategory =
  | "meal"
  | "snack"
  | "nap"
  | "diaper"
  | "daycare_dropoff"
  | "daycare_pickup"
  | "medication"
  | "temperature"
  | "hospital"
  | "vaccine_shot"
  | "vaccine_booking";

type ActivityEntry = {
  id: string;
  date: string;
  time: string;
  category: ActivityCategory;
  title: string;
  notes: string;
};

type AppointmentKind = "hospital" | "vaccine";

type Appointment = {
  id: string;
  date: string;
  time: string;
  kind: AppointmentKind;
  title: string;
  description: string;
  completed: boolean;
};

type VaccineRecord = {
  id: string;
  name: string;
  date: string;
  note: string;
  sourceAppointmentId?: string;
};

type ScheduleItem = {
  id: string;
  time: string;
  label: string;
};

type MedicationRoutineItem = {
  id: string;
  name: string;
  dosage: string;
  time: string;
  note: string;
  takenDates: string[];
};

type PlannerState = {
  guardianName: string;
  recipientName: string;
  recipientType: RecipientType;
  ageMonths: number;
  elderLargeText: boolean;
  activities: ActivityEntry[];
  appointments: Appointment[];
  vaccineRecords: VaccineRecord[];
  medicationRoutines: MedicationRoutineItem[];
  schedules: {
    weekday: ScheduleItem[];
    weekend: ScheduleItem[];
  };
};

type PlannerTab = "today" | "record" | "health" | "schedule" | "report";

type FeedingType = "breast_left" | "breast_right" | "formula" | "baby_food";

const FEEDING_TYPE_LABEL: Record<FeedingType, string> = {
  breast_left: "모유(왼쪽)",
  breast_right: "모유(오른쪽)",
  formula: "분유",
  baby_food: "이유식",
};

const STORAGE_KEY = "familycare_planner_v1";

const CATEGORY_META: Record<
  ActivityCategory,
  {
    label: string;
    color: string;
    badgeClass: string;
    recipientTypes: RecipientType[];
  }
> = {
  meal: {
    label: "식사",
    color: "#0284c7",
    badgeClass: "bg-sky-100 text-sky-700",
    recipientTypes: ["child", "elder"],
  },
  snack: {
    label: "간식",
    color: "#f97316",
    badgeClass: "bg-orange-100 text-orange-700",
    recipientTypes: ["child"],
  },
  nap: {
    label: "수면/낮잠",
    color: "#8b5cf6",
    badgeClass: "bg-violet-100 text-violet-700",
    recipientTypes: ["child", "elder"],
  },
  diaper: {
    label: "기저귀",
    color: "#65a30d",
    badgeClass: "bg-lime-100 text-lime-700",
    recipientTypes: ["child"],
  },
  daycare_dropoff: {
    label: "어린이집 등원",
    color: "#10b981",
    badgeClass: "bg-emerald-100 text-emerald-700",
    recipientTypes: ["child"],
  },
  daycare_pickup: {
    label: "어린이집 하원",
    color: "#14b8a6",
    badgeClass: "bg-teal-100 text-teal-700",
    recipientTypes: ["child"],
  },
  medication: {
    label: "약 복용",
    color: "#ec4899",
    badgeClass: "bg-pink-100 text-pink-700",
    recipientTypes: ["child", "elder"],
  },
  temperature: {
    label: "체온",
    color: "#f59e0b",
    badgeClass: "bg-amber-100 text-amber-700",
    recipientTypes: ["child", "elder"],
  },
  hospital: {
    label: "병원 방문",
    color: "#ef4444",
    badgeClass: "bg-rose-100 text-rose-700",
    recipientTypes: ["child", "elder"],
  },
  vaccine_shot: {
    label: "접종 완료",
    color: "#6366f1",
    badgeClass: "bg-indigo-100 text-indigo-700",
    recipientTypes: ["child"],
  },
  vaccine_booking: {
    label: "접종 예약",
    color: "#a855f7",
    badgeClass: "bg-purple-100 text-purple-700",
    recipientTypes: ["child"],
  },
};

const PLANNER_TABS: Array<{ id: PlannerTab; label: string }> = [
  { id: "today", label: "오늘" },
  { id: "record", label: "기록" },
  { id: "health", label: "건강" },
  { id: "schedule", label: "일정" },
  { id: "report", label: "리포트" },
];

const VACCINE_HELP: Record<string, string> = {
  BCG: "결핵 예방. 생후 초기 1회 접종 권장",
  "DTaP-IPV": "디프테리아/파상풍/백일해/소아마비 예방",
  MMR: "홍역/유행성이하선염/풍진 예방",
  VAR: "수두 예방 접종",
  "HepA": "A형 간염 예방",
  "Influenza": "독감 예방. 유행 시기 전 접종 권장",
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toTimeKey(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function toDateTimeKey(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function sortByDateTimeAsc<T extends { date: string; time: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    toDateTimeKey(a.date, a.time).localeCompare(toDateTimeKey(b.date, b.time)),
  );
}

function sortByTimeAsc<T extends { time: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.time.localeCompare(b.time));
}

function getDDayLabel(targetDate: string): string {
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

function formatDurationLabel(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes === 0) {
    return `${seconds}초`;
  }

  return `${minutes}분 ${String(seconds).padStart(2, "0")}초`;
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function createInitialPlannerState(): PlannerState {
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

function loadPlannerState(): PlannerState {
  const fallback = createInitialPlannerState();

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlannerState>;

    return {
      guardianName: parsed.guardianName ?? fallback.guardianName,
      recipientName: parsed.recipientName ?? fallback.recipientName,
      recipientType: parsed.recipientType ?? fallback.recipientType,
      ageMonths: parsed.ageMonths ?? fallback.ageMonths,
      elderLargeText: parsed.elderLargeText ?? fallback.elderLargeText,
      activities: Array.isArray(parsed.activities)
        ? parsed.activities
        : fallback.activities,
      appointments: Array.isArray(parsed.appointments)
        ? parsed.appointments
        : fallback.appointments,
      vaccineRecords: Array.isArray(parsed.vaccineRecords)
        ? parsed.vaccineRecords
        : fallback.vaccineRecords,
      medicationRoutines: Array.isArray(parsed.medicationRoutines)
        ? parsed.medicationRoutines.map((routine) => ({
            ...routine,
            takenDates: Array.isArray(routine.takenDates) ? routine.takenDates : [],
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
  } catch {
    return fallback;
  }
}

function getAvailableCategories(recipientType: RecipientType): ActivityCategory[] {
  return (Object.keys(CATEGORY_META) as ActivityCategory[]).filter((category) =>
    CATEGORY_META[category].recipientTypes.includes(recipientType),
  );
}

function getCalendarGrid(year: number, monthIndex: number): Array<{
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
      {
        meal: 0,
        snack: 0,
        nap: 0,
        diaper: 0,
        daycare_dropoff: 0,
        daycare_pickup: 0,
        medication: 0,
        temperature: 0,
        hospital: 0,
        vaccine_shot: 0,
        vaccine_booking: 0,
      },
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
    const byCategory = dayActivities.reduce<Record<ActivityCategory, number>>(
      (acc, entry) => {
        acc[entry.category] = (acc[entry.category] ?? 0) + 1;
        return acc;
      },
      {
        meal: 0,
        snack: 0,
        nap: 0,
        diaper: 0,
        daycare_dropoff: 0,
        daycare_pickup: 0,
        medication: 0,
        temperature: 0,
        hospital: 0,
        vaccine_shot: 0,
        vaccine_booking: 0,
      },
    );

    return {
      total: dayActivities.length,
      byCategory,
    };
  }, [dayActivities]);

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

  const visibleTabs =
    planner.recipientType === "elder"
      ? PLANNER_TABS.filter((tab) => ["today", "health", "schedule"].includes(tab.id))
      : PLANNER_TABS;

  const effectiveTab: PlannerTab =
    planner.recipientType === "elder" && ["record", "report"].includes(activeTab)
      ? "today"
      : activeTab;

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

  return (
    <div
      className={`space-y-6 ${
        planner.recipientType === "elder" && planner.elderLargeText
          ? "text-[17px] leading-7"
          : ""
      }`}
    >
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

      <section className="sticky top-0 z-20 space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
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
            <label className="text-sm text-slate-700">
              날짜
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setActivityDraft((prev) => ({ ...prev, date: event.target.value }));
                }}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <select
              value={planner.recipientType}
              onChange={(event) =>
                setPlanner((prev) => ({
                  ...prev,
                  recipientType: event.target.value as RecipientType,
                }))
              }
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

        <div className="flex gap-2 overflow-x-auto pb-1">
          {planner.recipientType === "child" ? (
            <>
              <button
                type="button"
                onClick={() => addQuickActivity("meal", "빠른기록 · 식사")}
                className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm text-sky-700"
              >
                🍼 식사
              </button>
              <button
                type="button"
                onClick={() => addQuickActivity("nap", "빠른기록 · 수면")}
                className="shrink-0 rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm text-violet-700"
              >
                😴 수면
              </button>
              <button
                type="button"
                onClick={() => addQuickActivity("diaper", "빠른기록 · 기저귀(소변)")}
                className="shrink-0 rounded-full border border-lime-300 bg-lime-50 px-3 py-1.5 text-sm text-lime-700"
              >
                🩲 기저귀
              </button>
              <button
                type="button"
                onClick={() => addQuickActivity("temperature", "빠른기록 · 체온 측정", `${temperatureDraft.celsius}°C`) }
                className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-700"
              >
                🌡️ 체온
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => addQuickActivity("meal", "빠른기록 · 식사")}
                className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm text-sky-700"
              >
                🍚 식사
              </button>
              <button
                type="button"
                onClick={() => addQuickActivity("medication", "빠른기록 · 복약 완료")}
                className="shrink-0 rounded-full border border-pink-300 bg-pink-50 px-3 py-1.5 text-sm text-pink-700"
              >
                💊 복약
              </button>
              <button
                type="button"
                onClick={() => addQuickActivity("hospital", "빠른기록 · 병원 방문")}
                className="shrink-0 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700"
              >
                🏥 병원
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                effectiveTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {effectiveTab === "today" ? (
        <section className="space-y-4">
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
            <h3 className="text-lg font-semibold text-slate-900">오늘 타임라인</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {dayActivities.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-500">
                  오늘 기록이 없습니다.
                </li>
              ) : (
                dayActivities.map((entry) => (
                  <li
                    key={entry.id}
                    className={`rounded-lg border-l-4 p-3 ${CATEGORY_META[entry.category].badgeClass}`}
                  >
                    <p className="font-medium text-slate-900">
                      {entry.time} · {entry.title}
                    </p>
                    {entry.notes ? <p className="mt-1 text-xs text-slate-600">{entry.notes}</p> : null}
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
        <section id="timeline" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setActivityDraft((prev) => ({ ...prev, date: event.target.value }));
                }}
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
      <section id="medication" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
      <section id="schedule" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                onClick={() => setSelectedDate(cell.date)}
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
      <section className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">리포트 요약</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">일간 요약</p>
              <p className="mt-2 text-sm text-slate-700">총 기록 {daySummary.total}건</p>
              <p className="text-xs text-slate-500">
                식사 {daySummary.byCategory.meal} · 수면 {daySummary.byCategory.nap} · 기저귀 {daySummary.byCategory.diaper} · 복약 {daySummary.byCategory.medication}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">주간 복약 달성률</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{weekSummary.medicationRate}%</p>
              <p className="text-xs text-slate-500">
                {weekSummary.checkedMedicationCount}/{weekSummary.medicationTargetCount}회 완료
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">활동 분포 도넛 차트</h3>
          <div className="mt-4 grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="flex justify-center">
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

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">24시간 패턴 차트</p>
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
          </div>
        </section>
      </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-base font-semibold text-slate-900">현재 사용 가능한 기능</h3>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>탭 기반 구조(오늘/기록/건강/일정/리포트)로 화면 분리</li>
          <li>상단 고정 바(대상자 요약 + 날짜 + 원탭 빠른기록 + 설정 이동)</li>
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
