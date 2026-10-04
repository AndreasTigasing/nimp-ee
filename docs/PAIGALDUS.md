# Paigaldusjuhend

Selles pakis on valmis ehitatud veebileht. Paigaldamiseks pole vaja midagi programmeerida ega
ehitada: vaja on tasuta Supabase'i kontot (andmebaas ja sisselogimine) ning kohta, kuhu failid
üles laadida (veebimajutus, oma server või GitHub Pages).

| Pakis          | Milleks                                                  |
| -------------- | -------------------------------------------------------- |
| `site/`        | Veebileht. Selle kausta **sisu** läheb veebiserverisse.  |
| `database.sql` | Andmebaasi struktuur. Käivitatakse üks kord Supabase'is. |
| `PAIGALDUS.md` | See juhend.                                              |

Kokku on neli sammu ja need võtavad umbes 15 minutit.

---

## 1. Loo andmebaas

1. Tee konto ja uus projekt aadressil <https://supabase.com/dashboard>. Tasuta pakett on piisav.
   Regiooniks sobib Eestile lähim (Stockholm või Frankfurt).
2. Ava projektis vasakult **SQL Editor**, kleebi sinna faili `database.sql` kogu sisu ja vajuta
   **Run**. Tulemuseks peab olema „Success".
3. Ava **Project Settings → API** ja jäta lahti. Sealt on kohe vaja kahte väärtust:
   - **Project URL** (kujul `https://xxxxx.supabase.co`)
   - **anon / publishable key**

   Võtit nimega `service_role` / `secret` ära kuhugi kopeeri. See on salajane ja lehel seda vaja ei ole.

## 2. Ühenda leht andmebaasiga

Ava tekstiredaktoris fail `site/config.js` ja kirjuta jutumärkide vahele eelmises sammus leitud
väärtused:

```js
window.__STREAMER_SITE__ = {
  supabaseUrl: 'https://xxxxx.supabase.co',
  supabaseAnonKey: 'eyJ…',
}
```

Need kaks väärtust on avalikud ja nii mõeldudki. Mida külastaja teha tohib, otsustab andmebaas.

## 3. Laadi leht üles

Lae kausta `site` **sisu** (mitte kaust ise) oma domeeni juurkausta. Leht peab asuma domeeni
juurel (`https://sinu-domeen.ee/`), mitte alamkaustas.

- **Veebimajutus (Zone, Veebimajutus.ee jt, Apache):** laadi failid FTP või failihalduriga
  kausta `public_html` / `htdocs`. Kaasas olev fail `.htaccess` hoolitseb selle eest, et
  `/admin` töötaks ka otse avades. Kontrolli, et see fail läks kaasa — mõni programm peidab
  punktiga algavaid faile.
- **Nginx:** lisa saidi seadistusse

  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  ```

- **GitHub Pages:** pane kausta `site` sisu reposse ja lülita sisse Settings → Pages.
  Fail `404.html` teeb seal sama töö, mis `.htaccess` Apache'is. (Arendajale on mugavam
  kasutada lähtekoodi repot ja selle automaatset avaldamist — vaata projekti README-d.)

Lülita majutuses sisse **HTTPS** (tavaliselt tasuta Let's Encrypt).

## 4. Tee esmane seadistus

1. Ava brauseris `https://sinu-domeen.ee/admin`. Kuna haldajat veel pole, avaneb **Esmane seadistus**.
2. **Seadistuskood.** Ava Supabase'is **Table Editor → `setup_state`** ja kopeeri veerust
   `setup_code` 12-märgiline kood. See tõendab, et just sina oled lehe omanik: ilma koodita ei
   saa keegi teine end haldajaks teha. Kood kehtib ühe korra.
3. **Konto.** Sisesta oma e-post (see on edaspidi kasutajanimi) ja vali parool.
   - Kui Supabase saadab kinnituskirja, ava kirjas olev link ja vajuta seadistuses uuesti
     „Loo konto". Kui tahad seda sammu vahele jätta, lülita enne välja
     **Authentication → Sign In / Providers → Email → Confirm email**.
4. **Leht.** Nimi, tunnuslause, äri e-post ja Twitchi link. Kõike saab hiljem seadetes muuta.
5. **Domeen.** Sisesta lehe aadress; seadistus näitab, mida domeenihalduris teha tuleb.
6. **Pärast seadistust** keela uute kasutajate registreerimine:
   **Authentication → Sign In / Providers → „Allow new users to sign up"** → välja.
   (Ka sisselülitatuna ei saa uus kasutaja mingeid õigusi, aga nii on puhtam.)

Valmis. Halduspaneel asub aadressil `/admin`.

---

## Kui midagi ei tööta

| Mure                                            | Lahendus                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Leht avaneb, aga pakkumisi/kalendrit ei laadita | `config.js` on täitmata või vale. Kontrolli aadressi ja võtit (samm 2).                      |
| `/admin` annab „404 Not Found"                  | `.htaccess` ei läinud üles või server pole Apache — lisa ülal toodud Nginxi reegel.          |
| „Registreerimine on keelatud"                   | Luba seadistuse ajaks **Allow new users to sign up** (Authentication → Sign In / Providers). |
| „Seadistuskood ei ole õige"                     | Kopeeri kood uuesti tabelist `setup_state`. Kui lahter on tühi, on seadistus juba tehtud.    |
| Parool ununes                                   | Supabase → Authentication → Users → kasutaja → „Send password recovery" või „Update user".   |
| Kõik haldajad said kogemata eemaldatud          | Kirjuta tabelis `setup_state` veergu `setup_code` uus kood ja ava uuesti `/admin`.           |

## Uuendamine

Uue versiooni paigaldamiseks asenda serveris kausta `site` failid uutega, **jättes alles oma
`config.js`**. Kui uue versiooniga on kaasas andmebaasimuudatusi, on need kirjas versiooni
märkmetes.

## Sisu varundamine ja kolimine

Lähtekoodi repos on käsud `npm run config:export` ja `npm run config:import`, millega saab
seaded, pakkumised, sündmused ja pildid ühe failina välja võtta ja teise projekti laadida.
