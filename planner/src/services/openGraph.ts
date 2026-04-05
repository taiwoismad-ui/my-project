export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
  try {
    // Use a proxy/parser service to avoid CORS issues
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FamilyPlannerBot/1.0)',
      },
    });

    const html = await response.text();

    const getMetaContent = (property: string): string | undefined => {
      // Try og: prefix
      const ogMatch = html.match(
        new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
      );
      if (ogMatch) return ogMatch[1];

      // Try content before property
      const ogMatch2 = html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i'),
      );
      if (ogMatch2) return ogMatch2[1];

      // Try name attribute
      const nameMatch = html.match(
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
      );
      if (nameMatch) return nameMatch[1];

      return undefined;
    };

    const getTitleFromHtml = (): string | undefined => {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1].trim() : undefined;
    };

    return {
      title: getMetaContent('title') ?? getTitleFromHtml(),
      description: getMetaContent('description'),
      image: getMetaContent('image'),
      siteName: getMetaContent('site_name'),
    };
  } catch (error) {
    console.warn('Failed to fetch Open Graph data:', error);
    return {};
  }
}
