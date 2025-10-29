import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

interface SubstackPost {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  url: string;
}

export async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { action, substackApiKey, publicationId } = await req.json();
    
    if (!substackApiKey || !publicationId) {
      return { status: 400, jsonBody: { error: "Missing Substack API key or publication ID" } };
    }

    let result;
    
    switch (action) {
      case 'get_posts':
        result = await getSubstackPosts(substackApiKey, publicationId);
        break;
      case 'create_post':
        const { title, content, publishNow } = req.body;
        result = await createSubstackPost(substackApiKey, publicationId, title, content, publishNow);
        break;
      case 'sync_newsletter':
        result = await syncNewsletterContent(substackApiKey, publicationId);
        break;
      default:
        return { status: 400, jsonBody: { error: "Invalid action. Use: get_posts, create_post, sync_newsletter" } };
    }

    return { status: 200, jsonBody: result };
  } catch (err: unknown) {
    context.error("SubstackSync error", err as Error);
    return { status: 500, jsonBody: { error: "Substack sync failed" } };
  }
}

async function getSubstackPosts(apiKey: string, publicationId: string): Promise<SubstackPost[]> {
  // Substack API integration - get recent posts
  const response = await fetch(`https://substack.com/api/v1/publications/${publicationId}/posts`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Substack API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.posts?.map((post: any) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    publishedAt: post.published_at,
    url: post.canonical_url
  })) || [];
}

async function createSubstackPost(apiKey: string, publicationId: string, title: string, content: string, publishNow: boolean = false): Promise<any> {
  // Create a new post in Substack
  const response = await fetch(`https://substack.com/api/v1/publications/${publicationId}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      content,
      publish: publishNow
    })
  });
  
  if (!response.ok) {
    throw new Error(`Substack API error: ${response.status}`);
  }
  
  return await response.json();
}

async function syncNewsletterContent(apiKey: string, publicationId: string): Promise<any> {
  // Sync newsletter content and generate social media posts
  const posts = await getSubstackPosts(apiKey, publicationId);
  
  // Generate social media content from newsletter posts
  const socialContent = posts.map(post => ({
    platform: 'linkedin',
    content: `New newsletter post: "${post.title}" - ${post.url}`,
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
  }));
  
  return {
    newsletterPosts: posts.length,
    socialContentGenerated: socialContent.length,
    socialContent
  };
}

app.http("SubstackSync", {
  methods: ["POST"],
  route: "substack/sync",
  authLevel: "function",
  handler
});
