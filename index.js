import readline from 'readline';
import axios from 'axios';
import cheerio from 'cheerio';
import chalk from 'chalk';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const visitedUrls = new Set();
const pagesToVisit = [];
const pagesWithClass = [];
const pagesWithoutClass = [];

async function crawlPage(url, className) {
	if (visitedUrls.has(url)) {
		return;
	}

	visitedUrls.add(url);

	try {
		const response = await axios.get(url);
		const $ = cheerio.load(response.data);

		if ($(`.${className}`).length > 0) {
			pagesWithClass.push(url);
		} else {
			pagesWithoutClass.push(url);
		}

		const links = $('a')
			.map((_, link) => $(link).attr('href'))
			.get();

		links.forEach((link) => {
			let absoluteUrl = link;
			if (!link.startsWith('http://') && !link.startsWith('https://')) {
				absoluteUrl = new URL(link, url).href;
			}
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

function displayResults() {
	console.log(chalk.green.bold('\nPages with the specified class:'));
	pagesWithClass.forEach((page) => {
		console.log(chalk.green(`✅ ${page}`));
	});

	console.log(chalk.red.bold('\nPages without the specified class:'));
	pagesWithoutClass.forEach((page) => {
		console.log(chalk.red(`❌ ${page}`));
	});
}

rl.question('Enter the website URL: ', (baseUrl) => {
	if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
		baseUrl = `https://${baseUrl}`;
	}

	rl.question('Enter the CSS class to search for: ', (className) => {
		console.log(chalk.blue(`\nCrawling website: ${baseUrl}`));
		console.log(chalk.blue(`Searching for class: ${className}`));

		crawlWebsite(baseUrl, className)
			.then(() => {
				console.log(chalk.green('\nWebsite crawling completed.'));
				displayResults();
				rl.close();
			})
			.catch((error) => {
				console.error(
					chalk.red('An error occurred during website crawling:'),
					error
				);
				rl.close();
			});
	});
});
