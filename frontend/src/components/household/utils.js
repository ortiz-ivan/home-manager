export function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(baseDate, days) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function getTodayDateInput() {
  return formatDateInput(new Date());
}

export function getHouseholdAgendaBuckets(occurrences, today = getTodayDateInput()) {
  const upcomingLimit = formatDateInput(addDays(new Date(`${today}T00:00:00`), 7));
  const tomorrow = formatDateInput(addDays(new Date(`${today}T00:00:00`), 1));

  const pendingOccurrences = occurrences.filter((item) => item.status === "pending");
  const resolvedOccurrences = occurrences.filter((item) => item.status !== "pending");

  return {
    overdue: pendingOccurrences.filter((item) => item.due_date < today),
    today: pendingOccurrences.filter((item) => item.due_date === today),
    tomorrow: pendingOccurrences.filter((item) => item.due_date === tomorrow),
    upcoming: pendingOccurrences.filter((item) => item.due_date > today && item.due_date <= upcomingLimit),
    resolvedRecent: resolvedOccurrences
      .slice()
      .sort((left, right) => String(right.completed_at || right.due_date).localeCompare(String(left.completed_at || left.due_date)))
      .slice(0, 8),
  };
}

export function getHouseholdReminderSummary(occurrences, today = getTodayDateInput()) {
  const buckets = getHouseholdAgendaBuckets(occurrences, today);
  const weekUpcoming = buckets.upcoming.filter((item) => item.due_date !== (buckets.tomorrow[0]?.due_date || "__none__"));
  const urgentItems = [...buckets.overdue, ...buckets.today, ...buckets.tomorrow].slice(0, 3);

  return {
    ...buckets,
    weekUpcoming,
    urgentItems,
    urgentCount: buckets.overdue.length + buckets.today.length + buckets.tomorrow.length,
  };
}

export function formatFrequencyLabel(item) {
  if (item.frequency_type === "daily") {
    return item.interval > 1 ? `Cada ${item.interval} dias` : "Diaria";
  }

  if (item.frequency_type === "weekly") {
    return item.interval > 1 ? `Cada ${item.interval} semanas` : "Semanal";
  }

  if (item.day_of_month) {
    return item.interval > 1 ? `Cada ${item.interval} meses, dia ${item.day_of_month}` : `Mensual, dia ${item.day_of_month}`;
  }

  return item.interval > 1 ? `Cada ${item.interval} meses` : "Mensual";
}

export function getOccurrenceUrgency(occurrence, today = getTodayDateInput()) {
  if (occurrence.status !== "pending") {
    return occurrence.status === "done" ? "done" : "skipped";
  }

  if (occurrence.due_date < today) {
    return "overdue";
  }

  if (occurrence.due_date === today) {
    return "today";
  }

  return "upcoming";
}