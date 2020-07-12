const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const cheerio = require('cheerio'); // DOM 핸들링
const axios = require('axios');
const puppeteer = require('puppeteer');
const xlsx = require('xlsx');
const add_to_sheet = require('./add_to_sheet');


const csv = fs.readFileSync('./data/coupang.csv');
const sendData = parse(csv.toString('utf-8'));
// console.log(sendData);

const crawler = async () => {
	let result, title, price, img, wrTxt = '', $;
	for(let v of sendData) {
		result = await axios.get(v[1]);
		if(result.status == 200) {
			$ = cheerio.load(result.data);
			title = $("h2.prod-buy-header__title").text().trim();
			price = $(".total-price strong").text().trim();
			price = price.substr(0, price.indexOf('원'));
			img = $("img.prod-image__detail").attr("src");
			wrTxt += `${v[0]},${v[1]},${title},${price},${img}\n`
			// console.log(txt, price, img);
		}
		fs.writeFileSync('./result/coupang.csv', wrTxt);
	}
}
// crawler();

const crawler2 = async () => {
	const browser = await puppeteer.launch(/* {headless: false} */);
	const page = await browser.newPage();
	await page.goto('https://naver.com');
	await page.waitFor(2000);
	const page2 = await browser.newPage();
	await page2.goto('https://daum.net');
	await page2.waitFor(2000);
	const page3 = await browser.newPage();
	await page3.goto('https://google.com');
	await page3.waitFor(2000);
	await page.close();
	await page2.close();
	await page3.close();
	await browser.close();
	console.log("캡쳐 끝");
}
// crawler2();

const crawler3 = async () => {
	const resultData = [];
	const browser = await puppeteer.launch({headless: false});
	const result = await Promise.all(sendData.map(async (v, i) => {
		const page = await browser.newPage();
		await page.goto(v[1]);
		const titleEl = await page.$("h2.prod-buy-header__title");
		const title = await page.evaluate(tag => tag.textContent.trim(), titleEl);
		const priceEl = await page.$(".total-price strong");
		const price = await page.evaluate(tag => tag.textContent.trim(), priceEl);
		const imgEl = await page.$("img.prod-image__detail");
		const img = await page.evaluate(tag => tag.src, imgEl);
		resultData.push({
			linkTitle: v[0],
			link: v[1],
			title,
			price,
			img
		});
		await page.close();
	}));
	await browser.close();
	let wrTxt = '';
	for(let v of resultData) {
		wrTxt += `${v.linkTitle},${v.link},${v.title},${v.price},${v.img}\n`
	}
	fs.writeFileSync('./result/coupang-puppeteer.csv', wrTxt);
}
// crawler3();


// console.log(excel.SheetNames);
const excel = xlsx.readFile('./data/coupang.xlsx');
const sheet = excel.Sheets.Sheet1;
const sheetData = xlsx.utils.sheet_to_json(sheet);
// console.log(sheetData);

const crawler4 = async () => {
	const resultData = [];
	const browser = await puppeteer.launch({headless: false});
	const result = await Promise.all(sheetData.map(async (v, i) => {
		const page = await browser.newPage();
		await page.goto(v['링크']);
		const titleEl = await page.$("h2.prod-buy-header__title");
		const title = await page.evaluate(tag => tag.textContent.trim(), titleEl);
		const priceEl = await page.$(".total-price strong");
		const price = await page.evaluate(tag => tag.textContent.trim(), priceEl);
		const imgEl = await page.$("img.prod-image__detail");
		const img = await page.evaluate(tag => tag.src, imgEl);
		resultData[i] = {
			linkTitle: v['제목'],
			link: v['링크'],
			title,
			price,
			img
		};
		await page.close();
	}));
	await browser.close();
	for(let i in resultData) {
		add_to_sheet(sheet, 'C'+(Number(i)+2), 'n', resultData[i].title);
		add_to_sheet(sheet, 'D'+(Number(i)+2), 'n', resultData[i].price);
		add_to_sheet(sheet, 'E'+(Number(i)+2), 'n', resultData[i].img);
	}
	xlsx.writeFile(excel, './result/coupang.xlsx');
}
crawler4();
