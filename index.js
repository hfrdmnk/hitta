const readline = require('readline');
const axios = require('axios');
const cheerio = require('cheerio');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const visitedUrls = new Set();
const pagesToVisit = [];

async function crawlPage(url, className) {
	if (visitedUrls.has(url)) {
		return;
	}

	visitedUrls.add(url);

	try {
		const response = await axios.get(url);
		const $ = cheerio.load(response.data);

		if ($(`.${className}`).length > 0) {
			console.log(`Page with class "${className}" found: ${url}`);
		}

		const links = $('a')
			.map((_, link) => $(link).attr('href'))
			.get();

		links.forEach((link) => {
			const absoluteUrl = new URL(link, url).href;
			if (!visitedUrls.has(absoluteUrl) && absoluteUrl.startsWith(url)) {
				pagesToVisit.push(absoluteUrl);
			}
		});
	} catch (error) {
		console.error(`Error crawling page ${url}:`, error);
	}
}

async function crawlWebsite(baseUrl, className) {
	pagesToVisit.push(baseUrl);

	while (pagesToVisit.length > 0) {
		const currentUrl = pagesToVisit.shift();
		await crawlPage(currentUrl, className);
	}
}

rl.question('Enter the website URL: ', (baseUrl) => {
	rl.question('Enter the CSS class to search for: ', (className) => {
		crawlWebsite(baseUrl, className)
			.then(() => {
				console.log('Website crawling completed.');
				rl.close();
			})
			.catch((error) => {
				console.error('An error occurred during website crawling:', error);
				rl.close();
			});
	});
});
