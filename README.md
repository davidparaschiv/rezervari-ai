# Rezervari.ai

Site într-o singură pagină, în română, fără bară de navigare. HTML, CSS și JavaScript simplu, cu Phaser inclus local pentru obiectele animate. Fără React, TypeScript, Vite sau Wrangler.

## Pornire în Git Bash

Ai nevoie de Node.js 20 sau mai nou, cu npm. În folderul extras:

```bash
./start.sh
```

Instalează dependențele, oprește lansarea dacă instalarea eșuează, rulează `npm run dev`, alege un port liber și deschide browserul după confirmarea serverului. Oprești cu Ctrl+C.

Alternativ, fără alte etape:

```bash
npm install
npm run dev
```

Comanda dev pornește direct `node dev-server.js`. Nu există o etapă de compilare necesară local.

## Google Play

Iconița deschide temporar pagina principală Google Play: `https://play.google.com/store/`. Textul „available on Google Play” rămâne neapăsabil. Când aplicația este publicată, înlocuiește `GOOGLE_PLAY_URL` la începutul `script.js` cu adresa exactă în formatul `https://play.google.com/store/apps/details?id=...`.

## Publicare pe GitHub Pages

```bash
./deploy.sh
```

Scriptul cere un repository GitHub existent și confirmarea publicării. Ai nevoie de Git și de acces GitHub configurat. Fișierele statice sunt trimise pe ramura `gh-pages`, fără force-push. La prima utilizare: GitHub → Settings → Pages → Deploy from a branch → gh-pages → / (root). Scriptul verifică apoi dacă versiunea publicată este disponibilă; trimiterea fișierelor nu înseamnă automat că Pages este activat.

## Conținut și accesibilitate

Descrierea și funcțiile abonamentelor sunt păstrate. Textele de prezentare și exemplele sunt redactate pe baza sursei. Small: 50 €/lună și un calendar. Complete: 150 €/lună și zece calendare, colegi, rapoarte și notificări. Nu sunt incluse capturi inventate ale aplicației.

Animațiile se pot opri și respectă preferința de reducere a mișcării. Conținutul și cardurile funcționează fără Phaser. Obiectele 3D sunt decorative. Randarea canvas se adaptează densității ecranului, până la 3×. Imaginile originale au 1254 × 1254 px.

Verificat în browser prin cadre responsive de 320, 390, 414, 768 și 1280 px; verificarea nu echivalează cu un test pe telefon fizic. Git Bash pe Windows nu a fost executat în acest mediu; testele locale rulează pe Linux/Bash.

`worker/`, `.openai/` și adaptorul de împachetare sunt necesare doar găzduirii private și nu sunt incluse în arhiva locală. Codul static rămâne editabil direct.
