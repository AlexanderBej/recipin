export function getWeekStart(date: Date, weekStartsOn: 0 | 1 = 1) {
  const day = date.getDay(); // Sun=0, Mon=1, ..., Sat=6
  const diff = day < weekStartsOn ? day + 7 - weekStartsOn : day - weekStartsOn;

  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

export function getWeekDays(start: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function addWeeks(date: Date, weeks: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
