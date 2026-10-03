/**
 * COMMUNITY OS — demo seed.
 * Deterministic (seeded RNG) so charts and demo stories are reproducible.
 * Creates: organization + 2 communities (isolation demo), 3 towers / 120 units,
 * ~64 residents, 6 months of billing at ~87% collection, issues, feed, polls,
 * events, visitors, facilities, vendors, assets, tasks, documents, audit, emails.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ─── Deterministic RNG ────────────────────────────────────────────────────────
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261003);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);

const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const day = 86400000;
const NOW = new Date();

// ─── Name pools (fictional) ───────────────────────────────────────────────────
const FIRST_M = ["Aarav", "Vivaan", "Rohan", "Aditya", "Kiran", "Nikhil", "Sahil", "Arjun", "Devang", "Mihir", "Yash", "Kunal", "Rahul", "Sanket", "Parth", "Jatin", "Harsh", "Uday", "Ankit", "Tarak"];
const FIRST_F = ["Ananya", "Diya", "Priya", "Meera", "Kavya", "Riya", "Isha", "Nisha", "Tulsi", "Aarti", "Pooja", "Nidhi", "Kinjal", "Hetal", "Bhavna", "Shreya", "Mitali", "Falguni", "Rina", "Jigna"];
const SURNAMES = ["Patel", "Shah", "Mehta", "Desai", "Joshi", "Trivedi", "Bhatt", "Modi", "Chauhan", "Solanki", "Parmar", "Pandya", "Kapadia", "Amin", "Parikh", "Rana", "Vora", "Thakkar", "Dalal", "Seth"];
const fullName = () => `${pick(chance(0.5) ? FIRST_M : FIRST_F)} ${pick(SURNAMES)}`;

const CAR_MODELS = [["Swift", "White"], ["Baleno", "Grey"], ["Creta", "Black"], ["Nexon EV", "Blue"], ["City", "Silver"], ["XUV700", "Red"], ["Punch", "Orange"], ["i20", "White"], ["Seltos", "Black"], ["Ertiga", "Grey"], ["Amaze", "Brown"], ["Altroz", "Red"]];
const BIKE_MODELS = [["Activa", "White"], ["Shine", "Black"], ["Pulsar", "Blue"], ["Splendor", "Black"], ["FZ", "Grey"], ["Jupiter", "White"]];
const GUJ_RTO = ["GJ01", "GJ18", "GJ27", "GJ03"];

const ISSUE_TEMPLATES = [
  ["Water leakage in Block B basement", "WATER", "HIGH", "Basement, Tower B", "There has been continuous water seepage in the B block basement near pump room for 3 days. Puddles are forming and it smells damp. Possible pipe joint failure."],
  ["Lift making grinding noise", "LIFT", "HIGH", "Tower A lift 2", "The second lift in Tower A makes a grinding sound between floors 6-8. It stops briefly before doors open. Requesting urgent AMC inspection."],
  ["Garbage not collected since Monday", "GARBAGE", "MEDIUM", "Gate 2 chute", "Household garbage bins on the second floor chute area are overflowing. Collection seems to have been skipped since Monday evening."],
  ["Streetlight out near garden", "ELECTRICAL", "LOW", "Central garden walkway", "Two garden pathway lights are not switching on at night. The stretch near the swings is completely dark."],
  ["Unauthorized parking blocking driveway", "PARKING", "MEDIUM", "Visitor parking, Gate 1", "An unidentified car has been parked in visitor parking for over a week without any pass. Blocking movement for delivery vehicles."],
  ["Low water pressure on 7th floor", "WATER", "MEDIUM", "Tower C, 7th floor", "Since yesterday evening the taps on the 7th floor have very low pressure. Morning usage is affected."],
  ["CCTV camera near gate not working", "SECURITY", "HIGH", "Main gate boom barrier", "The camera overlooking the boom barrier shows a blank feed. Security cannot verify vehicle numbers at night."],
  ["Drainage smell in ground floor corridor", "DRAINAGE", "MEDIUM", "Tower A ground floor", "Strong sewage smell in the corridor near the service shaft since the weekend. Possibly a dry trap or choked line."],
  ["Gym treadmill belt slipping", "OTHER", "LOW", "Gym", "The treadmill near the window slips under load and has stopped at higher speeds twice."],
  ["Loud music from clubhouse after hours", "NOISE", "LOW", "Clubhouse", "Music events are running past 10:30 PM on weekdays. Requesting the committee to enforce timing rules."],
  ["Broken intercom in C-301", "OTHER", "LOW", "Tower C, 3rd floor", "The intercom unit does not power on. Gate calls are not reaching our flat."],
  ["Pothole at exit ramp", "OTHER", "MEDIUM", "Basement exit ramp", "A pothole has opened up at the exit ramp curvature. Two-wheelers are swerving dangerously."],
  ["Swing chain broken in children's play area", "GARDEN", "MEDIUM", "Children's play area", "The chain on the left swing has snapped at the top joint. Kids keep trying to use it — please cordon it off."],
  ["Fire extinguisher missing on 5th floor", "SECURITY", "HIGH", "Tower B, 5th floor", "The extinguisher cabinet near the staircase on the 5th floor is empty. Refill/replacement needed urgently."],
  ["Pest control due in B wing", "CLEANING", "LOW", "Tower B common areas", "Cockroach sightings in the B wing service areas have increased. Requesting the monthly pest control cycle."],
  ["Water tanker delivery delays", "WATER", "MEDIUM", "Main tank inlet", "Tanker deliveries have been arriving 2-3 hours late all week, and the overhead tank runs low by evening."],
] as const;

const POSTS = [
  ["ANNOUNCEMENT", "Diwali decoration committee — volunteers needed", "We are forming a small team for Diwali decorations and the cultural evening. If you can spare a weekend, please comment below. Material budget has been approved in the October meeting."],
  ["ANNOUNCEMENT", "Water supply maintenance — Saturday 9 AM to 1 PM", "The overhead tanks will be cleaned this Saturday morning. Please store water in advance. Supply resumes by 1 PM. — Facility team"],
  ["DISCUSSION", "Is anyone interested in a weekend yoga group?", "A few of us are planning morning yoga sessions in the garden (7 AM, Sat & Sun). All levels welcome. Reply if you'd like to join."],
  ["SUGGESTION", "Dedicated two-wheeler charging points", "With more EV scooters in the society, can we request 2-3 dedicated charging points near the B wing parking? Happy to share load calculations."],
  ["APPRECIATION", "Kudos to the security team", "The night shift team helped when my kid had a fever at 2 AM — arranged the taxi and kept the gate open. Thank you Jagdish bhai and team."],
  ["LOST_FOUND", "Found: set of house keys near the clubhouse", "Found a keyring with 3 keys and a maroon fob near the clubhouse entrance this morning. Claim at A-804 with a description."],
  ["DISCUSSION", "Carpool group for SG Highway offices", "Starting a carpool list for offices along SG Highway. If you drive to Corporate Road / Prahlad Nagar, drop your details."],
  ["SUGGESTION", "Library shelf in the community room", "We have a lot of unused shelf space in the community room. Proposal: a small shared library — donate a book, borrow a book."],
  ["DISCUSSION", "Weekend badminton fixtures", "The badminton court is mostly free Saturday evenings. Proposing fixed 6-8 PM slots with a simple rotation. Comments welcome."],
  ["ANNOUNCEMENT", "Visitor parking rules reminder", "Visitor vehicles must display a pass and cannot remain overnight without committee approval. Vehicles blocking driveways will be towed after two notices."],
] as const;

const CHANNEL_MSGS = [
  ["Meera Shah", "Welcome to the community channel! Keep this space for society-related coordination."],
  ["Rohan Mehta", "October maintenance invoices are out. Payment via UPI takes under a minute from the Payments tab."],
  ["Kiran Bhatt", "The new gym equipment is installed — treadmill and cross-trainer are ready to use."],
  ["Priya Desai", "Zumba classes start next week in the clubhouse, Tue & Thu 7 PM. Fees go to the instructor directly."],
  ["Nikhil Joshi", "Reminder: DO NOT feed stray dogs near the basement ramp, it's causing traffic issues. The feeding point has been moved behind the garden."],
  ["Aarti Trivedi", "Lost a blue umbrella in the community room last evening. If found, please ping here."],
  ["Sanket Modi", "Weekend cricket on the lawn at 6:30 AM Sunday — all ages welcome."],
];

const EVENTS: Array<[string, string, string, number, number]> = [
  // title, type, location, budget, daysFromNow (negative = past)
  ["Diwali Celebration & Cultural Night", "FESTIVAL", "Central Garden & Clubhouse", 150000, 36],
  ["Navratri Garba Nights", "FESTIVAL", "Clubhouse Lawn", 90000, -3],
  ["Annual General Meeting (AGM)", "MEETING", "Community Room", 0, 21],
  ["Independence Day Flag Hoisting", "EVENT", "Main Gate Plaza", 20000, -49],
  ["Community Garage Sale", "EVENT", "Visitor Parking Bay", 5000, -20],
  ["Blood Donation Camp", "EVENT", "Clubhouse", 30000, -75],
  ["Uttarayan Kite Festival", "FESTIVAL", "Terrace, Tower A", 60000, 130],
  ["Fire Safety Drill", "MAINTENANCE", "All Towers", 0, 9],
  ["Society Foundation Day", "EVENT", "Clubhouse", 80000, -120],
  ["Kids' Summer Carnival", "EVENT", "Garden & Pool", 70000, -160],
];

const FACILITIES: Array<[string, string, number, number, number, boolean, number]> = [
  ["Clubhouse", "AC hall with stage and kitchenette — ideal for family functions", 500, 8, 22, true, 2],
  ["Party Hall", "Larger hall for 150+ guests, catering allowed", 2000, 8, 23, true, 1],
  ["Badminton Court", "Wooden court with LED lighting", 100, 6, 22, false, 8],
  ["Swimming Pool", "Semi-Olympic pool; swim cap mandatory", 200, 6, 20, false, 6],
  ["Gym", "Fully equipped gym, residents only", 0, 5, 22, false, 30],
  ["Community Room", "Small meeting room for 20 people", 0, 9, 21, false, 4],
];

const VENDOR_SEED: Array<[string, string, string, string, number, number | null]> = [
  ["Sentinel Security Services", "SECURITY", "Bhavesh Chauhan", "98250 11223", 120000, 220],
  ["SparkleClean Facility Care", "CLEANING", "Jyoti Prajapati", "98980 44556", 54000, 150],
  ["Suresh Elevators Co.", "LIFT", "Suresh Agarwal", "98240 77889", 20000, 18],
  ["VoltCare Electricals", "ELECTRICAL", "Deepak Shah", "97270 33445", 15000, 200],
  ["GreenLeaf Gardens", "GARDEN", "Manglu Bhai", "99090 55667", 18000, 130],
  ["AquaFix Plumbing", "PLUMBING", "Imran Shaikh", "97250 66788", 12000, 90],
  ["SafeHome Fire Systems", "FIRE_SAFETY", "Rahul Nair", "97370 22334", 8000, 25],
  ["PestAway Solutions", "PEST_CONTROL", "Vikram Rathod", "97660 88990", 6000, 300],
  ["SunGrid Solar O&M", "OTHER", "Nidhi Rawal", "99980 12121", 14000, 260],
  ["FreshDrop Water Supply", "WATER", "Bhikhu Bhai", "94280 90909", 22000, 45],
];

const ASSET_SEED: Array<[string, string, string, string, number | null, number, string]> = [
  // name, category, code, location, intervalDays, daysToNextService, condition
  ["Passenger Lift — Tower A", "LIFT", "AST-LFT-A1", "Tower A core", 30, 12, "GOOD"],
  ["Passenger Lift — Tower B", "LIFT", "AST-LFT-B1", "Tower B core", 30, 4, "GOOD"],
  ["Passenger Lift — Tower C", "LIFT", "AST-LFT-C1", "Tower C core", 30, 22, "FAIR"],
  ["Water Pump — Main Sump", "PUMP", "AST-PMP-01", "Basement pump room", 45, 20, "GOOD"],
  ["Water Pump — Overhead Tower B", "PUMP", "AST-PMP-02", "Tower B terrace", 45, 39, "FAIR"],
  ["Diesel Generator 125kVA", "GENERATOR", "AST-GEN-01", "Utility yard", 90, 60, "GOOD"],
  ["CCTV NVR + Cameras", "CCTV", "AST-CCTV-01", "Gate house", 60, 30, "GOOD"],
  ["Fire Extinguisher Set (120)", "FIRE_SAFETY", "AST-FIR-01", "All floors", 365, 200, "GOOD"],
  ["Fire Pump & Hydrant System", "FIRE_SAFETY", "AST-FIR-02", "Basement", 90, 75, "GOOD"],
  ["Rooftop Solar Array 75kW", "SOLAR", "AST-SOL-01", "All terraces", 180, 140, "EXCELLENT"],
  ["Underground Water Tank 1", "WATER_TANK", "AST-WTK-01", "Below garden", 180, 6, "GOOD"],
  ["Underground Water Tank 2", "WATER_TANK", "AST-WTK-02", "Below Tower C", 180, 95, "GOOD"],
  ["Treadmill T-900", "GYM", "AST-GYM-01", "Gym", 90, 88, "POOR"],
  ["Cross Trainer X2", "GYM", "AST-GYM-02", "Gym", 90, 40, "GOOD"],
  ["EV Charger — 2 x 7.4kW", "EV_CHARGER", "AST-EVC-01", "Visitor parking", 60, 48, "GOOD"],
];

const BUDGET: Array<[string, number, string]> = [
  ["SECURITY", 1440000, "Guards + CCTV AMC"],
  ["ELECTRICITY", 800000, "Common areas, pumps, lifts"],
  ["CLEANING", 540000, "Housekeeping contract"],
  ["WATER", 300000, "Tankers + pumping"],
  ["REPAIRS", 400000, "Plumbing, civil, misc"],
  ["GARDEN", 120000, "Landscaping"],
  ["LIFT", 240000, "AMC + repairs"],
  ["EVENTS", 150000, "Festivals & community"],
  ["ADMIN", 100000, "Audit, stationery, software"],
];

const DOC_SEED: Array<[string, string, string]> = [
  ["Society Registration Certificate", "REGISTRATION", "RESIDENT"],
  ["Model Bye-laws (Adopted)", "BYE_LAWS", "RESIDENT"],
  ["Fire Safety NOC 2026", "INSURANCE", "RESIDENT"],
  ["Property Insurance Policy", "INSURANCE", "RESIDENT"],
  ["Security Services Contract", "CONTRACTS", "COMMITTEE"],
  ["Lift AMC — Suresh Elevators", "CONTRACTS", "COMMITTEE"],
  ["Internal Audit Report FY25", "AUDIT", "COMMITTEE"],
  ["AGM Minutes — September", "MINUTES", "RESIDENT"],
  ["Parking Policy v2.1", "POLICIES", "RESIDENT"],
  ["Guest & Visitor Policy", "POLICIES", "RESIDENT"],
  ["Committee Meeting Notice — October", "NOTICES", "RESIDENT"],
  ["Water Testing Report", "AUDIT", "ADMIN"],
];

async function main() {
  console.log("Resetting tables…");
  // Order respects FK relations; SQLite pragmas make this safe sequentially.
  await db.consentRecord.deleteMany();
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.emailOutbox.deleteMany();
  await db.document.deleteMany();
  await db.calendarItem.deleteMany();
  await db.emergencyAlert.deleteMany();
  await db.securityIncident.deleteMany();
  await db.visitor.deleteMany();
  await db.maintenanceTask.deleteMany();
  await db.asset.deleteMany();
  await db.staff.deleteMany();
  await db.vendor.deleteMany();
  await db.booking.deleteMany();
  await db.facility.deleteMany();
  await db.eventRegistration.deleteMany();
  await db.event.deleteMany();
  await db.pollVote.deleteMany();
  await db.pollOption.deleteMany();
  await db.poll.deleteMany();
  await db.report.deleteMany();
  await db.postVote.deleteMany();
  await db.postComment.deleteMany();
  await db.post.deleteMany();
  await db.issueEvent.deleteMany();
  await db.issueVote.deleteMany();
  await db.issueComment.deleteMany();
  await db.issue.deleteMany();
  await db.budgetLine.deleteMany();
  await db.ledgerEntry.deleteMany();
  await db.expense.deleteMany();
  await db.payment.deleteMany();
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.billingRun.deleteMany();
  await db.parkingSlot.deleteMany();
  await db.vehicle.deleteMany();
  await db.membership.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.unit.deleteMany();
  await db.building.deleteMany();
  await db.community.deleteMany();
  await db.organization.deleteMany();

  // ─── Organization & communities ─────────────────────────────────────────────
  const org = await db.organization.create({
    data: { name: "Nexus Living Property Management", plan: "ENTERPRISE" },
  });

  const community = await db.community.create({
    data: {
      organizationId: org.id,
      name: "Green Heights Residency",
      code: "GHR-7F82A",
      city: "Ahmedabad",
      state: "Gujarat",
      address: "Green Heights Residency, S G Highway, Ahmedabad 380054",
      config: JSON.stringify({ maintenance: 2500, dueDay: 10, currency: "INR", jurisdiction: "Gujarat Co-operative Societies Act, 1961" }),
    },
  });

  // Second community to demonstrate tenant isolation
  const community2 = await db.community.create({
    data: {
      organizationId: org.id,
      name: "Sunrise Apartments",
      code: "SUN-3K91B",
      city: "Surat",
      state: "Gujarat",
      address: "Sunrise Apartments, Adajan, Surat 395009",
      config: JSON.stringify({ maintenance: 1800, dueDay: 5, currency: "INR" }),
    },
  });

  console.log("Buildings & units…");
  const towers = await Promise.all(
    ["Tower A", "Tower B", "Tower C"].map((name, i) =>
      db.building.create({ data: { communityId: community.id, name, code: name.slice(-1), floors: 10 } })
    )
  );

  const units: { id: string; label: string; floor: number; buildingName: string; buildingId: string }[] = [];
  for (const tower of towers) {
    for (let floor = 1; floor <= 10; floor++) {
      for (let u = 1; u <= 4; u++) {
        const label = `${tower.code}-${floor}${String(u).padStart(2, "0")}`;
        const unit = await db.unit.create({
          data: {
            communityId: community.id,
            buildingId: tower.id,
            floor,
            label,
            areaSqft: pick([950, 1050, 1150, 1250]),
            status: "VACANT",
          },
        });
        units.push({ id: unit.id, label, floor, buildingName: tower.name, buildingId: tower.id });
      }
    }
  }
  // occupy ~100 of 120
  const occupiedUnits = units.filter((_, i) => i % 6 !== 0); // deterministic ~100 units
  await db.unit.updateMany({
    where: { id: { in: occupiedUnits.map((u) => u.id) } },
    data: { status: "OCCUPIED" },
  });

  // ─── Key demo users ─────────────────────────────────────────────────────────
  console.log("Users…");
  const mkUser = (data: {
    email: string; password: string; name: string; role: string; phone?: string; communityId?: string | null;
    vendorId?: string; staffId?: string; avatarHue?: number; emergencyContact?: string;
  }) =>
    db.user.create({
      data: {
        email: data.email,
        passwordHash: hash(data.password),
        name: data.name,
        role: data.role,
        phone: data.phone ?? "",
        communityId: data.communityId ?? null,
        vendorId: data.vendorId,
        staffId: data.staffId,
        avatarHue: data.avatarHue ?? int(0, 5),
        emergencyContact: data.emergencyContact ?? "",
      },
    });

  // Super admin (platform)
  await mkUser({ email: "super@demo.local", password: "super123", name: "Platform Root", role: "SUPER_ADMIN" });

  // Community team
  const admin = await mkUser({ email: "admin@demo.local", password: "admin123", name: "Meera Shah", role: "COMMUNITY_ADMIN", phone: "98250 10101", communityId: community.id, emergencyContact: "Rakesh Shah · Spouse · 98250 10102" });
  const accountant = await mkUser({ email: "accountant@demo.local", password: "accountant123", name: "Rohan Mehta", role: "TREASURER", phone: "98250 20202", communityId: community.id });
  const guard = await mkUser({ email: "security@demo.local", password: "security123", name: "Jagdish Singh", role: "SECURITY_GUARD", phone: "98250 30303", communityId: community.id });
  const guard2 = await mkUser({ email: "guard2@demo.local", password: "guard123", name: "Ramsinh Rathod", role: "SECURITY_GUARD", phone: "98250 30304", communityId: community.id });
  await mkUser({ email: "secretary@demo.local", password: "sec12345", name: "Hiten Parikh", role: "SECRETARY", phone: "98250 40404", communityId: community.id });
  const staff = await mkUser({ email: "staff@demo.local", password: "staff123", name: "Ramesh Prajapati", role: "MAINTENANCE_STAFF", phone: "98250 50505", communityId: community.id });
  const staff2 = await mkUser({ email: "staff2@demo.local", password: "staff123", name: "Kalpesh Vaghela", role: "MAINTENANCE_STAFF", phone: "98250 50506", communityId: community.id });
  await mkUser({ email: "committee@demo.local", password: "committee123", name: "Falguni Amin", role: "COMMITTEE_MEMBER", phone: "98250 60606", communityId: community.id });

  // Vendor company + account
  const vendorEntity = await db.vendor.create({
    data: {
      communityId: community.id,
      company: "Suresh Elevators Co.",
      category: "LIFT",
      contactName: "Suresh Agarwal",
      phone: "98240 77889",
      email: "suresh@demo.local",
      contractStart: new Date(NOW.getTime() - 400 * day),
      contractEnd: new Date(NOW.getTime() + 18 * day),
      monthlyAmount: 20000,
      rating: 4,
      status: "ACTIVE",
    },
  });
  const vendorUser = await mkUser({ email: "vendor@demo.local", password: "vendor123", name: "Suresh Agarwal", role: "VENDOR", phone: "98240 77889", communityId: community.id, vendorId: vendorEntity.id });

  // Staff profiles
  const staffProfile = await db.staff.create({
    data: { communityId: community.id, name: "Ramesh Prajapati", workType: "ELECTRICIAN", phone: "98250 50505", verification: "VERIFIED", assignedUnits: "A-101, A-402, B-204", provider: "Society direct" },
  });
  await db.user.update({ where: { id: staff.id }, data: { staffId: staffProfile.id } });
  const staffProfile2 = await db.staff.create({
    data: { communityId: community.id, name: "Kalpesh Vaghela", workType: "PLUMBER", phone: "98250 50506", verification: "VERIFIED", assignedUnits: "Tower B, Tower C", provider: "Society direct" },
  });
  await db.user.update({ where: { id: staff2.id }, data: { staffId: staffProfile2.id } });

  // Domestic staff directory
  const STAFF_TYPES = ["MAID", "COOK", "DRIVER", "CLEANER", "GARDENER", "MAID", "COOK", "DRIVER", "CLEANER", "GARDENER"];
  for (const t of STAFF_TYPES) {
    await db.staff.create({
      data: {
        communityId: community.id,
        name: fullName(),
        workType: t,
        phone: `9${int(700000000, 899999999)}`,
        verification: chance(0.85) ? "VERIFIED" : "PENDING",
        assignedUnits: `${pick(units).label}, ${pick(units).label}`,
        provider: pick(["Society direct", "Self-employed"]),
      },
    });
  }

  // Remaining vendors
  for (const [company, category, contactName, phone, monthlyAmount, expiresInDays] of VENDOR_SEED) {
    if (company === "Suresh Elevators Co.") continue;
    await db.vendor.create({
      data: {
        communityId: community.id,
        company, category, contactName, phone,
        email: `${company.split(" ")[0].toLowerCase()}@vendor.local`,
        contractStart: new Date(NOW.getTime() - int(100, 500) * day),
        contractEnd: expiresInDays !== null ? new Date(NOW.getTime() + expiresInDays * day) : null,
        monthlyAmount,
        rating: int(3, 5),
        status: expiresInDays !== null && expiresInDays <= 30 ? "EXPIRING" : "ACTIVE",
      },
    });
  }

  // ─── Residents + memberships + vehicles + parking ────────────────────────────
  const usedEmails = new Set<string>();
  const residentUsers: { id: string; name: string; avatarHue: number }[] = [];
  const membershipByUnit = new Map<string, { userId: string; name: string }>();

  // Aryan Patel — primary resident demo account, A-402, with family
  const unitA402 = units.find((u) => u.label === "A-402")!;
  const aryan = await mkUser({
    email: "resident@demo.local", password: "demo123", name: "Aryan Patel", role: "OWNER",
    phone: "98980 12345", communityId: community.id, avatarHue: 0,
    emergencyContact: "Tulsi Patel · Spouse · 98980 12346",
  });
  await db.membership.create({ data: { userId: aryan.id, unitId: unitA402.id, type: "OWNER", isPrimary: true } });
  const tulsi = await mkUser({ email: "tulsi@demo.local", password: "demo123", name: "Tulsi Patel", role: "FAMILY_MEMBER", phone: "98980 12346", communityId: community.id, avatarHue: 1 });
  await db.membership.create({ data: { userId: tulsi.id, unitId: unitA402.id, type: "FAMILY_MEMBER" } });
  await db.unit.update({ where: { id: unitA402.id }, data: { householdName: "Patel Household" } });
  residentUsers.push(aryan, tulsi);
  membershipByUnit.set(unitA402.id, { userId: aryan.id, name: "Aryan Patel" });
  usedEmails.add("resident@demo.local");

  // Vehicles for Aryan
  await db.vehicle.create({ data: { communityId: community.id, unitId: unitA402.id, userId: aryan.id, number: "GJ01AB1234", type: "CAR", model: "Hyundai Creta", color: "Black" } });
  await db.vehicle.create({ data: { communityId: community.id, unitId: unitA402.id, userId: aryan.id, number: "GJ01CD5678", type: "BIKE", model: "Honda Activa", color: "White" } });

  // Parking slots: 1 per occupied unit + visitor slots
  const slotsByUnit = new Map<string, string[]>();
  for (const u of occupiedUnits) {
    const slot = await db.parkingSlot.create({
      data: { communityId: community.id, buildingId: u.buildingId, code: `${u.label}-P1`, area: u.floor === 1 ? "Podium" : `Basement ${u.floor <= 5 ? 1 : 2}`, type: "COVERED", unitId: u.id },
    });
    slotsByUnit.set(u.id, [slot.code]);
  }
  for (let i = 1; i <= 20; i++) {
    await db.parkingSlot.create({
      data: { communityId: community.id, code: `VIS-${String(i).padStart(2, "0")}`, area: "Gate side", type: "VISITOR" },
    });
  }

  // Other residents
  const others = occupiedUnits.filter((u) => u.id !== unitA402.id);
  let hue = 2;
  for (const u of others) {
    const name = fullName();
    const isTenant = chance(0.22);
    const slug = name.toLowerCase().replace(/\s+/g, ".");
    let email = `${slug}${int(1, 99)}@demo.local`;
    while (usedEmails.has(email)) email = `${slug}${int(100, 999)}@demo.local`;
    usedEmails.add(email);
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hash("resident123"),
        name,
        role: isTenant ? "TENANT" : "OWNER",
        phone: `9${int(600000000, 899999999)}`,
        communityId: community.id,
        avatarHue: hue++ % 6,
      },
    });
    await db.membership.create({ data: { userId: user.id, unitId: u.id, type: isTenant ? "TENANT" : "OWNER", isPrimary: true } });
    if (chance(0.28)) {
      const fam = await db.user.create({
        data: { email: `fam.${email}`, passwordHash: hash("resident123"), name: fullName(), role: "FAMILY_MEMBER", communityId: community.id, avatarHue: hue++ % 6 },
      });
      await db.membership.create({ data: { userId: fam.id, unitId: u.id, type: "FAMILY_MEMBER" } });
      residentUsers.push(fam);
    }
    residentUsers.push(user);
    membershipByUnit.set(u.id, { userId: user.id, name });

    await db.unit.update({ where: { id: u.id }, data: { householdName: `${name.split(" ")[1]} Household` } });

    // vehicles: ~45% of units get one, ~15% two
    if (chance(0.45)) {
      const [model, color] = pick(CAR_MODELS);
      await db.vehicle.create({
        data: {
          communityId: community.id, unitId: u.id, userId: user.id,
          number: `${pick(GUJ_RTO)}${pick(["AB", "CD", "KL", "MR", "ST", "ZX"])}${int(1000, 9999)}`,
          type: chance(0.75) ? "CAR" : "BIKE",
          model, color,
        },
      });
      if (chance(0.35)) {
        await db.vehicle.create({
          data: {
            communityId: community.id, unitId: u.id,
            number: `${pick(GUJ_RTO)}${pick(["AB", "CD", "KL", "MR"])}${int(1000, 9999)}`,
            type: chance(0.6) ? "BIKE" : "SCOOTER", model: pick(BIKE_MODELS)[0], color: pick(BIKE_MODELS)[1],
          },
        });
      }
    }
  }
  // A couple of vehicles without a clear owner (visitor lookups)
  await db.vehicle.create({ data: { communityId: community.id, number: "GJ27XY4321", type: "CAR", model: "Mahindra XUV700", color: "Red" } });

  // Sunrise Apartments — tiny isolated community
  const sunriseBuilding = await db.building.create({ data: { communityId: community2.id, name: "Wing 1", code: "W1", floors: 4 } });
  const sunriseUnits: { id: string; label: string }[] = [];
  for (let floor = 1; floor <= 4; floor++) {
    for (let u = 1; u <= 3; u++) {
      const label = `W1-${floor}${String(u).padStart(2, "0")}`;
      const unit = await db.unit.create({
        data: { communityId: community2.id, buildingId: sunriseBuilding.id, floor, label, status: "OCCUPIED", areaSqft: 850 },
      });
      sunriseUnits.push({ id: unit.id, label });
    }
  }
  await mkUser({ email: "sunrise.admin@demo.local", password: "sunrise123", name: "Nilesh Desai", role: "COMMUNITY_ADMIN", communityId: community2.id });
  for (const u of sunriseUnits) {
    const user = await mkUser({ email: `sr.${u.label.toLowerCase()}@demo.local`, password: "resident123", name: fullName(), role: "OWNER", communityId: community2.id });
    await db.membership.create({ data: { userId: user.id, unitId: u.id, type: "OWNER", isPrimary: true } });
  }

  console.log("Billing engine data…");
  // ─── Billing: 6 months × occupied units, ~87% collection ────────────────────
  const periods: { key: string; year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
    periods.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, year: d.getFullYear(), month: d.getMonth() });
  }
  const MAINT = 2500;
  let receiptSeq = 1;

  const currentRun = await db.billingRun.create({
    data: {
      communityId: community.id,
      period: periods[periods.length - 1].key,
      title: `${periods[periods.length - 1].key.split("-")[1]} maintenance run`,
      status: "POSTED",
      unitCount: occupiedUnits.length,
      totalAmount: MAINT * occupiedUnits.length,
      createdByUserId: accountant.id,
      postedAt: new Date(periods[periods.length - 1].year, periods[periods.length - 1].month, 1),
    },
  });

  const expenseLedger: { date: Date; category: string; description: string; amount: number }[] = [];

  for (const p of periods) {
    const isCurrent = p === periods[periods.length - 1];
    const run = isCurrent ? currentRun : null;
    if (!isCurrent) {
      await db.billingRun.create({
        data: {
          communityId: community.id, period: p.key,
          title: `${p.key.split("-")[1]} maintenance run`, status: "POSTED",
          unitCount: occupiedUnits.length, totalAmount: MAINT * occupiedUnits.length,
          createdByUserId: accountant.id,
          postedAt: new Date(p.year, p.month, 1),
        },
      });
    }
    for (const u of occupiedUnits) {
      const member = membershipByUnit.get(u.id)!;
      const issuedOn = new Date(p.year, p.month, 1, 9, 0);
      const dueOn = new Date(p.year, p.month, 10);
      const unpaid = isCurrent ? true : chance(0.13);
      const invoice = await db.invoice.create({
        data: {
          communityId: community.id,
          unitId: u.id,
          billingRunId: run?.id ?? null,
          number: `INV-${p.key}-${u.label}`,
          period: p.key,
          issuedOn, dueOn,
          total: MAINT,
          status: unpaid ? (isCurrent ? "PENDING" : "OVERDUE") : "PAID",
          paidAt: unpaid ? null : new Date(issuedOn.getTime() + int(0, 6) * day),
        },
      });
      await db.invoiceItem.create({
        data: { invoiceId: invoice.id, kind: "MAINTENANCE", label: "Monthly maintenance", amount: MAINT },
      });

      if (!unpaid) {
        const method = pick(["UPI", "UPI", "UPI", "CARD", "NETBANKING"]);
        const payment = await db.payment.create({
          data: {
            communityId: community.id,
            invoiceId: invoice.id,
            userId: member.userId,
            amount: MAINT,
            method,
            providerTxn: `TXN-DEMO-${int(100000, 999999)}`,
            idempotencyKey: `${member.userId}:${invoice.id}`,
            status: "SUCCESS",
            receiptNumber: `RCP-2026-${String(receiptSeq++).padStart(5, "0")}`,
            createdAt: invoice.paidAt!,
          },
        });
        await db.ledgerEntry.create({
          data: {
            communityId: community.id,
            date: invoice.paidAt!,
            type: "INCOME",
            category: "MAINTENANCE",
            description: `Payment for ${invoice.number} (${u.label})`,
            amount: MAINT,
            refType: "PAYMENT",
            refId: invoice.id,
          },
        });
        void payment;
      }
    }
  }

  // ─── Expenses + budget + ledger ─────────────────────────────────────────────
  console.log("Expenses, budget…");
  for (const [category, budgetAmount, notes] of BUDGET) {
    await db.budgetLine.create({ data: { communityId: community.id, year: NOW.getFullYear(), category, budgetAmount, notes } });
  }

  const vendors = await db.vendor.findMany({ where: { communityId: community.id } });
  const vendorByCat = new Map(vendors.map((v) => [v.category, v]));

  const EXPENSE_SEED: Array<[string, string, number, number]> = [
    // category, description, amount, daysAgo
    ["SECURITY", "Security services — monthly invoice", 120000, 8],
    ["CLEANING", "Housekeeping contract — monthly", 45000, 9],
    ["ELECTRICITY", "Common area electricity — September", 68000, 12],
    ["LIFT", "Lift AMC quarterly + repairs", 22000, 15],
    ["WATER", "Water tanker supply — September", 26000, 14],
    ["REPAIRS", "Basement leakage repair — plumbing works", 18500, 6],
    ["GARDEN", "Landscaping & garden upkeep", 15000, 18],
    ["EVENTS", "Navratri decorations & sound", 41000, 5],
    ["SECURITY", "CCTV camera replacement (gate)", 8200, 21],
    ["CLEANING", "Deep cleaning — Tower B water tank", 9500, 30],
    ["ELECTRICITY", "Diesel for generator — September", 12800, 25],
    ["REPAIRS", "Intercom system repair — Tower C", 4300, 40],
    ["LIFT", "Lift rope inspection — Tower A", 7600, 48],
    ["ADMIN", "Accounting software subscription", 2400, 11],
    ["GARDEN", "New saplings & manure", 6200, 55],
    ["EVENTS", "Independence Day arrangements", 15500, 49],
    ["WATER", "Tanker supply — August", 24000, 45],
  ];
  for (const [category, description, amount, daysAgo] of EXPENSE_SEED) {
    const date = new Date(NOW.getTime() - daysAgo * day);
    const status = daysAgo < 7 ? "PENDING_APPROVAL" : chance(0.8) ? "PAID" : "APPROVED";
    const vendor = vendorByCat.get(category === "REPAIRS" ? "PLUMBING" : category === "EVENTS" ? "PEST_CONTROL" : category);
    const expense = await db.expense.create({
      data: {
        communityId: community.id,
        vendorId: vendor?.id ?? null,
        category, description, amount, date, status,
        approvedByName: status !== "PENDING_APPROVAL" ? "Rohan Mehta" : "",
        paidAt: status === "PAID" ? new Date(date.getTime() + 3 * day) : null,
      },
    });
    if (status !== "PENDING_APPROVAL") {
      await db.ledgerEntry.create({
        data: {
          communityId: community.id, date,
          type: "EXPENSE", category, description, amount,
          refType: "EXPENSE", refId: expense.id,
        },
      });
      expenseLedger.push({ date, category, description, amount });
    }
  }

  // ─── Issues ──────────────────────────────────────────────────────────────────
  console.log("Issues, feed, polls…");
  const activeResidents = residentUsers;

  // Aryan's trending water leakage issue — IN_PROGRESS assigned to Ramesh
  const waterLeak = await db.issue.create({
    data: {
      communityId: community.id,
      authorId: aryan.id,
      title: "Water leakage in Block B basement",
      description: ISSUE_TEMPLATES[0][4],
      category: "WATER",
      location: "Basement, Tower B",
      status: "IN_PROGRESS",
      severity: "HIGH",
      slaHours: 4,
      upvoteCount: 0,
      createdAt: new Date(NOW.getTime() - 5 * day),
      timeline: {
        create: [
          { actorName: "Aryan Patel", toStatus: "SUBMITTED", note: "Issue submitted", createdAt: new Date(NOW.getTime() - 5 * day) },
          { actorName: "Meera Shah", fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", note: "Site inspected — confirmed pipe joint failure", createdAt: new Date(NOW.getTime() - 4.6 * day) },
          { actorName: "Meera Shah", fromStatus: "UNDER_REVIEW", toStatus: "ASSIGNED", note: "Assigned to Ramesh Prajapati (maintenance)", createdAt: new Date(NOW.getTime() - 4.2 * day) },
          { actorName: "Ramesh Prajapati", fromStatus: "ASSIGNED", toStatus: "IN_PROGRESS", note: "Parts ordered; plumbing repair underway", createdAt: new Date(NOW.getTime() - 3 * day) },
        ],
      },
    },
  });
  // votes for the leak issue (47 voters)
  const voters = [...activeResidents].sort(() => rand() - 0.5).slice(0, Math.min(47, activeResidents.length - 1));
  for (const v of voters) {
    if (v.id === aryan.id) continue;
    await db.issueVote.create({ data: { issueId: waterLeak.id, userId: v.id } }).catch(() => {});
  }
  const leakVoteCount = await db.issueVote.count({ where: { issueId: waterLeak.id } });
  await db.issue.update({ where: { id: waterLeak.id }, data: { upvoteCount: leakVoteCount } });

  await db.issueComment.create({
    data: { issueId: waterLeak.id, userId: tulsi.id, body: "The smell has reached the parking level too. Hope the parts arrive soon.", createdAt: new Date(NOW.getTime() - 4 * day) },
  });
  await db.issueComment.create({
    data: { issueId: waterLeak.id, userId: admin.id, body: "Vendor confirmed the replacement coupling arrives tomorrow. Work is sequenced first thing in the morning.", createdAt: new Date(NOW.getTime() - 2 * day) },
  });

  const leakTask = await db.maintenanceTask.create({
    data: {
      communityId: community.id,
      title: "Repair basement leakage — Tower B",
      description: "Replace failed pipe joint near pump room; verify with pressure test.",
      location: "Basement, Tower B",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: new Date(NOW.getTime() + 2 * day),
      assignedToUserId: staff.id,
      issueId: waterLeak.id,
      createdByName: "Meera Shah",
      createdAt: new Date(NOW.getTime() - 4 * day),
    },
  });

  // 15 more issues in various states
  const statusesPool = ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "VERIFIED", "RESOLVED", "CLOSED"];
  for (let i = 1; i < ISSUE_TEMPLATES.length; i++) {
    const [title, category, severity, location, description] = ISSUE_TEMPLATES[i];
    const status = statusesPool[i % statusesPool.length];
    const author = pick(activeResidents);
    const createdAt = new Date(NOW.getTime() - int(1, 40) * day - int(0, 20) * 3600000);
    const issue = await db.issue.create({
      data: {
        communityId: community.id,
        authorId: author.id,
        title, description, category, location,
        status,
        severity,
        slaHours: (severity as string) === "CRITICAL" ? 1 : severity === "HIGH" ? 4 : severity === "MEDIUM" ? 24 : 72,
        createdAt,
        resolvedAt: ["RESOLVED", "VERIFIED", "CLOSED"].includes(status) ? new Date(createdAt.getTime() + int(6, 96) * 3600000) : null,
        assignedToUserId: ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "VERIFIED", "CLOSED"].includes(status) ? (chance(0.6) ? staff.id : staff2.id) : null,
        assignedVendorId: category === "LIFT" ? vendorEntity.id : null,
      },
    });
    const voteCount = int(0, 28);
    const issueVoters = [...activeResidents].sort(() => rand() - 0.5).slice(0, Math.min(voteCount, activeResidents.length - 1));
    for (const v of issueVoters) {
      if (v.id === author.id) continue;
      await db.issueVote.create({ data: { issueId: issue.id, userId: v.id } }).catch(() => {});
    }
    const vc = await db.issueVote.count({ where: { issueId: issue.id } });
    await db.issue.update({ where: { id: issue.id }, data: { upvoteCount: vc } });

    await db.issueEvent.create({ data: { issueId: issue.id, actorName: "Community OS", toStatus: "SUBMITTED", note: "Issue submitted", createdAt } });
    if (status !== "SUBMITTED") {
      await db.issueEvent.create({ data: { issueId: issue.id, actorName: "Meera Shah", fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", note: "Reviewed by committee", createdAt: new Date(createdAt.getTime() + 3600000) } });
    }
    if (["RESOLVED", "VERIFIED", "CLOSED"].includes(status)) {
      await db.issueEvent.create({ data: { issueId: issue.id, actorName: "Maintenance", fromStatus: "IN_PROGRESS", toStatus: "RESOLVED", note: "Work completed and site cleaned", createdAt: issue.resolvedAt! } });
    }
    if (chance(0.5)) {
      await db.issueComment.create({
        data: { issueId: issue.id, userId: pick(activeResidents).id, body: pick(["Facing the same at our end.", "Thanks for reporting — following.", "Any update on this?", "This has been an issue for a while now.", "+1, please prioritise."]), createdAt: new Date(createdAt.getTime() + 7200000) },
      });
      await db.issue.update({ where: { id: issue.id }, data: { commentCount: { increment: 1 } } });
    }
    // link a couple of tasks
    if (status === "ASSIGNED" && chance(0.5)) {
      await db.maintenanceTask.create({
        data: {
          communityId: community.id, title: `Fix: ${title}`, location, priority: severity,
          status: "ASSIGNED", dueDate: new Date(NOW.getTime() + int(1, 5) * day),
          assignedToUserId: staff2.id, issueId: issue.id, createdByName: "Meera Shah",
        },
      });
    }
  }

  // Extra tasks not tied to issues
  for (let i = 0; i < 5; i++) {
    const asset = ASSET_SEED[i];
    await db.maintenanceTask.create({
      data: {
        communityId: community.id,
        title: `Service: ${asset[0]}`,
        description: "Scheduled preventive maintenance",
        location: asset[3],
        priority: "MEDIUM",
        status: pick(["OPEN", "ASSIGNED", "COMPLETED", "VERIFIED"]),
        dueDate: new Date(NOW.getTime() + int(-3, 10) * day),
        assignedToUserId: chance(0.6) ? staff.id : staff2.id,
        createdByName: "Meera Shah",
      },
    });
  }

  // ─── Community feed ──────────────────────────────────────────────────────────
  for (const [type, title, body] of POSTS) {
    const author = type === "ANNOUNCEMENT" ? admin : pick(activeResidents);
    const post = await db.post.create({
      data: {
        communityId: community.id,
        authorId: author.id,
        type, title, body,
        pinned: type === "ANNOUNCEMENT" && title.includes("Diwali"),
        createdAt: new Date(NOW.getTime() - int(1, 25) * day),
      },
    });
    const votes = int(2, 30);
    const postVoters = [...activeResidents].sort(() => rand() - 0.5).slice(0, Math.min(votes, activeResidents.length - 1));
    for (const v of postVoters) {
      if (v.id === author.id) continue;
      await db.postVote.create({ data: { postId: post.id, userId: v.id } }).catch(() => {});
    }
    const pvc = await db.postVote.count({ where: { postId: post.id } });
    await db.post.update({ where: { id: post.id }, data: { upvoteCount: pvc } });
    if (chance(0.6)) {
      await db.postComment.create({
        data: { postId: post.id, userId: pick(activeResidents).id, body: pick(["Count me in!", "Great initiative.", "Please share more details.", "Will join from next week.", "Noted, thank you."]) },
      });
      await db.post.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } });
    }
  }

  // Reported content → moderation queue
  const somePost = await db.post.findFirst({ where: { communityId: community.id, type: "DISCUSSION" } });
  if (somePost) {
    await db.report.create({
      data: {
        communityId: community.id,
        reporterId: pick(activeResidents).id,
        targetType: "POST",
        targetId: somePost.id,
        reason: "Posted commercial advertising, might violate community rules.",
        status: "OPEN",
      },
    });
  }

  // Channels (materialized as hidden anchor posts + comments)
  const anchorNames = ["General", "Announcements", "Tower A", "Tower B", "Tower C", "Events", "Buy & Sell", "Emergency"];
  const anchorMap = new Map<string, string>();
  for (const name of anchorNames) {
    const anchor = await db.post.create({
      data: { communityId: community.id, authorId: admin.id, type: "DISCUSSION", title: `__channel:${name}`, body: `Channel: ${name}`, hidden: true },
    });
    anchorMap.set(name, anchor.id);
  }
  for (const [authorName, body] of CHANNEL_MSGS) {
    const user = await db.user.findFirst({ where: { communityId: community.id, name: authorName } });
    if (!user) continue;
    await db.postComment.create({
      data: { postId: anchorMap.get("General")!, userId: user.id, body, createdAt: new Date(NOW.getTime() - int(2, 60) * 3600000) },
    });
  }

  // ─── Polls ───────────────────────────────────────────────────────────────────
  const pollDefs: Array<[string, string, string, string[], number]> = [
    ["Should we install EV chargers in the basement parking?", "Vendor quote received for 2 × 7.4kW chargers with load management. Installation cost ~₹1.8L from repair fund.", "INFORMAL", ["Yes", "No", "Need more information"], 7],
    ["Preferred timing for the community gym (summer)", "We are revising gym hours. Pick the slot you would use most.", "INFORMAL", ["5:00–8:00 AM", "6:00–9:00 AM", "Keep current hours"], -10],
    ["Approve painting of common areas (Tower B)", "Proposed vendor: ColourCraft. Cost ₹2.4L. Official committee resolution recorded at the AGM.", "OFFICIAL", ["Approve", "Reject", "Abstain"], -30],
    ["Should weekend visitor parking be paid?", "Proposal to charge ₹50/day for visitor vehicles beyond 6 hours on weekends.", "INFORMAL", ["Yes, ₹50/day", "No, keep free", "Only for overnight"], -3],
    ["Interest in a community library corner?", "Shelf space available in the community room. Book-exchange model.", "INFORMAL", ["I would use it", "Maybe", "Not interested"], 12],
  ];
  for (const [question, description, kind, options, daysLeft] of pollDefs) {
    const endsAt = new Date(NOW.getTime() + daysLeft * day);
    const startsAt = new Date(endsAt.getTime() - 14 * day);
    const poll = await db.poll.create({
      data: {
        communityId: community.id, question, description, kind,
        anonymous: true, startsAt, endsAt, closed: daysLeft <= 0, createdByUserId: admin.id,
        options: { create: options.map((label, i) => ({ label, position: i })) },
      },
    });
    const full = await db.poll.findUnique({ where: { id: poll.id }, include: { options: true } });
    if (!full) continue;
    const voters2 = [...activeResidents].sort(() => rand() - 0.5).slice(0, int(20, 55));
    for (const v of voters2) {
      const opt = pick(full.options);
      await db.pollVote.create({ data: { pollId: poll.id, optionId: opt.id, userId: v.id } }).catch(() => {});
    }
  }

  // ─── Events + RSVPs ──────────────────────────────────────────────────────────
  for (const [title, type, location, budget, daysFromNow] of EVENTS) {
    const startsAt = new Date(NOW.getTime() + daysFromNow * day);
    startsAt.setHours(type === "MEETING" ? 17 : 18, 30, 0, 0);
    const event = await db.event.create({
      data: {
        communityId: community.id,
        title, type, location, budget,
        description: type === "MEETING"
          ? "Agenda: FY26 audited accounts, maintenance revision proposal, EV charger project, AOB. Residents may submit questions in advance."
          : pick([
            "Open to all residents. Volunteers receive priority for stage-side seating.",
            "Community gathering — details on the notice board and in the feed.",
            "Family friendly event. Please RSVP so we can plan seating and snacks.",
          ]),
        startsAt,
        endsAt: new Date(startsAt.getTime() + 4 * 3600000),
        rsvpEnabled: true,
        volunteerSlots: type === "FESTIVAL" ? 12 : type === "EVENT" ? 6 : 0,
        agenda: type === "MEETING" ? "1. Welcome\n2. Audited accounts FY26\n3. Maintenance revision\n4. EV charger project\n5. AOB" : "",
        createdByUserId: admin.id,
      },
    });
    if (daysFromNow > -2) {
      const rsvpers = [...activeResidents].sort(() => rand() - 0.5).slice(0, int(25, 80));
      for (const v of rsvpers) {
        await db.eventRegistration.create({
          data: { eventId: event.id, userId: v.id, rsvp: chance(0.85) ? "YES" : "MAYBE", volunteer: chance(0.12) },
        }).catch(() => {});
      }
    }
  }

  // ─── Facilities + bookings ───────────────────────────────────────────────────
  console.log("Facilities, visitors…");
  for (const [name, description, hourlyFee, openHour, closeHour, approvalRequired, maxPerMonth] of FACILITIES) {
    await db.facility.create({
      data: { communityId: community.id, name, description, hourlyFee, openHour, closeHour, approvalRequired, maxPerMonth, slotMinutes: 60 },
    });
  }
  const facilities = await db.facility.findMany({ where: { communityId: community.id } });
  for (let i = 0; i < 12; i++) {
    const f = pick(facilities);
    const user = pick(activeResidents);
    const membership = await db.membership.findFirst({ where: { userId: user.id } });
    const date = new Date(new Date().toDateString());
    date.setDate(date.getDate() + int(-10, 12));
    const startHour = int(f.openHour, Math.min(f.closeHour - 2, 20));
    await db.booking.create({
      data: {
        communityId: community.id, facilityId: f.id, userId: user.id, unitId: membership?.unitId,
        date, startHour, endHour: startHour + 2,
        fee: f.hourlyFee * 2,
        status: date < NOW ? "COMPLETED" : f.approvalRequired ? "PENDING" : "CONFIRMED",
      },
    }).catch(() => {});
  }

  // ─── Visitors ────────────────────────────────────────────────────────────────
  const visitorDefs: Array<[string, string, string, string, string, number]> = [
    // name, type, purpose, vehicle, status, hoursOffset(validFrom)
    ["Priya Sharma", "GUEST", "Family dinner", "", "EXPECTED", 6],
    ["Rakesh Kumar", "GUEST", "Furniture delivery inspection", "GJ18KL4321", "EXPECTED", 28],
    ["Amazon Logistics", "DELIVERY", "Package", "", "CHECKED_OUT", -20],
    ["Swiggy", "DELIVERY", "Food delivery", "", "CHECKED_OUT", -30],
  ];
  for (const [name, type, purpose, vehicle, status, hoursOffset] of visitorDefs) {
    const validFrom = new Date(NOW.getTime() + hoursOffset * 3600000);
    await db.visitor.create({
      data: {
        communityId: community.id,
        name, type, purpose, vehicleNumber: vehicle,
        hostUserId: aryan.id, unitId: unitA402.id,
        passCode: randomCode("VIS", 6),
        validFrom, validTo: addDays(validFrom, 1),
        status,
        checkedInAt: status !== "EXPECTED" ? validFrom : null,
        checkedOutAt: status === "CHECKED_OUT" ? new Date(validFrom.getTime() + 1800000) : null,
        checkedInBy: status !== "EXPECTED" ? "Jagdish Singh" : "",
        createdAt: new Date(NOW.getTime() - Math.abs(hoursOffset) * 3600000 - day),
      },
    });
  }
  // community-wide visitor history
  for (let i = 0; i < 10; i++) {
    const host = pick([...membershipByUnit.values()]);
    const checkIn = new Date(NOW.getTime() - int(1, 10) * day);
    await db.visitor.create({
      data: {
        communityId: community.id,
        name: fullName(),
        type: pick(["GUEST", "DELIVERY", "CAB", "CONTRACTOR"]),
        purpose: pick(["Family visit", "Food delivery", "Ride", "AC service"]),
        vehicleNumber: chance(0.4) ? `${pick(GUJ_RTO)}${pick(["AB", "CD", "KL"])}${int(1000, 9999)}` : "",
        passCode: randomCode("VIS", 6),
        validFrom: checkIn, validTo: addDays(checkIn, 1),
        status: chance(0.85) ? "CHECKED_OUT" : "CHECKED_IN",
        checkedInAt: checkIn,
        checkedOutAt: chance(0.85) ? new Date(checkIn.getTime() + int(30, 240) * 60000) : null,
        checkedInBy: pick(["Jagdish Singh", "Ramsinh Rathod"]),
      },
    }).catch(() => {});
  }

  // Incidents
  await db.securityIncident.create({
    data: {
      communityId: community.id,
      type: "SECURITY", severity: "MEDIUM",
      title: "Tailgating at Gate 2 during evening rush",
      description: "Two unidentified individuals followed a resident's car in without verification at 7:40 PM. Guards advised; extra vigilance requested for a week.",
      location: "Gate 2", status: "INVESTIGATING",
      reportedByName: "Jagdish Singh",
      createdAt: new Date(NOW.getTime() - 2 * day),
    },
  });
  await db.securityIncident.create({
    data: {
      communityId: community.id,
      type: "POWER", severity: "LOW",
      title: "Brief power flicker in Tower C",
      description: "Generator carried load for ~4 minutes during a grid dip. No damage reported.",
      location: "Tower C", status: "RESOLVED",
      reportedByName: "Ramesh Prajapati",
      createdAt: new Date(NOW.getTime() - 9 * day),
      resolvedAt: new Date(NOW.getTime() - 9 * day + 7200000),
    },
  });

  // ─── Assets ──────────────────────────────────────────────────────────────────
  for (const [name, category, code, location, intervalDays, daysToService, condition] of ASSET_SEED) {
    await db.asset.create({
      data: {
        communityId: community.id,
        assetCode: code,
        name, category, location,
        purchaseDate: new Date(NOW.getTime() - int(400, 2000) * day),
        warrantyUntil: new Date(NOW.getTime() + int(-200, 700) * day),
        lastServiceAt: new Date(NOW.getTime() - int(10, 90) * day),
        nextServiceAt: new Date(NOW.getTime() + daysToService * day),
        intervalDays,
        condition,
      },
    });
  }

  // ─── Documents ───────────────────────────────────────────────────────────────
  for (const [title, category, visibility] of DOC_SEED) {
    await db.document.create({
      data: {
        communityId: community.id,
        title, category, visibility,
        fileName: `seed-${Math.random().toString(36).slice(2, 10)}.pdf`,
        mimeType: "application/pdf",
        size: int(80, 900) * 1024,
        version: `v1.${int(0, 3)}`,
        uploadedByName: "Hiten Parikh",
        createdAt: new Date(NOW.getTime() - int(5, 300) * day),
      },
    });
  }

  // ─── Calendar items ──────────────────────────────────────────────────────────
  const CAL: Array<[string, string, number]> = [
    ["Water tank cleaning — Tank 1", "OPERATIONS", 4],
    ["Fire drill (all towers)", "INSPECTION", 9],
    ["Pest control — common areas", "OPERATIONS", 12],
    ["Garbage collection — bulk item day", "OPERATIONS", 6],
    ["Generator load test", "INSPECTION", 16],
    ["Uttarayan kite festival prep", "FESTIVAL", 60],
  ];
  for (const [title, type, daysFromNow] of CAL) {
    await db.calendarItem.create({
      data: {
        communityId: community.id, title, type,
        date: new Date(NOW.getTime() + daysFromNow * day),
        time: "10:00 AM",
        source: "seeded",
      },
    });
  }

  // ─── Notifications (demo users) ──────────────────────────────────────────────
  await db.notification.createMany({
    data: [
      { userId: aryan.id, communityId: community.id, type: "PAYMENT", title: "October maintenance invoice generated", body: "₹2,500 due by 10 October.", link: "/resident/payments", read: false, createdAt: new Date(NOW.getTime() - 2 * day) },
      { userId: aryan.id, communityId: community.id, type: "ISSUE", title: "Your issue is now in progress", body: "Water leakage in Block B basement", link: `/resident/services/issues/${waterLeak.id}`, read: false, createdAt: new Date(NOW.getTime() - 3 * day) },
      { userId: aryan.id, communityId: community.id, type: "POLL", title: "New poll: Should we install EV chargers?", body: "Voting is open for 7 days.", link: "/resident/community?tab=polls", read: false, createdAt: new Date(NOW.getTime() - day) },
      { userId: aryan.id, communityId: community.id, type: "EVENT", title: "New event: Diwali Celebration & Cultural Night", body: "Central Garden & Clubhouse", link: "/resident/community?tab=events", read: true, createdAt: new Date(NOW.getTime() - 4 * day) },
      { userId: admin.id, communityId: community.id, type: "ISSUE", title: "New issue: Low water pressure on 7th floor", body: "MEDIUM severity · WATER", link: "/admin/issues", read: false, createdAt: new Date(NOW.getTime() - 6 * 3600000) },
      { userId: admin.id, communityId: community.id, type: "SYSTEM", title: "New moderation report", body: "post reported: Posted commercial advertising…", link: "/admin/community?tab=moderation", read: false, createdAt: new Date(NOW.getTime() - 8 * 3600000) },
      { userId: admin.id, communityId: community.id, type: "PAYMENT", title: "Payment received — ₹2,500", body: "INV-2026-10-C-701 marked as paid.", link: "/admin/finance", read: true, createdAt: new Date(NOW.getTime() - day) },
      { userId: accountant.id, communityId: community.id, type: "SYSTEM", title: "2 expenses awaiting approval", body: "Review pending expenses in Finance.", link: "/admin/finance?tab=expenses", read: false, createdAt: new Date(NOW.getTime() - 3600000) },
      { userId: guard.id, communityId: community.id, type: "VISITOR", title: "Visitor expected: Priya Sharma", body: "A-402 · evening", link: "/security", read: false, createdAt: new Date(NOW.getTime() - 2 * 3600000) },
      { userId: vendorUser.id, communityId: community.id, type: "SYSTEM", title: "New task assigned: Lift AMC inspection", body: "Tower A lift 2 — grinding noise reported.", link: "/work", read: false, createdAt: new Date(NOW.getTime() - 5 * 3600000) },
    ],
  });

  // A lift task assigned to the vendor
  await db.maintenanceTask.create({
    data: {
      communityId: community.id,
      title: "Lift AMC inspection — Tower A lift 2",
      description: "Grinding noise between floors 6-8. Full inspection and lubrication required.",
      location: "Tower A lift 2",
      priority: "HIGH",
      status: "ASSIGNED",
      dueDate: new Date(NOW.getTime() + 2 * day),
      assignedVendorId: vendorEntity.id,
      assetId: (await db.asset.findFirst({ where: { assetCode: "AST-LFT-A1" } }))?.id,
      createdByName: "Meera Shah",
    },
  });

  // ─── Audit logs ──────────────────────────────────────────────────────────────
  const auditSeed: Array<[string, string, string]> = [
    ["Meera Shah", "COMMUNITY_ADMIN", "ISSUE_ASSIGNED|Issue|Water leakage assigned to Ramesh Prajapati"],
    ["Rohan Mehta", "TREASURER", "EXPENSE_APPROVED|Expense|Security services — monthly invoice (₹1,20,000)"],
    ["Rohan Mehta", "TREASURER", "BILLING_RUN_POSTED|BillingRun|Posted 100 invoices for October 2026 (₹2,500/unit)"],
    ["Meera Shah", "COMMUNITY_ADMIN", "POLL_CREATED|Poll|Should we install EV chargers in the basement parking?"],
    ["Meera Shah", "COMMUNITY_ADMIN", "EVENT_CREATED|Event|Diwali Celebration & Cultural Night"],
    ["Jagdish Singh", "SECURITY_GUARD", "VISITOR_CHECKED_IN|Visitor|Amazon Logistics (host: A-402)"],
    ["Jagdish Singh", "SECURITY_GUARD", "VEHICLE_LOOKUP|Vehicle|GJ01AB1234 looked up at gate desk"],
    ["Hiten Parikh", "SECRETARY", "DOCUMENT_UPLOADED|Document|AGM Minutes — September"],
    ["Aryan Patel", "OWNER", "ISSUE_CREATED|Issue|Water leakage in Block B basement"],
    ["Meera Shah", "COMMUNITY_ADMIN", "SETTINGS_UPDATED|Community|Reviewed billing defaults"],
  ];
  for (const [actorName, actorRole, packed] of auditSeed) {
    const [action, entity, summary] = packed.split("|");
    const actor = await db.user.findFirst({ where: { communityId: community.id, name: actorName } });
    await db.auditLog.create({
      data: {
        communityId: community.id, userId: actor?.id, actorName, actorRole,
        action, entity, summary,
        createdAt: new Date(NOW.getTime() - int(1, 200) * 3600000),
      },
    });
  }

  // ─── Mock emails ─────────────────────────────────────────────────────────────
  await db.emailOutbox.createMany({
    data: [
      { communityId: community.id, to: "resident@demo.local", subject: "Your October maintenance invoice — ₹2,500", template: "invoice_generated", body: "Dear Aryan,\n\nYour October maintenance invoice of ₹2,500 is now available.\nDue date: 10 October.\n\n[View Invoice]\n\n— Green Heights Residency" },
      { communityId: community.id, to: "resident@demo.local", subject: "Issue registered: Water leakage in Block B basement", template: "issue_created", body: "Hi Aryan,\n\nYour issue has been registered and assigned reference #A1B2C3.\nSLA target: within 4 hours.\n\n— Community OS" },
      { communityId: community.id, to: "admin@demo.local", subject: "New expense pending approval", template: "expense_approval", body: "Dear Meera,\n\n2 expenses are awaiting committee approval:\n• Navratri decorations & sound — ₹41,000\n• Basement leakage repair — ₹18,500\n\n[Review Expenses]\n\n— Community OS" },
      { communityId: community.id, to: "security@demo.local", subject: "Visitor pass expected this evening", template: "visitor_expected", body: "Priya Sharma is expected at A-402 this evening.\nPass code: VIS-K7Q2MX\n\n— Community OS" },
    ],
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const counts = {
    users: await db.user.count(),
    units: await db.unit.count(),
    invoices: await db.invoice.count(),
    payments: await db.payment.count(),
    issues: await db.issue.count(),
    posts: await db.post.count(),
    visitors: await db.visitor.count(),
  };
  console.log("Seed complete:", counts);
  void expenseLedger;
  void leakTask;
}

function randomCode(prefix: string, len = 6): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(rand() * chars.length)];
  return `${prefix}-${s}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
