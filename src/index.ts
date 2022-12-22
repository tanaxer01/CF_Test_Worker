import { Router } from 'cloudflare-router';
import * as ApmRUM from '@elastic/apm-rum';

const router = new Router();

const apm = ApmRUM.init({
    serviceName: 'cloudflare-worker',
    serverUrl: ELASTIC_APM_SERVER_URL,
    environment: 'production'
})

router.get("/", (req, res) => res.text("Hello there!") );

// Route - Temperatura "actual" parsed. 
router.get("/temp", async (req, res) => {
	const tx = apm.startTransaction('fetch-temp');

	try {
		const response = await fetch("ahttp://api.meteored.cl/index.php?api_lang=cl&localidad=18578&affiliate_id=dr91po78hmpl&v=3.0");
		const body = await response.text();

		return res.text(body);
	} catch (error: any) {
		apm.captureError(error);
	} finally {
		if(tx !== undefined)
			tx.end()
	}

});

// Route - Crucigramas scrapped from some sites.
async function scrap_amuselabs(site: string):Promise<string[]> {
	const tx = apm.startTransaction('fetch-urls');

	try {
		const picker_url = `https://cdn3.amuselabs.com/${site}/date-picker?set=${site}&limit=100`
		const html = await (await fetch(picker_url)).text();
		const urls = [...html.matchAll(/class="puzzle-link" href="(.*)"/g)].map(x => `https://cdn3.amuselabs.com/${site}/${x[1]}`);

		return Promise.resolve(urls);
	} catch (error: any) {
		apm.captureError(error);
	} finally {
		if (tx !== undefined)
			tx.end()
	}

	if (tx)
		tx.end()

	return Promise.resolve([]);
}

router.get("/crossword", async (req, res) => {
	const options = ["atlantic", "nymag", "vox", "elpais"];
	const puzzle_matrix:string[][] = await Promise.all(options.map( async x => await scrap_amuselabs(x) ));
	const puzzles:string[] = puzzle_matrix.flat(1);

	console.log(puzzles);

	return res.json({ urls: puzzles });
});

// Route - Monedas




// export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
// }

addEventListener("fetch", event => {
    return event.respondWith(
        router.serveRequest(event.request, {/* extra data */ })
            .then(built => built.response)
    );
});
