/** Resolve 09:00 on a gift date in the configured IANA time zone, including DST. */
export function giftDeliveryTime(date: string, zone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const local = Date.UTC(y, m - 1, d, 9);
  let instant = local;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((x) => [x.type, x.value]),
    );
    const rendered = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    instant = local - (rendered - instant);
  }
  return new Date(instant);
}
