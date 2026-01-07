// npm install @qdrant/js-client-rest @xenova/transformers dotenv

const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();
const crypto = require('crypto');

let transformersModule = null;

async function loadTransformers() {
  if (!transformersModule) {
    transformersModule = await import('@xenova/transformers');
  }
  return transformersModule;
}

class ArticleVectorSearch {
  constructor() {
    this.qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    });

    this.collectionName = 'articles';
    this.embeddingModel = null;
    this.modelName = 'Xenova/bge-m3';
    this.vectorSize = 1024;
  }

  /* ---------------- MODEL ---------------- */

  async initializeModel() {
    if (this.embeddingModel) return;

    const { pipeline, env } = await loadTransformers();

    env.cacheDir = '/media/deep/D/news/ME-model-memory';
    env.allowLocalModels = true;
    env.useBrowserCache = false;

    this.embeddingModel = await pipeline('feature-extraction', this.modelName, {
      pooling: 'mean',
      normalize: true,
    });

    console.log('✓ BGE-M3 loaded');
  }

  async generateEmbedding(text) {
    if (!text || !text.trim()) return null;
    await this.initializeModel();
    const output = await this.embeddingModel(text);
    return Array.from(output.data);
  }

  /* ---------------- COLLECTION ---------------- */

  async initializeCollection() {
    const collections = await this.qdrantClient.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === this.collectionName
    );

    if (!exists) {
      await this.qdrantClient.createCollection(this.collectionName, {
        vectors: {
          title: { size: this.vectorSize, distance: 'Cosine' },
          summary: { size: this.vectorSize, distance: 'Cosine' },
          tags: { size: this.vectorSize, distance: 'Cosine' },
        },
      });
      console.log('✓ Collection created');
    }
  }

  /* ---------------- INDEX ---------------- */

  async indexArticles(articlesData) {
    await this.initializeCollection();

    const points = [];

    for (const article of articlesData.articles) {
      const f = article.formatted_data;

      const titleText = f.title || '';
      const summaryText = `${f.introductory_paragraph || ''} ${this.cleanHtml(
        f.descriptive_paragraph || ''
      )}`.trim();

      const tagsText = (article.tags || []).join(', ');

      const [titleVec, summaryVec, tagsVec] = await Promise.all([
        this.generateEmbedding(titleText),
        this.generateEmbedding(summaryText),
        this.generateEmbedding(tagsText),
      ]);

      points.push({
        id: crypto.randomUUID(),
        vectors: {
          title: titleVec,
          summary: summaryVec,
          tags: tagsVec,
        },
        payload: {
          title: titleText,
          summary: summaryText,
          tags: article.tags || [],
          link: article.original_link,
          published_time: article.published_time,
        },
      });
    }

    await this.qdrantClient.upsert(this.collectionName, {
      wait: true,
      points,
    });

    console.log(`✓ Indexed ${points.length} articles`);
  }

  /* ---------------- SEARCH ---------------- */

  async search(queryText, topK = 5) {
    const queryEmbedding = await this.generateEmbedding(queryText);

    const [titleRes, summaryRes, tagRes] = await Promise.all([
      this.searchVector('title', queryEmbedding, topK),
      this.searchVector('summary', queryEmbedding, topK),
      this.searchVector('tags', queryEmbedding, topK),
    ]);

    const scoreMap = {};

    const merge = (res, key) => {
      for (const r of res) {
        if (!scoreMap[r.id]) {
          scoreMap[r.id] = { payload: r.payload };
        }
        scoreMap[r.id][key] = r.score;
      }
    };

    merge(titleRes, 'title');
    merge(summaryRes, 'summary');
    merge(tagRes, 'tags');

    return Object.values(scoreMap).map((r) => {
      const title = r.title || 0;
      const summary = r.summary || 0;
      const tags = r.tags || 0;

      const overall = 0.5 * summary + 0.3 * title + 0.2 * tags;

      return {
        article_title: r.payload.title,
        article_link: r.payload.link,
        relevance: {
          title: `${(title * 100).toFixed(2)}%`,
          summary: `${(summary * 100).toFixed(2)}%`,
          tags: `${(tags * 100).toFixed(2)}%`,
          overall: `${(overall * 100).toFixed(2)}%`,
        },
      };
    });
  }

  async searchVector(name, vector, limit) {
    return this.qdrantClient.search(this.collectionName, {
      vector,
      vector_name: name,
      limit,
      with_payload: true,
    });
  }

  /* ---------------- UTILS ---------------- */

  cleanHtml(html) {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async deleteCollection() {
    await this.qdrantClient.deleteCollection(this.collectionName);
  }
}

/* ---------------- DEMO ---------------- */

async function main() {
  const vs = new ArticleVectorSearch();

  const articlesData = {
    articles: [
      {
        original_link:
          'https://economictimes.indiatimes.com/news/international/us/taxpayers-lose-free-irs-tax-filing-service',
        published_time: '2026-01-06T17:41:00.000Z',
        tags: ['Tax', 'IRS', 'Fiscal Policy'],
        formatted_data: {
          title:
            'IRS Direct File Program Eliminated, Taxpayers Seek Alternatives for 2026',
          introductory_paragraph:
            'The IRS Direct File program allowed free filing for millions.',
          descriptive_paragraph:
            '<p>The program was terminated after political criticism.</p>',
        },
      },
    ],
  };

  await vs.indexArticles(articlesData);

  const results = await vs.search(
    'Tax policy changes impacting fixed income investors'
  );

  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = ArticleVectorSearch;
