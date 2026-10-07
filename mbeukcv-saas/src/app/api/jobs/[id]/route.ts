import { NextResponse } from 'next/server';
import { readPublicProfile } from '@/lib/auth';
import { scoreOffer } from '@/lib/matching';
import { extractContactEmail, extractListedSkills, extractRecruiterName } from '@/lib/offers/rules';
import { fetchOfferText } from '@/lib/scrape/listing';
import { createSupabaseServer } from '@/lib/supabase/server';
import { centralCatalog } from '@/lib/supabase/factory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const client = centralCatalog();
  const { data: job, error } = await client
    .from('job_offers')
    .select('id, title, company, location, type, source, url, description, skills, contact_email, date_posted, deadline_date, expires_at, is_active')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!job || !job.is_active || (job.expires_at && new Date(job.expires_at).getTime() < Date.now())) {
    return NextResponse.json({ error: 'Cette offre n’est plus active.' }, { status: 404 });
  }

  let description = typeof job.description === 'string' ? job.description.trim() : '';
  let skills: string[] = Array.isArray(job.skills) ? job.skills : [];
  let contactEmail = job.contact_email as string | null;
  if (description.length < 80) {
    const fetched = await fetchOfferText(job.url);
    if (fetched) {
      description = fetched;
      if (skills.length === 0) skills = extractListedSkills(fetched);
      contactEmail = contactEmail || extractContactEmail(fetched);
      await client.from('job_offers').update({
        description,
        skills,
        contact_email: contactEmail,
      }).eq('id', job.id);
    }
  }

  const profile = await readPublicProfile(auth.user.id);
  const cv = profile?.cv;
  const hasCv = Boolean(cv && (cv.skills.length > 0 || cv.summary.trim().length >= 20 || cv.experiences.length > 0));
  const scored = hasCv && cv
    ? scoreOffer(
      { skills: cv.skills, yearsExperience: cv.yearsExperience, location: cv.location },
      { skills, description: description || null, location: job.location },
    )
    : null;

  return NextResponse.json({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    source: job.source,
    url: job.url,
    datePosted: job.date_posted,
    deadline: job.deadline_date,
    description: description || null,
    contactKnown: Boolean(contactEmail),
    contactEmail: contactEmail || null,
    recruiterName: extractRecruiterName(description),
    organisation: job.company && job.company !== 'Non indiqué' ? job.company : null,
    score: scored?.score ?? null,
    scoreNote: hasCv ? scored?.note ?? null : 'Enregistrez un CV pour calculer la correspondance.',
  });
}
