import * as bcrypt from 'bcryptjs';

async function main() {
  const password = 'DevHub-demo-password';
  console.log('bcrypt benchmark — local demo only; results depend on your CPU.');
  console.log('Higher cost roughly doubles the work per increment, so measure on your target environment.\n');

  for (const cost of [10, 11, 12]) {
    const started = Date.now();
    const hash = await bcrypt.hash(password, cost);
    const elapsed = Date.now() - started;
    const ok = await bcrypt.compare(password, hash);
    console.log(`cost=${cost} elapsed=${elapsed}ms compare=${ok}`);
  }

  console.log('\nImportant: bcrypt raises the cost of each password guess; it does not rate-limit online login attempts.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
