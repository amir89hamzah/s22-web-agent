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

  // For single words like "ai", match whole word only.
  // This prevents false matches such as "domain" matching "ai".
  if (/^[a-z0-9]+$/.test(normalizedKeyword)) {
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`
    );

    return pattern.test(text);
  }

  // For phrases such as "allen bradley" or "oil & gas", use normal includes.
  return text.includes(normalizedKeyword);
}

function getMatchedKeywords(text, keywords) {
  return keywords.filter((keyword) => keywordMatches(text, keyword));
}

function classifyPage(result) {
  const text = buildSearchText(result);

  const categoryRules = [
    {
      category: "industrial",
      keywords: [
        "plc",
        "hmi",
        "scada",
        "rockwell",
        "allen bradley",
        "allen-bradley",
        "vfd",
        "drive",
        "control",
        "industrial",
        "automation",
        "electrical",
        "instrumentation",
        "oil",
        "gas",
        "safeguarding",
        "commissioning",
        "maintenance",
      ],
    },
    {
      category: "ai_tool",
      keywords: [
        "ai",
        "artificial intelligence",
        "agentic",
        "agent",
        "agents",
        "llm",
        "openai",
        "flowise",
        "workflow",
        "chatbot",
        "generative",
        "machine learning",
      ],
    },
    {
      category: "job",
      keywords: [
        "career",
        "careers",
        "job",
        "jobs",
        "hiring",
        "vacancy",
        "role",
        "position",
        "apply",
        "recruitment",
      ],
    },
    {
      category: "company",
      keywords: [
        "about",
        "company",
        "services",
        "solutions",
        "contact",
        "customer",
        "support",
        "products",
      ],
    },
  ];

  const scored = categoryRules.map((rule) => {
    const matchedKeywords = getMatchedKeywords(text, rule.keywords);

    return {
      category: rule.category,
      score: matchedKeywords.length,
      matchedKeywords,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  let category = "unknown";
  let relevanceScore = 10;
  let notes = "No strong keyword match found.";

  if (best && best.score > 0) {
    category = best.category;
    relevanceScore = Math.min(100, 20 + best.score * 12);
    notes = `Matched ${best.score} keyword(s) for category "${category}": ${best.matchedKeywords.join(", ")}.`;
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
