import { headers } from 'next/headers'

export default function WebhookHandlerPage() {
    const headersList = headers();
    const referer = headersList.get('referer');

    return (
        <div>from {referer}</div>
    );
  }