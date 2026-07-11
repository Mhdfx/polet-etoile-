import { JournalAudit, type ParametresAudit } from "../audit/journal-audit";

export default function HistoriqueAdminsPage({
  searchParams,
}: {
  searchParams: Promise<ParametresAudit>;
}) {
  return (
    <JournalAudit
      searchParams={searchParams}
      chemin="/admin/historique-admins"
      titre="Historique des administrateurs"
      description="Toutes les créations, modifications, suppressions et autres actions réalisées par les administrateurs."
      roleAuteur="ADMIN"
    />
  );
}
