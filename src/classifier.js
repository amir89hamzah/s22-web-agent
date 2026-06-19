function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function buildSearchText(result) {
  const parts = [];

  parts.push(result.title || "");
  parts.push(result.description || "");
  parts.push((result.headings || []).join(" "));

  if (Array.isArray(result.links)) {
    result.links.forEach((link) => {
      parts.push(link.text || "");
      parts.push(link.href || "");
    });
  }

  return normalizeText(parts.join(" "));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text, keyword) {
  const normalizedKeyword = normalizeText(keyword).trim();

  if (!normalizedKeyword) {
    return false;
  }

  if (/^[a-z0-9]+$/.test(normalizedKeyword)) {
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`
    );

    return pattern.test(text);
  }

  return text.includes(normalizedKeyword);
}

function normalizeKeywordRule(rule) {
  if (typeof rule === "string") {
    return {
      term: rule,
      weight: 1,
    };
  }

  return {
    term: rule.term,
    weight: rule.weight || 1,
  };
}

function getMatchedKeywords(text, keywordRules) {
  return keywordRules
    .map(normalizeKeywordRule)
    .filter((rule) => keywordMatches(text, rule.term));
}

function formatMatchedKeywords(matches) {
  return matches.map((match) => `${match.term} (+${match.weight})`).join(", ");
}

function classifyPage(result) {
  const text = buildSearchText(result);

  const categoryRules = [
    {
      category: "industrial_automation",
      priority: 5,
      keywords: [
        { term: "plc", weight: 5 },
        { term: "hmi", weight: 5 },
        { term: "scada", weight: 5 },
        { term: "rockwell", weight: 5 },
        { term: "allen bradley", weight: 5 },
        { term: "allen-bradley", weight: 5 },
        { term: "contrologix", weight: 5 },
        { term: "compactlogix", weight: 5 },
        { term: "rslogix", weight: 5 },
        { term: "studio 5000", weight: 5 },
        { term: "factorytalk", weight: 5 },
        { term: "vfd", weight: 4 },
        { term: "drive", weight: 2 },
        { term: "automation", weight: 3 },
        { term: "industrial", weight: 3 },
        { term: "electrical", weight: 2 },
        { term: "instrumentation", weight: 3 },
        { term: "oil and gas", weight: 3 },
        { term: "oil & gas", weight: 3 },
        { term: "commissioning", weight: 3 },
        { term: "maintenance", weight: 2 },
      ],
    },
    {
      category: "ai_automation",
      priority: 4,
      keywords: [
        { term: "mcp", weight: 5 },
        { term: "model context protocol", weight: 5 },
        { term: "llm", weight: 5 },
        { term: "openai", weight: 5 },
        { term: "agentic", weight: 4 },
        { term: "agent", weight: 3 },
        { term: "agents", weight: 3 },
        { term: "ai", weight: 3 },
        { term: "artificial intelligence", weight: 4 },
        { term: "workflow automation", weight: 4 },
        { term: "automation", weight: 2 },
        { term: "chatbot", weight: 3 },
        { term: "generative", weight: 3 },
        { term: "machine learning", weight: 3 },
        { term: "playwright", weight: 4 },
        { term: "browser automation", weight: 4 },
        { term: "flowise", weight: 4 },
        { term: "n8n", weight: 4 },
      ],
    },
    {
      category: "career",
      priority: 3,
      keywords: [
        { term: "career", weight: 4 },
        { term: "careers", weight: 4 },
        { term: "job", weight: 4 },
        { term: "jobs", weight: 4 },
        { term: "hiring", weight: 4 },
        { term: "vacancy", weight: 4 },
        { term: "role", weight: 2 },
        { term: "position", weight: 2 },
        { term: "apply", weight: 3 },
        { term: "recruitment", weight: 4 },
        { term: "remote", weight: 2 },
      ],
    },
    {
      category: "company_profile",
      priority: 1,
      keywords: [
        { term: "about", weight: 1 },
        { term: "company", weight: 2 },
        { term: "services", weight: 1 },
        { term: "solutions", weight: 2 },
        { term: "contact", weight: 1 },
        { term: "customer", weight: 1 },
        { term: "support", weight: 1 },
        { term: "products", weight: 1 },
      ],
    },
  ];

  const scored = categoryRules.map((rule) => {
    const matchedKeywords = getMatchedKeywords(text, rule.keywords);
    const score = matchedKeywords.reduce((total, match) => total + match.weight, 0);

    return {
      category: rule.category,
      priority: rule.priority,
      score,
      matchedKeywords,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.priority - a.priority;
  });

  const best = scored[0];

  let category = "unknown";
  let relevanceScore = 10;
  let notes = "No strong keyword match found.";

  if (best && best.score > 0) {
    category = best.category;
    relevanceScore = Math.min(100, 15 + best.score * 8);

    notes = `Matched weighted keywords for category "${category}" with score ${best.score}: ${formatMatchedKeywords(
      best.matchedKeywords
    )}.`;
  }

  if (result.title) {
    relevanceScore = Math.min(100, relevanceScore + 5);
  }

  if (result.description) {
    relevanceScore = Math.min(100, relevanceScore + 5);
  }

  return {
    category,
    relevance_score: relevanceScore,
    notes,
  };
}

module.exports = {
  classifyPage,
};
