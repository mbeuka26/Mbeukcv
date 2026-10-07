/**
 * Vérifie qu’une URL de production répond pour la page d’accueil et /login.
 */
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https:\/\//.test(base)) {
  console.error('BLOQUÉ — URL de production manquante ou invalide.');
  process.exit(1);
}

const paths = ['/', '/login', '/pro/'];
const allowed = new Set([200, 301, 302, 307, 308]);

async function fetchStatus(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status !== 404 || attempt === 4) return response;
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('échec après tentatives');
}

for (const path of paths) {
  const url = `${base}${path}`;
  let response;
  try {
    response = await fetchStatus(url);
  } catch (error) {
    console.error(`BLOQUÉ — ${url} injoignable : ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
  if (!allowed.has(response.status)) {
    const body = (await response.text()).slice(0, 120).replace(/\s+/g, ' ');
    console.error(`BLOQUÉ — ${url} a renvoyé ${response.status} : ${body}`);
    process.exit(1);
  }
  console.log(`OK — ${url} → ${response.status}`);
}
console.log('OK — fumée production passée');
