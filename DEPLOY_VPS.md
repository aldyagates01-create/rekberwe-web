# RekberWE VPS deployment

Target: qhead01@103.175.217.140, /home/qhead01/rekberwe.
Runtime: Node 20, systemd rekberwe-web.service, HOST=127.0.0.1, PORT=3020.
Public origin: nginx for rekberwe.id, proxy to localhost:3020; TLS via Certbot.
Build: npm run check; npm run build. Never copy Windows node_modules to Linux.

## Migration state, 2026-11-10

VPS upgraded to 4 GB RAM / 2 vCPU. Private staging passes HTTP checks.
Railway remains public production until DNS cutover is explicitly verified.
Railway project steadfast-endurance / service rekberwe-web / volume rekberwe-web-volume.
Production uses SQLite at /data/rekberwe.sqlite, uploads at /data/uploads, Cloudinary also configured.
Secrets and online SQLite backup are saved outside this repository in the session-backups migration folder.
Preserve SESSION_SECRET, VOUCHER_CREDENTIALS_KEY, OAuth credentials and data/vapid.json.

Before cutover, quiesce the Railway application and take another online SQLite backup
plus uploads snapshot. Stop staging before replacing its database. Never serve two
independent writable copies. Verify final database counts, integrity, upload hashes,
TLS, authentication redirects and both RekberWE and Hanzay service health.
Do not remove Railway service or volume. Remove the temporary Railway SSH key after migration.
After DNS points to VPS, configure unattended Certbot renewal through the nginx ACME webroot.
