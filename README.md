# Article Vector Search

A Node.js application for performing vector similarity search on news articles using Qdrant vector database and BGE-M3 embeddings.

## Features

- **Vector Embeddings**: Uses BGE-M3 model for generating embeddings from article titles, summaries, and tags
- **Multi-vector Search**: Searches across title, summary, and tags vectors with weighted scoring
- **Qdrant Integration**: Stores and searches vectors in Qdrant database
- **Article Indexing**: Processes JSON-formatted article data for indexing

## Prerequisites

- Node.js (v14 or higher)
- Qdrant vector database running locally or remotely
- Sufficient disk space for model cache (~2GB for BGE-M3)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd article-vector-search
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```
   QDRANT_URL=http://localhost:6333
   ```

## Usage

### Data Format

Articles should be provided in JSON format as shown in [articles.json](articles.json):

```json
{
  "articles": [
    {
      "original_link": "https://example.com/article",
      "published_time": "2026-01-06T17:41:00.000Z",
      "tags": ["Tag1", "Tag2"],
      "formatted_data": {
        "title": "Article Title",
        "introductory_paragraph": "Intro text",
        "descriptive_paragraph": "<p>HTML content</p>"
      }
    }
  ]
}
```

### Indexing Articles

To index articles from your JSON file:

```javascript
const ArticleVectorSearch = require('./index');
const fs = require('fs');

async function indexArticles() {
  const vectorSearch = new ArticleVectorSearch();
  const articlesData = JSON.parse(fs.readFileSync('articles.json', 'utf8'));
  await vectorSearch.indexArticles(articlesData);
}

indexArticles();
```

### Searching Articles

To search for similar articles:

```javascript
const ArticleVectorSearch = require('./index');

async function searchArticles() {
  const vectorSearch = new ArticleVectorSearch();
  const results = await vectorSearch.search('your search query', 5);
  console.log(results);
}

searchArticles();
```

### Running the Demo

Run the included demo script:

```bash
npm start
```

Or run the full pipeline:

```bash
node run.js
```

## API Reference

### ArticleVectorSearch Class

#### Methods

- `initializeModel()`: Loads the BGE-M3 embedding model
- `generateEmbedding(text)`: Generates vector embedding for given text
- `initializeCollection()`: Creates Qdrant collection if it doesn't exist
- `indexArticles(articlesData)`: Indexes articles into the vector database
- `search(queryText, topK)`: Searches for similar articles and returns ranked results

## Configuration

- **Collection Name**: `articles` (configurable in constructor)
- **Vector Size**: 1024 (BGE-M3 output dimension)
- **Distance Metric**: Cosine similarity
- **Model**: Xenova/bge-m3

## Dependencies

- `@qdrant/js-client-rest`: Qdrant client for Node.js
- `@xenova/transformers`: Hugging Face transformers in JavaScript
- `dotenv`: Environment variable management
- `openai`: (Listed but not used in current code)
- `uuid`: UUID generation

## Troubleshooting

### Model Loading Issues
- Ensure sufficient RAM (at least 4GB free)
- Model cache is stored in `/media/deep/D/news/ME-model-memory` by default
- First run may take several minutes to download the model

### Qdrant Connection
- Verify Qdrant is running on the specified URL
- Check firewall settings if using remote Qdrant
- Ensure collection creation permissions

### Memory Usage
- BGE-M3 model requires ~2GB RAM
- Processing large article datasets may need additional memory
- Consider batching for large datasets

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]