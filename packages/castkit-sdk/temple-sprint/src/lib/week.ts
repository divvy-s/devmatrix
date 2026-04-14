export function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));

  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.round(((d.getTime() - week1.getTime()) / 86400000 + 1) / 7);

  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
