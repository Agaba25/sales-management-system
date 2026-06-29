export const computeRange = (period = "month", refDateStr) => {
  const ref = refDateStr ? new Date(`${refDateStr}T00:00:00`) : new Date();
  ref.setHours(0, 0, 0, 0);

  if (period === "day") {
    const start = new Date(ref);
    const end = new Date(ref);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (period === "week") {
    const day = (ref.getDay() + 6) % 7;
    const start = new Date(ref);
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (period === "month") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  return { start: "", end: "" };
};

export const formatDateOnly = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

export const formatRangeLabel = (period, start, end) => {
  if (!start || !end) return "All time";

  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setMilliseconds(endDate.getMilliseconds() - 1);

  const fmt = (date) =>
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (period === "day") return fmt(startDate);
  return `${fmt(startDate)} – ${fmt(endDate)}`;
};

export const groupByCalendarDate = (items, dateField = "created_at") => {
  const groups = [];

  items.forEach((item) => {
    const date = new Date(item[dateField]);
    const key = date.toISOString().slice(0, 10);
    let group = groups.find((g) => g.key === key);

    if (!group) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const itemDay = new Date(date);
      itemDay.setHours(0, 0, 0, 0);

      let heading = date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      if (itemDay.getTime() === today.getTime()) heading = `Today — ${heading}`;
      else if (itemDay.getTime() === yesterday.getTime()) heading = `Yesterday — ${heading}`;

      group = { key, heading, items: [] };
      groups.push(group);
    }

    group.items.push(item);
  });

  return groups;
};

export const periodOptions = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];
