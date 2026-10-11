let busy = false;

export function setAuthBusy(next: boolean): void {
  busy = next;
}

export function isAuthBusy(): boolean {
  return busy;
}
