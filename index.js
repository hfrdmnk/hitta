import { input, select } from '@inquirer/prompts';
import axios from 'axios';
import chalk from 'chalk';
import * as cheerio from 'cheerio';

const visitedUrls = new Set();
const pagesToVisit = [];
const pagesWithClass = [];
const pagesWithoutClass = [];

async function crawlPage(url, searchType, searchTerm) {
	if (visitedUrls.has(url)) {
		return;
	}

	visitedUrls.add(url);

	try {
		const response = await axios.get(url);
		const $ = cheerio.load(response.data);

		let found = false;
		if (searchType === 'Class') {
			found = $(`.${searchTerm}`).length > 0;
		} else if (searchType === 'String') {
			found = $('body').text().includes(searchTerm);
		}

		if (found) {
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

async function crawlWebsite(baseUrl, searchType, searchTerm) {
	pagesToVisit.push(baseUrl);

	while (pagesToVisit.length > 0) {
		const currentUrl = pagesToVisit.shift();
		await crawlPage(currentUrl, searchType, searchTerm);
		updateProgress();
	}
}

function updateProgress() {
	process.stdout.write(chalk.yellow(`Pages crawled: ${visitedUrls.size}\r`));
}

function displayResults(searchTerm, searchType) {
	if (pagesWithClass.length > 0) {
		console.log(
			chalk.green.bold(
				`\n${pagesWithClass.length} pages contain the ${
					searchType === 'Class' ? 'class' : 'string'
				} "${searchTerm}":`
			)
		);
		pagesWithClass.forEach((page) => {
			console.log(chalk.green(`✅ ${page}`));
		});
	}

	if (pagesWithoutClass.length > 0) {
		console.log(
			chalk.red.bold(
				`\n❌ ${pagesWithoutClass.length} pages don't contain the term "${searchTerm}".`
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

function startCrawling(baseUrl, searchType, searchTerm) {
	console.log(chalk.blue(`\nCrawling website: ${baseUrl}`));
	console.log(
		chalk.blue(`Searching for ${searchType.toLowerCase()}: ${searchTerm}`)
	);
	console.log('');

	crawlWebsite(baseUrl, searchType, searchTerm)
		.then(() => {
			console.log(chalk.green('\n\nWebsite crawling completed.'));
			displayResults(searchTerm, searchType);
		})
		.catch((error) => {
			console.error(
				chalk.red('\nAn error occurred during website crawling:'),
				error
			);
		});
}

const promptUser = async () => {
	const searchType = await select({
		message: 'What do you want to search for?',
		choices: [
			{ name: 'Class', value: 'Class' },
			{ name: 'String', value: 'String' },
		],
	});

	const baseUrl = await input({
		message: 'Enter the website URL:',
		validate: (input) => (input ? true : 'URL cannot be empty'),
	});

	const searchTerm = await input({
		message: `Enter the ${searchType.toLowerCase()} to search for:`,
		validate: (input) => (input ? true : `${searchType} cannot be empty`),
	});

	return { searchType, baseUrl: validateUrl(baseUrl), searchTerm };
};

const main = async () => {
	const { searchType, baseUrl, searchTerm } = await promptUser();
	startCrawling(baseUrl, searchType, searchTerm);
};

main();
