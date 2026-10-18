export function assertOwnerRole(roles: ReadonlyArray<{ role: string }>) {
  if (!roles.some(({ role }) => role === "admin")) {
    throw new Error("Acesso restrito ao dono da plataforma.");
  }
}

export function assertNoLinkedRecords(count: number, message: string) {
  if (count > 0) throw new Error(message);
}