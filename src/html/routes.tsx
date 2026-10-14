/* Généré : table des routes de la version HTML autonome (miroir de src/app). */
import type { ComponentType } from "react";
import { HomeScreen } from "@/screens/public/home";
import { HowScreen } from "@/screens/public/how";
import { OffersScreen } from "@/screens/public/offers";
import { SampleBookScreen } from "@/screens/public/sample-book";
import { LoginScreen } from "@/screens/public/login";
import { InvitationScreen } from "@/screens/public/invitation";
import { ListenScreen } from "@/screens/public/listen";
import { InboxScreen } from "@/screens/public/inbox";
import { BuyerHome } from "@/screens/buyer/home";
import { BuyerGifts } from "@/screens/buyer/gifts";
import { GiftWizard } from "@/screens/buyer/gift-wizard";
import { BuyerOrders } from "@/screens/buyer/orders";
import { BuyerTracking } from "@/screens/buyer/tracking";
import { NarratorHome } from "@/screens/narrator/home";
import { NarratorWelcome } from "@/screens/narrator/welcome";
import { QuestionsList } from "@/screens/narrator/questions";
import { QuestionScreen } from "@/screens/narrator/question";
import { MemoriesScreen } from "@/screens/narrator/memories";
import { PhotosScreen } from "@/screens/narrator/photos";
import { ChaptersScreen } from "@/screens/narrator/chapters";
import { BookEditor } from "@/screens/narrator/book-editor";
import { PreviewScreen } from "@/screens/narrator/preview";
import { FamilyScreen } from "@/screens/narrator/family";
import { PrivacyScreen } from "@/screens/narrator/privacy";
import { EditorHome } from "@/screens/editor/home";
import { EditorBooks } from "@/screens/editor/books";
import { EditorBook } from "@/screens/editor/book";
import { EditorReview } from "@/screens/editor/review";
import { AdminHome } from "@/screens/admin/home";
import { AdminOrders } from "@/screens/admin/orders";
import { AdminProjects } from "@/screens/admin/projects";
import { AdminQuestions } from "@/screens/admin/questions";
import { AdminPrint } from "@/screens/admin/print";
import { AdminSupport } from "@/screens/admin/support";

export type ShellKind = "public" | "acheteur" | "narrateur" | "editeur" | "ops";
export const ROUTES: { pattern: string; shell: ShellKind; title: string; Component: ComponentType }[] = [
  { pattern: "/", shell: "public", title: "Accueil", Component: HomeScreen },
  { pattern: "/comment-ca-marche", shell: "public", title: "Comment ça marche", Component: HowScreen },
  { pattern: "/offres", shell: "public", title: "Offres et tarifs", Component: OffersScreen },
  { pattern: "/livre-exemple", shell: "public", title: "Livre exemple", Component: SampleBookScreen },
  { pattern: "/connexion", shell: "public", title: "Connexion", Component: LoginScreen },
  { pattern: "/invitation/:token", shell: "public", title: "Invitation", Component: InvitationScreen },
  { pattern: "/ecouter/:token", shell: "public", title: "Écouter un souvenir", Component: ListenScreen },
  { pattern: "/demo/boite-mail", shell: "public", title: "E-mails de démonstration", Component: InboxScreen },
  { pattern: "/acheteur", shell: "acheteur", title: "Espace acheteur", Component: BuyerHome },
  { pattern: "/acheteur/cadeaux", shell: "acheteur", title: "Mes cadeaux", Component: BuyerGifts },
  { pattern: "/acheteur/offrir", shell: "acheteur", title: "Offrir Filémoire", Component: GiftWizard },
  { pattern: "/acheteur/commandes", shell: "acheteur", title: "Mes commandes", Component: BuyerOrders },
  { pattern: "/acheteur/suivi", shell: "acheteur", title: "Suivi du projet", Component: BuyerTracking },
  { pattern: "/narrateur", shell: "narrateur", title: "Mon espace", Component: NarratorHome },
  { pattern: "/narrateur/bienvenue", shell: "narrateur", title: "Bienvenue", Component: NarratorWelcome },
  { pattern: "/narrateur/questions", shell: "narrateur", title: "Mes questions", Component: QuestionsList },
  { pattern: "/narrateur/questions/:id", shell: "narrateur", title: "Question", Component: QuestionScreen },
  { pattern: "/narrateur/souvenirs", shell: "narrateur", title: "Mes souvenirs", Component: MemoriesScreen },
  { pattern: "/narrateur/photos", shell: "narrateur", title: "Mes photos", Component: PhotosScreen },
  { pattern: "/narrateur/chapitres", shell: "narrateur", title: "Mes chapitres", Component: ChaptersScreen },
  { pattern: "/narrateur/livre", shell: "narrateur", title: "Mon livre", Component: BookEditor },
  { pattern: "/narrateur/apercu", shell: "narrateur", title: "Aperçu du livre", Component: PreviewScreen },
  { pattern: "/narrateur/famille", shell: "narrateur", title: "Famille et partage", Component: FamilyScreen },
  { pattern: "/narrateur/confidentialite", shell: "narrateur", title: "Confidentialité", Component: PrivacyScreen },
  { pattern: "/editeur", shell: "editeur", title: "Espace éditeur familial", Component: EditorHome },
  { pattern: "/editeur/livres", shell: "editeur", title: "Livres confiés", Component: EditorBooks },
  { pattern: "/editeur/livres/:id", shell: "editeur", title: "Relecture d'un livre", Component: EditorBook },
  { pattern: "/editeur/relecture", shell: "editeur", title: "Mes suggestions", Component: EditorReview },
  { pattern: "/admin", shell: "ops", title: "Opérations", Component: AdminHome },
  { pattern: "/admin/commandes", shell: "ops", title: "Commandes", Component: AdminOrders },
  { pattern: "/admin/projets", shell: "ops", title: "Projets", Component: AdminProjects },
  { pattern: "/admin/questions", shell: "ops", title: "Bibliothèque de questions", Component: AdminQuestions },
  { pattern: "/admin/impression", shell: "ops", title: "Impression", Component: AdminPrint },
  { pattern: "/admin/support", shell: "ops", title: "Support", Component: AdminSupport },
];
