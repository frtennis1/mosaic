const { mc, socketClient, restClient, wasmClient } = vgplot;

export async function setDatabaseClient(type, options) {
  let client;
  switch (type) {
    case 'socket':
      client = socketClient(options);
      break;
    case 'rest':
      client = restClient(options);
      break;
    case 'wasm':
      client = await initWasmClient(options);
      break;
    default:
      throw new Error(`Unrecognized client type: ${type}`);
  }
  mc.databaseClient(client);
}

async function initWasmClient(options) {
  const client = await wasmClient(options);
  const { db, con } = client;

  async function csv(name, file) {
    const csv = await (await fetch(file)).text();
    await db.registerFileText(`${name}.csv`, csv);
    await con.insertCSVFromPath(`${name}.csv`, { name, schema: 'main' });
  }

  async function ipc(name, file) {
    const buffer = await (await fetch(file)).arrayBuffer();
    await con.insertArrowFromIPCStream(new Uint8Array(buffer), { name, schema: 'main' });
  }

  const dir = '../../data';
  await Promise.all([
    csv('athletes', `${dir}/athletes.csv`),
    csv('penguins', `${dir}/penguins.csv`),
    csv('seattle', `${dir}/seattle-weather.csv`),
    ipc('flights', `${dir}/flights-200k.arrow`),
    ipc('walk', `${dir}/random-walk.arrow`)
  ]);

  // TODO: accomplish via transforms
  await con.query(`
    CREATE TABLE weather AS
    SELECT *, make_date(2012, month(date), day(date)) AS doy FROM seattle
  `);

  return client;
}
