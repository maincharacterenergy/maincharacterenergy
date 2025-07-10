const fetch = require('node-fetch');
const fs = require('fs');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const README_PATH = 'README.md';
const NEWS_SECTION_START = '<!-- NEWS:START -->';
const NEWS_SECTION_END = '<!-- NEWS:END -->';

async function fetchTopHeadlines() {
    // Vamos buscar notícias de tecnologia no Brasil como exemplo
    // Documentação da API: https://newsapi.org/docs/endpoints/top-headlines
    const url = `https://newsapi.org/v2/top-headlines?country=br&category=technology&pageSize=5&apiKey=${NEWS_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('NewsAPI Error:', errorData);
            throw new Error(`NewsAPI request failed with status ${response.status}: ${errorData.message}`);
        }
        const data = await response.json();
        return data.articles;
    } catch (error) {
        console.error('Error fetching news:', error);
        return null;
    }
}

function formatNewsArticles(articles) {
    if (!articles || articles.length === 0) {
        return 'No news available at the moment. 🙁';
    }

    let newsContent = '<ul>\n';
    articles.forEach(article => {
        const title = article.title;
        const url = article.url;
        const sourceName = article.source.name;
        // Formata a data para DD/MM/YYYY HH:MM
        const publishedDate = new Date(article.publishedAt).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        newsContent += `  <li><a href="${url}" target="_blank">${title}</a> (<em>${sourceName}</em> - ${publishedDate})</li>\n`;
    });
    newsContent += '</ul>';
    return newsContent;
}

async function updateReadmeWithNews() {
    const articles = await fetchTopHeadlines();
    const newsHtml = formatNewsArticles(articles);

    try {
        let readmeContent = fs.readFileSync(README_PATH, 'utf-8');

        const startIndex = readmeContent.indexOf(NEWS_SECTION_START);
        const endIndex = readmeContent.indexOf(NEWS_SECTION_END);

        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            console.error('News section markers not found or incorrect in README.md');
            // Adiciona a seção se não existir
            readmeContent += `\n## 📰 **Latest Tech News (Brazil)**\n\n${NEWS_SECTION_START}\n${newsHtml}\n${NEWS_SECTION_END}\n`;
            console.log('News section added to README.md');
        } else {
            const prefix = readmeContent.substring(0, startIndex + NEWS_SECTION_START.length);
            const suffix = readmeContent.substring(endIndex);
            readmeContent = `${prefix}\n${newsHtml}\n${suffix}`;
            console.log('News section updated in README.md');
        }

        fs.writeFileSync(README_PATH, readmeContent, 'utf-8');
    } catch (error) {
        console.error('Error updating README.md:', error);
    }
}

updateReadmeWithNews();
