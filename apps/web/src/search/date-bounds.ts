const pad = (value: number, length = 2) => String(value).padStart(length, "0");

// The offset is read from the instant itself, so a day that starts in winter
// time and ends in summer time gets a different offset at each end.
function offsetDatetime(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? "-" : "+";
  const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  return `${day}T${time}${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

// new Date(year, …) reads years 0–99 as 1900–1999; setFullYear does not.
export function localDate(year: number, month: number, date: number, time: [number, number, number, number] = [0, 0, 0, 0]): Date {
  const day = new Date(2000, 0, 1, ...time);
  day.setFullYear(year, month - 1, date);
  return day;
}

function dayAt(day: string, time: [number, number, number, number]): Date {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  return localDate(year, month, date, time);
}

// A bare date would mean a UTC day to the API, so a local day is sent as the
// first and last instants of that day on this device.
export function localDayStart(day: string): string {
  return offsetDatetime(dayAt(day, [0, 0, 0, 0]));
}

export function localDayEnd(day: string): string {
  return offsetDatetime(dayAt(day, [23, 59, 59, 999]));
}
