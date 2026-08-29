import knowledge from '../../data/knowledge.json';
import { getColleges } from '../../lib/colleges.js';

// One payload for the assistant, built at build time from the same two files
// the rest of the site renders from. The point is that the assistant cannot
// drift from the pages: if a college's seat count changes in colleges.json,
// the answer the assistant gives changes with it, with no second copy to
// update and forget.
//
// Emitted as a static file by the build, fetched once when the chat is first
// opened rather than inlined into all 43 pages — the payload is a few tens of
// kB and most visitors never open the chat.
export async function GET() {
  const colleges = await getColleges();

  return new Response(
    JSON.stringify({
      reviewed: knowledge.reviewed,
      topics: knowledge.topics,
      // Only the fields already published on each college's own page. The
      // assistant must not be able to say something the site does not.
      colleges: colleges.map((c) => ({
        slug: c.slug,
        name: c.name,
        location: c.location || '',
        affiliation: c.affiliation || '',
        established: c.established || '',
        seats: c.seats || '',
        duration: c.duration || '5.5 years, including internship',
        admission: c.admission || 'NEET qualified, through MEC Nepal',
        website: c.website || '',
        ownership: c.badge || (c.type === 'govt' ? 'Government' : 'Private'),
      })),
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
