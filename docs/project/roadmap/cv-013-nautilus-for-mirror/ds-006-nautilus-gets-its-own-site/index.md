[< CV-013](../index.md)

# CV-013.DS-006 - Nautilus Gets Its Own Site

**Status:** 🔵 In progress — split from DS-005 by the Navigator on 2026-11-04 ("em um segundo momento o
site novo do nautilus"); started the same day ("comece a DS-006")

## Outcome

Nautilus has a site of its own, where a new person learns what it is and downloads it.

## Scope

- A new site, in English and Portuguese, with what Nautilus is, what it needs (a Mac, the Mirror
  Core), the download from the Nautilus channel and its release notes.
- Once it exists, the Mirror site's links to the desktop app point to it instead of the repository.

## Decided (Navigator, 2026-11-04)

- **Address:** the subdomain `nautilus.mirrormind.sh`.
- **Where it lives:** a folder in `mirrormind-site`, served by the same host and deployed the same
  way. Push and deploy each need the Navigator's own word.

## Decided: the App and the Method (Navigator, 2026-11-04)

Nautilus is an app that runs the Mirror and will gradually implement the concepts of the framework
of the same name, the Nautilus Agentic Method. The Navigator chose how the site says it:

- **Chambers.** The site says what the app does today, then shows the method's concepts as the
  nautilus's chambers: Journey open, Mission, Delivery, Evidence, Realization, Impact and
  Integration named and still to come. A chamber is lit only by the release that makes it work.
- **The app is the method's Harness**, in the Nautilus Family's terms.
- **The method** is linked at <https://github.com/mirror-mind-ai/nautilus> (its Portuguese pages
  under `docs/pt-br`).
- **English and Portuguese.**

## Built (2026-11-04)

`mirrormind-site` commit `740775b`, local: folder `nautilus/` (`/` English, `/pt-br/`
Portuguese), its own stylesheet and the app icon as favicon. Checked in a browser on a local server.

## Owed Before It Is Public

- ✅ DNS: the Navigator created `nautilus` as an `A` record to `51.222.160.3` in Cloudflare, DNS
  only (2026-11-04).
- ✅ On `szen-vps`: web root `/var/www/nautilus-site` (empty), server block
  `/etc/nginx/sites-available/nautilus-site` (linked in `sites-enabled`, `nginx -t` passed), and a
  Let's Encrypt certificate by `certbot --nginx --redirect`, valid to 2027-02-02 and renewed by
  `certbot.timer`. HTTP redirects to HTTPS; HTTPS answers 403 until the site is deployed; the
  Mirror sites and the update channel still answer 200. To undo: remove the link, reload nginx.
- Push and deploy, each with the Navigator's word. Then the Mirror site's `nautilus` links can move
  from its own Nautilus page to `nautilus.mirrormind.sh`.
