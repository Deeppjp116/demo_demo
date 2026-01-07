const ArticleVectorSearch = require('./index');
const fs = require('fs');


async function main() {
  try {
    console.log('=== Starting Vector Search System ===\n');

    const vectorSearch = new ArticleVectorSearch();

    // Load your articles from JSON file
    const articlesData = JSON.parse(fs.readFileSync('articles.json', 'utf8'));

    // Index articles
    console.log('Indexing articles...');
    await vectorSearch.indexArticles(articlesData);

    // Define portfolio tags for searching
    const portfolioTags = [
      {
        portfolio_tag: 'FD_INVESTOR',
        text: 'Government fiscal policies and tax regulations affecting fixed income investments',
      },
      {
        portfolio_tag: 'TECH_GROWTH',
        text: 'Technology sector innovations and digital transformation trends',
      },
    ];

    // Search for similar articles
    console.log('\nSearching for similar articles...');
    const results = await vectorSearch.searchSimilarArticles(portfolioTags, 5);

    // Display results
    console.log('\n=== RESULTS ===\n');
    console.log(JSON.stringify(results, null, 2));

    // Save results to file
    fs.writeFileSync('search_results.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Results saved to search_results.json');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
