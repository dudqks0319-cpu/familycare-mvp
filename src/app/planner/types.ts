export type RecipientType = "child" | "elder";
export type ScheduleType = "weekday" | "weekend";

export type ActivityCategory =
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

export type ActivityEntry = {
  id: string;
  date: string;
  time: string;
  category: ActivityCategory;
  title: string;
  notes: string;
};

export type AppointmentKind = "hospital" | "vaccine";

export type Appointment = {
  id: string;
  date: string;
  time: string;
  kind: AppointmentKind;
  title: string;
  description: string;
  completed: boolean;
};

export type VaccineRecord = {
  id: string;
  name: string;
  date: string;
  note: string;
  sourceAppointmentId?: string;
};

export type ScheduleItem = {
  id: string;
  time: string;
  label: string;
};

export type MedicationRoutineItem = {
  id: string;
  name: string;
  dosage: string;
  time: string;
  note: string;
  takenDates: string[];
};

export type PlannerState = {
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

export type PlannerTab = "today" | "record" | "health" | "schedule" | "report";

export type FeedingType = "breast_left" | "breast_right" | "formula" | "baby_food";

export type CategoryMeta = {
  label: string;
  color: string;
  badgeClass: string;
  recipientTypes: RecipientType[];
};
