import { redirect } from "next/navigation";
import { cheminAccueilPourRole, getUtilisateurSession } from "@/lib/session";

export default async function Home() {
  const utilisateur = await getUtilisateurSession();

  if (!utilisateur) {
    redirect("/connexion");
  }

  redirect(cheminAccueilPourRole(utilisateur.role));
}
