import { redirect } from 'next/navigation';

interface SignupRedirectProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupRedirectPage({ searchParams }: SignupRedirectProps) {
    const params = await searchParams;
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                query.append(key, item);
            }
        } else if (typeof value === 'string') {
            query.set(key, value);
        }
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    redirect(`/register${suffix}`);
}
