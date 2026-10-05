# Solenne – Shopify-thema

Een Online Store 2.0-thema voor de Solenne Applicator No. 1. Het werkt met de echte winkelwagen en checkout van Shopify. Alle teksten en foto's pas je aan in de thema-editor.

## Installeren

1. **Thema uploaden.** Ga in Shopify naar *Online Store › Thema's › Thema toevoegen › Zip-bestand uploaden* en kies `solenne-thema.zip`.
2. **Product importeren.** Ga naar *Producten › Importeren* en kies `product-import.csv`. Daarmee maak je *De Applicator No. 1* aan, met kleur Onyx en de sets Enkel (€29), Duo (€49) en Familie (€69).
   - Upload daarna bij het product de productfoto's. De foto's staan ook in `assets/`. De eerste foto is de hoofdfoto.
   - Vul het **gewicht** per variant in (staat nu op 0). Dat is nodig voor de verzendkosten.
   - Wil je voorraad bijhouden? Zet dan *Voorraad bijhouden* aan.
3. **Menu's maken.** Maak onder *Online Store › Navigatie* het hoofdmenu (bijv. Shop, Ritueel, Service) en een footermenu (Contact, Verzending, Retour, Voorwaarden, Privacy).
4. **Verzending instellen.** Stel onder *Instellingen › Verzending* gratis verzending vanaf €50 in. De balk in de winkelwagen gebruikt het bedrag uit *Thema-instellingen › Winkelwagen*. Houd die twee gelijk.
5. **Bekijken en publiceren.** Kies bij het thema eerst *Voorbeeld*. Klopt alles, kies dan *Publiceren*.

## Wat er in het thema zit

| Onderdeel | Waar aanpassen |
|---|---|
| Kleuren, gratis-verzendgrens, favicon | Thema-instellingen |
| Aankondigingsbalk, header (logo, menu), footer (nieuwsbrief, menu's, betaallogo's) | Thema-editor, op elke pagina |
| Productpagina: galerij, variantkeuze (kleurbolletjes en sets), koopknoppen, beloftes, uitklapblokken | Template *Product* |
| Homepage: openingsbeeld, verhaal met fotomozaïek, ritueel in stappen, detailfoto's, ervaringen, veelgestelde vragen | Template *Homepage* |
| Collectie, winkelwagen (met opmerkingveld voor cadeaukaartje), zoeken, pagina's, blog, 404, wachtwoordpagina | Eigen templates |

**Voorbeeldfoto's.** Zolang je bij een sectie nog geen afbeelding kiest, toont het thema de meegeleverde voorbeeldfoto. Kies je in de editor een eigen afbeelding, dan wordt die gebruikt.

**Kleuren binnenkort.** Steen, Rosé en Kobalt staan doorgestreept bij de kleuren. Je past dat aan in het blok *Variantkeuze* bij *Binnenkort-kleuren*. Komt een kleur echt binnen, voeg hem dan als variant toe aan het product en haal hem uit die lijst.

**Reviews.** De ervaringen zijn voorbeeldteksten. Vervang ze door echte reviews of gebruik een review-app (bijv. Judge.me). Apps kun je als blok in de productsectie zetten.

## Bestanden

- `layout/`, `templates/`, `sections/`, `snippets/`, `assets/`, `config/`, `locales/`: het thema zelf.
- `solenne-thema.zip`: dezelfde bestanden, klaar om te uploaden.
- `product-import.csv`: importbestand voor het product.

Na een wijziging maak je de zip opnieuw (vanuit deze map):

```sh
zip -r solenne-thema.zip layout templates sections snippets assets config locales
```
