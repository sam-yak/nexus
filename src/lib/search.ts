import { SearchResult } from "@/types";

export async function searchWeb(query: string, maxResults = 6): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
      search_depth: "advanced",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily search failed: ${response.status} - ${text}`);
  }

  const data = await response.json();

  return (data.results || []).map((r: { title: string; url: string; content: string; score: number }) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score ?? 0.5,
  }));
}
