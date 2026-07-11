import { JournalAudit, type ParametresAudit } from "./journal-audit";

export default function AuditPage({
  searchParams,
}: {
  searchParams: Promise<ParametresAudit>;
}) {
  return (
    <JournalAudit
      searchParams={searchParams}
      chemin="/admin/audit"
      titre="Journal d'audit"
      description="Journal complet et non modifiable des actions sensibles conservées en base."
    />
  );
}
