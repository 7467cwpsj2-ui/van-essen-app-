-- Machtiging voor ISDE: was een door de app zelf gegenereerde tekst die
-- de klant met de vinger ondertekende (puur voor de eigen administratie,
-- hoefde nooit naar RVO). Vervangen door het échte, officiële
-- RVO-machtigingsformulier: de klant downloadt dat, vult het in op
-- papier, ondertekent het, en uploadt een foto/scan terug — dat
-- bestand IS het document, er wordt niets meer zelf gegenereerd.
--
-- client_signature_path bevatte een handtekening-PNG; hernoemd naar
-- form_file_path omdat het nu het hele ingevulde formulier is (PDF of
-- foto), met een nieuwe kolom om dat onderscheid vast te leggen.
alter table subsidy_authorizations rename column client_signature_path to form_file_path;
alter table subsidy_authorizations add column if not exists form_file_type text check (form_file_type in ('image', 'pdf'));
