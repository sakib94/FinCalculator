# Local testing (PC + phone)

For testing only — nothing in this folder is deployed.

| File | Use it when | URL |
| --- | --- | --- |
| `start-local-server.bat` | You are changing code and want edits to appear instantly | `http://localhost:5173` |
| `start-production-preview.bat` | You want to check the final built site before uploading `dist\` | `http://localhost:4173` |

1. Install Node.js LTS from <https://nodejs.org> (once).
2. Double-click one of the `.bat` files. The first run installs dependencies.
3. On the PC open the `localhost` URL. On a phone connected to the **same Wi-Fi**, open the
   `http://192.168.x.x:…` address the window prints.
4. Press **Ctrl+C** in the window to stop.

**Phone cannot connect?** When Windows asks, allow Node.js through the firewall on *Private*
networks, and set your Wi-Fi to *Private* (Settings → Network & Internet → Wi-Fi → your network).
Guest and office Wi-Fi networks often block devices from reaching each other.

**Keep the project outside OneDrive** (e.g. `C:\dev\FinCalculator`). OneDrive syncing
`node_modules` makes `npm install` slow and can make it fail.

Offline mode (the service worker) only runs on a real `https://` site, so it cannot be tested
over these `http://` addresses.
