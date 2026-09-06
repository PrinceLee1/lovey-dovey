function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-20 w-20 text-2xl',
} as const;

export default function Avatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string;
  avatarUrl: string | null;
  size?: keyof typeof SIZES;
}) {
  return (
    <div
      className={`${SIZES[size]} shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 overflow-hidden grid place-items-center text-white font-semibold`}
    >
      {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" alt={name} /> : initials(name)}
    </div>
  );
}
