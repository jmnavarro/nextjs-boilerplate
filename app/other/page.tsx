import { headers } from 'next/headers'

export default function OtherPage() {
    const headersList = headers();
    const referer = headersList.get('user-agent');

    return (
        <div>Other page from {referer}</div>
    );
}