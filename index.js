import readline from 'readline';
import axios from 'axios';
import * as cheerio from 'cheerio';
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
		updateProgress();
	}
}

function updateProgress() {
	readline.cursorTo(process.stdout, 0);
	process.stdout.write(chalk.yellow(`Pages crawled: ${visitedUrls.size}`));
}

function displayResults(className) {
	if (pagesWithClass.length > 0) {
		console.log(
			chalk.green.bold(
				`\n${pagesWithClass.length} pages have the ${className} class:`
			)
		);
		pagesWithClass.forEach((page) => {
			console.log(chalk.green(`✅ ${page}`));
		});
	}

	if (pagesWithoutClass.length > 0) {
		console.log(
			chalk.red.bold(
				`\n❌ ${pagesWithoutClass.length} pages don't have the ${className} class.`
			)
		);
	}
}

function validateUrl(url) {
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		return `https://${url}`;
	}
	return url;
}

function startCrawling(baseUrl, className) {
	console.log(chalk.blue(`\nCrawling website: ${baseUrl}`));
	console.log(chalk.blue(`Searching for class: ${className}`));
	console.log('');

	crawlWebsite(baseUrl, className)
		.then(() => {
			console.log(chalk.green('\n\nWebsite crawling completed.'));
			displayResults(className);
			rl.close();
		})
		.catch((error) => {
			console.error(
				chalk.red('\nAn error occurred during website crawling:'),
				error
			);
			rl.close();
		});
}

const [, , ...args] = process.argv;

if (args.length === 2) {
	const [baseUrl, className] = args;
	const validatedUrl = validateUrl(baseUrl);
	startCrawling(validatedUrl, className);
} else {
	rl.question('Enter the website URL: ', (baseUrl) => {
		const validatedUrl = validateUrl(baseUrl);

		rl.question('Enter the CSS class to search for: ', (className) => {
			startCrawling(validatedUrl, className);
		});
	});
}
