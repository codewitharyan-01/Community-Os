// Shared demo persona registry — used by one-tap login everywhere.

export const DEMO_USERS: Record<string, { email: string; label: string }> = {
  resident: { email: "resident@demo.local", label: "Resident · Aryan Patel" },
  admin: { email: "admin@demo.local", label: "Admin · Meera Shah" },
  accountant: { email: "accountant@demo.local", label: "Accountant · Rohan Mehta" },
  security: { email: "security@demo.local", label: "Security · Jagdish Singh" },
  vendor: { email: "vendor@demo.local", label: "Vendor · Suresh Elevators" },
  staff: { email: "staff@demo.local", label: "Staff · Ramesh Prajapati" },
  secretary: { email: "secretary@demo.local", label: "Secretary · Hiten Parikh" },
};

export type DemoRole = keyof typeof DEMO_USERS;

export function isDemoRole(role: string): role is DemoRole {
  return Object.prototype.hasOwnProperty.call(DEMO_USERS, role);
}
