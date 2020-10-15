'use strict';

const { Cluster } = require('puppeteer-cluster');

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4,
    puppeteerOptions: {
      executablePath: '/usr/bin/google-chrome',
      headless: false
    },
  });

  // Extract title of page
  const extractTitle = async page => {
    const title = await page.evaluate(() => document.querySelector('.anuncio > div > a > h2'));
    const price = await page.evaluate(() => document.querySelector('.anuncio > div > a > h3'));
    console.log(`${title} is ${price}`);
  };

  await cluster.task(async ({ page, data }) => {
    const { url, offset } = data;
    await page.goto(
      url,
      { waitUntil: 'domcontentloaded' }
    );

    (await page.evaluate(() => {
      return [...document.querySelectorAll('.anuncio > div > a')]
        .map(el => ({ url: el.href, name: el.innerText }));
    })).forEach(({ url, name }, i) => {
      console.log(`  Adding ${name} to queue`);
      cluster.queue({
        url,
        position: (offset + i + 1)
      }, extractTitle);
    });
  });

  cluster.queue({ url: 'https://www.icarros.com.br/ache/listaanuncios.jsp?anunciosUsados=1' });

  await cluster.idle();
  await cluster.close();
})();