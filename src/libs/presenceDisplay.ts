export function dotColor(status: string) {
  if (status === 'online') return 'bg-emerald-500';
  if (status === 'in_game') return 'bg-purple-500';
  return 'bg-gray-400 dark:bg-gray-600'; // idle or offline
}

export function statusLabel(status: string) {
  if (status === 'online') return 'Online';
  if (status === 'in_game') return 'In a game';
  if (status === 'idle') return 'Idle';
  return 'Offline';
}
