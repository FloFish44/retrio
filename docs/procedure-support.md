# Procédure support Retrio

## Boîte de réception

- Adresse publique : `retrio.pro@gmail.com`.
- Vérifier la boîte au minimum matin et soir pendant les premières campagnes.
- Utiliser trois libellés Gmail : `Retrio/Bug`, `Retrio/Pro-paiement`, `Retrio/Remboursement`.
- Ne jamais demander de mot de passe, de numéro de carte ou de document personnel.

## Réponse initiale

Répondre idéalement sous un jour ouvré. Demander uniquement : version de Windows, version de Retrio, étapes suivies, résultat obtenu et capture d’écran anonymisée si nécessaire.

## Activation Pro

1. Vérifier dans Stripe que l’abonnement associé à l’e-mail est actif.
2. Demander à l’utilisateur de saisir exactement le même e-mail dans l’onglet Pro.
3. Vérifier que l’ordinateur est connecté à Internet et relancer la vérification.
4. Si Stripe est actif mais que Retrio reste gratuit, contrôler le webhook Stripe et le service de licence avant de modifier manuellement une licence.

## Remboursement

1. Retrouver le paiement dans Stripe avec l’adresse e-mail et la date approximative.
2. Vérifier le montant et l’identité de la transaction, sans demander de donnée bancaire complète.
3. Enregistrer le motif dans la note interne Stripe.
4. Utiliser l’action **Rembourser** du paiement Stripe et choisir le montant approprié.
5. Résilier aussi l’abonnement si l’utilisateur le demande ; un remboursement seul ne résilie pas automatiquement les futures échéances.
6. Confirmer par e-mail que le remboursement repart sur le moyen de paiement d’origine et que le délai bancaire peut varier.

## Incident critique

Un paiement encaissé sans activation, une perte de fichiers ou un blocage généralisé est prioritaire. Suspendre la publicité si plusieurs utilisateurs signalent le même incident et conserver les éléments techniques sans données personnelles.
