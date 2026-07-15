/**
 * FAQ éditoriales, orientées SEO (rich results FAQPage + longue traîne).
 * Réponses tenues au vrai du produit — pas de chiffres non vérifiables (commission,
 * délais précis, retours) formulés comme des engagements fermes.
 */
export type FaqItem = { q: string; a: string };

/** FAQ acheteur, affichée en page d'accueil. */
export const buyerFaq: FaqItem[] = [
  {
    q: "Qu'est-ce que Tinned ?",
    a: "Tinned est une marketplace belge qui réunit des boutiques et des créateurs indépendants, sélectionnés à la main. Chaque enseigne y a sa « boîte » : un univers avec ses produits, son histoire et ses contenus.",
  },
  {
    q: "Qu'est-ce qu'une « boîte » (box) sur Tinned ?",
    a: "Une boîte, c'est l'espace d'une marque sur Tinned. La Store Box présente ses produits, la Business Box raconte son savoir-faire, la Blog Box publie ses articles et la Travel Box ses carnets de voyage.",
  },
  {
    q: "Comment passer commande ?",
    a: "Ajoutez les articles qui vous plaisent au panier, puis réglez en une fois. Chaque boutique prépare et expédie sa partie de la commande.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Le paiement est sécurisé via Mollie : Bancontact, carte bancaire, PayPal, ainsi que KBC, Belfius et iDEAL.",
  },
  {
    q: "Puis-je pré-commander un produit affiché « Bientôt » ?",
    a: "Oui, lorsque le prix est connu. La pré-commande bénéficie de 15 % de réduction, réglée à la commande, et le produit vous est livré dès son lancement.",
  },
  {
    q: "Les boutiques sont-elles vérifiées ?",
    a: "Oui. Chaque boutique et chaque créateur sont sélectionnés à la main avant d'ouvrir leur boîte sur Tinned.",
  },
  {
    q: "Où livrez-vous ?",
    a: "En Belgique et en Europe. Le mode et les frais de livraison sont proposés au moment du paiement, boutique par boutique.",
  },
];

/** FAQ vendeur, affichée sur la page « Vendre ». */
export const sellerFaq: FaqItem[] = [
  {
    q: "Comment vendre sur Tinned ?",
    a: "Créez votre compte, ouvrez votre Store Box et ajoutez vos produits. Votre boutique est en ligne en quelques minutes.",
  },
  {
    q: "Quels types de boîtes puis-je ouvrir ?",
    a: "La Store Box pour vendre vos produits, la Business Box pour présenter votre marque, la Blog Box pour vos articles et la Travel Box pour vos carnets de voyage.",
  },
  {
    q: "Comment fixe-t-on les prix et la livraison ?",
    a: "Vous fixez vos prix et vos options de livraison. Tinned prélève une commission sur les ventes réalisées, sans frais d'inscription.",
  },
  {
    q: "Comment suis-je payé ?",
    a: "Les paiements des clients sont encaissés via Mollie, puis reversés à votre boutique. Chaque commande est suivie depuis votre tableau de bord.",
  },
  {
    q: "Puis-je raconter l'histoire de ma marque ?",
    a: "Oui. La Business Box et la Blog Box vous permettent de présenter votre univers, votre savoir-faire et vos coulisses, au-delà de la simple fiche produit.",
  },
];

/** FAQ générale, servie en secours sur /faq quand aucune FAQ n'est publiée côté back. */
export const generalFaq: FaqItem[] = [
  ...buyerFaq,
  {
    q: "Comment suivre ma commande ?",
    a: "Depuis votre compte, rubrique Commandes, ou via les e-mails de confirmation envoyés à chaque étape.",
  },
  {
    q: "Comment devenir vendeur sur Tinned ?",
    a: "Rendez-vous sur la page « Vendre » pour créer votre compte et ouvrir votre boîte. La mise en ligne ne prend que quelques minutes.",
  },
];
