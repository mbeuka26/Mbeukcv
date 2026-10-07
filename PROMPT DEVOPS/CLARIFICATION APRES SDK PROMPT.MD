CLARIFICATION ARCHITECTURALE — DÉCISION À APPLIQUER

Je précise l'architecture cible afin d'éviter toute mauvaise interprétation pendant l'intégration.

Le Hub Central doit centraliser UNIQUEMENT le plan IDENTITÉ + COMMERCE du SaaS :

- identité utilisateur ;
- authentification ;
- création et gestion du compte d'identité ;
- vérification du compte ;
- paiement ;
- licences ;
- abonnements si prévus par le SDK ;
- entitlements / droits d'accès ;
- contrôle commercial de l'accès au SaaS.

En revanche, le Hub Central ne doit PAS devenir la base centrale de toutes les données métier de mes SaaS.

Chaque SaaS conserve son propre plan MÉTIER / DATA :

- données métier ;
- métadonnées métier ;
- logique métier ;
- superviseur des données métier ;
- superviseur « Premier-On » ;
- possibilité pour un client d'utiliser son propre superviseur métier.

ARCHITECTURE CIBLE :

HUB CENTRAL
→ Identity
→ Authentication
→ Accounts
→ Payment
→ License
→ Subscription
→ Entitlement

SDK
→ pont entre le Hub et le SaaS

SAAS
→ Business Data
→ Business Metadata
→ Business Logic
→ Business Supervisor
→ Premier-On Supervisor
→ Client Custom Supervisor

IMPORTANT :

Le fait que l'identité soit centralisée dans le Hub ne signifie PAS que toutes les données utilisateur doivent être déplacées vers le Hub.

Le SaaS peut conserver dans sa propre base les références nécessaires à son fonctionnement métier, par exemple :

user_id
employee_id
role métier
permissions métier
profil métier
préférences métier

Mais le SaaS ne doit pas devenir une deuxième autorité d'authentification ou de licence concurrente du Hub.

Donc :

IDENTITÉ / AUTHENTIFICATION
→ HUB

PAIEMENT / LICENCE / ENTITLEMENT
→ HUB

DONNÉES MÉTIER / LOGIQUE MÉTIER / SUPERVISEURS MÉTIER
→ SAAS

Ne supprimez pas les superviseurs métier existants simplement parce que l'authentification est maintenant centralisée.

Ne déplacez pas les données métier vers le Hub sans nécessité architecturale explicite.

Concernant les anciennes pages d'authentification et l'ancien système de licence :

- analysez-les d'abord ;
- identifiez ce qui relève de l'ancienne identité/authentification ;
- identifiez ce qui relève des données métier ;
- identifiez ce qui relève de l'ancien système de licence/paiement ;
- remplacez uniquement les responsabilités devenues celles du Hub ;
- conservez et adaptez ce qui reste nécessaire au fonctionnement métier.

NE ME REPOSEZ PAS une question si sa réponse est déjà déterminée par le Prompt d'intégration du SDK et cette clarification.

Si une proposition que vous envisagez est compatible avec ces règles, appliquez-la directement.

Si une proposition contredit ces règles, ne l'appliquez pas silencieusement : expliquez le conflit.

Si une vraie ambiguïté technique subsiste, présentez brièvement :
1. le problème ;
2. les options ;
3. votre recommandation ;
4. la raison ;
5. uniquement la question indispensable.

Ne reconstruisez pas le SaaS.

Ne créez pas un nouveau système d'authentification concurrent.

Ne créez pas une deuxième autorité de licence ou de paiement.

Ne déplacez pas inutilement les données métier vers le Hub.

Le SDK fourni et le Prompt d'intégration restent les références techniques pour l'implémentation. Cette clarification définit la séparation des responsabilités entre le Hub et le SaaS.