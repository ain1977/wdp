import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

interface ContentRequest {
  type: 'social_post' | 'newsletter' | 'email_sequence' | 'blog_post';
  topic: string;
  tone: 'professional' | 'friendly' | 'authoritative' | 'conversational';
  practiceType: string;
  targetAudience: string;
  length?: 'short' | 'medium' | 'long';
}

export async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { type, topic, tone, practiceType, targetAudience, length = 'medium' } = await req.json() as ContentRequest;
    
    if (!type || !topic || !tone || !practiceType || !targetAudience) {
      return { status: 400, jsonBody: { error: "Missing required fields" } };
    }

    const content = await generateContent(type, topic, tone, practiceType, targetAudience, length, context);
    
    return { 
      status: 200, 
      jsonBody: { 
        content,
        type,
        generatedAt: new Date().toISOString(),
        metadata: { topic, tone, practiceType, targetAudience, length }
      } 
    };
  } catch (err: unknown) {
    context.error("ContentGenerator error", err as Error);
    return { status: 500, jsonBody: { error: "Content generation failed" } };
  }
}

async function generateContent(
  type: string, 
  topic: string, 
  tone: string, 
  practiceType: string, 
  targetAudience: string, 
  length: string,
  context: InvocationContext
): Promise<any> {
  
  // For now, return structured templates. Later integrate with Azure OpenAI
  const templates = {
    social_post: {
      linkedin: generateLinkedInPost(topic, tone, practiceType, targetAudience),
      instagram: generateInstagramPost(topic, tone, practiceType, targetAudience),
      twitter: generateTwitterPost(topic, tone, practiceType, targetAudience)
    },
    newsletter: generateNewsletterContent(topic, tone, practiceType, targetAudience, length),
    email_sequence: generateEmailSequence(topic, tone, practiceType, targetAudience),
    blog_post: generateBlogPost(topic, tone, practiceType, targetAudience, length)
  };

  return templates[type] || { error: "Unsupported content type" };
}

function generateLinkedInPost(topic: string, tone: string, practiceType: string, targetAudience: string): string {
  const templates = {
    professional: `💡 ${topic} - A key insight for ${targetAudience} in ${practiceType}.\n\nAs a ${practiceType} practitioner, I've seen how ${topic.toLowerCase()} can transform lives. Here's what I've learned...\n\n#${practiceType.replace(/\s+/g, '')} #Wellness #Health`,
    friendly: `Hey ${targetAudience}! 👋\n\nI wanted to share something about ${topic} that might help you on your wellness journey.\n\nIn my ${practiceType} practice, I often see clients struggling with ${topic.toLowerCase()}. Here's a simple approach that works...\n\nWhat's your experience with this? Drop a comment below! 💬`,
    authoritative: `The Science Behind ${topic} in ${practiceType}\n\nResearch consistently shows that ${topic.toLowerCase()} plays a crucial role in ${practiceType} outcomes. Here's what the evidence tells us...\n\n#EvidenceBased #${practiceType.replace(/\s+/g, '')} #Wellness`,
    conversational: `Quick question: How do you handle ${topic.toLowerCase()} in your daily routine?\n\nI ask because in my ${practiceType} practice, this comes up ALL the time. And honestly, there's no one-size-fits-all answer...\n\nBut here's what I've found works for most ${targetAudience}...`
  };
  
  return templates[tone] || templates.conversational;
}

function generateInstagramPost(topic: string, tone: string, practiceType: string, targetAudience: string): string {
  return `✨ ${topic} ✨\n\nFor all my ${targetAudience} out there - this is something I see in my ${practiceType} practice every day.\n\nSwipe to see how you can apply this to your wellness journey! 👆\n\n#${practiceType.replace(/\s+/g, '')} #Wellness #SelfCare #${topic.replace(/\s+/g, '')}`;
}

function generateTwitterPost(topic: string, tone: string, practiceType: string, targetAudience: string): string {
  const shortTopic = topic.length > 20 ? topic.substring(0, 17) + '...' : topic;
  return `${shortTopic} - A game changer for ${targetAudience} in ${practiceType}. Here's why it matters: [thread] #Wellness #${practiceType.replace(/\s+/g, '')}`;
}

function generateNewsletterContent(topic: string, tone: string, practiceType: string, targetAudience: string, length: string): any {
  const wordCount = length === 'short' ? 300 : length === 'medium' ? 800 : 1500;
  
  return {
    subject: `${topic}: What Every ${targetAudience} Should Know`,
    content: `# ${topic}: A ${practiceType} Perspective\n\nDear ${targetAudience},\n\nIn my years of ${practiceType} practice, I've learned that ${topic.toLowerCase()} is one of the most important factors in achieving lasting wellness...\n\n## Why This Matters\n\n[Content would be generated based on topic and practice type]\n\n## Practical Steps\n\n1. [Step 1 based on topic]\n2. [Step 2 based on topic]\n3. [Step 3 based on topic]\n\n## Your Next Steps\n\n[Call to action based on practice type]\n\nWarmly,\n[Practitioner Name]`,
    wordCount: wordCount,
    estimatedReadTime: Math.ceil(wordCount / 200)
  };
}

function generateEmailSequence(topic: string, tone: string, practiceType: string, targetAudience: string): any {
  return {
    sequence: [
      {
        day: 0,
        subject: `Welcome! Let's talk about ${topic}`,
        content: `Hi there!\n\nThanks for your interest in ${practiceType}. I wanted to share something important about ${topic.toLowerCase()}...`
      },
      {
        day: 3,
        subject: `The ${topic} challenge I see most often`,
        content: `In my ${practiceType} practice, I notice that ${targetAudience} often struggle with...`
      },
      {
        day: 7,
        subject: `Ready to take action on ${topic}?`,
        content: `It's been a week since we started talking about ${topic}. Are you ready to...`
      }
    ]
  };
}

function generateBlogPost(topic: string, tone: string, practiceType: string, targetAudience: string, length: string): any {
  const wordCount = length === 'short' ? 500 : length === 'medium' ? 1200 : 2500;
  
  return {
    title: `${topic}: A Complete Guide for ${targetAudience}`,
    content: `# ${topic}: A Complete Guide for ${targetAudience}\n\n## Introduction\n\n[Introduction based on topic and practice type]\n\n## The Problem\n\n[Problem description]\n\n## The Solution\n\n[Solution based on practice type]\n\n## Implementation\n\n[Step-by-step implementation]\n\n## Conclusion\n\n[Conclusion and call to action]`,
    wordCount: wordCount,
    estimatedReadTime: Math.ceil(wordCount / 200),
    seoKeywords: [topic, practiceType, targetAudience, 'wellness', 'health']
  };
}

app.http("ContentGenerator", {
  methods: ["POST"],
  route: "content/generate",
  authLevel: "function",
  handler
});
