import { NextResponse } from 'next/server';

const BLOG_POSTS = [
    {
        title: 'How to Build a JEE Revision Loop That Actually Sticks',
        category: 'JEE Strategy',
        description: 'A practical revision cycle using lectures, question practice, and timed checkpoints.',
        link: 'https://saviedutech.com/blog/revision-loop',
        pubDate: '2026-03-09',
    },
    {
        title: 'NEET Biology Retention: A Smarter NCERT Review Pattern',
        category: 'NEET',
        description: 'Use short concept reviews, rapid recall, and image-based learning for better memory.',
        link: 'https://saviedutech.com/blog/neet-biology',
        pubDate: '2026-03-08',
    },
    {
        title: 'What Parents Should Track During a Student Study Week',
        category: 'Parent Guidance',
        description: 'A cleaner way to review consistency, effort, and progress without overwhelming the learner.',
        link: 'https://saviedutech.com/blog/parent-guide',
        pubDate: '2026-03-07',
    },
];

export async function GET() {
    const siteUrl = 'https://saviedutech.com';
    const blogUrl = `${siteUrl}/blog`;
    
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>SaviEduTech Blog</title>
    <link>${blogUrl}</link>
    <description>Insights, preparation strategy, exam guidance, and learning updates from SaviEduTech.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${blogUrl}/rss" rel="self" type="application/rss+xml"/>
    <category>Education</category>
    <category>JEE Preparation</category>
    <category>NEET Preparation</category>
    
    ${BLOG_POSTS.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${post.link}</link>
      <description><![CDATA[${post.description}]]></description>
      <category>${post.category}</category>
      <pubDate>${new Date(post.pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="true">${post.link}</guid>
    </item>
    `).join('')}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
    });
}
