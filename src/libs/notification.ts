import { echo } from "../libs/echo";

export function subscribePartnerNotifications(userId: number, handlers: {
  onAccepted?: (e:any)=>void;
  onRejected?: ()=>void;
  onStatus?: (e:any)=>void;
}) {
  const ch = echo.private(`private-user.${userId}`)
    .listen('PartnerInviteAccepted', (e:any) => handlers.onAccepted?.(e))
    .listen('PartnerInviteRejected', () => handlers.onRejected?.())
    .listen('PartnerStatusUpdated', (e:any) => handlers.onStatus?.(e));

  return () => { echo.leave(`private-user.${userId}`); };
}