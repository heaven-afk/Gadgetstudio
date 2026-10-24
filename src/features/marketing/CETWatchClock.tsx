'use client';

import { useEffect, useState } from 'react';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Etc/GMT-1', // CET stays at UTC+1, independently of daylight saving.
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function CETWatchClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);
  const [hours, minutes] = now
    ? formatter.format(now).split(':')
    : ['--', '--'];
  return (
    <time dateTime={now?.toISOString()} title="Central European Time (UTC+1)">
      {hours}
      <br />
      {minutes}
      <small>CET</small>
    </time>
  );
}
