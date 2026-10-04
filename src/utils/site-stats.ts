const shanghai = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Shanghai",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});
const DAY_MS = 86400000;
export interface StatDates {
	runningDays: number;
	lastActivityDay: string | null;
	state: "missing" | "past" | "today" | "future";
	daysSinceActivity: number | null;
}
function calendarDay(date: Date): string {
	const parts = shanghai.formatToParts(date);
	return ["year", "month", "day"]
		.map((type) => parts.find((part) => part.type === type)?.value)
		.join("-");
}
function dayNumber(day: string): number {
	return Date.parse(`${day}T00:00:00Z`) / DAY_MS;
}
export function getStatDates(
	startDay: string,
	lastActivityISO: string | null,
	now: Date = new Date(),
): StatDates {
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(startDay) ||
		!Number.isFinite(dayNumber(startDay)) ||
		new Date(dayNumber(startDay) * DAY_MS).toISOString().slice(0, 10) !==
			startDay ||
		!Number.isFinite(now.getTime())
	)
		throw new RangeError("Invalid site start date or current date");
	const today = dayNumber(calendarDay(now));
	const runningDays = Math.max(0, today - dayNumber(startDay));
	const last = lastActivityISO ? new Date(lastActivityISO) : null;
	if (!last || !Number.isFinite(last.getTime()))
		return {
			runningDays,
			lastActivityDay: null,
			state: "missing",
			daysSinceActivity: null,
		};
	const lastActivityDay = calendarDay(last);
	const daysSinceActivity = today - dayNumber(lastActivityDay);
	return {
		runningDays,
		lastActivityDay,
		daysSinceActivity,
		state:
			daysSinceActivity < 0
				? "future"
				: daysSinceActivity === 0
					? "today"
					: "past",
	};
}
export function activityText(dates: StatDates): string {
	if (dates.state === "missing") return "日期未记录";
	return `${dates.lastActivityDay} · ${dates.state === "future" ? "日期待核实" : dates.state === "today" ? "今天" : `${dates.daysSinceActivity} 天前`}`;
}
