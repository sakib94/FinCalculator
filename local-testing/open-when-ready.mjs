// Opens the browser once a local server starts answering on a port.
// Used by the START / DEV launchers so the page never opens onto
// "can't connect" while a build is still running.
//
//   node local-testing/open-when-ready.mjs 4173
//
// Gives up quietly after five minutes (a failed build, Ctrl+C, …).
import net from 'node:net';
import { exec } from 'node:child_process';

const port = Number(process.argv[2]);
const url = `http://localhost:${port}`;
const deadline = Date.now() + 5 * 60 * 1000;

function tryConnect() {
  const socket = net.connect(port, '127.0.0.1', () => {
    socket.destroy();
    // `start` is the Windows way to hand a URL to the default browser.
    exec(process.platform === 'win32' ? `start "" "${url}"` : `open "${url}" || xdg-open "${url}"`);
  });
  socket.on('error', () => {
    socket.destroy();
    if (Date.now() < deadline) setTimeout(tryConnect, 600);
  });
}

if (Number.isInteger(port) && port > 0) tryConnect();
