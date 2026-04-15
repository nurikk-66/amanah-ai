// Pure utility — no "use client" — safe to import in server components

export interface TimelineStage {
  id: string;
  label: string;
  description: string;
  date: Date | null;
  status: "complete" | "pending" | "failed";
  icon: "Package" | "FlaskConical" | "Shield" | "CheckCircle2";
}

export function buildTimelineStages(
  overallStatus: "halal" | "doubtful" | "haram",
  scanTimestamp: string,
): TimelineStage[] {
  const auditDate = (() => {
    const d = new Date(scanTimestamp);
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  const rawDate  = new Date(auditDate.getTime() - 72 * 3_600_000);
  const labDate  = new Date(auditDate.getTime() - 24 * 3_600_000);
  const marketStatus: TimelineStage["status"] =
    overallStatus === "halal" ? "complete" : overallStatus === "doubtful" ? "pending" : "failed";

  return [
    {
      id: "raw",
      label: "Raw Material Sourced",
      description: "Ingredients sourced, documented, and supplier declarations collected",
      date: rawDate,
      status: "complete",
      icon: "Package",
    },
    {
      id: "lab",
      label: "Lab Tested",
      description: "Certificate of Analysis (COA) issued by an accredited laboratory",
      date: labDate,
      status: "complete",
      icon: "FlaskConical",
    },
    {
      id: "audit",
      label: "Amanah AI Audited",
      description: `JAKIM compliance analysis completed — ${overallStatus.toUpperCase()} determination`,
      date: auditDate,
      status: overallStatus === "haram" ? "failed" : "complete",
      icon: "Shield",
    },
    {
      id: "market",
      label: "Ready for Market",
      description:
        overallStatus === "halal"
          ? "All checks passed. Product cleared for the halal market."
          : overallStatus === "doubtful"
          ? "Pending supplier declarations before market clearance."
          : "Haram ingredient detected. Reformulation required before approval.",
      date: overallStatus === "halal" ? auditDate : null,
      status: marketStatus,
      icon: "CheckCircle2",
    },
  ];
}
