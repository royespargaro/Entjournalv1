export const detectSession = (utcHour: number): string => {
  const sydney   = (utcHour >= 21) || (utcHour < 6);
  const tokyo    = utcHour >= 0 && utcHour < 9;
  const london   = utcHour >= 7 && utcHour < 16;
  const newYork  = utcHour >= 12 && utcHour < 21;

  const sessions = [];
  if (sydney)   sessions.push('Sydney');
  if (tokyo)    sessions.push('Tokyo');
  if (london)   sessions.push('London');
  if (newYork)  sessions.push('New York');

  if (sessions.length === 0) return 'Off Session';
  return sessions.join(' / ');
};
